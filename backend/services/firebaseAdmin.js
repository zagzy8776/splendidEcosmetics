/**
 * Firebase Admin for Vercel.
 * Supports:
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   OR FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string from the downloaded key file)
 */

let adminMod = null;
let initPromise = null;
let lastError = null;
let statusCache = null;

function envFlags() {
  return {
    hasProjectId: !!(process.env.FIREBASE_PROJECT_ID || "").trim(),
    hasClientEmail: !!(process.env.FIREBASE_CLIENT_EMAIL || "").trim(),
    hasPrivateKey: !!(process.env.FIREBASE_PRIVATE_KEY || "").trim(),
    hasServiceAccountJson: !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim(),
  };
}

function normalizePrivateKey(raw) {
  if (!raw || typeof raw !== "string") return null;
  let k = raw.trim();
  // Strip one layer of wrapping quotes
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  // JSON-escaped newlines
  k = k.replace(/\\n/g, "\n");
  k = k.replace(/\r\n/g, "\n").trim();
  return k;
}

function buildCredential() {
  // Preferred: full service account JSON (most reliable on Vercel)
  const jsonRaw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (jsonRaw) {
    try {
      let text = jsonRaw;
      if (
        (text.startsWith('"') && text.endsWith('"')) ||
        (text.startsWith("'") && text.endsWith("'"))
      ) {
        text = text.slice(1, -1);
      }
      const parsed = JSON.parse(text);
      if (!parsed.private_key || !parsed.client_email || !parsed.project_id) {
        lastError = "FIREBASE_SERVICE_ACCOUNT_JSON missing private_key/client_email/project_id";
        return null;
      }
      parsed.private_key = normalizePrivateKey(parsed.private_key);
      return parsed;
    } catch (err) {
      lastError = "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON";
      console.error("[Firebase Admin]", lastError, err?.message);
      return null;
    }
  }

  const projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    lastError =
      "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_JSON)";
    return null;
  }

  if (!privateKey.includes("BEGIN") || !privateKey.includes("PRIVATE KEY")) {
    lastError = "FIREBASE_PRIVATE_KEY missing BEGIN PRIVATE KEY header";
    return null;
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
}

async function loadAdminModule() {
  if (adminMod) return adminMod;
  try {
    const mod = await import("firebase-admin");
    adminMod = mod.default || mod;
    return adminMod;
  } catch (err) {
    lastError = "firebase-admin package failed to load: " + (err?.message || String(err));
    console.error("[Firebase Admin]", lastError);
    return null;
  }
}

/**
 * Initialize once. Safe to call many times.
 * Returns messaging instance or null.
 */
export async function ensureMessaging() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const flags = envFlags();
    statusCache = { ...flags, packageOk: false, initialized: false, lastError: null };

    const admin = await loadAdminModule();
    if (!admin) {
      statusCache.lastError = lastError;
      return null;
    }
    statusCache.packageOk = true;

    if (admin.apps && admin.apps.length) {
      statusCache.initialized = true;
      statusCache.lastError = null;
      return admin.messaging();
    }

    const cred = buildCredential();
    if (!cred) {
      statusCache.lastError = lastError;
      return null;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: cred.project_id,
          clientEmail: cred.client_email,
          privateKey: cred.private_key,
        }),
      });
      statusCache.initialized = true;
      statusCache.lastError = null;
      lastError = null;
      return admin.messaging();
    } catch (err) {
      lastError = err?.message || "credential.cert / initializeApp failed";
      statusCache.lastError = lastError;
      console.error("[Firebase Admin] init failed:", lastError);
      // Allow retry on next cold start by clearing promise on failure
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

/** Sync-ish status for admin UI (may trigger init) */
export async function getFirebaseConfigStatus() {
  await ensureMessaging();
  return (
    statusCache || {
      ...envFlags(),
      packageOk: false,
      initialized: false,
      lastError,
    }
  );
}

/** Back-compat for older call sites */
export function getMessaging() {
  // Cannot fully init sync; return existing app messaging if already init
  try {
    if (!adminMod) return null;
    if (adminMod.apps && adminMod.apps.length) {
      return adminMod.messaging();
    }
  } catch {
    return null;
  }
  return null;
}

export function getFirebaseAdmin() {
  try {
    if (adminMod?.apps?.length) return adminMod.app();
  } catch {
    /* ignore */
  }
  return null;
}

export async function sendToFid(fid, { title, body, data = {}, link = "/" }) {
  const messaging = await ensureMessaging();
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
