"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { sync, MARKER_NAME, MARKER_CONTENT } = require("../scripts/sync-generated-profiles.cjs");

const id = "00000000-0000-4000-8000-000000000551";

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reputix-sync-test-"));
  const generated = path.join(root, "generated");
  const repo = path.join(root, "repo");
  fs.mkdirSync(path.join(generated, "business", id), { recursive: true });
  fs.mkdirSync(repo, { recursive: true });
  fs.writeFileSync(path.join(generated, "business", id, "index.html"), "<h1>Approved fixture</h1>");
  fs.writeFileSync(path.join(generated, "sitemap.xml"), '<?xml version="1.0"?><urlset></urlset>');
  return { root, generated, repo };
}

test("sync installs approved pages and then removes stale generated pages", () => {
  const f = setup();
  const first = sync(f.generated, f.repo);
  assert.equal(first.profiles, 1);
  assert.equal(fs.readFileSync(path.join(f.repo, "business", id, "index.html"), "utf8"), "<h1>Approved fixture</h1>");
  assert.equal(fs.readFileSync(path.join(f.repo, "business", MARKER_NAME), "utf8"), MARKER_CONTENT);

  fs.rmSync(path.join(f.generated, "business", id), { recursive: true, force: true });
  const second = sync(f.generated, f.repo);
  assert.equal(second.profiles, 0);
  assert.equal(fs.existsSync(path.join(f.repo, "business", id)), false);
  assert.equal(fs.existsSync(path.join(f.repo, "business", MARKER_NAME)), true);
});

test("sync refuses to overwrite an unmarked existing business directory", () => {
  const f = setup();
  const businessRoot = path.join(f.repo, "business");
  fs.mkdirSync(businessRoot);
  fs.writeFileSync(path.join(businessRoot, "keep.txt"), "User-owned file");
  assert.throws(() => sync(f.generated, f.repo), /not marked as Reputix-generated/i);
  assert.equal(fs.readFileSync(path.join(businessRoot, "keep.txt"), "utf8"), "User-owned file");
});

test("sync refuses unexpected paths inside a managed directory", () => {
  const f = setup();
  const businessRoot = path.join(f.repo, "business");
  fs.mkdirSync(businessRoot);
  fs.writeFileSync(path.join(businessRoot, MARKER_NAME), MARKER_CONTENT);
  fs.mkdirSync(path.join(businessRoot, "manual-content"));
  assert.throws(() => sync(f.generated, f.repo), /unmanaged path/i);
  assert.equal(fs.existsSync(path.join(businessRoot, "manual-content")), true);
});
