"use strict";

const fs = require("node:fs");
const path = require("node:path");

const SITE_ORIGIN = "https://www.reputixapp.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value, maxLength = 500) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function normalizeApprovedBusinesses(rows) {
  if (!Array.isArray(rows)) throw new Error("The business manifest must be a JSON array.");
  const seen = new Set();
  const approved = [];
  for (const row of rows) {
    if (!row || row.status !== "approved") continue;
    const id = cleanText(row.id, 64);
    const name = cleanText(row.name, 120);
    if (!UUID_RE.test(id)) throw new Error("An approved business has an invalid UUID; refusing to publish.");
    if (!name) throw new Error("An approved business is missing its public name; refusing to publish.");
    if (seen.has(id)) throw new Error("Duplicate approved business ID; refusing to publish.");
    seen.add(id);
    approved.push({
      id,
      name,
      category: cleanText(row.category, 120),
      description: cleanText(row.description, 300),
      address: cleanText(row.address, 180),
      city: cleanText(row.city, 100),
      state: cleanText(row.state, 80),
      country: cleanText(row.country, 80)
    });
  }
  return approved;
}

function replaceExactlyOne(source, pattern, replacement, label) {
  const matches = source.match(pattern) || [];
  if (matches.length !== 1) throw new Error("Expected exactly one " + label + " in the HTML template; found " + matches.length + ".");
  return source.replace(pattern, replacement);
}

function renderProfileHtml(template, business) {
  const canonical = SITE_ORIGIN + "/business/" + business.id + "/";
  const title = business.name + " | Reputix";
  const description = business.description ||
    [business.category, business.address, business.city, business.state].filter(Boolean).join(" · ") ||
    "Consulta opiniones y descubre este negocio en Reputix.";
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Reputix",
    url: SITE_ORIGIN + "/",
    description: "Plataforma para descubrir negocios, consultar opiniones reales y compartir experiencias."
  };
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: canonical
  };
  if (business.description) localBusinessSchema.description = business.description;
  if (business.category) localBusinessSchema.additionalType = business.category;
  const address = {};
  if (business.address) address.streetAddress = business.address;
  if (business.city) address.addressLocality = business.city;
  if (business.state) address.addressRegion = business.state;
  if (business.country) address.addressCountry = business.country;
  if (Object.keys(address).length) {
    localBusinessSchema.address = { "@type": "PostalAddress", ...address };
  }
  const websiteJsonLd = JSON.stringify(websiteSchema);
  const jsonLd = JSON.stringify(localBusinessSchema)
    .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

  let html = template;
  html = replaceExactlyOne(html, /<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(title) + "</title>", "title");
  html = replaceExactlyOne(html, /<meta\s+name="description"\s+content="[^"]*"\s*>/i,
    '<meta name="description" content="' + escapeHtml(description) + '">', "description metadata");
  html = replaceExactlyOne(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*>/i,
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">', "canonical link");
  html = replaceExactlyOne(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*>/i,
    '<meta property="og:title" content="' + escapeHtml(title) + '">', "Open Graph title");
  html = replaceExactlyOne(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*>/i,
    '<meta property="og:description" content="' + escapeHtml(description) + '">', "Open Graph description");
  html = replaceExactlyOne(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*>/i,
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">', "Open Graph URL");
  html = replaceExactlyOne(html, /<meta\s+name="twitter:title"\s+content="[^"]*"\s*>/i,
    '<meta name="twitter:title" content="' + escapeHtml(title) + '">', "Twitter title");
  html = replaceExactlyOne(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*>/i,
    '<meta name="twitter:description" content="' + escapeHtml(description) + '">', "Twitter description");
  html = replaceExactlyOne(html, /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
    '<script type="application/ld+json">' + websiteJsonLd + "</script>\n" +
    '<script type="application/ld+json" id="reputix-business-structured-data">' + jsonLd + "</script>",
    "JSON-LD script");
  html = html.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*>/i,
    '<meta name="robots" content="index,follow,max-image-preview:large">');
  if (!/<base\s+href=/i.test(html)) html = html.replace(/<head>/i, '<head>\n  <base href="/">');
  return html;
}

function buildSitemap(businesses) {
  const urls = [SITE_ORIGIN + "/"].concat(
    businesses.map(b => SITE_ORIGIN + "/business/" + b.id + "/")
  );
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(url => "  <url><loc>" + escapeXml(url) + "</loc></url>").join("\n") +
    "\n</urlset>\n";
}

function build(manifestPath, outputDir, templatePath) {
  const rows = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const businesses = normalizeApprovedBusinesses(rows);
  const template = fs.readFileSync(templatePath, "utf8");
  const out = path.resolve(outputDir);
  const repoRoot = path.resolve(__dirname, "..");
  if (out === path.parse(out).root || out === repoRoot || repoRoot.startsWith(out + path.sep)) {
    throw new Error("Refusing to write generated pages into or above the repository root.");
  }

  const businessRoot = path.join(out, "business");
  fs.rmSync(businessRoot, { recursive: true, force: true });
  fs.mkdirSync(businessRoot, { recursive: true });
  for (const business of businesses) {
    const directory = path.join(businessRoot, business.id);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "index.html"), renderProfileHtml(template, business), "utf8");
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "sitemap.xml"), buildSitemap(businesses), "utf8");
  return { approved: businesses.length, sitemap: path.join(out, "sitemap.xml") };
}

if (require.main === module) {
  const [manifestPath, outputDir, templatePath] = process.argv.slice(2);
  if (!manifestPath || !outputDir) {
    console.error("Usage: node scripts/prerender-approved-profiles.cjs <businesses.json> <output-dir> [index.html]");
    process.exit(2);
  }
  try {
    const result = build(manifestPath, outputDir, templatePath || path.resolve(__dirname, "..", "index.html"));
    console.log(JSON.stringify({ status: "success", ...result }));
  } catch (error) {
    console.error("Approved profile pre-render failed: " + error.message);
    process.exit(1);
  }
}

module.exports = { build, buildSitemap, normalizeApprovedBusinesses, renderProfileHtml };
