/**
 * Additive-only production helper for SEO discovery tables.
 * Never drops, rewrites, or alters product/order data.
 * Safe to run repeatedly.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `CREATE TABLE IF NOT EXISTS "seo_locations" (
    "id" TEXT PRIMARY KEY,
    "state" TEXT NOT NULL,
    "capital" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "region" TEXT,
    "description" TEXT NOT NULL,
    "is_capital" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "seo_locations_state_capital_key" ON "seo_locations" ("state", "capital")`,
  `CREATE INDEX IF NOT EXISTS "seo_locations_state_active_idx" ON "seo_locations" ("state", "active")`,
  `CREATE INDEX IF NOT EXISTS "seo_locations_capital_active_idx" ON "seo_locations" ("capital", "active")`,

  `CREATE TABLE IF NOT EXISTS "seo_areas" (
    "id" TEXT PRIMARY KEY,
    "state" TEXT NOT NULL,
    "capital" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "seo_areas_state_active_idx" ON "seo_areas" ("state", "active")`,
  `CREATE INDEX IF NOT EXISTS "seo_areas_capital_active_idx" ON "seo_areas" ("capital", "active")`,
  `CREATE INDEX IF NOT EXISTS "seo_areas_area_active_idx" ON "seo_areas" ("area", "active")`,

  `CREATE TABLE IF NOT EXISTS "search_intents" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
    "query" TEXT NOT NULL,
    "intent_type" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "search_intents_intent_type_active_idx" ON "search_intents" ("intent_type", "active")`,
  `CREATE INDEX IF NOT EXISTS "search_intents_topic_active_idx" ON "search_intents" ("topic", "active")`,
  `CREATE INDEX IF NOT EXISTS "search_intents_location_active_idx" ON "search_intents" ("location", "active")`,

  `CREATE TABLE IF NOT EXISTS "content_topics" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "category" TEXT,
    "audience" TEXT,
    "search_questions" TEXT NOT NULL DEFAULT '[]',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "content_topics_content_type_active_idx" ON "content_topics" ("content_type", "active")`,
  `CREATE INDEX IF NOT EXISTS "content_topics_category_active_idx" ON "content_topics" ("category", "active")`,

  `CREATE TABLE IF NOT EXISTS "seo_brands" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "seo_brands_active_priority_idx" ON "seo_brands" ("active", "priority")`,

  `CREATE TABLE IF NOT EXISTS "seo_claims" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "claim" TEXT NOT NULL,
    "claim_type" TEXT NOT NULL,
    "value" TEXT,
    "source" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "seo_claims_claim_type_active_idx" ON "seo_claims" ("claim_type", "active")`,
  `CREATE INDEX IF NOT EXISTS "seo_claims_verified_active_idx" ON "seo_claims" ("verified", "active")`,
];

async function tableExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    name
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const names = ["seo_locations", "seo_areas", "search_intents", "content_topics", "seo_brands", "seo_claims"];
  const before = await Promise.all(names.map(tableExists));
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
  const after = await Promise.all(names.map(tableExists));

  console.log(JSON.stringify({
    additiveOnly: true,
    tables: Object.fromEntries(names.map((name, index) => [name, { before: before[index], after: after[index] }])),
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
