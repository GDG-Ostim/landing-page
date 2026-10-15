import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import type { Db } from "./database.js";

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, SCRYPT, (error, key) => error ? reject(error) : resolve(key));
});

export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128) throw new Error("Password must contain 12–128 characters.");
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

// A valid fixed-cost dummy hash prevents missing-account timing shortcuts.
export const DUMMY_HASH = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;
export async function verifyPassword(password: string, encoded: string) {
  const [version, salt, hash] = encoded.split(":");
  if (version !== "scrypt-v1" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? "")) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, "hex"));
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionToken(cookie: string | undefined, name: string) {
  const value = cookie?.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

export async function setAdmin(db: Db, username: string, password: string) {
  if (!/^[a-z0-9_.-]{3,64}$/.test(username)) throw new Error("Username must be 3–64 lowercase letters, digits, dots, hyphens or underscores.");
  const hash = await hashPassword(password);
  db.transaction(() => {
    db.prepare(`INSERT INTO admin (id, username, password_hash, updated_at) VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET username=excluded.username, password_hash=excluded.password_hash, updated_at=excluded.updated_at`).run(username, hash, Date.now());
    db.prepare("DELETE FROM sessions").run();
    db.prepare("DELETE FROM login_limits").run();
  })();
}
