type TikTokEventProperties = Record<string, string | number | boolean | null | undefined | object>;

declare global {
  interface Window {
    ttq?: {
      load: (pixelId: string) => void;
      page: () => void;
      track: (eventName: string, properties?: TikTokEventProperties, options?: { event_id?: string }) => void;
    };
  }
}

const PIXEL_ID = String(import.meta.env.VITE_TIKTOK_PIXEL_ID || "").trim();
const queue: Array<{ eventName: string; properties?: TikTokEventProperties; eventId?: string }> = [];
let loading = false;
let ready = false;

function flush() {
  if (!ready || !window.ttq) return;
  while (queue.length) {
    const event = queue.shift();
    if (!event) break;
    try {
      window.ttq.track(event.eventName, event.properties, event.eventId ? { event_id: event.eventId } : undefined);
    } catch {
      // Analytics must never break the storefront.
    }
  }
}

function ensurePixel() {
  if (typeof window === "undefined" || !PIXEL_ID || ready || loading) return;
  loading = true;

  try {
    const existing = document.querySelector('script[data-splendid-tiktok="true"]');
    if (existing) {
      ready = !!window.ttq;
      loading = false;
      flush();
      return;
    }

    window.ttq = window.ttq || {
      load: () => {},
      page: () => {},
      track: () => {},
    };

    const ttq = window.ttq;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(PIXEL_ID)}&lib=ttq`;
    script.dataset.splendidTiktok = "true";
    script.onload = () => {
      try {
        window.ttq?.load(PIXEL_ID);
        window.ttq?.page();
        ready = true;
        flush();
      } catch {
        // Keep the storefront usable if the third-party pixel fails.
      } finally {
        loading = false;
      }
    };
    script.onerror = () => {
      loading = false;
    };
    document.head.appendChild(script);

    // Keep the local reference alive while the remote SDK initializes.
    void ttq;
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
  queue.push({ eventName, properties, eventId });
  flush();
}
