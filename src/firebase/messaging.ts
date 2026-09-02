import {
  getMessaging,
  isSupported,
  onMessage,
  onRegistered,
  register,
  getToken,
  unregister,
} from "firebase/messaging";
import type { Messaging } from "firebase/messaging";
import { getFirebaseApp, getVapidKey, isFirebaseConfigured } from "./config";

const DISMISS_KEY = "splendid_push_dismissed_at";
const FID_KEY = "splendid_push_fid";
const TOKEN_KEY = "splendid_push_token";

let messagingInstance: Messaging | null = null;
let registeredCallbackBound = false;

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

export function getStoredFid(): string | null {
  try {
    return localStorage.getItem(FID_KEY);
  } catch {
    return null;
  }
}

function storeFid(fid: string) {
  try {
    localStorage.setItem(FID_KEY, fid);
  } catch { /* ignore */ }
}

function storeToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch { /* ignore */ }
}

export function wasPromptDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Date.now() - ts < 14 * 24 * 60 * 60 * 1000;
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

async function postRegister(payload: {
  installationId: string;
  token?: string;
}) {
  const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const res = await fetch(`${API_BASE}/api/notifications/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      installationId: payload.installationId,
      token: payload.token || undefined,
      userAgent: navigator.userAgent,
      platform: navigator.platform || undefined,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save subscription on server");
  }
}

async function postUnregister(installationId: string) {
  const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  await fetch(`${API_BASE}/api/notifications/unregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ installationId }),
  }).catch(() => {});
}

function ensureOnRegistered(messaging: Messaging) {
  if (registeredCallbackBound) return;
  registeredCallbackBound = true;
  try {
    onRegistered(messaging, (installationId) => {
      if (!installationId) return;
      storeFid(installationId);
      const token = localStorage.getItem(TOKEN_KEY) || undefined;
      postRegister({ installationId, token }).catch((err) =>
        console.warn("[FCM] failed to sync FID", err)
      );
    });
  } catch (err) {
    console.warn("[FCM] onRegistered not available", err);
  }
}

/**
 * Request permission, register with FCM (FID + web token), store on backend.
 */
export async function enablePushNotifications(): Promise<{ ok: boolean; error?: string }> {
  const supported = await messagingSupported();
  if (!supported) {
    return { ok: false, error: "Notifications are not supported in this browser." };
  }

  const messaging = getMessagingSafe();
  if (!messaging) {
    return { ok: false, error: "Push is not configured." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error:
        permission === "denied"
          ? "Notifications are blocked. Enable them in your browser settings for this site."
          : "Permission was not granted.",
    };
  }

  const vapidKey = getVapidKey();
  if (!vapidKey) {
    return { ok: false, error: "Missing VAPID key configuration." };
  }

  // Ensure SW is ready (helps getToken on some browsers)
  try {
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      await navigator.serviceWorker.ready;
    }
  } catch (err) {
    console.warn("[FCM] service worker register", err);
  }

  ensureOnRegistered(messaging);

  let token = "";
  let fid = "";

  // Web delivery still works most reliably with the registration token
  try {
    token = await getToken(messaging, { vapidKey });
    if (token) storeToken(token);
  } catch (err: any) {
    console.warn("[FCM] getToken failed", err);
  }

  // Prefer FID registration when supported
  try {
    await register(messaging, { vapidKey });
    await new Promise((r) => setTimeout(r, 1000));
    fid = getStoredFid() || "";
  } catch (err: any) {
    console.warn("[FCM] register(FID) failed", err);
  }

  // installationId is required by backend — use FID, else token as id
  const installationId = fid || token;
  if (!installationId) {
    return {
      ok: false,
      error: "Could not get a push registration from Firebase. Try Chrome/Safari on HTTPS.",
    };
  }

  try {
    await postRegister({ installationId, token: token || undefined });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to save subscription." };
  }
}

export async function disablePushNotifications(): Promise<void> {
  const messaging = getMessagingSafe();
  const fid = getStoredFid();
  if (fid) await postUnregister(fid);
  if (messaging) {
    try {
      await unregister(messaging);
    } catch { /* ignore */ }
  }
  try {
    localStorage.removeItem(FID_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export function listenForeground(handler: (title: string, body: string) => void) {
  const messaging = getMessagingSafe();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "Splendid Empire";
    const body = payload.notification?.body || "";
    handler(title, body);
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

  ensureOnRegistered(messaging);
  try {
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      await navigator.serviceWorker.ready;
    }
  } catch { /* ignore */ }

  try {
    const token = await getToken(messaging, { vapidKey });
    if (token) storeToken(token);
    try {
      await register(messaging, { vapidKey });
    } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 600));
    const fid = getStoredFid() || token;
    if (fid) await postRegister({ installationId: fid, token: token || undefined });
  } catch (err) {
    console.warn("[FCM] sync failed", err);
  }
}
