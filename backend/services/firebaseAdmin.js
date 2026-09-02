/**
 * Firebase Admin singleton for Vercel serverless + local Node.
 * Credentials come ONLY from env vars — never from the client.
 */
import admin from "firebase-admin";

let initialized = false;

export function getFirebaseAdmin() {
  if (initialized) {
    try {
      return admin.app();
    } catch {
      initialized = false;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  // Vercel/env often stores newlines as \n
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  initialized = true;
  return admin.app();
}

export function getMessaging() {
  const app = getFirebaseAdmin();
  if (!app) return null;
  return admin.messaging();
}

/**
 * Send a web push notification to a single FID.
 * Returns { success, errorCode? }
 */
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
      fcmOptions: {
        link: link.startsWith("http") ? link : undefined,
      },
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

/** Codes that mean the subscription is permanently invalid */
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
