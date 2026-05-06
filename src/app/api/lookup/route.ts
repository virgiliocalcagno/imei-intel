import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";
import { normalize, validate } from "@/lib/imei";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  value: string;
  actor?: string;
}

interface BlacklistRow {
  id: number;
  value: string;
  kind: string;
  category: string;
  reason: string | null;
  caseNumber: string | null;
  reportedBy: string | null;
  reportedAt: string;
  notes: string | null;
}

interface OccurrenceRow {
  uploadId: string;
  fileName: string;
  uploadedAt: string;
  rowIndex: number;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const value = normalize(body?.value ?? "");
  if (!value) return NextResponse.json({ error: "missing value" }, { status: 400 });

  const db = await getDb();
  const validation = validate(value);

  const blRows = await db.query<BlacklistRow>(
    `SELECT id, value, kind, category, reason,
            case_number AS "caseNumber",
            reported_by AS "reportedBy",
            reported_at AS "reportedAt",
            notes
       FROM blacklist WHERE value = $1`,
    [value]
  );
  const blacklisted = blRows.rows[0]
    ? { ...blRows.rows[0], reportedAt: Number(blRows.rows[0].reportedAt) }
    : null;

  const occRows = await db.query<OccurrenceRow>(
    `SELECT u.id AS "uploadId",
            u.file_name AS "fileName",
            u.uploaded_at AS "uploadedAt",
            r.row_index AS "rowIndex"
       FROM records r JOIN uploads u ON u.id = r.upload_id
      WHERE r.value = $1 ORDER BY u.uploaded_at DESC LIMIT 50`,
    [value]
  );
  const occurrences = occRows.rows.map((o) => ({ ...o, uploadedAt: Number(o.uploadedAt) }));

  await logAudit("lookup", {
    targetValue: value,
    actor: body.actor,
    details: { blacklisted: !!blacklisted, occurrences: occurrences.length },
  });

  return NextResponse.json({ value, validation, blacklisted, occurrences });
}
