import { NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await getDb();
  const lookup = await db.query<{ value: string }>(
    `SELECT value FROM blacklist WHERE id = $1`,
    [Number(id)]
  );
  const r = await db.query(`DELETE FROM blacklist WHERE id = $1`, [Number(id)]);
  await logAudit("blacklist.remove", {
    targetValue: lookup.rows[0]?.value,
    details: { changes: r.rowCount ?? 0 },
  });
  return NextResponse.json({ deleted: r.rowCount ?? 0 });
}
