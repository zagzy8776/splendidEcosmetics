import React, { useEffect, useState } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import {
  messagingSupported,
  permissionState,
  wasPromptDismissed,
  dismissPrompt,
  enablePushNotifications,
  syncExistingRegistration,
} from "../../../firebase/messaging";
import { isFirebaseConfigured } from "../../../firebase/config";

function detectIOS() {
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function detectStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    (window.navigator as any).standalone === true
  );
}

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOS(detectIOS());
    setIsStandalone(detectStandalone());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isFirebaseConfigured()) return;
      const supported = await messagingSupported();
      if (!supported || cancelled) return;

      const perm = permissionState();
      if (perm === "granted") {
        syncExistingRegistration().catch(() => {});
        return;
      }

      if (wasPromptDismissed()) return;

      // On iPhone Safari tab (not home screen), skip big prompt — push won't work there
      if (detectIOS() && !detectStandalone()) return;

      if (perm === "denied") {
        setTimeout(() => {
          if (!cancelled) {
            setBlocked(true);
            setVisible(true);
          }
        }, 2500);
        return;
      }

      setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, 4000);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onEnable() {
    setLoading(true);
    setError("");
    const result = await enablePushNotifications();
    setLoading(false);
    if (result.ok) {
      setDone(true);
      setBlocked(false);
      setTimeout(() => setVisible(false), 2000);
    } else {
      const msg = result.error || "Could not enable notifications.";
      setError(msg);
      if (permissionState() === "denied" || /block|denied|permission/i.test(msg)) {
        setBlocked(true);
      }
    }
  }

  function onDismiss() {
    dismissPrompt();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-2xl bg-white shadow-2xl border border-[#F9DEDA]/60 p-4 sm:p-5 font-[Raleway,sans-serif]">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#F2B8A8]/25 shrink-0">
            <Bell className="text-[#C9A227]" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="font-bold text-[#1A0F0A] text-sm"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {blocked ? "Allow notifications for this site" : "Stay updated with Splendid ✨"}
              </h3>
              <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-[#FAF7F5] text-[#9A7A6E]" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {blocked ? (
              <p className="text-xs text-[#5C3D2E]/90 mt-2 leading-relaxed">
                Tap the lock icon by the address → Permissions → Notifications → <strong>Allow</strong>, then reload.
              </p>
            ) : (
              <p className="text-xs text-[#5C3D2E]/80 mt-1 leading-relaxed">
                New arrivals, offers and order updates.
              </p>
            )}

            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

            {done ? (
              <p className="text-xs text-emerald-600 mt-3 font-semibold">You&apos;re all set!</p>
            ) : (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onEnable}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-[#1A0F0A] text-[#F2B8A8] text-xs font-semibold py-2.5 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Enable notifications
                </button>
                <button onClick={onDismiss} className="px-3 rounded-xl border border-[#F9DEDA] text-xs font-semibold text-[#5C3D2E]">
                  Not now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
