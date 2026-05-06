import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";

export const runtime = "nodejs";

interface Body {
  scope: "uploads" | "blacklist" | "audit" | "all";
  confirm: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (body?.confirm !== "BORRAR") {
    return NextResponse.json({ error: "missing confirmation" }, { status: 400 });
  }

  const db = getDb();
  const counts = { uploads: 0, records: 0, blacklist: 0, audit: 0 };

  const txn = db.transaction(() => {
    if (body.scope === "uploads" || body.scope === "all") {
      counts.uploads = (db.prepare(`SELECT COUNT(*) AS c FROM uploads`).get() as { c: number }).c;
      counts.records = (db.prepare(`SELECT COUNT(*) AS c FROM records`).get() as { c: number }).c;
      db.exec(`DELETE FROM records; DELETE FROM uploads;`);
    }
    if (body.scope === "blacklist" || body.scope === "all") {
      counts.blacklist = (db.prepare(`SELECT COUNT(*) AS c FROM blacklist`).get() as { c: number }).c;
      db.exec(`DELETE FROM blacklist;`);
    }
    if (body.scope === "audit" || body.scope === "all") {
      counts.audit = (db.prepare(`SELECT COUNT(*) AS c FROM audit_log`).get() as { c: number }).c;
      db.exec(`DELETE FROM audit_log;`);
    }
  });
  txn();

  logAudit("admin.reset", { details: { scope: body.scope, counts } });
  return NextResponse.json({ ok: true, counts });
}
