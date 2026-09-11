import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";

const PORT = Number(process.env.TEST_PORT || 3123);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const START_TIMEOUT_MS = 60_000;

// `next start` serves the production build, so these assertions exercise the
// same output Vercel deploys.
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

// The server gets a throwaway data folder and password, so tests never touch
// the real HQ data or .env.local values (explicit env vars win over .env files).
const DATA_DIR = mkdtempSync(path.join(tmpdir(), "northstar-test-"));
const PASSWORD = "test-password";

let server;

before(async () => {
  server = spawn(process.execPath, [nextBin, "start", "--port", String(PORT)], {
    stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, HQ_DATA_DIR: DATA_DIR, HQ_PASSWORD: PASSWORD, HQ_SESSION_SECRET: "", GMAIL_USER: "", RESEND_API_KEY: "" },
  });

  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const deadline = Date.now() + START_TIMEOUT_MS;
  for (;;) {
    if (server.exitCode !== null) {
      throw new Error(`next start exited with code ${server.exitCode}.\n${stderr}`);
    }
    try {
      await fetch(ORIGIN, { signal: AbortSignal.timeout(2000) });
      return;
    } catch {
      if (Date.now() > deadline) {
        throw new Error(`next start did not become reachable within ${START_TIMEOUT_MS}ms.\n${stderr}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await once(server, "exit");
  }
  rmSync(DATA_DIR, { recursive: true, force: true });
});

// Mirrors lib/auth.ts so a test can present a valid owner session.
function sessionCookie() {
  const key = createHash("sha256").update(`northstar-hq::${PASSWORD}`).digest();
  const expires = String(Math.floor(Date.now() / 1000) + 3600);
  return `northstar_hq_session=${expires}.${createHmac("sha256", key).update(expires).digest("base64url")}`;
}

function fetchSite(path = "/", init = {}) {
  return fetch(`${ORIGIN}${path}`, {
    ...init,
    headers: { accept: "text/html", ...(init.headers || {}) },
  });
}

test("renders the tutoring homepage and metadata", async () => {
  const response = await fetchSite();
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(html, /Northstar Learning Montreal/);
  assert.match(html, /Math can make/);
  assert.match(html, /Mathematics tutoring/);
  assert.match(html, /application\/ld\+json/);
});

test("sends the shared security headers", async () => {
  const response = await fetchSite();
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
});

test("keeps the private HQ out of search results", async () => {
  const response = await fetchSite("/hq/login");
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("sends signed-out visitors from the HQ to the login page", async () => {
  for (const path of ["/hq", "/hq/clients", "/hq/export"]) {
    const response = await fetchSite(path, { redirect: "manual" });
    assert.equal(response.status, 307, path);
    assert.match(response.headers.get("location") ?? "", /\/hq\/login$/, path);
  }
});

test("renders the legal pages and custom 404", async () => {
  const privacy = await fetchSite("/privacy");
  assert.equal(privacy.status, 200);
  assert.match(await privacy.text(), /Privacy policy/);

  const terms = await fetchSite("/terms");
  assert.equal(terms.status, 200);
  assert.match(await terms.text(), /Terms of service/);

  const missing = await fetchSite("/does-not-exist");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /This page isn/);
});

test("publishes robots and sitemap routes", async () => {
  const robots = await fetchSite("/robots.txt");
  assert.equal(robots.status, 200);
  const rules = await robots.text();
  assert.match(rules, /Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/);
  assert.match(rules, /Disallow:\s*\/hq\//);

  const sitemap = await fetchSite("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  assert.match(xml, /<loc>https?:\/\/\S+<\/loc>/);
  assert.match(xml, /\/privacy/);
  assert.match(xml, /\/terms/);
});

test("booking API rejects malformed and incomplete submissions", async () => {
  const malformed = await fetchSite("/api/booking", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: "not json",
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).code, "INVALID_JSON");

  const incomplete = await fetchSite("/api/booking", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(incomplete.status, 422);
  assert.equal((await incomplete.json()).code, "VALIDATION_ERROR");
});

test("booking API silently absorbs honeypot submissions", async () => {
  const response = await fetchSite("/api/booking", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ website: "https://spam.example" }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("booking API saves valid requests to the HQ data file", async () => {
  const response = await fetchSite("/api/booking", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      name: "Test Parent",
      email: "parent@example.com",
      phone: "5145550101",
      requester: "parent",
      grade: "Grade 4",
      subject: "Mathematics",
      format: "Online",
      date: "Tuesday at 5 p.m.",
      message: "A local automated test request.",
    }),
  });
  assert.equal(response.status, 200);
  const data = JSON.parse(readFileSync(path.join(DATA_DIR, "hq.json"), "utf8"));
  assert.equal(data.bookings.length, 1);
  assert.equal(data.bookings[0].name, "Test Parent");
  assert.equal(data.bookings[0].status, "new");
});

test("the HQ opens with a valid session and shows saved requests", async () => {
  const login = await fetchSite("/hq/login");
  assert.match(await login.text(), /type="password"/);

  const forged = await fetchSite("/hq/requests", { redirect: "manual", headers: { cookie: "northstar_hq_session=9999999999.forged" } });
  assert.equal(forged.status, 307);

  const requests = await fetchSite("/hq/requests", { headers: { cookie: sessionCookie() } });
  assert.equal(requests.status, 200);
  assert.match(await requests.text(), /Test Parent/);
});
