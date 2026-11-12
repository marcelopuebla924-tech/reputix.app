"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { extractPublicSupabaseConfig, fetchApprovedBusinesses, PUBLIC_SELECT } = require("../scripts/fetch-approved-businesses.cjs");

const key = "sb_publishable_test_public_key_only";

test("Supabase config extraction accepts only the public publishable key format", () => {
  const config = extractPublicSupabaseConfig(
    'const SUPABASE_URL = "https://project.supabase.co";\nconst SUPABASE_KEY = "' + key + '";'
  );
  assert.equal(config.supabaseUrl, "https://project.supabase.co");
  assert.equal(config.apiKey, key);
  assert.throws(() => extractPublicSupabaseConfig(
    'const SUPABASE_URL = "https://project.supabase.co";\nconst SUPABASE_KEY = "service_role_secret";'
  ), /publishable key/i);
});

test("approved-business fetch uses an allowlisted select and paginates deterministically", async () => {
  const calls = [];
  const pages = [
    [
      { id: "a", name: "Public A", status: "approved" },
      { id: "b", name: "Public B", status: "approved" }
    ],
    [{ id: "c", name: "Public C", status: "approved" }]
  ];
  const rows = await fetchApprovedBusinesses({
    supabaseUrl: "https://project.supabase.co",
    apiKey: key,
    pageSize: 2,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const index = calls.length - 1;
      return { ok: true, status: 200, json: async () => pages[index] };
    }
  });
  assert.equal(rows.length, 3);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    const url = new URL(call.url);
    assert.equal(url.pathname, "/rest/v1/businesses");
    assert.equal(url.searchParams.get("select"), PUBLIC_SELECT);
    assert.equal(url.searchParams.get("status"), "eq.approved");
    assert.equal(url.searchParams.get("order"), "id.asc");
    assert.equal(call.options.headers.apikey, key);
    assert.equal(call.options.headers.Authorization, undefined);
    assert.equal(call.options.cache, "no-store");
  }
  assert.equal(new URL(calls[0].url).searchParams.get("offset"), "0");
  assert.equal(new URL(calls[1].url).searchParams.get("offset"), "2");
});

test("fetch fails closed on unapproved rows, HTTP errors, and secret keys", async () => {
  await assert.rejects(fetchApprovedBusinesses({
    supabaseUrl: "https://project.supabase.co",
    apiKey: key,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => [{ id: "x", status: "pending" }] })
  }), /non-approved row/i);
  await assert.rejects(fetchApprovedBusinesses({
    supabaseUrl: "https://project.supabase.co",
    apiKey: key,
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => [] })
  }), /HTTP 403/i);
  await assert.rejects(fetchApprovedBusinesses({
    supabaseUrl: "https://project.supabase.co",
    apiKey: "service_role_secret",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => [] })
  }), /publishable Supabase key/i);
});
