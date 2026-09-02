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

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isFirebaseConfigured()) return;
      const supported = await messagingSupported();
      if (!supported || cancelled) return;

      // Refresh registration if already granted
      if (permissionState() === "granted") {
        syncExistingRegistration().catch(() => {});
        return;
      }

      if (permissionState() === "denied") return;
      if (wasPromptDismissed()) return;

      // Soft delay so it doesn't interrupt first paint
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
      setTimeout(() => setVisible(false), 1800);
    } else {
      setError(result.error || "Could not enable notifications.");
    }
  }

  function onDismiss() {
    dismissPrompt();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] sm:left-auto sm:right-4 sm:max-w-sm animate-in fade-in slide-in-from-bottom-4">
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
                Stay updated with Splendid ✨
              </h3>
              <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-[#FAF7F5] text-[#9A7A6E]" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-[#5C3D2E]/80 mt-1 leading-relaxed">
              Get notified about new arrivals, special offers and important order updates.
            </p>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            {done ? (
              <p className="text-xs text-emerald-600 mt-3 font-semibold">You&apos;re all set! We&apos;ll keep you posted.</p>
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
