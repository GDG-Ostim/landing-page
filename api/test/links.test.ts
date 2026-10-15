import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl } from "../src/links.js";
import { adminClient, fixture, origin } from "./fixture.js";

type Link = { id: number; title: string; url: string; icon: string; note: string; position?: number };
const sample = { title: "Discord", url: "https://discord.gg/example", icon: "users", note: "Sohbet kanalı" };

test("the previous /links cards are seeded and readable without logging in", async t => {
  const f = await fixture(t);
  const response = await f.call("/api/links");
  assert.equal(response.status, 200);
  const { links } = await response.json() as { links: Link[] };
  assert.deepEqual(links.map(link => [link.title, link.icon]), [
    ["Bize katılmayı unutmayın!", "users"],
    ["GDG on Campus Topluluğu I", "whatsapp"],
    ["GDG on Campus Topluluğu II", "whatsapp"],
    ["Web sitemiz", "world"],
  ]);
  assert.equal(links[3].url, "/");
  assert.equal("position" in links[0], false);
});

test("visitors cannot create, edit, reorder or delete links", async t => {
  const f = await fixture(t);
  const headers = { Origin: origin, "Content-Type": "application/json" };
  for (const [method, path] of [["POST", "/api/admin/links"], ["PUT", "/api/admin/links/1"], ["DELETE", "/api/admin/links/1"], ["POST", "/api/admin/links/1/move"]]) {
    assert.equal((await f.call(path, { method, headers, body: JSON.stringify(sample) })).status, 401);
  }
  assert.equal((await f.call("/api/links", { method: "POST", headers, body: "{}" })).status, 404);
  assert.equal(((await (await f.call("/api/links")).json()) as { links: Link[] }).links.length, 4);
});

test("an admin adds, edits, moves and deletes links; the public list follows", async t => {
  const a = await adminClient(t);
  const created = await a.send("POST", "/api/admin/links", sample);
  assert.equal(created.status, 201);
  const { link } = await created.json() as { link: Link };
  assert.equal(link.position, 4);

  const edited = await a.send("PUT", `/api/admin/links/${link.id}`, { ...sample, title: "  Discord sunucumuz  ", note: "" });
  assert.equal(((await edited.json()) as { link: Link }).link.title, "Discord sunucumuz");

  await a.send("POST", `/api/admin/links/${link.id}/move`, { direction: "up" });
  let titles = ((await (await a.call("/api/links")).json()) as { links: Link[] }).links.map(item => item.title);
  assert.deepEqual(titles.slice(3), ["Discord sunucumuz", "Web sitemiz"]);
  // Moving the first card up is a no-op, not an error.
  const first = ((await (await a.send("GET", "/api/admin/links")).json()) as { links: Link[] }).links[0];
  assert.equal((await a.send("POST", `/api/admin/links/${first.id}/move`, { direction: "up" })).status, 200);

  assert.equal((await a.send("DELETE", `/api/admin/links/${first.id}`)).status, 200);
  const remaining = ((await (await a.send("GET", "/api/admin/links")).json()) as { links: Link[] }).links;
  assert.deepEqual(remaining.map(item => item.position), [0, 1, 2, 3]);
  titles = remaining.map(item => item.title);
  assert.equal(titles.includes("Bize katılmayı unutmayın!"), false);
  assert.equal((await a.send("DELETE", `/api/admin/links/${first.id}`)).status, 404);
});

test("links survive a restart", async t => {
  const a = await adminClient(t);
  await a.send("POST", "/api/admin/links", sample);
  await a.restart();
  const titles = ((await (await a.call("/api/links")).json()) as { links: Link[] }).links.map(item => item.title);
  assert.equal(titles.at(-1), "Discord");
  assert.equal(titles.length, 5);
});

test("invalid link input is rejected with a readable message", async t => {
  const a = await adminClient(t);
  for (const body of [
    { ...sample, title: "" }, { ...sample, title: "x".repeat(81) }, { ...sample, icon: "rocket" }, { ...sample, note: "x".repeat(121) },
    { ...sample, url: "javascript:alert(1)" }, { ...sample, url: "//evil.example" }, { ...sample, url: "" },
  ]) {
    const response = await a.send("POST", "/api/admin/links", body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(typeof ((await response.json()) as { error: string }).error, "string");
  }
  assert.equal((await a.send("POST", "/api/admin/links/1/move", { direction: "sideways" })).status, 400);
  assert.equal((await a.send("PUT", "/api/admin/links/abc", sample)).status, 404);
});

test("address normalisation allows web, e-mail and same-site paths only", () => {
  assert.equal(normalizeUrl("https://instagram.com/gdgostimtech"), "https://instagram.com/gdgostimtech");
  assert.equal(normalizeUrl(" gdgostimtech@outlook.com "), "mailto:gdgostimtech@outlook.com");
  assert.equal(normalizeUrl("mailto:gdgostimtech@outlook.com"), "mailto:gdgostimtech@outlook.com");
  assert.equal(normalizeUrl("/links"), "/links");
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "ftp://example.com", "https://localhost", "//x.com", "http://a b.com", "mailto:nobody", 42]) {
    assert.equal(normalizeUrl(bad), null, String(bad));
  }
});
