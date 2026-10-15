import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { readConfig } from "./config.js";
import { openDatabase } from "./database.js";
import { setAdmin } from "./auth.js";

if (!process.stdin.isTTY) throw new Error("Run admin:setup in an interactive terminal. Passwords are never accepted as command arguments.");
let hidden = false;
const output = new Writable({ write(chunk, _encoding, callback) { if (!hidden) process.stdout.write(chunk); callback(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
let db: ReturnType<typeof openDatabase> | undefined;
try {
  db = openDatabase(readConfig().dataDir);
  const exists = db.prepare("SELECT id FROM admin WHERE id = 1").get();
  if (exists && (await rl.question("Replace the existing admin and revoke all sessions? Type yes: ")) !== "yes") {
    console.log("No changes made.");
  } else {
    const username = (await rl.question("Username: ")).trim().toLowerCase();
    process.stdout.write("Password (12–128 characters, hidden): ");
    hidden = true;
    const password = await rl.question("");
    process.stdout.write("\nRepeat password: ");
    const repeated = await rl.question("");
    hidden = false;
    process.stdout.write("\n");
    if (password !== repeated) throw new Error("Passwords do not match.");
    await setAdmin(db, username, password);
    console.log("Admin saved. All previous sessions revoked.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Admin setup failed.");
  process.exitCode = 1;
} finally {
  rl.close();
  db?.close();
}
