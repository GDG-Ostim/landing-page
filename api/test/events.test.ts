import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDate } from "../src/events.js";
import { pruneUploads, sniffImage } from "../src/uploads.js";
import { adminClient, fixture, origin } from "./fixture.js";

type Event = { id: number; title: string; startsOn: string; endsOn: string | null; kind: string; place: string; cover: string; url: string; position?: number };
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), Buffer.alloc(16)]);

async function upload(a: Awaited<ReturnType<typeof adminClient>>, body: Buffer, type = "image/png") {
  return a.call("/api/admin/uploads", { method: "POST", headers: { Origin: origin, Cookie: a.auth, "Content-Type": type }, body: new Uint8Array(body) });
}
const sample = (cover: string) => ({ title: "Flutter Workshop", startsOn: "2026-11-12", endsOn: "", kind: "Workshop", place: "Çevrim içi", cover, url: "gdg.community.dev/events/1" });
const publicList = async (call: (path: string) => Promise<Response>) => ((await (await call("/api/events")).json()) as { events: Event[] }).events;

test("the three previous events are seeded with their built-in covers and are public", async t => {
  const f = await fixture(t);
  const events = await publicList(f.call);
  assert.deepEqual(events.map(event => [event.title, event.startsOn, event.endsOn, event.cover]), [
    ["Kulüp Tanıtım Günleri", "2026-10-06", "2026-10-08", "/assets/event-intro.webp"],
    ["GDG On Campus Hackathon", "2026-04-04", "2026-04-05", "/assets/event-hackathon.webp"],
    ["Engineerium '26", "2026-02-24", null, "/assets/event-summit.webp"],
  ]);
});

test("visitors cannot upload images or change events", async t => {
  const f = await fixture(t);
  const headers = { Origin: origin, "Content-Type": "application/json" };
  assert.equal((await f.call("/api/admin/uploads", { method: "POST", headers: { Origin: origin, "Content-Type": "image/png" }, body: png })).status, 401);
  for (const [method, path] of [["POST", "/api/admin/events"], ["PUT", "/api/admin/events/1"], ["DELETE", "/api/admin/events/1"], ["POST", "/api/admin/events/1/move"]]) {
    assert.equal((await f.call(path, { method, headers, body: JSON.stringify(sample("/assets/event-intro.webp")) })).status, 401);
  }
  assert.equal(readdirSync(join(f.directory, "uploads")).length, 0);
  assert.equal((await publicList(f.call)).length, 3);
});

test("uploads are checked by content, stored under a random name and served back", async t => {
  const a = await adminClient(t);
  const created = await upload(a, png, "image/jpeg");
  assert.equal(created.status, 201);
  const { url } = await created.json() as { url: string };
  assert.match(url, /^\/api\/uploads\/[a-f0-9]{32}\.png$/);
  const served = await a.call(url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.match(served.headers.get("cache-control")!, /immutable/);
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);

  const svg = await upload(a, Buffer.from("<svg onload=alert(1)>"), "image/svg+xml");
  assert.equal(svg.status, 415);
  assert.equal((await upload(a, Buffer.alloc(5 * 1024 * 1024 + 1, 0xff))).status, 413);
  assert.equal((await a.call("/api/uploads/..%2Fgdg.sqlite")).status, 404);
  assert.equal((await a.call(`/api/uploads/${"0".repeat(32)}.png`)).status, 404);
});

test("an admin adds, edits, moves and deletes events; covers are cleaned up", async t => {
  const a = await adminClient(t);
  const first = ((await (await upload(a, png)).json()) as { url: string }).url;
  const created = await a.send("POST", "/api/admin/events", sample(first));
  assert.equal(created.status, 201);
  const { event } = await created.json() as { event: Event };
  assert.deepEqual([event.position, event.endsOn, event.url], [3, null, "https://gdg.community.dev/events/1"]);

  const second = ((await (await upload(a, webp)).json()) as { url: string }).url;
  const edited = await a.send("PUT", `/api/admin/events/${event.id}`, { ...sample(second), endsOn: "2026-11-13", url: "" });
  assert.equal(edited.status, 200);
  assert.deepEqual([((await edited.json()) as { event: Event }).event.endsOn], ["2026-11-13"]);
  // The replaced cover is removed at once; the new one is kept.
  const uploads = join(a.directory, "uploads");
  assert.equal(existsSync(join(uploads, first.split("/").at(-1)!)), false);
  assert.equal(existsSync(join(uploads, second.split("/").at(-1)!)), true);

  await a.send("POST", `/api/admin/events/${event.id}/move`, { direction: "up" });
  assert.deepEqual((await publicList(a.call)).map(item => item.title).slice(2), ["Flutter Workshop", "Engineerium '26"]);

  assert.equal((await a.send("DELETE", `/api/admin/events/${event.id}`)).status, 200);
  assert.equal(existsSync(join(uploads, second.split("/").at(-1)!)), false);
  assert.deepEqual((await (await a.send("GET", "/api/admin/events")).json() as { events: Event[] }).events.map(item => item.position), [0, 1, 2]);
});

test("events and their images survive a restart", async t => {
  const a = await adminClient(t);
  const cover = ((await (await upload(a, png)).json()) as { url: string }).url;
  await a.send("POST", "/api/admin/events", sample(cover));
  await a.restart();
  assert.equal((await publicList(a.call)).at(-1)?.cover, cover);
  assert.equal((await a.call(cover)).status, 200);
});

test("invalid event input is rejected with a readable message", async t => {
  const a = await adminClient(t);
  const cover = "/assets/event-intro.webp";
  for (const body of [
    { ...sample(cover), title: "" }, { ...sample(cover), startsOn: "2026-02-30" }, { ...sample(cover), startsOn: "12.11.2026" },
    { ...sample(cover), endsOn: "2026-11-01" }, { ...sample(cover), kind: "" }, { ...sample(cover), place: "x".repeat(81) },
    { ...sample(cover), cover: "" }, { ...sample(cover), cover: "https://evil.example/x.png" }, { ...sample(cover), cover: `/api/uploads/${"a".repeat(32)}.png` },
    { ...sample(cover), url: "javascript:alert(1)" },
  ]) {
    const response = await a.send("POST", "/api/admin/events", body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(typeof ((await response.json()) as { error: string }).error, "string");
  }
});

test("unsaved uploads are pruned only after the grace period", async t => {
  const a = await adminClient(t);
  const url = ((await (await upload(a, png)).json()) as { url: string }).url;
  const path = join(a.directory, "uploads", url.split("/").at(-1)!);
  writeFileSync(join(a.directory, "uploads", "notes.txt"), "not an upload");
  pruneUploads(a.db, a.directory, 60_000);
  assert.equal(existsSync(path), true);
  const old = new Date(Date.now() - 120_000);
  utimesSync(path, old, old);
  pruneUploads(a.db, a.directory, 60_000);
  assert.equal(existsSync(path), false);
  assert.equal(existsSync(join(a.directory, "uploads", "notes.txt")), true);
});

test("date and image checks", () => {
  assert.equal(isDate("2026-02-28"), true);
  for (const bad of ["2026-02-29", "2026-13-01", "26-01-01", "1999-12-31", 20260101]) assert.equal(isDate(bad), false, String(bad));
  assert.equal(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0])), "jpg");
  assert.equal(sniffImage(png), "png");
  assert.equal(sniffImage(webp), "webp");
  assert.equal(sniffImage(Buffer.from("GIF89a-----")), null);
});
