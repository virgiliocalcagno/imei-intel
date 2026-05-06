import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";
import type { AnalysisRecord, AnalysisReport } from "@/lib/dedupe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UploadRow {
  id: string;
  file_name: string;
  file_size: string;
  uploaded_at: string;
  summary_json: AnalysisReport["summary"];
}

interface RecordRow {
  row_index: number;
  value: string;
  kind: string;
  valid: boolean;
  reason: string | null;
  is_duplicate: boolean;
  duplicate_rows: number[] | null;
  source: string | null;
}

interface BlacklistRow {
  value: string;
  kind: string;
  category: string;
  reason: string | null;
  case_number: string | null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await getDb();

  const meta = (
    await db.query<UploadRow>(
      `SELECT id, file_name, file_size, uploaded_at, summary_json FROM uploads WHERE id = $1`,
      [id]
    )
  ).rows[0];
  if (!meta) return NextResponse.json({ error: "not found" }, { status: 404 });

  const recordRows = (
    await db.query<RecordRow>(
      `SELECT row_index, value, kind, valid, reason, is_duplicate, duplicate_rows, source
         FROM records WHERE upload_id = $1 ORDER BY row_index ASC`,
      [id]
    )
  ).rows;

  const records: AnalysisRecord[] = recordRows.map((r) => ({
    rowIndex: r.row_index,
    value: r.value,
    raw: r.value,
    kind: r.kind as AnalysisRecord["kind"],
    valid: r.valid,
    reason: r.reason ?? undefined,
    isDuplicate: r.is_duplicate,
    duplicateRows: r.duplicate_rows ?? [],
    source: r.source ?? "",
  }));

  const blacklist = new Map<string, BlacklistRow>();
  const blacklistRows = await db.query<BlacklistRow>(
    `SELECT value, kind, category, reason, case_number FROM blacklist`
  );
  for (const b of blacklistRows.rows) blacklist.set(b.value, b);

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
    fileSize: Number(meta.file_size),
    uploadedAt: Number(meta.uploaded_at),
    report: { records: enriched, summary: meta.summary_json, duplicateGroups },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await getDb();
  const r = await db.query(`DELETE FROM uploads WHERE id = $1`, [id]);
  await logAudit("upload.delete", { targetValue: id, details: { changes: r.rowCount ?? 0 } });
  return NextResponse.json({ deleted: r.rowCount ?? 0 });
}
