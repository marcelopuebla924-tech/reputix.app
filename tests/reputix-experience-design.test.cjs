const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("Reputix experience section is present and accessible", () => {
  assert.match(html, /<section class="reputix-how" id="reputixHow"[^>]*aria-labelledby="reputixHowTitle"/);
  assert.match(html, /id="reputixHowTitle"/);
  assert.equal((html.match(/class="reputix-how-card"/g) || []).length, 4);
  assert.match(html, /href="#searchForm"/);
  assert.match(html, /href="#communityTitle"/);
});

test("How-it-works copy has Spanish and English variants with a language listener", () => {
  assert.ok((html.match(/data-reputix-es=/g) || []).length >= 8);
  assert.ok((html.match(/data-reputix-en=/g) || []).length >= 8);
  assert.match(html, /language\.addEventListener\("change", applyCopy\)/);
  assert.match(html, /applyCopy\(\);/);
});

test("visual refresh includes responsive and reduced-motion behavior", () => {
  assert.match(css, /\.reputix-how-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*520px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
});

test("existing high-value product entry points remain in the page", () => {
  for (const id of ["searchForm", "results", "ownerAuthForm", "basicCheckoutButton", "proCheckoutButton", "reputixAiFab", "communityTitle"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing existing entry point: " + id);
  }
  assert.match(html, /href="\.\/mapa\.html"/);
  assert.match(html, /styles\.css\?v=experience-refresh-20261124-1/);
});
