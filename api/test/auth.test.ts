import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { hashPassword, setAdmin, tokenHash, verifyPassword } from "../src/auth.js";
import { readConfig } from "../src/config.js";
import { cookie, fixture, origin, password } from "./fixture.js";
import { backupData } from "../src/backup.js";

test("password hashes are salted, verify correctly and reject invalid setup input", async () => {
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong", first), false);
  assert.equal(await verifyPassword(password, "malformed"), false);
  await assert.rejects(hashPassword("short"));
});

test("private endpoints reject anonymous and forged sessions; login errors reveal no account", async t => {
  const f = await fixture(t);
  for (const path of ["/api/admin/session", "/api/admin/future-content"]) {
    assert.equal((await f.call(path)).status, 401);
    assert.equal((await f.call(path, { headers: { Cookie: `gdg_session=${"a".repeat(64)}` } })).status, 401);
  }
  const wrongUser = await f.login({ username: "unknown", password });
  const wrongPassword = await f.login({ username: "admin", password: "wrong" });
  assert.equal(wrongUser.status, 401);
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(await wrongUser.json(), await wrongPassword.json());
  assert.equal(wrongUser.headers.get("set-cookie"), null);
});

test("login persists only the token hash, rotates sessions, and logout revokes them", async t => {
  const f = await fixture(t);
  const login = await f.login();
  assert.equal(login.status, 200);
  const first = cookie(login);
  assert.match(login.headers.get("set-cookie")!, /HttpOnly/);
  assert.match(login.headers.get("set-cookie")!, /SameSite=Strict/);
  assert.match(login.headers.get("set-cookie")!, /Max-Age=28800/);
  assert.equal(login.headers.get("cache-control"), "no-store");
  const token = first.split("=")[1];
  assert.deepEqual(f.db.prepare("SELECT token_hash FROM sessions").get(), { token_hash: tokenHash(token) });
  const session = await f.call("/api/admin/session", { headers: { Cookie: first } });
  assert.deepEqual(await session.json(), { admin: { username: "admin" } });
  const second = cookie(await f.login(undefined, first));
  assert.notEqual(first, second);
  assert.equal((await f.call("/api/admin/session", { headers: { Cookie: first } })).status, 401);
  const logout = await f.call("/api/auth/logout", { method: "POST", headers: { Origin: origin, Cookie: second } });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get("set-cookie")!, /Expires=Thu, 01 Jan 1970/);
  assert.equal((await f.call("/api/admin/session", { headers: { Cookie: second } })).status, 401);
});

test("cross-origin and originless mutations are rejected, including logout", async t => {
  const f = await fixture(t);
  const auth = cookie(await f.login());
  for (const source of [undefined, "https://attacker.example", "null", `${origin}.attacker.example`]) {
    for (const path of ["/api/auth/login", "/api/auth/logout", "/api/admin/future-content"]) {
      const response = await f.call(path, { method: "POST", headers: { Cookie: auth, ...(source ? { Origin: source } : {}) } });
      assert.equal(response.status, 403);
    }
  }
  assert.equal((await f.call("/api/admin/session", { headers: { Cookie: auth } })).status, 200);
});

test("sessions and migrations survive reopen; expired sessions stop working", async t => {
  const f = await fixture(t);
  const auth = cookie(await f.login());
  await f.restart();
  assert.equal((await f.call("/api/admin/session", { headers: { Cookie: auth } })).status, 200);
  assert.deepEqual(f.db.prepare("SELECT version FROM migrations ORDER BY version").all(), [{ version: 1 }, { version: 2 }, { version: 3 }]);
  f.advance(8 * 60 * 60 * 1000 + 1);
  assert.equal((await f.call("/api/admin/session", { headers: { Cookie: auth } })).status, 401);
});

test("administrator replacement revokes existing sessions and retains exactly one account", async t => {
  const f = await fixture(t);
  const auth = cookie(await f.login());
  await assert.rejects(setAdmin(f.db, "invalid user", password));
  await setAdmin(f.db, "replacement", "replacement-password-456");
  assert.equal((await f.call("/api/admin/session", { headers: { Cookie: auth } })).status, 401);
  assert.equal((await f.login()).status, 401);
  assert.equal((await f.login({ username: "replacement", password: "replacement-password-456" })).status, 200);
  assert.deepEqual(f.db.prepare("SELECT username FROM admin").all(), [{ username: "replacement" }]);
});

test("login rate limits survive restart and ignore spoofed proxy headers", async t => {
  const f = await fixture(t);
  for (let index = 0; index < 10; index++) {
    // Invalid bodies count too, without spending time on ten scrypt operations.
    assert.equal((await f.call("/api/auth/login", {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "X-Forwarded-For": `192.0.2.${index}` }, body: "{}",
    })).status, 400);
  }
  await f.restart();
  const blocked = await f.login();
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  f.advance(15 * 60 * 1000 + 1);
  assert.equal((await f.login()).status, 200);
});

test("production cookies have Secure and __Host scope; bad request bodies stay JSON errors", async t => {
  const f = await fixture(t, true);
  const login = await f.login();
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie")!, /^__Host-gdg_session=/);
  assert.match(login.headers.get("set-cookie")!, /; Secure/);
  assert.match(login.headers.get("set-cookie")!, /Path=\//);
  assert.doesNotMatch(login.headers.get("set-cookie")!, /Domain=/);
  for (const [body, status] of [["{", 400], [JSON.stringify({ password: "a".repeat(9000) }), 413]] as const) {
    const response = await f.call("/api/auth/login", { method: "POST", headers: { Origin: f.config.origin, "Content-Type": "application/json" }, body });
    assert.equal(response.status, status);
    assert.match(response.headers.get("content-type")!, /application\/json/);
    assert.equal(typeof (await response.json()).error, "string");
  }
});

test("online backup holds the WAL-committed database and the uploaded images together", async t => {
  const f = await fixture(t);
  await f.login();
  await writeFile(join(f.directory, "uploads", "cover.webp"), "image-bytes");
  const target = await backupData(f.db, f.directory, "test-stamp");
  assert.equal(target, join(f.directory, "backups", "test-stamp"));
  assert.equal(await readFile(join(target, "uploads", "cover.webp"), "utf8"), "image-bytes");
  await assert.rejects(backupData(f.db, f.directory, "test-stamp"));
  const backup = new Database(join(target, "gdg.sqlite"), { readonly: true });
  try {
    assert.deepEqual(backup.prepare("SELECT username FROM admin").get(), { username: "admin" });
    assert.deepEqual(backup.prepare("SELECT count(*) AS total FROM sessions").get(), { total: 1 });
    assert.deepEqual(backup.pragma("integrity_check"), [{ integrity_check: "ok" }]);
  } finally { backup.close(); }
});

test("configuration fails closed in production and uses a working-directory-independent data path", () => {
  assert.equal(readConfig({}).dataDir, fileURLToPath(new URL("../../.data", import.meta.url)));
  assert.throws(() => readConfig({ NODE_ENV: "production" }));
  assert.throws(() => readConfig({ NODE_ENV: "production", APP_ORIGIN: "http://example.com", DATA_DIR: tmpdir() }));
  assert.throws(() => readConfig({ NODE_ENV: "production", APP_ORIGIN: "https://example.com", DATA_DIR: "relative" }));
  assert.throws(() => readConfig({ APP_ORIGIN: "https://example.com/path" }));
  assert.throws(() => readConfig({ NODE_ENV: "prod" }));
  assert.throws(() => readConfig({ PORT: "0" }));
  assert.throws(() => readConfig({ TRUST_PROXY: "anything" }));
  assert.equal(readConfig({ NODE_ENV: "production", APP_ORIGIN: "https://example.com", DATA_DIR: tmpdir() }).production, true);
});
