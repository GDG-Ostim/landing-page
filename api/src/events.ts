import { Router } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./database.js";
import { normalizeUrl } from "./links.js";
import { ordering } from "./ordering.js";
import { UPLOAD_URL, pruneUploads } from "./uploads.js";

type Event = { id: number; title: string; startsOn: string; endsOn: string | null; kind: string; place: string; cover: string; url: string; position: number };
const COLUMNS = "id, title, starts_on AS startsOn, ends_on AS endsOn, kind, place, cover, url, position";
// Covers that ship with the website (the seeded events); everything else is an upload.
const BUILT_IN_COVERS = ["/assets/event-intro.webp", "/assets/event-hackathon.webp", "/assets/event-summit.webp"];

/** A real calendar date written as YYYY-MM-DD. */
export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) && value >= "2000-01-01" && value <= "2100-12-31";
}

function parseEvent(body: unknown, dataDir: string): { value?: Omit<Event, "id" | "position">; error?: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const text = (key: string) => typeof input[key] === "string" ? (input[key] as string).trim() : "";
  const [title, kind, place, cover] = [text("title"), text("kind"), text("place"), text("cover")];
  const endsOn = input.endsOn === null || input.endsOn === "" || input.endsOn === undefined ? null : input.endsOn;
  // A link typed without a scheme ("gdg.community.dev/…") gets https:// added.
  const link = text("url");
  const url = link ? normalizeUrl(/^[a-z][a-z\d+.-]*:|^\//i.test(link) ? link : `https://${link}`) : "";
  if (!title || title.length > 80) return { error: "Başlık 1–80 karakter olmalı." };
  if (!isDate(input.startsOn)) return { error: "Geçerli bir başlangıç tarihi seç." };
  if (endsOn !== null && (!isDate(endsOn) || endsOn < input.startsOn)) return { error: "Bitiş tarihi başlangıçtan önce olamaz." };
  if (!kind || kind.length > 40) return { error: "Tür 1–40 karakter olmalı (örn. Workshop)." };
  if (!place || place.length > 80) return { error: "Yer 1–80 karakter olmalı (mekân veya “Çevrim içi”)." };
  const uploaded = UPLOAD_URL.test(cover) && existsSync(join(dataDir, "uploads", cover.slice("/api/uploads/".length)));
  if (!uploaded && !BUILT_IN_COVERS.includes(cover)) return { error: "Bir kapak görseli yükle." };
  if (url === null) return { error: "Bağlantı https://… ile başlamalı." };
  return { value: { title, startsOn: input.startsOn, endsOn, kind, place, cover, url } };
}

const list = (db: Db) => db.prepare(`SELECT ${COLUMNS} FROM events ORDER BY position, id`).all() as Event[];

export function publicEvents(db: Db) {
  const router = Router();
  router.get("/api/events", (_req, res) => {
    res.json({ events: list(db).map(({ position: _position, ...event }) => event) });
  });
  return router;
}

/** Mounted below the /api/admin session guard. */
export function adminEvents(db: Db, dataDir: string) {
  const router = Router();
  const order = ordering(db, "events");
  const find = (id: string) => /^\d{1,9}$/.test(id) ? db.prepare(`SELECT ${COLUMNS} FROM events WHERE id = ?`).get(Number(id)) as Event | undefined : undefined;
  const notFound = { error: "Etkinlik bulunamadı." };
  // Replaced or deleted covers go at once; unsaved uploads get a day's grace.
  const tidy = (dropped?: string) => {
    if (dropped && UPLOAD_URL.test(dropped)) pruneUploads(db, dataDir, 0, Date.now(), dropped);
    pruneUploads(db, dataDir, 24 * 60 * 60 * 1000);
  };

  router.get("/events", (_req, res) => { res.json({ events: list(db) }); });

  router.post("/events", (req, res) => {
    const { value, error } = parseEvent(req.body, dataDir);
    if (!value) { res.status(400).json({ error }); return; }
    if ((db.prepare("SELECT count(*) AS total FROM events").get() as { total: number }).total >= 50) {
      res.status(400).json({ error: "En fazla 50 etkinlik eklenebilir." });
      return;
    }
    const id = db.prepare(`INSERT INTO events (title, starts_on, ends_on, kind, place, cover, url, position, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(value.title, value.startsOn, value.endsOn, value.kind, value.place, value.cover, value.url, order.next(), Date.now()).lastInsertRowid;
    tidy();
    res.status(201).json({ event: find(String(id)), events: list(db) });
  });

  router.put("/events/:id", (req, res) => {
    const event = find(req.params.id);
    if (!event) { res.status(404).json(notFound); return; }
    const { value, error } = parseEvent(req.body, dataDir);
    if (!value) { res.status(400).json({ error }); return; }
    db.prepare(`UPDATE events SET title = ?, starts_on = ?, ends_on = ?, kind = ?, place = ?, cover = ?, url = ?, updated_at = ? WHERE id = ?`)
      .run(value.title, value.startsOn, value.endsOn, value.kind, value.place, value.cover, value.url, Date.now(), event.id);
    tidy(event.cover !== value.cover ? event.cover : undefined);
    res.json({ event: find(req.params.id), events: list(db) });
  });

  router.delete("/events/:id", (req, res) => {
    const event = find(req.params.id);
    if (!event) { res.status(404).json(notFound); return; }
    db.transaction(() => { db.prepare("DELETE FROM events WHERE id = ?").run(event.id); order.renumber(); })();
    tidy(event.cover);
    res.json({ events: list(db) });
  });

  router.post("/events/:id/move", (req, res) => {
    const direction = req.body?.direction;
    if (direction !== "up" && direction !== "down") { res.status(400).json({ error: "Yön up veya down olmalı." }); return; }
    const event = find(req.params.id);
    if (!event) { res.status(404).json(notFound); return; }
    order.move(event.id, direction);
    res.json({ events: list(db) });
  });
  return router;
}
