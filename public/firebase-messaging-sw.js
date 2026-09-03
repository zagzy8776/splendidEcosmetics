/* Splendid Empire FCM service worker */
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");
importScripts("/firebase-config.js");

const DEFAULT_ICON = "/icon-192.png";
const DEFAULT_BADGE = "/icon-96.png";

try {
  firebase.initializeApp(self.__FIREBASE_CONFIG__);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title =
      (payload.notification && payload.notification.title) ||
      (payload.data && payload.data.title) ||
      "Splendid Empire";
    const body =
      (payload.notification && payload.notification.body) ||
      (payload.data && payload.data.body) ||
      "";
    const data = payload.data || {};
    const icon = data.icon || DEFAULT_ICON;
    const image = data.image || undefined;
    return self.registration.showNotification(title, {
      body,
      icon,
      badge: DEFAULT_BADGE,
      image,
      data,
      tag: data.tag || data.orderId || "splendid-push",
      renotify: true,
      requireInteraction: true,
    });
  });
} catch (err) {
  console.error("[firebase-messaging-sw] init failed", err);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const path = data.click_url || data.link || "/";
  const url = path.startsWith("http")
    ? path
    : self.location.origin + (path.startsWith("/") ? path : "/" + path);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientsArr) => {
      for (const c of clientsArr) {
        if (c.url && c.url.startsWith(self.location.origin) && "focus" in c) {
          await c.focus();
          try {
            if ("navigate" in c && typeof c.navigate === "function") {
              await c.navigate(url);
              return;
            }
          } catch (_) {}
          // Fallback: open target in this client via postMessage
          try {
            c.postMessage({ type: "NOTIFICATION_CLICK", url });
          } catch (_) {}
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("push", (event) => {
  let title = "Splendid Empire";
  let body = "";
  let data = {};
  try {
    const json = event.data ? event.data.json() : {};
    title = (json.notification && json.notification.title) || (json.data && json.data.title) || title;
    body = (json.notification && json.notification.body) || (json.data && json.data.body) || body;
    data = json.data || {};
  } catch (_) {
    try {
      body = event.data ? event.data.text() : "";
    } catch (_) {}
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: data.icon || DEFAULT_ICON,
      badge: DEFAULT_BADGE,
      image: data.image || undefined,
      data,
      tag: data.tag || data.orderId || "splendid-push",
      renotify: true,
      requireInteraction: true,
    })
  );
});
