import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readConfig } from "./config.js";
import { openDatabase, type Db } from "./database.js";

/**
 * Writes `backups/<timestamp>/` containing `gdg.sqlite` (SQLite online backup,
 * safe while the API is running) and a copy of `uploads/`. The database is
 * copied first so every image it references is already on disk.
 */
export async function backupData(db: Db, dataDir: string, stamp = new Date().toISOString().replaceAll(":", "-")) {
  const target = join(dataDir, "backups", stamp);
  await mkdir(target, { recursive: true, mode: 0o700 });
  await db.backup(join(target, "gdg.sqlite"));
  await cp(join(dataDir, "uploads"), join(target, "uploads"), { recursive: true, errorOnExist: true, force: false });
  return target;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const config = readConfig();
  const db = openDatabase(config.dataDir);
  try {
    console.log(`Backup written: ${await backupData(db, config.dataDir)}`);
  } finally {
    db.close();
  }
}
