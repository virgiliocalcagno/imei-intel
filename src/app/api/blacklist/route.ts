import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";
import { classify, normalize } from "@/lib/imei";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BlacklistEntry {
  id: number;
  value: string;
  kind: string;
  category: string;
  reason: string | null;
  case_number: string | null;
  reported_by: string | null;
  reported_at: string;
  notes: string | null;
}

interface CreateBody {
  value: string;
  category: string;
  reason?: string;
  caseNumber?: string;
  reportedBy?: string;
  notes?: string;
}

interface BulkBody {
  entries: CreateBody[];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const db = await getDb();

  const result = q
    ? await db.query<BlacklistEntry>(
        `SELECT * FROM blacklist
         WHERE value ILIKE $1 OR case_number ILIKE $1 OR reason ILIKE $1
         ORDER BY reported_at DESC LIMIT 500`,
        [`%${q}%`]
      )
    : await db.query<BlacklistEntry>(`SELECT * FROM blacklist ORDER BY reported_at DESC LIMIT 500`);

  return NextResponse.json(result.rows.map(toApi));
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateBody | BulkBody;
  const db = await getDb();

  const entries: CreateBody[] = "entries" in body ? body.entries : [body];
  let inserted = 0;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (const e of entries) {
      const value = normalize(e.value);
      if (!value) continue;
      const kind = classify(value);
      await client.query(
        `INSERT INTO blacklist (value, kind, category, reason, case_number, reported_by, reported_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (value) DO UPDATE SET
           kind        = EXCLUDED.kind,
           category    = EXCLUDED.category,
           reason      = EXCLUDED.reason,
           case_number = EXCLUDED.case_number,
           reported_by = EXCLUDED.reported_by,
           reported_at = EXCLUDED.reported_at,
           notes       = EXCLUDED.notes`,
        [
          value,
          kind,
          e.category || "uncategorized",
          e.reason ?? null,
          e.caseNumber ?? null,
          e.reportedBy ?? null,
          Date.now(),
          e.notes ?? null,
        ]
      );
      inserted++;
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await logAudit("blacklist.add", {
    details: { count: inserted },
    actor: entries[0]?.reportedBy,
  });

  return NextResponse.json({ inserted });
}

function toApi(r: BlacklistEntry) {
  return {
    id: r.id,
    value: r.value,
    kind: r.kind,
    category: r.category,
    reason: r.reason,
    caseNumber: r.case_number,
    reportedBy: r.reported_by,
    reportedAt: Number(r.reported_at),
    notes: r.notes,
  };
}
