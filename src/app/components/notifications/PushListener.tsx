import { useEffect } from "react";
import { listenForeground, permissionState } from "../../../firebase/messaging";

/**
 * When the site tab is open, FCM delivers to onMessage (no system tray).
 * Show a browser notification so the user still sees it.
 */
export default function PushListener() {
  useEffect(() => {
    if (permissionState() !== "granted") return;

    const unsub = listenForeground((title, body) => {
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const n = new Notification(title || "Splendid Empire", {
            body: body || "",
            icon: "/logo.jpg",
            tag: "splendid-push",
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        }
      } catch (err) {
        console.warn("[FCM] foreground notification", err);
      }
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  return null;
}
