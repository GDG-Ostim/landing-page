import Database from "better-sqlite3";
import { chmodSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function openDatabase(dataDir: string) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  mkdirSync(join(dataDir, "uploads"), { recursive: true, mode: 0o700 });
  const file = join(dataDir, "gdg.sqlite");
  const db = new Database(file);
  chmodSync(file, 0o600);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  try {
    db.transaction(() => {
      db.exec("CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY)");
      if (!db.prepare("SELECT version FROM migrations WHERE version = 1").get()) {
        db.exec(`
          CREATE TABLE admin (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE TABLE sessions (
            token_hash TEXT PRIMARY KEY,
            admin_id INTEGER NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
          );
          CREATE INDEX sessions_expiry ON sessions(expires_at);
          CREATE TABLE login_limits (
            key TEXT PRIMARY KEY,
            attempts INTEGER NOT NULL,
            resets_at INTEGER NOT NULL
          );
          INSERT INTO migrations(version) VALUES (1);
        `);
      }
    })();
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export type Db = ReturnType<typeof openDatabase>;
