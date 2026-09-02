import React, { useEffect, useState } from "react";
import { Bell, Loader2, Send, Users, Trash2 } from "lucide-react";
import { getAdminToken } from "../../api";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function adminHeaders() {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type Stats = {
  totalSubscribers: number;
  activeSubscribers: number;
  configured: boolean;
  configDetail?: {
    hasProjectId?: boolean;
    hasClientEmail?: boolean;
    hasPrivateKey?: boolean;
    hasServiceAccountJson?: boolean;
    packageOk?: boolean;
    initialized?: boolean;
    lastError?: string | null;
  };
  dbError?: string | null;
  recent: Array<{
    id: string;
    title: string;
    body: string;
    audience: string;
    sentCount: number;
    failedCount: number;
    createdAt: string;
  }>;
};

export default function NotificationsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/stats`, {
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load");
      setStats(await res.json());
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLog(id: string) {
    if (!window.confirm("Delete this notification from history?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/${id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch (err: any) {
      setMsg({ type: "err", text: err?.message || "Could not delete" });
    }
  }

  async function handleClearLogs() {
    if (!window.confirm("Clear all notification history?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error("Clear failed");
      await load();
    } catch (err: any) {
      setMsg({ type: "err", text: err?.message || "Could not clear history" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!title.trim() || !body.trim()) {
      setMsg({ type: "err", text: "Title and message are required." });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/send`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ title: title.trim(), body: body.trim(), audience: "all" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Send failed");
      const errHint = Array.isArray(data.errors) && data.errors.length
        ? ` (${data.errors[0]})`
        : "";
      const extra = data.message ? ` ${data.message}` : "";
      setMsg({
        type: data.sent > 0 ? "ok" : "err",
        text: `Sent to ${data.sent} device${data.sent === 1 ? "" : "s"}${data.failed ? ` · ${data.failed} failed` : ""}${errHint}.${extra}`,
      });
      setTitle("");
      setBody("");
      await load();
    } catch (err: any) {
      setMsg({ type: "err", text: err?.message || "Failed to send notification." });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A227]" size={28} />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Notifications
        </h1>
        <p className="text-[#5C3D2E]/70 text-sm mt-1">
          Send updates to customers who enabled browser notifications
        </p>
      </div>

      {!stats?.configured && (
        <div className="mb-5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800 space-y-1">
          <p className="font-semibold">Push is not ready on the server yet.</p>
          <p>
            After adding env vars you must <strong>Redeploy</strong> on Vercel (Deployments → … → Redeploy).
            Env vars only apply after a new deploy.
          </p>
          {stats?.configDetail && (
            <p className="text-xs mt-1 opacity-90">
              Check: projectId={String(stats.configDetail.hasProjectId)} ·
              clientEmail={String(stats.configDetail.hasClientEmail)} ·
              privateKey={String(stats.configDetail.hasPrivateKey)} ·
              package={String(stats.configDetail.packageOk)}
              {stats.configDetail.lastError ? ` · ${stats.configDetail.lastError}` : ""}
              {stats.dbError ? ` · DB: ${stats.dbError}` : ""}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#9A7A6E] text-xs font-bold uppercase tracking-wider mb-2">
            <Users size={14} /> Subscribers
          </div>
          <div className="text-2xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {stats?.totalSubscribers ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#9A7A6E] text-xs font-bold uppercase tracking-wider mb-2">
            <Bell size={14} /> Active
          </div>
          <div className="text-2xl font-bold text-emerald-600" style={{ fontFamily: "'Playfair Display', serif" }}>
            {stats?.activeSubscribers ?? 0}
          </div>
        </div>
      </div>

      <form onSubmit={handleSend} className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-5 shadow-sm mb-6 space-y-4">
        <h2 className="font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Send notification
        </h2>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="New arrivals are here ✨"
            className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Check out our latest beauty products..."
            className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">Audience</label>
          <select
            disabled
            className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm text-[#5C3D2E]"
          >
            <option>All subscribers</option>
          </select>
        </div>
        {msg && (
          <div
            className={`rounded-xl px-3 py-2.5 text-sm ${
              msg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
            }`}
          >
            {msg.text}
          </div>
        )}
        <button
          type="submit"
          disabled={sending || !stats?.configured}
          className="w-full rounded-xl bg-[#1A0F0A] text-[#F2B8A8] font-semibold py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send notification
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F9DEDA]/40 flex items-center justify-between gap-3">
          <h2 className="font-bold text-[#1A0F0A] text-sm uppercase tracking-wider">Recent notifications</h2>
          {!!stats?.recent?.length && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="text-[11px] font-semibold text-red-600/80 hover:text-red-700"
            >
              Clear all
            </button>
          )}
        </div>
        {!stats?.recent?.length ? (
          <div className="p-8 text-center text-sm text-[#9A7A6E]">No notifications sent yet</div>
        ) : (
          <div className="divide-y divide-[#F9DEDA]/40">
            {stats.recent.map((n) => (
              <div key={n.id} className="px-5 py-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#1A0F0A] text-sm">{n.title}</div>
                  <div className="text-xs text-[#5C3D2E]/80 mt-0.5 line-clamp-2">{n.body}</div>
                  <div className="text-[11px] text-[#9A7A6E] mt-2">
                    {n.audience} · Sent {n.sentCount}
                    {n.failedCount ? ` · Failed ${n.failedCount}` : ""} ·{" "}
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteLog(n.id)}
                  className="p-2 rounded-lg text-[#9A7A6E] hover:text-red-600 hover:bg-red-50 shrink-0"
                  title="Delete"
                  aria-label="Delete notification"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
