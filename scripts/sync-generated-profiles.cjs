"use strict";

const fs = require("node:fs");
const path = require("node:path");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MARKER_NAME = ".reputix-generated";
const MARKER_CONTENT = "Managed by Reputix approved-profile publishing. Do not add manual files here.\n";

function listGeneratedProfiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const profiles = [];
  for (const entry of entries) {
    if (!UUID_RE.test(entry.name) || !entry.isDirectory() || entry.isSymbolicLink()) {
      throw new Error("Generated profile output contains an unexpected path; refusing to sync.");
    }
    const profileDir = path.join(directory, entry.name);
    const files = fs.readdirSync(profileDir, { withFileTypes: true });
    if (files.length !== 1 || files[0].name !== "index.html" || !files[0].isFile() || files[0].isSymbolicLink()) {
      throw new Error("Generated profile directory must contain only index.html.");
    }
    profiles.push(entry.name);
  }
  return profiles;
}

function validateExistingDirectory(directory) {
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Existing business path is not a normal directory.");
  const markerPath = path.join(directory, MARKER_NAME);
  if (!fs.existsSync(markerPath) || !fs.lstatSync(markerPath).isFile() ||
      fs.readFileSync(markerPath, "utf8") !== MARKER_CONTENT) {
    throw new Error("Existing business directory is not marked as Reputix-generated; refusing to overwrite it.");
  }
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === MARKER_NAME) continue;
    if (!UUID_RE.test(entry.name) || !entry.isDirectory() || entry.isSymbolicLink()) {
      throw new Error("Existing business directory contains an unmanaged path; refusing to delete it.");
    }
  }
}

function sync(generatedRoot, repositoryRoot) {
  const repo = path.resolve(repositoryRoot);
  const generated = path.resolve(generatedRoot);
  if (generated === repo || repo.startsWith(generated + path.sep)) {
    throw new Error("Generated source must be separate from the repository root.");
  }
  const sourceBusiness = path.join(generated, "business");
  const sourceSitemap = path.join(generated, "sitemap.xml");
  if (!fs.existsSync(sourceBusiness) || !fs.lstatSync(sourceBusiness).isDirectory() ||
      !fs.existsSync(sourceSitemap) || !fs.lstatSync(sourceSitemap).isFile()) {
    throw new Error("Generated business directory or sitemap is missing.");
  }
  const profileIds = listGeneratedProfiles(sourceBusiness);
  const sitemap = fs.readFileSync(sourceSitemap, "utf8");
  if (!sitemap.startsWith('<?xml version="1.0"') || !sitemap.includes("<urlset")) {
    throw new Error("Generated sitemap is invalid.");
  }

  const targetBusiness = path.join(repo, "business");
  const targetSitemap = path.join(repo, "sitemap.xml");
  const exists = fs.existsSync(targetBusiness);
  if (exists) validateExistingDirectory(targetBusiness);
  if (fs.existsSync(targetSitemap) && !fs.lstatSync(targetSitemap).isFile()) {
    throw new Error("Existing sitemap path is not a regular file.");
  }

  const suffix = String(process.pid);
  const stageBusiness = path.join(repo, ".reputix-business-stage-" + suffix);
  const backupBusiness = path.join(repo, ".reputix-business-backup-" + suffix);
  const stageSitemap = path.join(repo, ".reputix-sitemap-stage-" + suffix);
  const backupSitemap = path.join(repo, ".reputix-sitemap-backup-" + suffix);
  for (const p of [stageBusiness, backupBusiness, stageSitemap, backupSitemap]) {
    if (fs.existsSync(p)) throw new Error("A previous interrupted profile sync requires manual inspection.");
  }

  fs.mkdirSync(stageBusiness);
  fs.writeFileSync(path.join(stageBusiness, MARKER_NAME), MARKER_CONTENT, "utf8");
  for (const id of profileIds) {
    fs.cpSync(path.join(sourceBusiness, id), path.join(stageBusiness, id), { recursive: true, errorOnExist: true });
  }
  fs.writeFileSync(stageSitemap, sitemap, "utf8");

  let businessBackedUp = false;
  let sitemapBackedUp = false;
  let businessInstalled = false;
  let sitemapInstalled = false;
  try {
    if (exists) {
      fs.renameSync(targetBusiness, backupBusiness);
      businessBackedUp = true;
    }
    if (fs.existsSync(targetSitemap)) {
      fs.renameSync(targetSitemap, backupSitemap);
      sitemapBackedUp = true;
    }
    fs.renameSync(stageBusiness, targetBusiness);
    businessInstalled = true;
    fs.renameSync(stageSitemap, targetSitemap);
    sitemapInstalled = true;
    if (businessBackedUp) fs.rmSync(backupBusiness, { recursive: true, force: true });
    if (sitemapBackedUp) fs.rmSync(backupSitemap, { force: true });
  } catch (error) {
    if (businessInstalled && fs.existsSync(targetBusiness)) fs.rmSync(targetBusiness, { recursive: true, force: true });
    if (sitemapInstalled && fs.existsSync(targetSitemap)) fs.rmSync(targetSitemap, { force: true });
    if (businessBackedUp && fs.existsSync(backupBusiness)) fs.renameSync(backupBusiness, targetBusiness);
    if (sitemapBackedUp && fs.existsSync(backupSitemap)) fs.renameSync(backupSitemap, targetSitemap);
    throw error;
  } finally {
    for (const p of [stageBusiness, stageSitemap]) fs.rmSync(p, { recursive: true, force: true });
  }
  return { profiles: profileIds.length, sitemap: targetSitemap };
}

if (require.main === module) {
  const [generatedRoot, repositoryRoot] = process.argv.slice(2);
  if (!generatedRoot || !repositoryRoot) {
    console.error("Usage: node scripts/sync-generated-profiles.cjs <generated-output-dir> <repository-root>");
    process.exit(2);
  }
  try {
    console.log(JSON.stringify({ status: "success", ...sync(generatedRoot, repositoryRoot) }));
  } catch (error) {
    console.error("Generated profile sync failed: " + error.message);
    process.exit(1);
  }
}

module.exports = { sync, MARKER_NAME, MARKER_CONTENT };
