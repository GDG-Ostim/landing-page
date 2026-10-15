import { Router } from "express";
import type { Db } from "./database.js";
import { EMAIL } from "./links.js";

export type Social = { instagram: string; linkedin: string; email: string };
const FIELDS = ["instagram", "linkedin", "email"] as const;

/** A profile URL on `host` (or a subdomain). Missing https:// is added; "@name" means host/name. */
export function profileUrl(value: unknown, host: string) {
  if (typeof value !== "string") return null;
  let text = value.trim();
  if (!text || text.length > 300 || /\s/.test(text)) return null;
  if (/^@[\w.]{1,60}$/.test(text)) text = `${host}/${text.slice(1)}`;
  if (!/^[a-z][a-z\d+.-]*:/i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    const ownHost = url.hostname === host || url.hostname.endsWith(`.${host}`);
    if (!["https:", "http:"].includes(url.protocol) || !ownHost || url.username || url.password || url.pathname === "/") return null;
    url.protocol = "https:";
    return url.href;
  } catch { return null; }
}

export function readSocial(db: Db): Social {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'social.%'").all() as { key: string; value: string }[];
  const values = Object.fromEntries(rows.map(row => [row.key.slice("social.".length), row.value]));
  return { instagram: values.instagram ?? "", linkedin: values.linkedin ?? "", email: values.email ?? "" };
}

export function publicSocial(db: Db) {
  const router = Router();
  router.get("/api/social", (_req, res) => { res.json({ social: readSocial(db) }); });
  return router;
}

/** Mounted below the /api/admin session guard. */
export function adminSocial(db: Db) {
  const router = Router();
  router.get("/social", (_req, res) => { res.json({ social: readSocial(db) }); });
  router.put("/social", (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().replace(/^mailto:/i, "") : "";
    const value: Social = {
      instagram: profileUrl(body.instagram, "instagram.com") ?? "",
      linkedin: profileUrl(body.linkedin, "linkedin.com") ?? "",
      email: EMAIL.test(email) && email.length <= 254 ? email : "",
    };
    const errors: Partial<Record<keyof Social, string>> = {};
    if (!value.instagram) errors.instagram = "instagram.com üzerinde bir profil adresi gir.";
    if (!value.linkedin) errors.linkedin = "linkedin.com üzerinde bir sayfa adresi gir.";
    if (!value.email) errors.email = "Geçerli bir e-posta adresi gir (örn. ad@alanadi.com).";
    if (Object.keys(errors).length) {
      res.status(400).json({ error: "Bazı alanları kontrol et.", errors });
      return;
    }
    const save = db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);
    db.transaction(() => FIELDS.forEach(field => save.run(`social.${field}`, value[field], Date.now())))();
    res.json({ social: readSocial(db) });
  });
  return router;
}
