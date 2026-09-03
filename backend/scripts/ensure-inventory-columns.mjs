/**
 * Additive-only production helper.
 * Adds inventory columns if missing. Never drops or rewrites rows.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function columnExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'products'
       AND column_name = $1
     LIMIT 1`,
    name
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const beforeProducts = await prisma.product.count();
  const beforeOrders = await prisma.order.count();

  const hadQty = await columnExists("stock_quantity");
  const hadThreshold = await columnExists("low_stock_threshold");

  if (!hadQty) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "products" ADD COLUMN "stock_quantity" INTEGER`
    );
  }
  if (!hadThreshold) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "products" ADD COLUMN "low_stock_threshold" INTEGER NOT NULL DEFAULT 3`
    );
  }

  const afterQty = await columnExists("stock_quantity");
  const afterThreshold = await columnExists("low_stock_threshold");
  const afterProducts = await prisma.product.count();
  const afterOrders = await prisma.order.count();

  const untracked = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS c FROM products WHERE stock_quantity IS NULL`
  );

  console.log(
    JSON.stringify(
      {
        addedStockQuantity: !hadQty && afterQty,
        addedLowStockThreshold: !hadThreshold && afterThreshold,
        columns: {
          stock_quantity: afterQty,
          low_stock_threshold: afterThreshold,
        },
        productsBefore: beforeProducts,
        productsAfter: afterProducts,
        ordersBefore: beforeOrders,
        ordersAfter: afterOrders,
        legacyNullStockQuantity: untracked?.[0]?.c ?? null,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
