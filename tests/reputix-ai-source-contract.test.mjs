import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../supabase/functions/reputix-ai/index.ts", import.meta.url), "utf8");

test("CORS allowlist contains only the approved Reputix origins", () => {
  for (const origin of [
    "https://reputixapp.com",
    "https://www.reputixapp.com",
    "https://marcelopuebla924-tech.github.io",
  ]) assert.ok(source.includes(origin), "missing allowed origin: " + origin);
  assert.match(source, /const allowedOrigins\s*=\s*new Set\(/);
  assert.doesNotMatch(source, /Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
  assert.match(source, /"Vary"\s*:\s*"Origin"/);
});

test("CORS response selects the request origin only when it is allowlisted", () => {
  assert.match(source, /origin\s*&&\s*allowedOrigins\.has\(origin\)/);
  assert.match(source, /function corsHeaders\(origin: string \| null\)/);
});

test("OPTIONS preflight is handled before method and authentication checks", () => {
  const preflight = source.indexOf('if (req.method === "OPTIONS")');
  const methodGuard = source.indexOf('if (req.method !== "POST")');
  const authGuard = source.indexOf("const authorization = req.headers.get");
  assert.ok(preflight >= 0 && methodGuard > preflight && authGuard > methodGuard);
});

test("only POST requests proceed beyond the method guard", () => {
  assert.match(source, /if \(req\.method !== "POST"\) return respond\(\{ error: "Method not allowed" \}, 405\)/);
});

test("a valid Supabase user session is checked server-side", () => {
  assert.match(source, /fetch\(\$\{supabaseUrl\}\/auth\/v1\/user/);
  assert.match(source, /if \(!userResponse\.ok\) return respond\(\{ error: "Valid user session required" \}, 401\)/);
  assert.match(source, /if \(!user\?\.id\) return respond\(\{ error: "Valid user session required" \}, 401\)/);
});

test("administrator moderation queue requires the admin app metadata claim", () => {
  assert.match(source, /mode === "admin_moderation_list"/);
  assert.match(source, /user\?\.app_metadata\?\.reputix_role !== "admin"/);
});

test("user moderation is limited to the caller's own pending review", () => {
  assert.match(source, /review\.user_id !== user\.id/);
  assert.match(source, /review\.status !== "pending"/);
});

test("moderation remains advisory and does not publish or reject reviews", () => {
  assert.match(source, /advisory_only:\s*true/);
  assert.doesNotMatch(source, /PATCH\s*.*\/rest\/v1\/reviews|\/rest\/v1\/reviews.*method:\s*"PATCH"/s);
});

test("assistant Pro entitlement is checked server-side, not from browser input", () => {
  assert.match(source, /mode === "assistant"/);
  assert.match(source, /subscription\?\.plan_code !== "pro"/);
  assert.match(source, /validStatus = \["active", "trialing"\]/);
});
