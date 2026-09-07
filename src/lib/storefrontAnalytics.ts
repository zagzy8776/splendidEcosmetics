import { trackTikTokEvent, initTikTokPixel } from "./tiktok";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const VID_KEY = "se_vid";
const SID_KEY = "se_sid";

type EventPayload = Record<string, string | number | null | undefined>;

function safeId(): string {
  try {
    if (crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VID_KEY);
    if (!id) {
      id = safeId();
      localStorage.setItem(VID_KEY, id);
    }
    return id;
  } catch {
    return safeId();
  }
}

export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id = safeId();
      sessionStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return safeId();
  }
}

const queue: Array<{ type: string; payload: EventPayload }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const recentProductViews = new Map<string, number>();

function mirrorToTikTok(type: string, payload: EventPayload) {
  try {
    const product = payload.productId
      ? [{
          content_id: String(payload.productId),
          content_name: payload.productName ? String(payload.productName) : undefined,
          content_category: payload.category ? String(payload.category) : undefined,
          quantity: Number(payload.quantity || 1),
          price: Number(payload.price || 0),
        }]
      : undefined;

    if (type === "view_item") {
      trackTikTokEvent("ViewContent", {
        content_type: "product",
        contents: product,
        content_id: payload.productId ? String(payload.productId) : undefined,
        currency: "NGN",
        value: Number(payload.price || 0),
      });
    } else if (type === "add_to_cart") {
      trackTikTokEvent("AddToCart", {
        content_type: "product",
        contents: product,
        content_id: payload.productId ? String(payload.productId) : undefined,
        currency: "NGN",
        value: Number(payload.price || 0) * Number(payload.quantity || 1),
      });
    } else if (type === "begin_checkout") {
      trackTikTokEvent("InitiateCheckout", {
        content_type: "product",
        currency: "NGN",
        value: Number(payload.price || 0),
      });
    } else if (type === "search") {
      trackTikTokEvent("Search", { query: payload.searchTerm ? String(payload.searchTerm) : "" });
    } else if (type === "whatsapp_click") {
      trackTikTokEvent("Contact", { contact_method: "WhatsApp" });
    } else if (type === "place_order") {
      trackTikTokEvent("PlaceAnOrder", {
        content_type: "product",
        currency: "NGN",
        value: Number(payload.value || 0),
      }, payload.orderId ? String(payload.orderId) : undefined);
    }
  } catch {
    // TikTok is optional and must never affect checkout or navigation.
  }
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!queue.length) return;
  const events = queue.splice(0, 20);
  const attr = getAttribution();
  const body = JSON.stringify({
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    source: attr.source,
    medium: attr.medium,
    campaign: attr.campaign,
    referrer: attr.referrer,
    events,
  });
  fetch(`${API_BASE}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackStoreEvent(type: string, payload: EventPayload = {}) {
  try {
    queue.push({ type, payload });
    mirrorToTikTok(type, payload);
    if (queue.length >= 8) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, 900);
  } catch {
    /* analytics must never throw */
  }
}

export function trackProductView(product: {
  id: string;
  name: string;
  category?: string;
  price?: number;
}) {
  if (!product?.id) return;
  const last = recentProductViews.get(product.id) || 0;
  if (Date.now() - last < 60_000) return;
  recentProductViews.set(product.id, Date.now());
  trackStoreEvent("view_item", {
    productId: product.id,
    productName: product.name,
    category: product.category,
    price: product.price,
    currency: "NGN",
    section: "product",
  });
  setPresenceContext("product", product);
}

let presence = { section: "home", productId: null as string | null, productName: null as string | null };
let heartbeatStarted = false;

export function setPresenceContext(
  section: string,
  product?: { id?: string; name?: string } | null
) {
  presence = {
    section,
    productId: product?.id || null,
    productName: product?.name || null,
  };
}

function sendHeartbeat() {
  fetch(`${API_BASE}/api/analytics/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      section: presence.section,
      productId: presence.productId,
      productName: presence.productName,
      ...getAttribution(),
    }),
    keepalive: true,
  }).catch(() => {});
}

export function startPresenceHeartbeat() {
  if (heartbeatStarted || typeof window === "undefined") return;
  heartbeatStarted = true;
  initTikTokPixel();
  sendHeartbeat();
  setInterval(sendHeartbeat, 45_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") sendHeartbeat();
  });
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest?.("a") as HTMLAnchorElement | null;
    if (!link) return;
    const href = link.href || "";
    if (href.includes("wa.me/")) {
      trackStoreEvent("whatsapp_click", { section: "storefront" });
    }
  }, { passive: true });
}

function getAttribution() {
  try {
    const stored = sessionStorage.getItem("se_src");
    if (stored) return JSON.parse(stored);
    const q = new URLSearchParams(window.location.search);
    const utm = (q.get("utm_source") || "").slice(0, 40);
    const medium = (q.get("utm_medium") || "").slice(0, 40);
    const campaign = (q.get("utm_campaign") || "").slice(0, 80);
    const ttclid = (q.get("ttclid") || "").slice(0, 180);
    const fbclid = (q.get("fbclid") || "").slice(0, 180);
    const gclid = (q.get("gclid") || "").slice(0, 180);
    const referrer = String(document.referrer || "").slice(0, 180);
    const source = ttclid ? "TikTok" : fbclid ? "Facebook" : gclid ? "Google" : utm || referrer || "direct";
    const normalizedMedium = medium || (ttclid ? "paid_social" : fbclid ? "paid_social" : gclid ? "paid_search" : "");
    const attr = { source, medium: normalizedMedium, campaign, referrer };
    sessionStorage.setItem("se_src", JSON.stringify(attr));
    return attr;
  } catch {
    return { source: "direct", medium: "", campaign: "", referrer: "" };
  }
}
