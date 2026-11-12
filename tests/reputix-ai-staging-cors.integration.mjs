// Read-only staging CORS smoke checks. No credentials, POSTs, AI requests, or data writes.
// Run explicitly: REPUTIX_STAGING_AI_URL=https://<staging-project>.supabase.co/functions/v1/reputix-ai node --test tests/reputix-ai-staging-cors.integration.mjs
import test from "node:test";
import assert from "node:assert/strict";

const url = process.env.REPUTIX_STAGING_AI_URL;
const stagingProjectId = "lzcyulncvjjxsyyivlty";
const expectedUrl = `https://${stagingProjectId}.supabase.co/functions/v1/reputix-ai`;

test("staging CORS preflight: approved and disallowed origins", { skip: !url && "Set REPUTIX_STAGING_AI_URL explicitly to enable live read-only checks" }, async () => {
  assert.equal(url, expectedUrl, "Refusing to contact any URL except the known Reputix staging AI endpoint");
  const cases = [
    { origin: "https://www.reputixapp.com", reflected: true },
    { origin: "https://reputixapp.com", reflected: true },
    { origin: "https://marcelopuebla924-tech.github.io", reflected: true },
    { origin: "https://untrusted.example", reflected: false },
  ];
  for (const { origin, reflected } of cases) {
    const response = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,apikey,content-type",
      },
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 200, `preflight HTTP status for ${origin}`);
    const allow = response.headers.get("access-control-allow-origin");
    assert.equal(allow === origin, reflected, `origin reflection policy for ${origin}`);
    assert.notEqual(allow, "*", "wildcard origin forbidden");
    assert.match(response.headers.get("vary") || "", /origin/i);
    assert.match(response.headers.get("access-control-allow-methods") || "", /POST/);
  }
});
