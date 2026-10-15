import { Router } from "express";
import type { Db } from "./database.js";
import { ordering } from "./ordering.js";

// Must match the icon set in app/src/lib/social.tsx.
export const LINK_ICONS = ["users", "whatsapp", "instagram", "linkedin", "mail", "world", "github", "youtube", "calendar"] as const;
type Link = { id: number; title: string; url: string; icon: string; note: string; position: number };
const COLUMNS = "id, title, url, icon, note, position";
export const EMAIL = /^[^\s@<>()":/]+@[^\s@<>()":/]+\.[^\s@<>()":/]+$/;

/** Accepts http(s) and mailto links, or a same-site path such as "/". A bare e-mail becomes mailto:. */
export function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > 500 || /[\s\\]/.test(text)) return null;
  if (text.startsWith("/")) return text.startsWith("//") ? null : text;
  if (EMAIL.test(text)) return `mailto:${text}`;
  try {
    const url = new URL(text);
    if (url.protocol === "mailto:") return EMAIL.test(decodeURIComponent(url.pathname)) ? url.href : null;
    return ["https:", "http:"].includes(url.protocol) && url.hostname.includes(".") ? url.href : null;
  } catch { return null; }
}

function parseLink(body: unknown): { value?: Omit<Link, "id" | "position">; error?: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const note = typeof input.note === "string" ? input.note.trim() : "";
  const url = normalizeUrl(input.url);
  if (!title || title.length > 80) return { error: "Başlık 1–80 karakter olmalı." };
  if (!url) return { error: "Geçerli bir adres gir: https://…, e-posta ya da / ile başlayan site içi yol." };
  if (typeof input.icon !== "string" || !(LINK_ICONS as readonly string[]).includes(input.icon)) return { error: "Listeden bir ikon seç." };
  if (note.length > 120) return { error: "Kısa açıklama en fazla 120 karakter olabilir." };
  return { value: { title, url, icon: input.icon, note } };
}

const list = (db: Db) => db.prepare(`SELECT ${COLUMNS} FROM links ORDER BY position, id`).all() as Link[];

export function publicLinks(db: Db) {
  const router = Router();
  router.get("/api/links", (_req, res) => {
    res.json({ links: list(db).map(({ position: _position, ...link }) => link) });
  });
  return router;
}

/** Mounted below the /api/admin session guard. */
export function adminLinks(db: Db) {
  const router = Router();
  const order = ordering(db, "links");
  const find = (id: string) => /^\d{1,9}$/.test(id) ? db.prepare(`SELECT ${COLUMNS} FROM links WHERE id = ?`).get(Number(id)) as Link | undefined : undefined;
  const notFound = { error: "Link bulunamadı." };

  router.get("/links", (_req, res) => { res.json({ links: list(db) }); });

  router.post("/links", (req, res) => {
    const { value, error } = parseLink(req.body);
    if (!value) { res.status(400).json({ error }); return; }
    if ((db.prepare("SELECT count(*) AS total FROM links").get() as { total: number }).total >= 50) {
      res.status(400).json({ error: "En fazla 50 link eklenebilir." });
      return;
    }
    const id = db.transaction(() => db.prepare("INSERT INTO links (title, url, icon, note, position, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(value.title, value.url, value.icon, value.note, order.next(), Date.now()).lastInsertRowid)();
    res.status(201).json({ link: find(String(id)), links: list(db) });
  });

  router.put("/links/:id", (req, res) => {
    const link = find(req.params.id);
    if (!link) { res.status(404).json(notFound); return; }
    const { value, error } = parseLink(req.body);
    if (!value) { res.status(400).json({ error }); return; }
    db.prepare("UPDATE links SET title = ?, url = ?, icon = ?, note = ?, updated_at = ? WHERE id = ?")
      .run(value.title, value.url, value.icon, value.note, Date.now(), link.id);
    res.json({ link: find(req.params.id), links: list(db) });
  });

  router.delete("/links/:id", (req, res) => {
    const link = find(req.params.id);
    if (!link) { res.status(404).json(notFound); return; }
    db.transaction(() => { db.prepare("DELETE FROM links WHERE id = ?").run(link.id); order.renumber(); })();
    res.json({ links: list(db) });
  });

  router.post("/links/:id/move", (req, res) => {
    const direction = req.body?.direction;
    if (direction !== "up" && direction !== "down") { res.status(400).json({ error: "Yön up veya down olmalı." }); return; }
    const link = find(req.params.id);
    if (!link) { res.status(404).json(notFound); return; }
    order.move(link.id, direction);
    res.json({ links: list(db) });
  });
  return router;
}
