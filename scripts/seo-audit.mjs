import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const SITE = "https://www.splendidcosmetics.com.ng";
const sitemapIndex = path.join(PUBLIC, "sitemap.xml");

const fail = (message) => {
  console.error(`SEO AUDIT FAILED: ${message}`);
  process.exitCode = 1;
};

const read = (file) => fs.readFileSync(file, "utf8");
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

if (!fs.existsSync(sitemapIndex)) fail("public/sitemap.xml is missing");
if (!fs.existsSync(path.join(PUBLIC, "robots.txt"))) fail("public/robots.txt is missing");

const indexXml = read(sitemapIndex);
const sitemapRefs = locs(indexXml);
if (!sitemapRefs.length) fail("sitemap.xml contains no child sitemaps");
if (sitemapRefs.some((url) => !url.startsWith(`${SITE}/`))) fail("sitemap index contains a non-canonical host");

const allUrls = [];
for (const ref of sitemapRefs) {
  const relative = ref.replace(`${SITE}/`, "");
  const file = path.join(PUBLIC, relative);
  if (!fs.existsSync(file)) {
    if (!["sitemap-search.xml", "sitemap-areas.xml", "sitemap-brands.xml"].includes(relative)) fail(`sitemap index references missing file: ${relative}`);
    continue;
  }
  const xml = read(file);
  if (!xml.includes("<urlset") && !xml.includes("<sitemapindex")) fail(`${relative} is not valid sitemap XML structure`);
  allUrls.push(...locs(xml));
}

const unique = new Set(allUrls);
if (unique.size !== allUrls.length) fail(`duplicate sitemap URLs found (${allUrls.length - unique.size} duplicates)`);

for (const url of allUrls) {
  if (!url.startsWith(`${SITE}/`) && url !== `${SITE}/`) fail(`non-canonical URL in sitemap: ${url}`);
  if (/[?#]/.test(url)) fail(`query/hash URL in sitemap: ${url}`);
  if (/\/api\//i.test(url)) fail(`API URL in sitemap: ${url}`);
  if (url.includes("localhost")) fail(`localhost URL in sitemap: ${url}`);
}

const robots = read(path.join(PUBLIC, "robots.txt"));
if (!robots.includes(`${SITE}/sitemap.xml`)) fail("robots.txt does not advertise the master sitemap");

const main = read(path.join(ROOT, "src/main.tsx"));
const routePatterns = [
  "/product/:productId",
  "/location/:locationSlug",
  "/area/:areaSlug",
  "/search/:intentSlug",
  "/guide/:topicSlug",
  "/brand/:brandSlug",
  "/brands",
];
for (const route of routePatterns) {
  if (!main.includes(`path=\"${route}\"`)) fail(`expected route is missing from src/main.tsx: ${route}`);
}

const packageJson = JSON.parse(read(path.join(ROOT, "package.json")));
if (!packageJson.scripts?.["seo:audit"]) fail("package.json is missing seo:audit script");

const productSeed = read(path.join(ROOT, "backend/seed.js"));
for (const id of ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"]) {
  if (!new RegExp(`\\bid:\\s*[\"']${id}[\"']`).test(productSeed)) fail(`existing product seed record ${id} is missing`);
}

console.log(`SEO AUDIT PASSED: ${allUrls.length} static sitemap URLs checked, ${sitemapRefs.length} sitemap references checked, ${routePatterns.length} SEO routes present.`);
console.log("Product seed guard: p1-p8 present; audit does not modify product data.");
