import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { Package, Loader2, ArrowLeft, CheckCircle2, Truck, Clock } from "lucide-react";
import { fetchPublicOrder } from "../api";

const STATUS_STEPS = ["pending", "verifying", "confirmed", "dispatched", "delivered"] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "Received",
  verifying: "Verifying payment",
  confirmed: "Payment confirmed",
  dispatched: "On the way",
  delivered: "Delivered",
};

function fmt(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

export default function OrderTrackPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setError("Missing order reference");
      setLoading(false);
      return;
    }
    fetchPublicOrder(orderId)
      .then(setOrder)
      .catch((e) => setError(e?.message || "Could not load order"))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#FFF6F3] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C9A227]" size={28} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-dvh bg-[#FFF6F3] flex flex-col items-center justify-center p-6 text-center">
        <Package className="text-[#9A7A6E] mb-3" size={36} />
        <h1 className="text-xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Order not found
        </h1>
        <p className="text-sm text-[#5C3D2E]/80 mt-2 max-w-sm">
          {error || "We couldn't find that order. Check the reference and try again."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1A0F0A] text-[#F2B8A8] px-5 py-2.5 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back to shop
        </Link>
      </div>
    );
  }

  const stepIdx = Math.max(0, STATUS_STEPS.indexOf(order.status as any));

  return (
    <div className="min-h-dvh bg-[#FFF6F3] font-[Raleway,sans-serif]">
      <header className="bg-[#1A0F0A] text-center py-6 px-4">
        <p className="text-[#F2B8A8] text-xs tracking-[0.2em] uppercase mb-1">Splendid Empire Cosmetics</p>
        <h1 className="text-[#F2B8A8] text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
          Track your order
        </h1>
      </header>

      <main className="max-w-lg mx-auto p-5 md:p-8">
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/60 shadow-sm p-5 mb-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A7A6E]">Order reference</div>
          <div className="font-mono text-lg font-bold text-[#B5784A] mt-1 break-all">{order.id}</div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#5C3D2E]">
            <span>
              <strong className="text-[#1A0F0A]">{order.customerName}</strong>
            </span>
            <span>·</span>
            <span>{fmt(order.total)}</span>
            <span>·</span>
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#F9DEDA]/60 shadow-sm p-5 mb-5">
          <div className="text-sm font-bold text-[#1A0F0A] mb-4 uppercase tracking-wider">Status</div>
          <div className="space-y-3">
            {STATUS_STEPS.map((s, i) => {
              const done = i <= stepIdx;
              const current = i === stepIdx;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      done ? "bg-[#C9A227] text-white" : "bg-[#FAF7F5] text-[#9A7A6E]"
                    }`}
                  >
                    {s === "delivered" && done ? (
                      <CheckCircle2 size={16} />
                    ) : s === "dispatched" && done ? (
                      <Truck size={16} />
                    ) : (
                      <Clock size={14} />
                    )}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${current ? "text-[#C9A227]" : "text-[#1A0F0A]"}`}>
                      {STATUS_LABEL[s] || s}
                    </div>
                    {current && <div className="text-xs text-[#9A7A6E]">Current status</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {Array.isArray(order.items) && order.items.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#F9DEDA]/60 shadow-sm p-5 mb-5">
            <div className="text-sm font-bold text-[#1A0F0A] mb-3 uppercase tracking-wider">Items</div>
            <ul className="divide-y divide-[#F9DEDA]/40">
              {order.items.map((it: any, idx: number) => (
                <li key={idx} className="py-2.5 flex justify-between gap-3 text-sm">
                  <span className="text-[#1A0F0A]">
                    {it.name} <span className="text-[#9A7A6E]">×{it.quantity}</span>
                  </span>
                  <span className="font-semibold text-[#1A0F0A] shrink-0">{fmt(it.price * it.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#C9A227] hover:underline"
        >
          <ArrowLeft size={16} /> Continue shopping
        </Link>
      </main>
    </div>
  );
}
