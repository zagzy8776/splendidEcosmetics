/* Splendid Empire FCM service worker */
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");
importScripts("/firebase-config.js");

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
    return self.registration.showNotification(title, {
      body,
      icon: "/logo.jpg",
      badge: "/favicon.svg",
      data,
      tag: "splendid-push",
      renotify: true,
      requireInteraction: true,
    });
  });
} catch (err) {
  console.error("[firebase-messaging-sw] init failed", err);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path =
    (event.notification.data && event.notification.data.click_url) || "/";
  const url = path.startsWith("http")
    ? path
    : self.location.origin + (path.startsWith("/") ? path : "/" + path);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const c of clientsArr) {
        if ("focus" in c) {
          c.focus();
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("push", (event) => {
  // Fallback if firebase handler does not run
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
      icon: "/logo.jpg",
      data,
      tag: "splendid-push",
      renotify: true,
      requireInteraction: true,
    })
  );
});
