import { test } from "node:test";
import assert from "node:assert/strict";
import { profileUrl } from "../src/social.js";
import { adminClient, fixture, origin } from "./fixture.js";

type Social = { instagram: string; linkedin: string; email: string };
const read = async (call: (path: string) => Promise<Response>) => ((await (await call("/api/social")).json()) as { social: Social }).social;

test("the previous social addresses are seeded and public", async t => {
  const f = await fixture(t);
  assert.deepEqual(await read(f.call), {
    instagram: "https://instagram.com/gdgostimtech",
    linkedin: "https://www.linkedin.com/company/ostimtech-gdsc/",
    email: "gdgostimtech@outlook.com",
  });
});

test("visitors cannot change social addresses", async t => {
  const f = await fixture(t);
  const response = await f.call("/api/admin/social", {
    method: "PUT", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ instagram: "@x", linkedin: "linkedin.com/in/x", email: "x@y.com" }),
  });
  assert.equal(response.status, 401);
  assert.equal((await read(f.call)).instagram, "https://instagram.com/gdgostimtech");
});

test("an admin saves all three addresses once; they persist and are normalised", async t => {
  const a = await adminClient(t);
  const response = await a.send("PUT", "/api/admin/social", { instagram: "@gdg.ostim", linkedin: "tr.linkedin.com/company/gdg", email: " mailto:hello@gdg.dev " });
  assert.equal(response.status, 200);
  const expected = { instagram: "https://instagram.com/gdg.ostim", linkedin: "https://tr.linkedin.com/company/gdg", email: "hello@gdg.dev" };
  assert.deepEqual(((await response.json()) as { social: Social }).social, expected);
  await a.restart();
  assert.deepEqual(await read(a.call), expected);
});

test("each wrong field gets its own message and nothing is saved", async t => {
  const a = await adminClient(t);
  const response = await a.send("PUT", "/api/admin/social", { instagram: "https://evil.example/instagram.com", linkedin: "https://linkedin.com/", email: "not-an-email" });
  assert.equal(response.status, 400);
  const { errors } = await response.json() as { errors: Record<string, string> };
  assert.deepEqual(Object.keys(errors).sort(), ["email", "instagram", "linkedin"]);
  assert.equal((await read(a.call)).email, "gdgostimtech@outlook.com");
});

test("profile URLs must stay on the expected host", () => {
  assert.equal(profileUrl("instagram.com/gdgostimtech", "instagram.com"), "https://instagram.com/gdgostimtech");
  assert.equal(profileUrl("http://www.instagram.com/gdg", "instagram.com"), "https://www.instagram.com/gdg");
  for (const bad of ["https://notinstagram.com/x", "https://instagram.com.evil.example/x", "javascript:alert(1)", "https://user@instagram.com/x", "instagram.com", "", 7]) {
    assert.equal(profileUrl(bad, "instagram.com"), null, String(bad));
  }
});
