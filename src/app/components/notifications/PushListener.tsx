import { useEffect } from "react";
import { listenForeground, permissionState } from "../../../firebase/messaging";

/**
 * When the site tab is open, FCM delivers to onMessage (no system tray).
 * Show a browser notification so the user still sees it.
 */
export default function PushListener() {
  useEffect(() => {
    if (permissionState() !== "granted") return;

    // Service worker may postMessage when notification is clicked and navigate() is unavailable
    const onMsg = (event: MessageEvent) => {
      if (event?.data?.type === "NOTIFICATION_CLICK" && typeof event.data.url === "string") {
        try {
          window.location.href = event.data.url;
        } catch {
          /* ignore */
        }
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);

    const unsub = listenForeground((title, body, data) => {
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const n = new Notification(title || "Splendid Empire", {
            body: body || "",
            icon: "/icon-192.png",
            tag: (data && (data.tag || data.orderId)) || `fg-${Date.now()}`,
            data: data || {},
          });
          n.onclick = () => {
            window.focus();
            const path = (data && (data.click_url || data.link)) || "/";
            const url = path.startsWith("http") ? path : window.location.origin + (path.startsWith("/") ? path : "/" + path);
            try {
              window.location.href = url;
            } catch {
              /* ignore */
            }
            n.close();
          };
        }
      } catch (err) {
        console.warn("[FCM] foreground notification", err);
      }
    });

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMsg);
      if (typeof unsub === "function") unsub();
    };
  }, []);

  return null;
}
