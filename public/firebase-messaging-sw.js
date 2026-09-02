/* Splendid Empire — Firebase Messaging service worker (compat CDN for reliability on Vercel) */
/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

// Config is public client config (same as VITE_FIREBASE_*). Filled by vite plugin at build/dev.
self.__FIREBASE_CONFIG__ = self.__FIREBASE_CONFIG__ || {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "PLACEHOLDER_AUTH_DOMAIN",
  projectId: "PLACEHOLDER_PROJECT_ID",
  storageBucket: "PLACEHOLDER_STORAGE_BUCKET",
  messagingSenderId: "PLACEHOLDER_MESSAGING_SENDER_ID",
  appId: "PLACEHOLDER_APP_ID",
};

try {
  firebase.initializeApp(self.__FIREBASE_CONFIG__);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || "Splendid Empire";
    const body = (payload.notification && payload.notification.body) || "";
    const icon = "/logo.jpg";
    const data = payload.data || {};
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "/favicon.svg",
      data,
    });
  });
} catch (err) {
  console.error("[firebase-messaging-sw] init failed", err);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.click_url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          client.focus();
          if (url && url !== "/" && "navigate" in client) {
            try { client.navigate(url); } catch (_) {}
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url.startsWith("http") ? url : self.location.origin + (url.startsWith("/") ? url : "/" + url));
      }
    })
  );
});
