"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PAGE_SIZE = 500;
const MAX_PAGES = 100;
const PUBLIC_SELECT = "id,name,category,address,city,state,country,status";

function extractPublicSupabaseConfig(appSource) {
  const urlMatch = appSource.match(/const\s+SUPABASE_URL\s*=\s*["']([^"']+)["'];/);
  const keyMatch = appSource.match(/const\s+SUPABASE_KEY\s*=\s*["']([^"']+)["'];/);
  if (!urlMatch || !keyMatch) throw new Error("Could not read the public Supabase configuration from app.js.");
  const parsed = new URL(urlMatch[1]);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    throw new Error("Supabase URL is not an approved HTTPS project URL.");
  }
  if (!keyMatch[1].startsWith("sb_publishable_")) {
    throw new Error("Only a Supabase publishable key is permitted for public profile export; refusing other key types.");
  }
  return { supabaseUrl: parsed.origin, apiKey: keyMatch[1] };
}

async function fetchApprovedBusinesses({ supabaseUrl, apiKey, fetchImpl = globalThis.fetch, pageSize = PAGE_SIZE, maxPages = MAX_PAGES }) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(supabaseUrl || ""))) {
    throw new Error("Invalid Supabase project URL.");
  }
  if (!String(apiKey || "").startsWith("sb_publishable_")) {
    throw new Error("A publishable Supabase key is required; service-role and secret keys are forbidden.");
  }
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Invalid page size.");

  const all = [];
  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const params = new URLSearchParams({
      select: PUBLIC_SELECT,
      status: "eq.approved",
      order: "id.asc",
      limit: String(pageSize),
      offset: String(offset)
    });
    const response = await fetchImpl(supabaseUrl.replace(/\/+$/, "") + "/rest/v1/businesses?" + params.toString(), {
      method: "GET",
      headers: {
        apikey: apiKey,
        Accept: "application/json"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error("Public approved-business read failed with HTTP " + response.status + "; no profile files were changed.");
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length > pageSize) throw new Error("Supabase returned an invalid public business page.");
    if (rows.some(row => !row || row.status !== "approved")) {
      throw new Error("The public data source returned a non-approved row; refusing to publish.");
    }
    all.push(...rows);
    if (rows.length < pageSize) return all;
  }
  throw new Error("Approved business export exceeded the safe pagination limit; refusing a partial publish.");
}

async function main(outputPath) {
  const appPath = path.resolve(__dirname, "..", "app.js");
  const config = extractPublicSupabaseConfig(fs.readFileSync(appPath, "utf8"));
  const rows = await fetchApprovedBusinesses(config);
  const target = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = target + ".tmp";
  fs.writeFileSync(temporary, JSON.stringify(rows, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, target);
  console.log(JSON.stringify({ status: "success", approvedBusinesses: rows.length }));
}

if (require.main === module) {
  const outputPath = process.argv[2];
  if (!outputPath) {
    console.error("Usage: node scripts/fetch-approved-businesses.cjs <output-manifest.json>");
    process.exit(2);
  }
  main(outputPath).catch(error => {
    console.error("Approved business export failed: " + error.message);
    process.exit(1);
  });
}

module.exports = { extractPublicSupabaseConfig, fetchApprovedBusinesses, PUBLIC_SELECT };
