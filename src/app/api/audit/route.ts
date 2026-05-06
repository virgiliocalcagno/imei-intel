import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: number;
  action: string;
  target_value: string | null;
  actor: string | null;
  at: string;
  details_json: unknown;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 1000);
  const db = await getDb();
  const result = await db.query<Row>(
    `SELECT id, action, target_value, actor, at, details_json FROM audit_log
     ORDER BY at DESC LIMIT $1`,
    [limit]
  );
  return NextResponse.json(
    result.rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetValue: r.target_value,
      actor: r.actor,
      at: Number(r.at),
      details: r.details_json,
    }))
  );
}
