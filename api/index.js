import app from "../backend/server.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SITE_URL = "https://www.splendidcosmetics.com.ng";
const NATIONAL_SEARCH_SLUGS = [
  "buy-cosmetics-online-nigeria", "online-cosmetics-store-nigeria", "buy-skincare-products-nigeria",
  "buy-makeup-products-nigeria", "beauty-products-online-nigeria", "cosmetics-store-nigeria",
  "skincare-store-nigeria", "makeup-store-nigeria", "foundation-price-nigeria", "concealer-price-nigeria",
  "serum-price-nigeria", "moisturizer-price-nigeria", "lipstick-price-nigeria", "lip-gloss-price-nigeria",
  "perfume-price-nigeria", "eyeliner-price-nigeria", "best-skincare-products-nigeria", "best-makeup-products-nigeria",
  "authentic-skincare-products-nigeria", "authentic-cosmetics-nigeria", "beauty-products-delivery-nigeria",
];

const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&apos;");

const sendSeoError = (res, err) => {
  console.error("[SEO API]", err?.message || err);
  res.status(503).json({ error: "SEO discovery data is temporarily unavailable" });
};

// Public, read-only SEO endpoints. They never read or mutate product records.
app.get("/api/seo/location/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 120) return res.status(400).json({ error: "Invalid location slug" });
    const location = await prisma.seoLocation.findFirst({ where: { slug, active: true }, select: { state: true, capital: true, slug: true, country: true, region: true, description: true, isCapital: true, priority: true } });
    if (!location) return res.status(404).json({ error: "Location not found" });
    res.json(location);
  } catch (err) { sendSeoError(res, err); }
});

app.get("/api/seo/area/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 160) return res.status(400).json({ error: "Invalid area slug" });
    const area = await prisma.seoArea.findFirst({ where: { slug, active: true }, select: { state: true, capital: true, area: true, slug: true, description: true, priority: true } });
    if (!area) return res.status(404).json({ error: "Area not found" });
    res.json(area);
  } catch (err) { sendSeoError(res, err); }
});

app.get("/api/seo/search/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 160) return res.status(400).json({ error: "Invalid search slug" });
    const intent = await prisma.searchIntent.findFirst({ where: { slug, active: true }, select: { slug: true, query: true, intentType: true, topic: true, location: true, description: true, priority: true } });
    if (!intent) return res.status(404).json({ error: "Search intent not found" });
    res.json(intent);
  } catch (err) { sendSeoError(res, err); }
});

app.get("/api/seo/guide/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 160) return res.status(400).json({ error: "Invalid guide slug" });
    const topic = await prisma.contentTopic.findFirst({ where: { slug, active: true }, select: { slug: true, title: true, summary: true, contentType: true, category: true, audience: true, searchQuestions: true, priority: true } });
    if (!topic) return res.status(404).json({ error: "Guide not found" });
    res.json(topic);
  } catch (err) { sendSeoError(res, err); }
});

app.get("/api/seo/brand/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 120) return res.status(400).json({ error: "Invalid brand slug" });
    const brand = await prisma.seoBrand.findFirst({ where: { slug, active: true }, select: { name: true, slug: true, description: true, priority: true } });
    if (!brand) return res.status(404).json({ error: "Brand not found" });
    res.json(brand);
  } catch (err) { sendSeoError(res, err); }
});

app.get("/api/seo/brands", async (_req, res) => {
  try {
    const brands = await prisma.seoBrand.findMany({ where: { active: true }, orderBy: [{ priority: "desc" }, { name: "asc" }], select: { name: true, slug: true, description: true, priority: true } });
    res.json(brands);
  } catch (err) { sendSeoError(res, err); }
});

app.get("/sitemap-search.xml", async (_req, res) => {
  try {
    let slugs = NATIONAL_SEARCH_SLUGS;
    try {
      const rows = await prisma.searchIntent.findMany({ where: { active: true, intentType: "commercial", priority: { gte: 80 }, location: null }, select: { slug: true }, orderBy: { priority: "desc" }, take: 1000 });
      if (rows.length) slugs = [...new Set(rows.map((row) => row.slug))];
    } catch (err) { console.warn("[SEO sitemap] database unavailable; using national fallback", err?.message || err); }
    const urls = slugs.map((slug) => `  <url><loc>${escapeXml(`${SITE_URL}/search/${slug}`)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`).join("\n");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
  } catch (err) { sendSeoError(res, err); }
});

app.get("/sitemap-areas.xml", async (_req, res) => {
  try {
    const areas = await prisma.seoArea.findMany({ where: { active: true }, select: { slug: true, updatedAt: true, priority: true }, orderBy: { priority: "desc" }, take: 1000 });
    const urls = areas.map(({ slug, updatedAt }) => `  <url><loc>${escapeXml(`${SITE_URL}/area/${slug}`)}</loc><lastmod>${new Date(updatedAt).toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join("\n");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
  } catch (err) { sendSeoError(res, err); }
});

app.get("/sitemap-brands.xml", async (_req, res) => {
  try {
    const brands = await prisma.seoBrand.findMany({ where: { active: true }, select: { slug: true, updatedAt: true, priority: true }, orderBy: { priority: "desc" }, take: 1000 });
    const urls = brands.map(({ slug, updatedAt }) => `  <url><loc>${escapeXml(`${SITE_URL}/brand/${slug}`)}</loc><lastmod>${new Date(updatedAt).toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join("\n");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
  } catch (err) { sendSeoError(res, err); }
});

export default app;
