import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  Truck,
} from "lucide-react";
import { fetchPublicOrder } from "../api";

const STATUS_STEPS = [
  {
    key: "pending",
    title: "Order received",
    message: "We've received your order and are reviewing it.",
    icon: Package,
  },
  {
    key: "verifying",
    title: "Payment under review",
    message: "We're reviewing your payment. We'll update you once it's confirmed.",
    icon: Clock3,
  },
  {
    key: "confirmed",
    title: "Payment confirmed",
    message: "Your payment has been confirmed and we're preparing your order.",
    icon: CheckCircle2,
  },
  {
    key: "dispatched",
    title: "Order dispatched",
    message: "Your order is on the way.",
    icon: Truck,
  },
  {
    key: "delivered",
    title: "Order delivered",
    message: "Your order has been delivered. We hope you love it!",
    icon: CheckCircle2,
  },
] as const;

type OrderStatus = (typeof STATUS_STEPS)[number]["key"];

type PublicOrderItem = {
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
};

type PublicOrder = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt?: string;
  items: PublicOrderItem[];
};

function fmt(n: number) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeStatus(status: string): OrderStatus | null {
  const value = String(status || "").toLowerCase();
  return STATUS_STEPS.some((step) => step.key === value) ? (value as OrderStatus) : null;
}

function LoadingState() {
  return (
    <div className="min-h-dvh bg-[#FFF8F6] flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A0F0A] shadow-lg">
          <Loader2 className="animate-spin text-[#F2B8A8]" size={24} />
        </div>
        <h1 className="text-xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Loading your order...
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#7D645A]">We’re getting the latest status for you.</p>
      </div>
    </div>
  );
}

function ErrorState({ kind }: { kind: "not-found" | "server" }) {
  const notFound = kind === "not-found";
  return (
    <div className="min-h-dvh bg-[#FFF8F6] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#F4DED7] bg-white p-7 text-center shadow-[0_16px_50px_rgba(80,48,35,0.08)] sm:p-9">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF0ED] text-[#9A7A6E]">
          {notFound ? <Package size={25} /> : <RefreshCw size={25} />}
        </div>
        <h1 className="text-2xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {notFound ? "We couldn't find this order." : "Something went wrong while loading your order."}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#7D645A]">
          {notFound
            ? "Please check the order reference from your notification and try again."
            : "Please try opening the notification again in a moment."}
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#1A0F0A] px-5 py-3 text-sm font-semibold text-[#F2B8A8] transition hover:bg-[#2A1A12]"
        >
          <ArrowLeft size={16} />
          Back to shop
        </Link>
      </div>
    </div>
  );
}

export default function OrderTrackPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorKind, setErrorKind] = useState<"not-found" | "server" | null>(null);

  const loadOrder = useCallback(async (silent = false) => {
    if (!orderId) {
      setErrorKind("not-found");
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await fetchPublicOrder(orderId);
      setOrder(data as PublicOrder);
      setErrorKind(null);
    } catch (error) {
      const message = String((error as Error)?.message || "").toLowerCase();
      setErrorKind(message.includes("not found") ? "not-found" : "server");
      if (!silent) setOrder(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    // Notifications are the primary real-time mechanism. This is only a light
    // fallback while the customer is actively viewing the tracking page.
    const interval = window.setInterval(() => {
      void loadOrder(true);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [loadOrder]);

  if (loading) return <LoadingState />;
  if (errorKind) return <ErrorState kind={errorKind} />;
  if (!order) return <ErrorState kind="server" />;

  const currentStatus = normalizeStatus(order.status);
  if (!currentStatus) return <ErrorState kind="server" />;

  const activeIndex = STATUS_STEPS.findIndex((step) => step.key === currentStatus);
  const currentStep = STATUS_STEPS[activeIndex];
  const itemCount = order.items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
    0
  );

  return (
    <div className="min-h-dvh bg-[#FFF8F6] font-[Raleway,sans-serif] text-[#1A0F0A]">
      <header className="bg-[#1A0F0A] px-5 pb-8 pt-7 text-center text-white shadow-[0_10px_30px_rgba(26,15,10,0.12)] sm:px-6">
        <div className="mx-auto max-w-lg">
          <div className="mb-2 inline-flex items-center gap-2 text-[#F2B8A8]">
            <Sparkles size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">Splendid E-Cosmetics</span>
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Track your order
          </h1>
          <p className="mt-2 text-sm text-white/60">Your latest order status, all in one place.</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-[#F1DDD7] bg-white p-5 shadow-[0_16px_45px_rgba(80,48,35,0.06)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A7A6E]">Order reference</p>
              <p className="mt-1 break-all font-mono text-base font-bold text-[#B5784A] sm:text-lg">{order.id}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadOrder(true)}
              disabled={refreshing}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#EED7D0] bg-[#FFF8F6] px-3 py-2 text-xs font-semibold text-[#5C3D2E] transition hover:border-[#C9A227]/50 disabled:opacity-60"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-[#FFF7F4] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A0F0A] text-[#F2B8A8]">
                <currentStep.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B5784A]">Current status</p>
                <h2 className="mt-1 text-lg font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {currentStep.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#6F574D]">{currentStep.message}</p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#F1DDD7] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A7A6E]">Order date</p>
              <p className="mt-1.5 text-sm font-semibold text-[#1A0F0A]">{formatDate(order.createdAt)}</p>
            </div>
            <div className="rounded-2xl border border-[#F1DDD7] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A7A6E]">Items</p>
              <p className="mt-1.5 text-sm font-semibold text-[#1A0F0A]">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[#F1DDD7] bg-white p-5 shadow-[0_16px_45px_rgba(80,48,35,0.06)] sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A7A6E]">Progress</p>
              <h2 className="mt-1 text-lg font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Order journey
              </h2>
            </div>
            <span className="rounded-full bg-[#F8ECE8] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#9A5F43]">
              {activeIndex + 1} of {STATUS_STEPS.length}
            </span>
          </div>

          <div className="mt-7">
            {STATUS_STEPS.map((step, index) => {
              const Icon = step.icon;
              const completed = index < activeIndex;
              const current = index === activeIndex;
              const future = index > activeIndex;

              return (
                <div key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
                  {index < STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute left-[19px] top-10 h-[calc(100%-16px)] w-px ${
                        index < activeIndex ? "bg-[#C9A227]" : "bg-[#EEDDD7]"
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                      current
                        ? "border-[#1A0F0A] bg-[#1A0F0A] text-[#F2B8A8] shadow-[0_0_0_5px_rgba(242,184,168,0.18)]"
                        : completed
                          ? "border-[#C9A227] bg-[#C9A227] text-white"
                          : "border-[#E8D7D1] bg-[#FAF7F5] text-[#A18B82]"
                    }`}
                  >
                    {completed ? <Check size={17} strokeWidth={2.5} /> : <Icon size={17} />}
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <p
                      className={`text-sm font-bold ${
                        current ? "text-[#B5784A]" : future ? "text-[#A18B82]" : "text-[#1A0F0A]"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className={`mt-1 text-xs leading-5 ${future ? "text-[#B4A39B]" : "text-[#7D645A]"}`}>
                      {current ? step.message : completed ? "Completed" : "Coming next"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[#F1DDD7] bg-white p-5 shadow-[0_16px_45px_rgba(80,48,35,0.06)] sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A7A6E]">Your purchase</p>
              <h2 className="mt-1 text-lg font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Items ordered
              </h2>
            </div>
            <span className="text-xs text-[#9A7A6E]">{formatDateTime(order.createdAt)}</span>
          </div>

          <div className="mt-5 divide-y divide-[#F2E3DE]">
            {order.items.map((item, index) => {
              const quantity = Math.max(0, Number(item.quantity) || 0);
              const price = Math.max(0, Number(item.price) || 0);
              return (
                <div key={`${item.name}-${index}`} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#F1DDD7] bg-[#FAF7F5] sm:h-[72px] sm:w-[72px]">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#B79D93]">
                        <Package size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-5 text-[#1A0F0A]">{item.name}</p>
                    <p className="mt-1 text-xs text-[#9A7A6E]">Qty {quantity} · {fmt(price)} each</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-[#1A0F0A]">{fmt(price * quantity)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 border-t border-[#EEDDD7] pt-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-[#5C3D2E]">Total amount</span>
              <span className="text-2xl font-bold text-[#B5784A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {fmt(order.total)}
              </span>
            </div>
          </div>
        </section>

        <div className="px-2 pb-3 pt-6 text-center">
          <p className="text-xs leading-5 text-[#9A7A6E]">Notifications keep you updated as your order moves through each stage.</p>
          <Link to="/" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#B5784A] hover:underline">
            <ArrowLeft size={15} /> Continue shopping
          </Link>
        </div>
      </main>
    </div>
  );
}
