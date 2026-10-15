import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import { createApp } from "../src/app.js";
import { openDatabase } from "../src/database.js";
import { setAdmin } from "../src/auth.js";
import type { Config } from "../src/config.js";

export const password = "test-only-password-123";
export const origin = "http://127.0.0.1:5173";

export async function fixture(t: TestContext, production = false) {
  const directory = await mkdtemp(join(tmpdir(), "gdg-api-test-"));
  let db = openDatabase(directory);
  let time = Date.now();
  const config: Config = { dataDir: directory, origin: production ? "https://gdg.example" : origin, port: 3001, production, trustProxy: false };
  await setAdmin(db, "admin", password);
  const listen = async () => {
    const server = createApp(db, config, () => time).listen(0, "127.0.0.1");
    await once(server, "listening");
    return server;
  };
  let server = await listen();
  const closeServer = () => new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
  const call = (path: string, options: RequestInit = {}) => {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    return fetch(`http://127.0.0.1:${address.port}${path}`, options);
  };
  const login = (body: object = { username: "admin", password }, cookie?: string) => call("/api/auth/login", {
    method: "POST", headers: { Origin: config.origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body),
  });
  t.after(async () => {
    await closeServer();
    db.close();
    const target = resolve(directory);
    assert.ok(target.startsWith(resolve(tmpdir()) + "/gdg-api-test-") || target.startsWith(resolve(tmpdir()) + "\\gdg-api-test-"));
    await rm(target, { recursive: true, force: true });
  });
  return {
    directory, config, call, login,
    get db() { return db; },
    advance(ms: number) { time += ms; },
    async restart() { await closeServer(); db.close(); db = openDatabase(directory); server = await listen(); },
  };
}

export function cookie(response: Response) {
  const value = response.headers.get("set-cookie");
  assert.ok(value);
  return value.split(";")[0];
}

/** Logged-in JSON caller for /api/admin routes. */
export async function adminClient(t: TestContext) {
  const f = await fixture(t);
  const auth = cookie(await f.login());
  const send = (method: string, path: string, body?: object) => f.call(path, {
    method, headers: { Origin: origin, Cookie: auth, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { ...f, auth, send, get db() { return f.db; } };
}
