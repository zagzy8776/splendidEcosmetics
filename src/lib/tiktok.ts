type TikTokEventProperties = Record<string, string | number | boolean | null | undefined | object>;

declare global {
  interface Window {
    ttq?: any;
  }
}

const PIXEL_ID = String(import.meta.env.VITE_TIKTOK_PIXEL_ID || "").trim();
const pending: Array<{ eventName: string; properties?: TikTokEventProperties; eventId?: string }> = [];
let loading = false;
let ready = false;

function flush() {
  if (!ready || !window.ttq || typeof window.ttq.track !== "function") return;
  while (pending.length) {
    const event = pending.shift();
    if (!event) break;
    try {
      window.ttq.track(
        event.eventName,
        event.properties,
        event.eventId ? { event_id: event.eventId } : undefined,
      );
    } catch {
      // Third-party analytics must never break the storefront.
    }
  }
}

function ensurePixel() {
  if (typeof window === "undefined" || !PIXEL_ID || ready || loading) return;
  loading = true;

  try {
    if (window.ttq && typeof window.ttq.track === "function") {
      ready = true;
      loading = false;
      flush();
      return;
    }

    // TikTok's loader consumes the queue while the SDK script initializes.
    const ttq: any[] = [];
    (ttq as any).methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
    (ttq as any).setAndDefer = (target: any, method: string) => {
      target[method] = (...args: any[]) => target.push([method, ...args]);
    };
    for (const method of (ttq as any).methods) {
      (ttq as any).setAndDefer(ttq, method);
    }
    window.ttq = ttq;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(PIXEL_ID)}&lib=ttq`;
    script.dataset.splendidTiktok = "true";
    script.onload = () => {
      try {
        window.ttq.load(PIXEL_ID);
        window.ttq.page();
        ready = true;
        flush();
      } catch {
        // Keep the storefront usable if the SDK fails to initialize.
      } finally {
        loading = false;
      }
    };
    script.onerror = () => {
      loading = false;
    };
    document.head.appendChild(script);
  } catch {
    loading = false;
  }
}

export function initTikTokPixel() {
  ensurePixel();
}

export function trackTikTokEvent(
  eventName: string,
  properties: TikTokEventProperties = {},
  eventId?: string,
) {
  if (!PIXEL_ID || typeof window === "undefined") return;
  ensurePixel();
  pending.push({ eventName, properties, eventId });
  flush();
}
