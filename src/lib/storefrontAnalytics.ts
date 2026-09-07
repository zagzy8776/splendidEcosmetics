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
  sendHeartbeat();
  setInterval(sendHeartbeat, 45_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") sendHeartbeat();
  });
}

function getAttribution() {
  try {
    const stored = sessionStorage.getItem("se_src");
    if (stored) return JSON.parse(stored);
    const q = new URLSearchParams(window.location.search);
    const utm = (q.get("utm_source") || "").slice(0, 40);
    const medium = (q.get("utm_medium") || "").slice(0, 40);
    const campaign = (q.get("utm_campaign") || "").slice(0, 80);
    const referrer = String(document.referrer || "").slice(0, 180);
    const source = utm || referrer || "direct";
    const attr = { source, medium, campaign, referrer };
    sessionStorage.setItem("se_src", JSON.stringify(attr));
    return attr;
  } catch {
    return { source: "direct", medium: "", campaign: "", referrer: "" };
  }
}
