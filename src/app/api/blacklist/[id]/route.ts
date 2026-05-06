import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const row = db.prepare(`SELECT value FROM blacklist WHERE id = ?`).get(Number(id)) as
    | { value: string }
    | undefined;
  const r = db.prepare(`DELETE FROM blacklist WHERE id = ?`).run(Number(id));
  logAudit("blacklist.remove", { targetValue: row?.value, details: { changes: r.changes } });
  return NextResponse.json({ deleted: r.changes });
}
