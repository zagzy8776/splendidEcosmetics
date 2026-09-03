-- Additive inventory fields. Existing rows keep stock_quantity NULL
-- so current inStock values stay in force until an admin sets a quantity.

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "stock_quantity" INTEGER,
  ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER NOT NULL DEFAULT 3;
