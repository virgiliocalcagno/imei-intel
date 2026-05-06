import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  scope: "uploads" | "blacklist" | "audit" | "all";
  confirm: string;
}

async function countOf(client: { query: <T = unknown>(s: string) => Promise<{ rows: T[] }> }, table: string) {
  const r = await client.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM ${table}`);
  return Number(r.rows[0]?.c ?? 0);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (body?.confirm !== "BORRAR") {
    return NextResponse.json({ error: "missing confirmation" }, { status: 400 });
  }

  const db = await getDb();
  const counts = { uploads: 0, records: 0, blacklist: 0, audit: 0 };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (body.scope === "uploads" || body.scope === "all") {
      counts.uploads = await countOf(client, "uploads");
      counts.records = await countOf(client, "records");
      await client.query(`DELETE FROM records`);
      await client.query(`DELETE FROM uploads`);
    }
    if (body.scope === "blacklist" || body.scope === "all") {
      counts.blacklist = await countOf(client, "blacklist");
      await client.query(`DELETE FROM blacklist`);
    }
    if (body.scope === "audit" || body.scope === "all") {
      counts.audit = await countOf(client, "audit_log");
      await client.query(`DELETE FROM audit_log`);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await logAudit("admin.reset", { details: { scope: body.scope, counts } });
  return NextResponse.json({ ok: true, counts });
}
