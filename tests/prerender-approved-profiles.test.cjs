"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { build, normalizeApprovedBusinesses, renderProfileHtml } = require("../scripts/prerender-approved-profiles.cjs");

const approvedId = "00000000-0000-4000-8000-000000000551";
const pendingId = "00000000-0000-4000-8000-000000000552";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reputix-prerender-test-"));
  const templatePath = path.join(root, "template.html");
  const manifestPath = path.join(root, "businesses.json");
  const outputDir = path.join(root, "site");
  fs.writeFileSync(templatePath, [
    "<!doctype html><html lang=\"es\"><head>",
    '<meta name="description" content="Home description">',
    '<link rel="canonical" href="https://www.reputixapp.com/">',
    '<meta name="robots" content="index,follow">',
    '<meta property="og:title" content="Home">',
    '<meta property="og:description" content="Home description">',
    '<meta property="og:url" content="https://www.reputixapp.com/">',
    '<meta name="twitter:title" content="Home">',
    '<meta name="twitter:description" content="Home description">',
    "<title>Home</title>",
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Reputix"}</script>',
    "</head><body><script src=\"/app.js\"></script></body></html>"
  ].join("\n"));
  fs.writeFileSync(manifestPath, JSON.stringify([
    {
      id: approvedId,
      status: "approved",
      name: "QA <script>alert(1)</script> Store",
      category: "Retail </script><script>alert(2)</script>",
      description: "A public description that must not be published as official business copy.",
      address: "100 Test Avenue",
      city: "Los Angeles",
      state: "CA",
      country: "US",
      owner_email: "private@example.com",
      internal_notes: "NEVER PUBLISH INTERNAL NOTES",
      stripe_customer_id: "cus_private"
    },
    { id: pendingId, status: "pending", name: "Pending Secret Business" },
    { id: "00000000-0000-4000-8000-000000000553", status: "rejected", name: "Rejected Secret Business" }
  ]));
  return { root, templatePath, manifestPath, outputDir };
}

test("only approved records produce profile HTML and sitemap URLs; private fields never escape", () => {
  const f = fixture();
  const result = build(f.manifestPath, f.outputDir, f.templatePath);
  assert.equal(result.approved, 1);
  const profilePath = path.join(f.outputDir, "business", approvedId, "index.html");
  const html = fs.readFileSync(profilePath, "utf8");
  const sitemap = fs.readFileSync(path.join(f.outputDir, "sitemap.xml"), "utf8");

  assert.match(html, /<title>QA &lt;script&gt;alert\(1\)&lt;\/script&gt; Store \| Reputix<\/title>/);
  assert.match(html, /<base href="\/">/);
  assert.match(html, /<noscript><main><h1>QA &lt;script&gt;alert\(1\)&lt;\/script&gt; Store<\/h1>/);
  assert.match(html, new RegExp("https://www\\.reputixapp\\.com/business/" + approvedId + "/"));
  assert.ok(html.includes("Retail &lt;/script&gt;&lt;script&gt;alert(2)&lt;/script&gt; · Los Angeles · CA"));
  assert.doesNotMatch(html, /private@example\.com|NEVER PUBLISH INTERNAL NOTES|cus_private|Pending Secret Business|Rejected Secret Business/);
  assert.ok(!html.includes("A public description that must not be published as official business copy"));
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>|<script>alert\(2\)<\/script>/);
  assert.match(html, /id="reputix-business-structured-data"/);
  assert.match(html, /\\u003c\/script\\u003e/);
  assert.match(sitemap, new RegExp("https://www\\.reputixapp\\.com/business/" + approvedId + "/"));
  assert.doesNotMatch(sitemap, /pending|rejected|552|553/i);
  assert.equal(fs.existsSync(path.join(f.outputDir, "business", pendingId, "index.html")), false);
});

test("invalid approved IDs and duplicate IDs fail closed", () => {
  assert.throws(() => normalizeApprovedBusinesses([
    { id: "../private", status: "approved", name: "Invalid" }
  ]), /invalid UUID/i);
  assert.throws(() => normalizeApprovedBusinesses([
    { id: approvedId, status: "approved", name: "One" },
    { id: approvedId, status: "approved", name: "Duplicate" }
  ]), /Duplicate approved business ID/i);
});

test("unapproved records are ignored even when their other fields are populated", () => {
  assert.deepEqual(normalizeApprovedBusinesses([
    { id: pendingId, status: "pending", name: "Not public" },
    { id: "00000000-0000-4000-8000-000000000553", status: "rejected", name: "Also not public" }
  ]), []);
});

test("obviously malformed locality values are omitted from public SEO metadata without changing source records", () => {
  const business = normalizeApprovedBusinesses([{
    id: "00000000-0000-4000-8000-000000000554",
    status: "approved",
    name: "Quick Cleaning Services",
    address: "9233south gate",
    city: "Ca",
    state: "CA",
    country: "US"
  }])[0];

  assert.equal(business.address, "");
  assert.equal(business.city, "");
  assert.equal(business.state, "CA");
  assert.equal(business.country, "US");

  const template = '<head><title>Home</title><meta name="description" content="Home">' +
    '<link rel="canonical" href="https://www.reputixapp.com/">' +
    '<meta property="og:title" content="Home"><meta property="og:description" content="Home">' +
    '<meta property="og:url" content="https://www.reputixapp.com/">' +
    '<meta name="twitter:title" content="Home"><meta name="twitter:description" content="Home">' +
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script></head><body></body>';
  const html = renderProfileHtml(template, business);
  assert.doesNotMatch(html, /9233south gate|addressLocality|streetAddress/);
  assert.match(html, /"addressRegion":"CA"/);
  assert.match(html, /"addressCountry":"US"/);
});
