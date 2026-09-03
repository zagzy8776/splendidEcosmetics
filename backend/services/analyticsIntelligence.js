/** Deterministic store intelligence. Thresholds are documented, not ML. */

export const THRESHOLDS = {
  HIGH_VIEWS: 10,
  STRONG_PURCHASES: 2,
  STRONG_VIEW_PURCHASE_PCT: 8,
  LOW_CONV_PCT: 3,
  STRONG_CART: 5,
  MIN_ATTENTION_VIEWS: 10,
  MIN_DEMAND_VIEWS: 8,
  MIN_DEMAND_CARTS: 3,
};

export function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function classifyProduct({ views, carts, purchases }) {
  const viewPurchase = pct(purchases, views);
  if (purchases >= THRESHOLDS.STRONG_PURCHASES && viewPurchase >= THRESHOLDS.STRONG_VIEW_PURCHASE_PCT) {
    return { label: "Strong performer", tone: "strong" };
  }
  if (purchases > 0 && purchases >= carts && carts > 0) {
    return { label: "Best seller", tone: "seller" };
  }
  if (views >= THRESHOLDS.HIGH_VIEWS && purchases === 0) {
    return { label: "High views, no purchases", tone: "alert" };
  }
  if (views >= THRESHOLDS.MIN_ATTENTION_VIEWS && viewPurchase < THRESHOLDS.LOW_CONV_PCT) {
    return { label: "High interest, low conversion", tone: "warn" };
  }
  if (carts >= THRESHOLDS.STRONG_CART && purchases <= 1) {
    return { label: "Strong cart interest", tone: "cart" };
  }
  if (views >= THRESHOLDS.HIGH_VIEWS) {
    return { label: "High views", tone: "views" };
  }
  return { label: "Watching", tone: "neutral" };
}

export function classifySource(rawSource, referrer = "") {
  const s = String(rawSource || "").toLowerCase();
  const r = String(referrer || "").toLowerCase();
  const blob = `${s} ${r}`;
  if (blob.includes("tiktok")) return "TikTok";
  if (blob.includes("instagram") || blob.includes("ig.com")) return "Instagram";
  if (blob.includes("facebook") || blob.includes("fb.com") || blob.includes("fbclid")) return "Facebook";
  if (blob.includes("whatsapp") || blob.includes("wa.me")) return "WhatsApp";
  if (blob.includes("google") || blob.includes("gclid")) return "Google";
  if (s && s !== "direct") return "Referral";
  if (r && !r.includes("splendidcosmetics.com.ng")) return "Referral";
  return "Direct";
}

export function classifyInventoryDemand({ views, carts, purchases, stockQuantity, lowStockThreshold, inStock }) {
  const tracked = stockQuantity !== null && stockQuantity !== undefined;
  const stock = tracked ? Number(stockQuantity) : null;
  const threshold = Number(lowStockThreshold || 3);
  if (tracked && stock <= 0) {
    return { label: "Out of stock", tone: "out" };
  }
  const hot =
    views >= THRESHOLDS.MIN_DEMAND_VIEWS ||
    carts >= THRESHOLDS.MIN_DEMAND_CARTS ||
    purchases >= 2;
  if (tracked && stock > 0 && stock <= threshold && hot) {
    return { label: "High demand / low stock", tone: "hot" };
  }
  if (tracked && stock > 0 && stock <= threshold) {
    return { label: "Low stock", tone: "low" };
  }
  if (views < 3 && carts === 0 && purchases === 0) {
    return { label: "Too little data", tone: "neutral" };
  }
  if (views >= THRESHOLDS.MIN_DEMAND_VIEWS && carts === 0 && purchases === 0) {
    return { label: "Interest, no demand yet", tone: "watch" };
  }
  return { label: "Healthy", tone: "ok" };
}

export function abandonedFromSessions(cartSessions, checkoutSessions, purchaseCount, cartValue, checkoutValue) {
  const abandonedBeforeCheckout = Math.max(0, cartSessions - checkoutSessions);
  const abandonedAfterCheckout = Math.max(0, checkoutSessions - purchaseCount);
  return {
    cartsCreated: cartSessions,
    checkoutStarts: checkoutSessions,
    purchases: purchaseCount,
    abandonedBeforeCheckout,
    abandonedAfterCheckout,
    estimatedAbandonedValue: abandonedBeforeCheckout * 0 + (cartValue || 0),
    estimatedCheckoutDropValue: checkoutValue || 0,
    note: "Purchases are store orders in the same date range, not linked to a named shopper.",
  };
}
