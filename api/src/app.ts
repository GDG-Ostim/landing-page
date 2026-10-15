import express, { type ErrorRequestHandler } from "express";
import { randomBytes } from "node:crypto";
import type { Config } from "./config.js";
import type { Db } from "./database.js";
import { DUMMY_HASH, sessionToken, tokenHash, verifyPassword } from "./auth.js";
import { adminLinks, publicLinks } from "./links.js";

const SESSION_MS = 8 * 60 * 60 * 1000;
const LIMIT_MS = 15 * 60 * 1000;
type Admin = { id: number; username: string; password_hash: string };

export function createApp(db: Db, config: Config, now = Date.now) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy ? "loopback" : false);
  const cookieName = config.production ? "__Host-gdg_session" : "gdg_session";
  const cookieOptions = { httpOnly: true, secure: config.production, sameSite: "strict" as const, path: "/" };

  app.use((_req, res, next) => {
    res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    next();
  });
  // All mutations require the exact browser origin, including login and logout.
  // This middleware also applies to future content-management routes.
  app.use((req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("Origin") !== config.origin) {
      res.status(403).json({ error: "İstek kaynağına izin verilmiyor." });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "8kb" }));
  app.get("/api/health", (_req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ ok: true });
  });
  // Public, read-only content for the website.
  app.use(publicLinks(db));

  const consumeAttempt = db.transaction((ip: string) => {
    const time = now();
    db.prepare("DELETE FROM login_limits WHERE resets_at <= ?").run(time);
    const keys = [[`ip:${tokenHash(ip)}`, 10], ["account", 50]] as const;
    for (const [key, limit] of keys) {
      const row = db.prepare("SELECT attempts, resets_at FROM login_limits WHERE key = ?").get(key) as { attempts: number; resets_at: number } | undefined;
      if (row && row.attempts >= limit) return Math.max(1, Math.ceil((row.resets_at - time) / 1000));
    }
    for (const [key] of keys) {
      db.prepare(`INSERT INTO login_limits (key, attempts, resets_at) VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1`).run(key, time + LIMIT_MS);
    }
    return 0;
  });

  app.post("/api/auth/login", async (req, res) => {
    const retry = consumeAttempt(req.ip ?? "unknown");
    if (retry) {
      res.set("Retry-After", String(retry)).status(429).json({ error: "Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin." });
      return;
    }
    const { username, password } = req.body ?? {};
    if (typeof username !== "string" || typeof password !== "string" || username.length > 64 || password.length > 128 || !password) {
      res.status(400).json({ error: "Geçerli kullanıcı adı ve şifre girin." });
      return;
    }
    const admin = db.prepare("SELECT id, username, password_hash FROM admin WHERE id = 1").get() as Admin | undefined;
    const valid = await verifyPassword(password, admin?.password_hash ?? DUMMY_HASH);
    // Recheck after the asynchronous hash: password resets invalidate in-flight logins too.
    const current = db.prepare("SELECT password_hash FROM admin WHERE id = 1").get() as { password_hash: string } | undefined;
    if (!admin || !valid || username !== admin.username || current?.password_hash !== admin.password_hash) {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı." });
      return;
    }
    const token = randomBytes(32).toString("hex");
    const oldToken = sessionToken(req.get("Cookie"), cookieName);
    db.transaction(() => {
      db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
      if (oldToken) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(oldToken));
      db.prepare("INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, 1, ?)").run(tokenHash(token), now() + SESSION_MS);
    })();
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: SESSION_MS });
    res.json({ admin: { username: admin.username } });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = sessionToken(req.get("Cookie"), cookieName);
    if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
    res.clearCookie(cookieName, cookieOptions).status(204).end();
  });

  // Mount future private CRUD endpoints below this guard.
  app.use("/api/admin", (req, res, next) => {
    const token = sessionToken(req.get("Cookie"), cookieName);
    const session = token ? db.prepare(`SELECT admin.username FROM sessions
      JOIN admin ON admin.id = sessions.admin_id WHERE token_hash = ? AND expires_at > ?`).get(tokenHash(token), now()) as { username: string } | undefined : undefined;
    if (!session) {
      res.clearCookie(cookieName, cookieOptions).status(401).json({ error: "Lütfen giriş yapın." });
      return;
    }
    res.locals.admin = session;
    next();
  });
  app.get("/api/admin/session", (_req, res) => res.json({ admin: res.locals.admin }));
  app.use("/api/admin", adminLinks(db));
  app.use((_req, res) => res.status(404).json({ error: "Bulunamadı." }));
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "İstek çok büyük." });
    } else if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ error: "Geçersiz JSON." });
    } else {
      // Never log request bodies, passwords, session cookies or database bindings.
      console.error("API request failed:", error instanceof Error ? error.name : "UnknownError");
      res.status(500).json({ error: "İşlem tamamlanamadı." });
    }
  };
  app.use(errorHandler);
  return app;
}
