import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

interface Row {
  id: number;
  action: string;
  target_value: string | null;
  actor: string | null;
  at: number;
  details_json: string | null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 1000);
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, action, target_value, actor, at, details_json FROM audit_log
       ORDER BY at DESC LIMIT ?`
    )
    .all(limit) as Row[];
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetValue: r.target_value,
      actor: r.actor,
      at: r.at,
      details: r.details_json ? JSON.parse(r.details_json) : null,
    }))
  );
}
