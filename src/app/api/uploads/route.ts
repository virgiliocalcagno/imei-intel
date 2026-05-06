import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";
import type { AnalysisReport } from "@/lib/dedupe";

export const runtime = "nodejs";

interface CreateBody {
  fileName: string;
  fileSize: number;
  report: AnalysisReport;
}

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, file_name AS fileName, file_size AS fileSize, uploaded_at AS uploadedAt, summary_json AS summary
       FROM uploads ORDER BY uploaded_at DESC LIMIT 200`
    )
    .all() as { id: string; fileName: string; fileSize: number; uploadedAt: number; summary: string }[];
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      fileSize: r.fileSize,
      uploadedAt: r.uploadedAt,
      summary: JSON.parse(r.summary),
    }))
  );
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateBody;
  if (!body?.fileName || !body?.report) {
    return NextResponse.json({ error: "missing payload" }, { status: 400 });
  }

  const db = getDb();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const insertUpload = db.prepare(
    `INSERT INTO uploads (id, file_name, file_size, uploaded_at, summary_json) VALUES (?, ?, ?, ?, ?)`
  );
  const insertRecord = db.prepare(
    `INSERT INTO records (upload_id, row_index, value, kind, valid, reason, is_duplicate, duplicate_rows, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const txn = db.transaction((report: AnalysisReport) => {
    insertUpload.run(
      id,
      body.fileName,
      body.fileSize ?? 0,
      Date.now(),
      JSON.stringify(report.summary)
    );
    for (const r of report.records) {
      insertRecord.run(
        id,
        r.rowIndex,
        r.value,
        r.kind,
        r.valid ? 1 : 0,
        r.reason ?? null,
        r.isDuplicate ? 1 : 0,
        r.duplicateRows.length ? JSON.stringify(r.duplicateRows) : null,
        r.source ?? null
      );
    }
  });
  txn(body.report);

  logAudit("upload.create", {
    targetValue: body.fileName,
    details: { id, summary: body.report.summary },
  });

  return NextResponse.json({ id });
}
