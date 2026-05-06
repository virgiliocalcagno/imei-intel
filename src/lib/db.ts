import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

let dbInstance: Database.Database | null = null;

function dbPath(): string {
  // In dev, store next to the project. In a packaged Tauri build, the app will
  // override this with the platform's user data directory.
  const override = process.env.IMEI_DB_PATH;
  if (override) return override;
  return join(process.cwd(), "data", "imei.db");
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  dbInstance = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id            TEXT PRIMARY KEY,
      file_name     TEXT NOT NULL,
      file_size     INTEGER NOT NULL,
      uploaded_at   INTEGER NOT NULL,
      summary_json  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS records (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      upload_id       TEXT NOT NULL,
      row_index       INTEGER NOT NULL,
      value           TEXT NOT NULL,
      kind            TEXT NOT NULL,
      valid           INTEGER NOT NULL,
      reason          TEXT,
      is_duplicate    INTEGER NOT NULL,
      duplicate_rows  TEXT,
      source          TEXT,
      FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_upload ON records(upload_id);
    CREATE INDEX IF NOT EXISTS idx_records_value  ON records(value);

    CREATE TABLE IF NOT EXISTS blacklist (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      value         TEXT NOT NULL UNIQUE,
      kind          TEXT NOT NULL,
      category      TEXT NOT NULL,
      reason        TEXT,
      case_number   TEXT,
      reported_by   TEXT,
      reported_at   INTEGER NOT NULL,
      notes         TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_blacklist_value ON blacklist(value);

    CREATE TABLE IF NOT EXISTS audit_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      action        TEXT NOT NULL,
      target_value  TEXT,
      actor         TEXT,
      at            INTEGER NOT NULL,
      details_json  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
  `);
}

export function logAudit(
  action: string,
  opts: { targetValue?: string; actor?: string; details?: unknown } = {}
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_log (action, target_value, actor, at, details_json) VALUES (?, ?, ?, ?, ?)`
  ).run(
    action,
    opts.targetValue ?? null,
    opts.actor ?? null,
    Date.now(),
    opts.details ? JSON.stringify(opts.details) : null
  );
}
