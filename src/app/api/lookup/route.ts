import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";
import { normalize, validate } from "@/lib/imei";

export const runtime = "nodejs";

interface Body {
  value: string;
  actor?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const value = normalize(body?.value ?? "");
  if (!value) return NextResponse.json({ error: "missing value" }, { status: 400 });

  const db = getDb();
  const validation = validate(value);

  const blacklisted = db
    .prepare(
      `SELECT id, value, kind, category, reason, case_number AS caseNumber,
              reported_by AS reportedBy, reported_at AS reportedAt, notes
       FROM blacklist WHERE value = ?`
    )
    .get(value) as
    | {
        id: number;
        value: string;
        kind: string;
        category: string;
        reason: string | null;
        caseNumber: string | null;
        reportedBy: string | null;
        reportedAt: number;
        notes: string | null;
      }
    | undefined;

  type Occurrence = { uploadId: string; fileName: string; uploadedAt: number; rowIndex: number };
  const occurrences = db
    .prepare(
      `SELECT u.id AS uploadId, u.file_name AS fileName, u.uploaded_at AS uploadedAt, r.row_index AS rowIndex
       FROM records r JOIN uploads u ON u.id = r.upload_id
       WHERE r.value = ? ORDER BY u.uploaded_at DESC LIMIT 50`
    )
    .all(value) as Occurrence[];

  logAudit("lookup", {
    targetValue: value,
    actor: body.actor,
    details: { blacklisted: !!blacklisted, occurrences: occurrences.length },
  });

  return NextResponse.json({ value, validation, blacklisted: blacklisted ?? null, occurrences });
}
