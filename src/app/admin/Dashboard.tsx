import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Truck,
  WalletCards,
} from "lucide-react";
import { fetchOrders } from "../../api";
import { fmt, type Order, type OrderStatus } from "./types";

const STATUS_ORDER: OrderStatus[] = ["pending", "verifying", "confirmed", "dispatched", "delivered"];
const SALES_STATUSES: OrderStatus[] = ["confirmed", "dispatched", "delivered"];
const ACTIONABLE_STATUSES: OrderStatus[] = ["verifying", "confirmed", "pending"];

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700" },
  verifying: { label: "Payment review", className: "border-orange-200 bg-orange-50 text-orange-700" },
  confirmed: { label: "Ready to dispatch", className: "border-blue-200 bg-blue-50 text-blue-700" },
  dispatched: { label: "Dispatched", className: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  delivered: { label: "Delivered", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function isToday(value: Date) {
  return new Date(value).getTime() >= startOfToday().getTime();
}

function formatTime(value: Date) {
  return new Date(value).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

function actionLabel(status: OrderStatus) {
  if (status === "verifying") return "Review payment";
  if (status === "confirmed") return "Prepare order";
  return "Review order";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await fetchOrders();
      setOrders(
        data.map((order: any) => ({
          ...order,
          total: Number(order.total) || 0,
          status: order.status as OrderStatus,
          createdAt: order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt),
        }))
      );
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") void loadOrders(true);
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [loadOrders]);

  const todaysOrders = useMemo(
    () => orders.filter((order) => isToday(new Date(order.createdAt))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      pending: 0,
      verifying: 0,
      confirmed: 0,
      dispatched: 0,
      delivered: 0,
    };
    orders.forEach((order) => {
      if (counts[order.status] !== undefined) counts[order.status] += 1;
    });
    return counts;
  }, [orders]);

  const needsAttention = useMemo(
    () =>
      orders
        .filter((order) => ACTIONABLE_STATUSES.includes(order.status))
        .sort((a, b) => {
          const priority = ACTIONABLE_STATUSES.indexOf(a.status) - ACTIONABLE_STATUSES.indexOf(b.status);
          if (priority !== 0) return priority;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        })
        .slice(0, 6),
    [orders]
  );

  const todaysSales = useMemo(
    () =>
      todaysOrders
        .filter((order) => SALES_STATUSES.includes(order.status))
        .reduce((sum, order) => sum + Number(order.total || 0), 0),
    [todaysOrders]
  );

  const averageOrderValue = todaysOrders.length ? Math.round(todaysSales / todaysOrders.length) : 0;
  const ordersToProcess = statusCounts.pending + statusCounts.verifying + statusCounts.confirmed;

  const openOrder = (id: string) => {
    navigate(`/admin/orders?order=${encodeURIComponent(id)}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#C9A227]" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-5 md:p-8">
        <div className="rounded-3xl border border-red-100 bg-white p-7 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={28} />
          <h1 className="text-xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Dashboard unavailable
          </h1>
          <p className="mt-2 text-sm text-[#7D645A]">We couldn't load the latest store data.</p>
          <button
            type="button"
            onClick={() => void loadOrders(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1A0F0A] px-5 py-2.5 text-sm font-semibold text-[#F2B8A8]"
          >
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-5 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B5784A]">Splendid E-Cosmetics</div>
          <h1 className="mt-1 text-2xl font-bold text-[#1A0F0A] md:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Good to have you back
          </h1>
          <p className="mt-1 text-sm text-[#7D645A]">Here’s what needs your attention today.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#EEDDD7] bg-white px-4 py-2.5 text-sm font-semibold text-[#5C3D2E] shadow-sm transition hover:border-[#C9A227]/50 disabled:opacity-60"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <SummaryCard label="Orders to process" value={ordersToProcess} icon={ShoppingBag} className="bg-[#1A0F0A] text-white" valueClassName="text-white" labelClassName="text-white/55" />
        <SummaryCard label="Payment review" value={statusCounts.verifying} icon={Clock3} />
        <SummaryCard label="Ready to dispatch" value={statusCounts.confirmed} icon={Package} />
        <SummaryCard label="Dispatched" value={statusCounts.dispatched} icon={Truck} />
        <SummaryCard label="Today's sales" value={fmt(todaysSales)} icon={WalletCards} valueSmall />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-3xl border border-[#F1DDD7] bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-[#F2E3DE] p-5 sm:p-6">
            <div>
              <div className="flex items-center gap-2">
                <AlertCircle size={17} className="text-[#B5784A]" />
                <h2 className="text-base font-bold text-[#1A0F0A]">Needs Attention</h2>
              </div>
              <p className="mt-1 text-xs text-[#9A7A6E]">Start here. These are the orders waiting on you.</p>
            </div>
            <span className="rounded-full bg-[#FFF6F3] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#9A5F43]">
              {needsAttention.length} open
            </span>
          </div>

          {needsAttention.length === 0 ? (
            <div className="p-8 text-center sm:p-10">
              <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={27} />
              <p className="text-sm font-semibold text-[#1A0F0A]">You’re all caught up.</p>
              <p className="mt-1 text-xs text-[#9A7A6E]">No payment reviews or preparation tasks are waiting.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F2E3DE]">
              {needsAttention.map((order) => (
                <div key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#B5784A]">{order.id}</span>
                      <StatusPill status={order.status} />
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#1A0F0A]">{order.customerName}</div>
                    <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-[#9A7A6E]">
                      <span>{fmt(order.total)}</span>
                      <span>·</span>
                      <span>{formatDate(new Date(order.createdAt))}</span>
                      <span>{formatTime(new Date(order.createdAt))}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openOrder(order.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A0F0A] px-4 py-2.5 text-xs font-semibold text-[#F2B8A8] transition hover:bg-[#2A1A12] sm:w-auto"
                  >
                    {actionLabel(order.status)}
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#F1DDD7] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-[#1A0F0A]">Sales Summary</h2>
            <p className="mt-1 text-xs text-[#9A7A6E]">Based on completed sales today.</p>
          </div>
          <div className="space-y-3">
            <MetricRow label="Today's sales" value={fmt(todaysSales)} />
            <MetricRow label="Today's orders" value={String(todaysOrders.length)} />
            <MetricRow label="Average order value" value={fmt(averageOrderValue)} />
          </div>
          <div className="mt-6 rounded-2xl bg-[#FFF8F6] p-4 text-xs leading-5 text-[#7D645A]">
            Confirmed, dispatched, and delivered orders count as sales. Pending and payment-review orders do not.
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-3xl border border-[#F1DDD7] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#F2E3DE] p-5 sm:p-6">
            <div>
              <h2 className="text-base font-bold text-[#1A0F0A]">Today’s Orders</h2>
              <p className="mt-1 text-xs text-[#9A7A6E]">Latest orders placed today.</p>
            </div>
            <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-[#B5784A] hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {todaysOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#9A7A6E]">No orders today.</div>
          ) : (
            <div className="divide-y divide-[#F2E3DE]">
              {todaysOrders.slice(0, 7).map((order) => (
                <div key={order.id} className="flex items-center gap-3 p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-[11px] font-bold text-[#B5784A]">{order.id}</span>
                      <StatusPill status={order.status} />
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-[#1A0F0A]">{order.customerName}</p>
                    <p className="mt-0.5 text-xs text-[#9A7A6E]">{formatTime(new Date(order.createdAt))}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-[#1A0F0A]">{fmt(order.total)}</div>
                    {ACTIONABLE_STATUSES.includes(order.status) ? (
                      <button type="button" onClick={() => openOrder(order.id)} className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#B5784A] hover:underline">
                        Action
                      </button>
                    ) : (
                      <span className="mt-1 inline-block text-[10px] text-[#A18B82]">Updated</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#F1DDD7] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-base font-bold text-[#1A0F0A]">Order Status</h2>
            <p className="mt-1 text-xs text-[#9A7A6E]">All orders by current status.</p>
          </div>
          <div className="mt-5 space-y-2.5">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center justify-between rounded-2xl bg-[#FFF8F6] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${status === "pending" ? "bg-amber-400" : status === "verifying" ? "bg-orange-400" : status === "confirmed" ? "bg-blue-400" : status === "dispatched" ? "bg-indigo-400" : "bg-emerald-400"}`} />
                  <span className="text-sm font-medium text-[#5C3D2E]">{STATUS_META[status].label}</span>
                </div>
                <span className="text-sm font-bold text-[#1A0F0A]">{statusCounts[status]}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-[#F2E3DE] pt-5">
            <div className="mb-3 flex items-center gap-2">
              <Package size={16} className="text-[#B5784A]" />
              <h3 className="text-sm font-bold text-[#1A0F0A]">Inventory Attention</h3>
            </div>
            <p className="text-xs leading-5 text-[#7D645A]">
              The current product data only tracks <strong>In Stock / Out of Stock</strong>. Proper low-stock alerts need a quantity and reorder-threshold field; no fake stock numbers are shown here.
            </p>
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#1A0F0A]">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <QuickAction to="/admin/products" label="Add Product" icon={Plus} />
          <QuickAction to="/admin/orders" label="View Orders" icon={ShoppingBag} />
          <QuickAction to="/admin/products" label="Manage Products" icon={Package} />
          <QuickAction to="/admin/categories" label="Manage Categories" icon={FolderOpen} />
          <QuickAction to="/admin/notifications" label="Send Notification" icon={Bell} />
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  className = "bg-white text-[#1A0F0A]",
  valueClassName = "text-[#1A0F0A]",
  labelClassName = "text-[#9A7A6E]",
  valueSmall = false,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  valueSmall?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-[#F1DDD7] p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-3 inline-flex rounded-xl bg-[#FFF4EF] p-2 text-[#B5784A]">
        <Icon size={17} />
      </div>
      <div className={`text-[10px] font-bold uppercase tracking-[0.14em] ${labelClassName}`}>{label}</div>
      <div className={`mt-1 font-bold ${valueSmall ? "text-lg sm:text-xl" : "text-2xl"} ${valueClassName}`} style={{ fontFamily: "'Playfair Display', serif" }}>
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${meta.className}`}>{meta.label}</span>;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#F2E3DE] py-3 last:border-b-0">
      <span className="text-sm text-[#7D645A]">{label}</span>
      <span className="text-sm font-bold text-[#1A0F0A]">{value}</span>
    </div>
  );
}

function QuickAction({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <Link to={to} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#F1DDD7] bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C9A227]/50 hover:shadow-md">
      <span className="rounded-xl bg-[#FFF4EF] p-2 text-[#B5784A]"><Icon size={16} /></span>
      <span className="text-xs font-semibold leading-4 text-[#1A0F0A]">{label}</span>
    </Link>
  );
}
