import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";
import { classify, normalize } from "@/lib/imei";

export const runtime = "nodejs";

interface BlacklistEntry {
  id: number;
  value: string;
  kind: string;
  category: string;
  reason: string | null;
  case_number: string | null;
  reported_by: string | null;
  reported_at: number;
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
  const db = getDb();
  let rows: BlacklistEntry[];
  if (q) {
    rows = db
      .prepare(
        `SELECT * FROM blacklist WHERE value LIKE ? OR case_number LIKE ? OR reason LIKE ?
         ORDER BY reported_at DESC LIMIT 500`
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`) as BlacklistEntry[];
  } else {
    rows = db
      .prepare(`SELECT * FROM blacklist ORDER BY reported_at DESC LIMIT 500`)
      .all() as BlacklistEntry[];
  }
  return NextResponse.json(rows.map(toApi));
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateBody | BulkBody;
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO blacklist (value, kind, category, reason, case_number, reported_by, reported_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const entries: CreateBody[] = "entries" in body ? body.entries : [body];
  let inserted = 0;
  const txn = db.transaction(() => {
    for (const e of entries) {
      const value = normalize(e.value);
      if (!value) continue;
      const kind = classify(value);
      stmt.run(
        value,
        kind,
        e.category || "uncategorized",
        e.reason ?? null,
        e.caseNumber ?? null,
        e.reportedBy ?? null,
        Date.now(),
        e.notes ?? null
      );
      inserted++;
    }
  });
  txn();

  logAudit("blacklist.add", {
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
    reportedAt: r.reported_at,
    notes: r.notes,
  };
}
