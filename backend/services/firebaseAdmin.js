/**
 * Firebase Admin — does not crash the server if package/env is missing.
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let admin = null;
let packageLoadTried = false;
let lastInitError = null;

function tryLoadAdmin() {
  if (packageLoadTried) return admin;
  packageLoadTried = true;
  try {
    admin = require("firebase-admin");
  } catch (err) {
    lastInitError = "firebase-admin package missing on server";
    console.error("[Firebase Admin] not installed:", err?.message || err);
    admin = null;
  }
  return admin;
}

/** Normalize private key from Vercel / .env paste formats */
function normalizePrivateKey(raw) {
  if (!raw || typeof raw !== "string") return null;
  let k = raw.trim();
  // Strip wrapping quotes Vercel sometimes adds
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  // Convert escaped newlines to real newlines (repeat for double-escape)
  k = k.replace(/\\n/g, "\n");
  if (k.includes("\\n")) k = k.replace(/\\n/g, "\n");
  // Some pastes use literal "\n" mixed with real breaks
  k = k.replace(/\r\n/g, "\n");
  return k;
}

export function getFirebaseConfigStatus() {
  const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
  const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
  const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
  const mod = tryLoadAdmin();
  const packageOk = !!mod;
  let initialized = false;
  if (mod && mod.apps && mod.apps.length) initialized = true;
  else if (hasProjectId && hasClientEmail && hasPrivateKey && packageOk) {
    // try init
    initialized = !!getFirebaseAdmin();
  }
  return {
    hasProjectId,
    hasClientEmail,
    hasPrivateKey,
    packageOk,
    initialized,
    lastError: lastInitError,
  };
}

export function getFirebaseAdmin() {
  const mod = tryLoadAdmin();
  if (!mod) return null;

  if (mod.apps && mod.apps.length) {
    return mod.app();
  }

  const projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    lastInitError = "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY";
    return null;
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY") && !privateKey.includes("BEGIN RSA PRIVATE KEY")) {
    lastInitError = "FIREBASE_PRIVATE_KEY does not look like a PEM private key (missing BEGIN line)";
    console.error("[Firebase Admin]", lastInitError);
    return null;
  }

  try {
    mod.initializeApp({
      credential: mod.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    lastInitError = null;
    return mod.app();
  } catch (err) {
    lastInitError = err?.message || "Firebase credential init failed";
    console.error("[Firebase Admin] init failed:", lastInitError);
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
    lastInitError = err?.message || "messaging() failed";
    console.error("[Firebase Admin] messaging failed:", lastInitError);
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
