import express, { Router } from "express";
import { randomBytes } from "node:crypto";
import { readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./database.js";

export const MAX_UPLOAD = 5 * 1024 * 1024;
const NAME = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
export const UPLOAD_URL = /^\/api\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/;
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

/** Decides the type from the file's own bytes, never from the client's headers or file name. */
export function sniffImage(data: Buffer): keyof typeof TYPES | null {
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (data.length > 12 && data.toString("latin1", 0, 4) === "RIFF" && data.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
}

const fileOf = (url: string) => url.slice("/api/uploads/".length);

/**
 * Deletes uploaded files no event points at. Files younger than `graceMs` are kept,
 * so an image picked in an open (not yet saved) form survives. `only` limits it to one URL.
 */
export function pruneUploads(db: Db, dataDir: string, graceMs: number, now = Date.now(), only?: string) {
  const used = new Set((db.prepare("SELECT cover FROM events").all() as { cover: string }[]).map(row => fileOf(row.cover)));
  const directory = join(dataDir, "uploads");
  for (const name of readdirSync(directory)) {
    if (!NAME.test(name) || used.has(name) || (only && name !== fileOf(only))) continue;
    const path = join(directory, name);
    if (now - statSync(path).mtimeMs >= graceMs) unlinkSync(path);
  }
}

export function publicUploads(dataDir: string) {
  const router = Router();
  router.get("/api/uploads/:name", (req, res, next) => {
    const name = req.params.name;
    if (!NAME.test(name)) { next(); return; }
    const type = TYPES[name.split(".")[1] as keyof typeof TYPES];
    // Names are random and never reused, so the files can be cached for good.
    res.set({ "Cache-Control": "public, max-age=31536000, immutable", "Content-Security-Policy": "default-src 'none'", "Content-Type": type });
    res.sendFile(name, { root: join(dataDir, "uploads"), dotfiles: "deny", headers: { "Content-Type": type } }, error => {
      if (error && !res.headersSent) { res.set("Cache-Control", "no-store"); next(); }
    });
  });
  return router;
}

/** Mounted below the /api/admin session guard. The body is the raw image. */
export function adminUploads(dataDir: string) {
  const router = Router();
  router.post("/uploads", express.raw({ type: () => true, limit: MAX_UPLOAD }), (req, res) => {
    const data = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const kind = sniffImage(data);
    if (!kind) { res.status(415).json({ error: "Yalnızca JPG, PNG veya WebP görsel yüklenebilir." }); return; }
    const name = `${randomBytes(16).toString("hex")}.${kind}`;
    writeFileSync(join(dataDir, "uploads", name), data, { mode: 0o600, flag: "wx" });
    res.status(201).json({ url: `/api/uploads/${name}` });
  });
  return router;
}
