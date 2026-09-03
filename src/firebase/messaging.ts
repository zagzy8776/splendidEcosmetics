import {
  getMessaging,
  isSupported,
  onMessage,
  getToken,
  deleteToken,
} from "firebase/messaging";
import type { Messaging } from "firebase/messaging";
import { getFirebaseApp, getVapidKey, isFirebaseConfigured } from "./config";

const DISMISS_KEY = "splendid_push_dismissed_at";
const TOKEN_KEY = "splendid_push_token";
const DEVICE_KEY = "splendid_push_device_id";

function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (id && id.length >= 16) return id;
    id = (crypto.randomUUID && crypto.randomUUID()) || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return `web-${Date.now()}`;
  }
}

let messagingInstance: Messaging | null = null;

export async function messagingSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isFirebaseConfigured()) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

function getMessagingSafe(): Messaging | null {
  if (messagingInstance) return messagingInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch { /* ignore */ }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function wasPromptDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < 14 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

async function postRegister(token: string) {
  const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const res = await fetch(`${API_BASE}/api/notifications/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      installationId: getDeviceId(),
      token,
      userAgent: navigator.userAgent,
      platform: navigator.platform || undefined,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save subscription on server");
  }
}

async function postUnregister(token: string) {
  const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const ids = Array.from(new Set([getDeviceId(), token].filter(Boolean)));
  await Promise.all(
    ids.map((installationId) =>
      fetch(`${API_BASE}/api/notifications/unregister`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installationId }),
      }).catch(() => {})
    )
  );
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn("[FCM] SW register failed", err);
    return null;
  }
}

/**
 * Enable push: permission → SW → getToken → save on server.
 * getToken is required for reliable web delivery with Admin SDK.
 */
export async function enablePushNotifications(): Promise<{ ok: boolean; error?: string }> {
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    (window.navigator as any).standalone === true;
  if (isIOS && !isStandalone) {
    return {
      ok: false,
      error: "On iPhone, open the Home Screen app (Share → Add to Home Screen), then enable notifications.",
    };
  }

  const supported = await messagingSupported();
  if (!supported) {
    return { ok: false, error: "Notifications are not supported in this browser." };
  }

  const messaging = getMessagingSafe();
  if (!messaging) {
    return { ok: false, error: "Push is not configured on this site." };
  }

  // If already denied, requestPermission() will not show a prompt on Chrome
  if (Notification.permission === "denied") {
    return {
      ok: false,
      error:
        "Chrome blocked notifications for this site. Tap the lock icon next to the address → Permissions → Notifications → Allow, then reload.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error:
        permission === "denied"
          ? "Chrome blocked notifications for this site. Tap the lock icon next to the address → Permissions → Notifications → Allow, then reload."
          : "Permission was not granted.",
    };
  }

  const vapidKey = getVapidKey();
  if (!vapidKey) {
    return { ok: false, error: "Missing VAPID key (VITE_FIREBASE_VAPID_KEY)." };
  }

  const swReg = await ensureServiceWorker();
  if (!swReg) {
    return { ok: false, error: "Could not register notification service worker." };
  }

  let token = "";
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });
  } catch (err: any) {
    console.error("[FCM] getToken error", err);
    return {
      ok: false,
      error: err?.message || "Could not get push token from Firebase.",
    };
  }

  if (!token || token.length < 80) {
    return {
      ok: false,
      error: "Firebase returned an empty push token. Check VAPID key and Firebase web config.",
    };
  }

  storeToken(token);

  try {
    await postRegister(token);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to save subscription." };
  }
}

export async function disablePushNotifications(): Promise<void> {
  const messaging = getMessagingSafe();
  const token = getStoredToken();
  if (token) await postUnregister(token);
  if (messaging) {
    try {
      await deleteToken(messaging);
    } catch { /* ignore */ }
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export function listenForeground(
  handler: (title: string, body: string, data?: Record<string, string>) => void
) {
  const messaging = getMessagingSafe();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const title =
      payload.notification?.title ||
      (payload.data && (payload.data as any).title) ||
      "Splendid Empire";
    const body =
      payload.notification?.body ||
      (payload.data && (payload.data as any).body) ||
      "";
    const data = (payload.data || {}) as Record<string, string>;
    handler(String(title), String(body), data);
  });
}

export async function syncExistingRegistration() {
  if (permissionState() !== "granted") return;
  const supported = await messagingSupported();
  if (!supported) return;
  const messaging = getMessagingSafe();
  if (!messaging) return;
  const vapidKey = getVapidKey();
  if (!vapidKey) return;

  try {
    const swReg = await ensureServiceWorker();
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg || undefined,
    });
    if (token && token.length > 80) {
      storeToken(token);
      await postRegister(token);
    }
  } catch (err) {
    console.warn("[FCM] sync failed", err);
  }
}
