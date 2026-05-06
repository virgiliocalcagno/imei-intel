import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";
import type { AnalysisReport } from "@/lib/dedupe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  fileName: string;
  fileSize: number;
  report: AnalysisReport;
}

export async function GET() {
  const db = await getDb();
  const { rows } = await db.query<{
    id: string;
    fileName: string;
    fileSize: string;
    uploadedAt: string;
    summary: AnalysisReport["summary"];
  }>(
    `SELECT id,
            file_name   AS "fileName",
            file_size   AS "fileSize",
            uploaded_at AS "uploadedAt",
            summary_json AS summary
       FROM uploads ORDER BY uploaded_at DESC LIMIT 200`
  );
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      fileSize: Number(r.fileSize),
      uploadedAt: Number(r.uploadedAt),
      summary: r.summary,
    }))
  );
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateBody;
  if (!body?.fileName || !body?.report) {
    return NextResponse.json({ error: "missing payload" }, { status: 400 });
  }

  const db = await getDb();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO uploads (id, file_name, file_size, uploaded_at, summary_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, body.fileName, body.fileSize ?? 0, Date.now(), JSON.stringify(body.report.summary)]
    );

    const recs = body.report.records;
    const COLS = 9;
    const MAX_PARAMS = 60_000; // Postgres limit is 65535
    const chunkSize = Math.max(1, Math.floor(MAX_PARAMS / COLS));
    for (let i = 0; i < recs.length; i += chunkSize) {
      const slice = recs.slice(i, i + chunkSize);
      const values: unknown[] = [];
      const placeholders = slice
        .map((r, idx) => {
          const b = idx * COLS;
          values.push(
            id,
            r.rowIndex,
            r.value,
            r.kind,
            r.valid,
            r.reason ?? null,
            r.isDuplicate,
            r.duplicateRows.length ? JSON.stringify(r.duplicateRows) : null,
            r.source ?? null
          );
          return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`;
        })
        .join(",");
      await client.query(
        `INSERT INTO records (upload_id, row_index, value, kind, valid, reason, is_duplicate, duplicate_rows, source)
         VALUES ${placeholders}`,
        values
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await logAudit("upload.create", {
    targetValue: body.fileName,
    details: { id, summary: body.report.summary },
  });

  return NextResponse.json({ id });
}
