import React, { useEffect, useState } from "react";
import { Bell, X, Loader2, Settings } from "lucide-react";
import {
  messagingSupported,
  permissionState,
  wasPromptDismissed,
  dismissPrompt,
  enablePushNotifications,
  syncExistingRegistration,
} from "../../../firebase/messaging";
import { isFirebaseConfigured } from "../../../firebase/config";

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      (window.navigator as any).standalone === true;
    setIsStandalone(!!standalone);
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

      // If previously denied, still show a small helper so they can fix site settings
      if (perm === "denied") {
        if (wasPromptDismissed()) return;
        setTimeout(() => {
          if (!cancelled) {
            setBlocked(true);
            setVisible(true);
          }
        }, 2500);
        return;
      }

      if (wasPromptDismissed()) return;
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
      if (
        permissionState() === "denied" ||
        /block|denied|permission/i.test(msg)
      ) {
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
                {blocked ? "Notifications blocked for this site" : "Stay updated with Splendid ✨"}
              </h3>
              <button
                onClick={onDismiss}
                className="p-1 rounded-lg hover:bg-[#FAF7F5] text-[#9A7A6E]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {blocked ? (
              <div className="text-xs text-[#5C3D2E]/90 mt-2 space-y-2 leading-relaxed">
                <p>
                  Chrome can block <strong>this website only</strong>, even when phone notifications
                  look turned on.
                </p>
                <p className="font-semibold text-[#1A0F0A] flex items-center gap-1">
                  <Settings size={12} /> Fix on Android Chrome:
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Tap the lock icon (or tune icon) left of the website address</li>
                  <li>Tap <strong>Permissions</strong> / <strong>Site settings</strong></li>
                  <li>Find <strong>Notifications</strong></li>
                  <li>Change from <strong>Block</strong> to <strong>Allow</strong></li>
                  <li>Reload the page, then tap Enable again</li>
                </ol>
                <p className="text-[11px] text-[#9A7A6E]">
                  Or: Chrome menu → Settings → Site settings → Notifications → allowed/blocked list →
                  remove splendidcosmetics.com.ng from blocked.
                </p>
              </div>
            ) : isIOS && !isStandalone ? (
              <div className="text-xs text-[#5C3D2E]/90 mt-2 space-y-2 leading-relaxed">
                <p>
                  On iPhone, browser notifications only work after you add Splendid to your{" "}
                  <strong>Home Screen</strong> (Apple rule — not a site bug).
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open this site in <strong>Safari</strong> (not Chrome)</li>
                  <li>Tap the <strong>Share</strong> button</li>
                  <li>Tap <strong>Add to Home Screen</strong> → Add</li>
                  <li>Open the new <strong>Splendid</strong> icon from your Home Screen</li>
                  <li>Then tap <strong>Enable notifications</strong> and Allow</li>
                </ol>
              </div>
            ) : (
              <p className="text-xs text-[#5C3D2E]/80 mt-1 leading-relaxed">
                Get notified about new arrivals, special offers and important order updates.
              </p>
            )}

            {error && !blocked && <p className="text-xs text-red-600 mt-2">{error}</p>}
            {error && blocked && (
              <p className="text-xs text-red-600 mt-2">{error}</p>
            )}

            {done ? (
              <p className="text-xs text-emerald-600 mt-3 font-semibold">
                You&apos;re all set! We&apos;ll keep you posted.
              </p>
            ) : (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onEnable}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-[#1A0F0A] text-[#F2B8A8] text-xs font-semibold py-2.5 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {blocked ? "Try again after Allow" : "Enable notifications"}
                </button>
                <button
                  onClick={onDismiss}
                  className="px-3 rounded-xl border border-[#F9DEDA] text-xs font-semibold text-[#5C3D2E]"
                >
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
