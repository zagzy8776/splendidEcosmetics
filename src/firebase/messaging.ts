import { getMessaging, isSupported, onMessage, onRegistered, register, unregister } from "firebase/messaging";
import type { Messaging } from "firebase/messaging";
import { getFirebaseApp, getVapidKey, isFirebaseConfigured } from "./config";

const DISMISS_KEY = "splendid_push_dismissed_at";
const FID_KEY = "splendid_push_fid";

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

export function wasPromptDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    // Don't re-prompt for 14 days after "Not now"
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

async function postRegister(installationId: string) {
  const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  await fetch(`${API_BASE}/api/notifications/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      installationId,
      userAgent: navigator.userAgent,
      platform: navigator.platform || undefined,
    }),
  });
}

async function postUnregister(installationId: string) {
  const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  await fetch(`${API_BASE}/api/notifications/unregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ installationId }),
  }).catch(() => {});
}

/**
 * Ensure onRegistered is bound once so FID changes are always synced.
 */
function ensureOnRegistered(messaging: Messaging) {
  if (registeredCallbackBound) return;
  registeredCallbackBound = true;
  onRegistered(messaging, (installationId) => {
    if (!installationId) return;
    storeFid(installationId);
    postRegister(installationId).catch((err) =>
      console.warn("[FCM] failed to sync registration", err)
    );
  });
}

/**
 * Request permission (must be called from user gesture), register with FCM,
 * and store FID on the Splendid backend.
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

  ensureOnRegistered(messaging);

  try {
    await register(messaging, { vapidKey });
    // FID arrives via onRegistered; wait briefly for local storage
    await new Promise((r) => setTimeout(r, 800));
    const fid = getStoredFid();
    if (fid) {
      await postRegister(fid);
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[FCM register]", err);
    return { ok: false, error: err?.message || "Failed to enable notifications." };
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
  } catch { /* ignore */ }
}

/** Foreground messages while the tab is open */
export function listenForeground(handler: (title: string, body: string) => void) {
  const messaging = getMessagingSafe();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "Splendid Empire";
    const body = payload.notification?.body || "";
    handler(title, body);
  });
}

/** Re-register on load if permission already granted */
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
    await register(messaging, { vapidKey });
  } catch (err) {
    console.warn("[FCM] sync register failed", err);
  }
}
