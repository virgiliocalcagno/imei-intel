import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";
import type { AnalysisRecord, AnalysisReport } from "@/lib/dedupe";

export const runtime = "nodejs";

interface UploadRow {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_at: number;
  summary_json: string;
}

interface RecordRow {
  row_index: number;
  value: string;
  kind: string;
  valid: number;
  reason: string | null;
  is_duplicate: number;
  duplicate_rows: string | null;
  source: string | null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();

  const meta = db
    .prepare(
      `SELECT id, file_name, file_size, uploaded_at, summary_json FROM uploads WHERE id = ?`
    )
    .get(id) as UploadRow | undefined;
  if (!meta) return NextResponse.json({ error: "not found" }, { status: 404 });

  const records = (
    db
      .prepare(
        `SELECT row_index, value, kind, valid, reason, is_duplicate, duplicate_rows, source
         FROM records WHERE upload_id = ? ORDER BY row_index ASC`
      )
      .all(id) as RecordRow[]
  ).map<AnalysisRecord>((r) => ({
    rowIndex: r.row_index,
    value: r.value,
    raw: r.value,
    kind: r.kind as AnalysisRecord["kind"],
    valid: r.valid === 1,
    reason: r.reason ?? undefined,
    isDuplicate: r.is_duplicate === 1,
    duplicateRows: r.duplicate_rows ? (JSON.parse(r.duplicate_rows) as number[]) : [],
    source: r.source ?? "",
  }));

  // Cross-check against blacklist.
  type BlacklistRow = {
    value: string;
    kind: string;
    category: string;
    reason: string | null;
    case_number: string | null;
  };
  const blacklist = new Map<string, BlacklistRow>();
  for (const b of db.prepare(`SELECT value, kind, category, reason, case_number FROM blacklist`).all() as BlacklistRow[]) {
    blacklist.set(b.value, b);
  }

  const enriched = records.map((r) => {
    const hit = blacklist.get(r.value);
    return hit
      ? {
          ...r,
          blacklisted: true,
          blacklistCategory: hit.category,
          blacklistCaseNumber: hit.case_number ?? undefined,
          blacklistReason: hit.reason ?? undefined,
        }
      : { ...r, blacklisted: false };
  });

  const summary = JSON.parse(meta.summary_json) as AnalysisReport["summary"];
  // Recompute duplicate groups from records (kept lean to avoid storing it twice).
  const groupMap = new Map<string, number[]>();
  for (const r of records) {
    if (r.isDuplicate) {
      const arr = groupMap.get(r.value) ?? [];
      arr.push(r.rowIndex);
      groupMap.set(r.value, arr);
    }
  }
  const duplicateGroups = [...groupMap.entries()].map(([value, rows]) => ({ value, rows }));

  return NextResponse.json({
    id: meta.id,
    fileName: meta.file_name,
    fileSize: meta.file_size,
    uploadedAt: meta.uploaded_at,
    report: { records: enriched, summary, duplicateGroups },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const r = db.prepare(`DELETE FROM uploads WHERE id = ?`).run(id);
  logAudit("upload.delete", { targetValue: id, details: { changes: r.changes } });
  return NextResponse.json({ deleted: r.changes });
}
