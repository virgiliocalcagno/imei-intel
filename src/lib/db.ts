// Postgres-backed persistence layer (Vercel Postgres / Neon).
// Uses node-postgres with a module-level Pool so that Vercel serverless
// invocations within the same warm instance share connections.

import { Pool, type PoolConfig } from "pg";

let pool: Pool | null = null;
let migrated = false;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL is not set. Configure your database connection.");
  }
  const config: PoolConfig = {
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 10_000,
  };
  pool = new Pool(config);
  return pool;
}

async function migrate() {
  if (migrated) return;
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id           TEXT PRIMARY KEY,
      file_name    TEXT NOT NULL,
      file_size    BIGINT NOT NULL,
      uploaded_at  BIGINT NOT NULL,
      summary_json JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS records (
      id              BIGSERIAL PRIMARY KEY,
      upload_id       TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
      row_index       INTEGER NOT NULL,
      value           TEXT NOT NULL,
      kind            TEXT NOT NULL,
      valid           BOOLEAN NOT NULL,
      reason          TEXT,
      is_duplicate    BOOLEAN NOT NULL,
      duplicate_rows  JSONB,
      source          TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_records_upload ON records(upload_id);
    CREATE INDEX IF NOT EXISTS idx_records_value  ON records(value);

    CREATE TABLE IF NOT EXISTS blacklist (
      id           BIGSERIAL PRIMARY KEY,
      value        TEXT NOT NULL UNIQUE,
      kind         TEXT NOT NULL,
      category     TEXT NOT NULL,
      reason       TEXT,
      case_number  TEXT,
      reported_by  TEXT,
      reported_at  BIGINT NOT NULL,
      notes        TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_blacklist_value ON blacklist(value);

    CREATE TABLE IF NOT EXISTS audit_log (
      id            BIGSERIAL PRIMARY KEY,
      action        TEXT NOT NULL,
      target_value  TEXT,
      actor         TEXT,
      at            BIGINT NOT NULL,
      details_json  JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC);
  `);
  migrated = true;
}

export async function getDb(): Promise<Pool> {
  await migrate();
  return getPool();
}

export async function logAudit(
  action: string,
  opts: { targetValue?: string; actor?: string; details?: unknown } = {}
) {
  const db = await getDb();
  await db.query(
    `INSERT INTO audit_log (action, target_value, actor, at, details_json) VALUES ($1, $2, $3, $4, $5)`,
    [
      action,
      opts.targetValue ?? null,
      opts.actor ?? null,
      Date.now(),
      opts.details ? JSON.stringify(opts.details) : null,
    ]
  );
}
