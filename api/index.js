import app from "../backend/server.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sendSeoError = (res, err) => {
  console.error("[SEO API]", err?.message || err);
  res.status(503).json({ error: "SEO discovery data is temporarily unavailable" });
};

// Public, read-only SEO discovery endpoints. They never read or mutate products.
app.get("/api/seo/location/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 120) return res.status(400).json({ error: "Invalid location slug" });
    const location = await prisma.seoLocation.findFirst({
      where: { slug, active: true },
      select: { state: true, capital: true, slug: true, country: true, region: true, description: true, isCapital: true, priority: true },
    });
    if (!location) return res.status(404).json({ error: "Location not found" });
    res.json(location);
  } catch (err) {
    sendSeoError(res, err);
  }
});

app.get("/api/seo/search/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 160) return res.status(400).json({ error: "Invalid search slug" });
    const intent = await prisma.searchIntent.findFirst({
      where: { slug, active: true },
      select: { slug: true, query: true, intentType: true, topic: true, location: true, description: true, priority: true },
    });
    if (!intent) return res.status(404).json({ error: "Search intent not found" });
    res.json(intent);
  } catch (err) {
    sendSeoError(res, err);
  }
});

app.get("/api/seo/guide/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 160) return res.status(400).json({ error: "Invalid guide slug" });
    const topic = await prisma.contentTopic.findFirst({
      where: { slug, active: true },
      select: { slug: true, title: true, summary: true, contentType: true, category: true, audience: true, searchQuestions: true, priority: true },
    });
    if (!topic) return res.status(404).json({ error: "Guide not found" });
    res.json(topic);
  } catch (err) {
    sendSeoError(res, err);
  }
});

app.get("/api/seo/brands", async (_req, res) => {
  try {
    const brands = await prisma.seoBrand.findMany({
      where: { active: true },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      select: { name: true, slug: true, description: true, priority: true },
    });
    res.json(brands);
  } catch (err) {
    sendSeoError(res, err);
  }
});

// Force production function refresh for analytics cron routes.
export default app;
