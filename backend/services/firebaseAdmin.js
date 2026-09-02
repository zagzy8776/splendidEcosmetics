/**
 * Firebase Admin — does not crash the server if package/env is missing.
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let admin = null;
let initTried = false;

function tryLoadAdmin() {
  if (initTried) return admin;
  initTried = true;
  try {
    admin = require("firebase-admin");
  } catch (err) {
    console.error("[Firebase Admin] not installed:", err?.message || err);
    admin = null;
  }
  return admin;
}

export function getFirebaseAdmin() {
  const mod = tryLoadAdmin();
  if (!mod) return null;

  if (mod.apps && mod.apps.length) {
    return mod.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    mod.initializeApp({
      credential: mod.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return mod.app();
  } catch (err) {
    console.error("[Firebase Admin] init failed:", err?.message || err);
    return null;
  }
}

export function getMessaging() {
  const mod = tryLoadAdmin();
  const app = getFirebaseAdmin();
  if (!mod || !app) return null;
  try {
    return mod.messaging();
  } catch (err) {
    console.error("[Firebase Admin] messaging failed:", err?.message || err);
    return null;
  }
}

export async function sendToFid(fid, { title, body, data = {}, link = "/" }) {
  const messaging = getMessaging();
  if (!messaging) {
    return { success: false, errorCode: "admin-not-configured" };
  }

  const message = {
    fid,
    notification: {
      title: String(title).slice(0, 100),
      body: String(body).slice(0, 500),
    },
    webpush: {
      notification: {
        title: String(title).slice(0, 100),
        body: String(body).slice(0, 500),
        icon: "/logo.jpg",
        badge: "/favicon.svg",
      },
      data: Object.fromEntries(
        Object.entries({ ...data, click_url: link || "/" }).map(([k, v]) => [k, String(v)])
      ),
    },
    data: Object.fromEntries(
      Object.entries({ ...data, click_url: link || "/" }).map(([k, v]) => [k, String(v)])
    ),
  };

  try {
    await messaging.send(message);
    return { success: true };
  } catch (err) {
    const code = err?.code || err?.errorInfo?.code || "unknown";
    console.error("[FCM send error]", code, err?.message);
    return { success: false, errorCode: code };
  }
}

export function isUnregisteredError(code) {
  if (!code) return false;
  const c = String(code).toLowerCase();
  return (
    c.includes("registration-token-not-registered") ||
    c.includes("installation-id-not-registered") ||
    c.includes("invalid-registration") ||
    c.includes("not-found") ||
    c.includes("unregistered")
  );
}
