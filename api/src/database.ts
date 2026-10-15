import Database from "better-sqlite3";
import { chmodSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Migration = (db: Database.Database) => void;

// Append only: each entry runs once, in order, inside the startup transaction.
const migrations: Migration[] = [
  db => db.exec(`
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
  `),
  db => {
    db.exec(`
      CREATE TABLE links (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        position INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX links_position ON links(position);
    `);
    // The cards /links showed before the panel existed.
    const insert = db.prepare("INSERT INTO links (title, url, icon, note, position, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
    [
      ["Bize katılmayı unutmayın!", "https://gdg.community.dev/gdg-on-campus-ostim-teknik-university-ankara-turkiye", "users", "GDG Community'de üye ol, etkinlik duyurularını al"],
      ["GDG on Campus Topluluğu I", "https://chat.whatsapp.com/H9macgZPZxFJUVZH4Sia1V", "whatsapp", "WhatsApp topluluğu · ücretsiz"],
      ["GDG on Campus Topluluğu II", "https://chat.whatsapp.com/DyEscGIRnLaGnVNP2UgeiA", "whatsapp", "WhatsApp topluluğu · ücretsiz"],
      ["Web sitemiz", "/", "world", "gdgostimtech.com"],
    ].forEach((row, index) => insert.run(...row, index, Date.now()));
  },
  db => {
    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    // The social addresses the site hard-coded before the panel existed.
    const insert = db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)");
    [
      ["social.instagram", "https://instagram.com/gdgostimtech"],
      ["social.linkedin", "https://www.linkedin.com/company/ostimtech-gdsc/"],
      ["social.email", "gdgostimtech@outlook.com"],
    ].forEach(([key, value]) => insert.run(key, value, Date.now()));
  },
];

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
      const applied = new Set((db.prepare("SELECT version FROM migrations").all() as { version: number }[]).map(row => row.version));
      migrations.forEach((migrate, index) => {
        if (applied.has(index + 1)) return;
        migrate(db);
        db.prepare("INSERT INTO migrations(version) VALUES (?)").run(index + 1);
      });
    })();
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export type Db = ReturnType<typeof openDatabase>;
