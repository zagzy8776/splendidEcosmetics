import {
  pct,
  classifyProduct,
  classifySource,
  classifyInventoryDemand,
  THRESHOLDS,
} from "./analyticsIntelligence.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(pct(3, 32) === 9.4, "view purchase pct");
assert(classifyProduct({ views: 32, carts: 8, purchases: 4 }).tone === "strong", "strong performer");
assert(classifyProduct({ views: 24, carts: 2, purchases: 0 }).tone === "alert", "high views no purchase");
assert(classifyProduct({ views: 24, carts: 2, purchases: 0 }).label.includes("no purchases"), "label");
assert(classifySource("tiktok", "") === "TikTok", "tiktok");
assert(classifySource("", "https://www.google.com/") === "Google", "google ref");
assert(classifySource("", "") === "Direct", "direct");
assert(classifyInventoryDemand({ views: 47, carts: 13, purchases: 6, stockQuantity: 2, lowStockThreshold: 3 }).tone === "hot", "high demand low stock");
assert(classifyInventoryDemand({ views: 1, carts: 0, purchases: 0, stockQuantity: 20, lowStockThreshold: 3 }).tone === "neutral", "tiny sample not low demand");
assert(THRESHOLDS.HIGH_VIEWS === 10, "threshold");
console.log("analytics intelligence tests passed");

assert(classifySource("", "https://www.tiktok.com/@x") === "TikTok", "referrer tiktok");
assert(classifySource("direct", "") === "Direct", "direct source");
console.log("attribution classification tests passed");
