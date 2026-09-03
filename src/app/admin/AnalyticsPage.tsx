import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  TrendingUp, ShoppingBag, Package, Users, Clock, Loader2, Calendar, Crown, ArrowUpRight,
} from "lucide-react";
import { fetchOrders, fetchProducts, fetchVisitorAnalytics, fetchLiveVisitors } from "../../api";
import { fmt, type Order, type Product, type OrderStatus } from "./types";

type Range = "today" | "yesterday" | "week" | "month" | "lifetime";

const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "lifetime", label: "All time" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  verifying: "#F97316",
  confirmed: "#3B82F6",
  dispatched: "#6366F1",
  delivered: "#10B981",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function inRange(date: Date, range: Range) {
  const now = new Date();
  const today = startOfDay(now);
  const t = date.getTime();
  if (range === "lifetime") return true;
  if (range === "today") return t >= today.getTime();
  if (range === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return t >= y.getTime() && t < today.getTime();
  }
  if (range === "week") {
    const w = new Date(today);
    w.setDate(w.getDate() - 6);
    return t >= w.getTime();
  }
  if (range === "month") {
    const m = new Date(today);
    m.setDate(1);
    return t >= m.getTime();
  }
  return true;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortDay(d: string) {
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("month");
  const [visitorStats, setVisitorStats] = useState<any>(null);
  const [live, setLive] = useState<{ active: number; visitors: any[] }>({ active: 0, visitors: [] });

  useEffect(() => {
    fetchVisitorAnalytics(range).then(setVisitorStats).catch(() => setVisitorStats(null));
  }, [range]);

  useEffect(() => {
    let alive = true;
    const loadLive = () => fetchLiveVisitors().then((d) => { if (alive) setLive(d); }).catch(() => {});
    loadLive();
    const t = setInterval(loadLive, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    Promise.all([fetchOrders().catch(() => []), fetchProducts().catch(() => [])]).then(
      ([ords, prods]) => {
        setOrders(
          ords.map((o: any) => ({
            ...o,
            status: o.status as OrderStatus,
            total: Number(o.total) || 0,
            createdAt: o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt),
          }))
        );
        setProducts(prods.map((p: any) => ({ ...p, rating: p.rating ?? 0, reviews: p.reviews ?? 0 })));
        setLoading(false);
      }
    );
  }, []);

  const filtered = useMemo(
    () => orders.filter((o) => inRange(new Date(o.createdAt), range)),
    [orders, range]
  );

  const completed = useMemo(
    () => filtered.filter((o) => ["confirmed", "dispatched", "delivered"].includes(o.status)),
    [filtered]
  );

  const revenue = completed.reduce((s, o) => s + o.total, 0);
  const orderCount = filtered.length;
  const aov = completed.length ? Math.round(revenue / completed.length) : 0;
  const pending = filtered.filter((o) => o.status === "pending" || o.status === "verifying").length;
  const delivered = filtered.filter((o) => o.status === "delivered").length;

  // unique customers in range
  const customers = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((o) => {
      const key = (o.phone || o.email || o.customerName || "").toLowerCase();
      if (key) set.add(key);
    });
    return set.size;
  }, [filtered]);

  // units sold
  const unitsSold = useMemo(() => {
    let n = 0;
    completed.forEach((o) => o.items?.forEach((i) => (n += i.quantity || 0)));
    return n;
  }, [completed]);

  // revenue by day (last 14 days of selected range, or all days in range)
  const revenueSeries = useMemo(() => {
    const map: Record<string, number> = {};
    completed.forEach((o) => {
      const k = dayKey(new Date(o.createdAt));
      map[k] = (map[k] || 0) + o.total;
    });
    // fill gaps for week/month views
    const days: string[] = [];
    if (range === "today" || range === "yesterday") {
      const d = range === "today" ? new Date() : new Date(Date.now() - 86400000);
      days.push(dayKey(startOfDay(d)));
    } else if (range === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(dayKey(startOfDay(d)));
      }
    } else if (range === "month") {
      const start = startOfDay(new Date());
      start.setDate(1);
      const end = startOfDay(new Date());
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(dayKey(new Date(d)));
      }
    } else {
      // lifetime: last 30 days with data + empty
      const keys = Object.keys(map).sort();
      if (keys.length === 0) {
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push(dayKey(startOfDay(d)));
        }
      } else {
        return keys.map((k) => ({ day: shortDay(k), key: k, revenue: map[k] || 0 }));
      }
    }
    return days.map((k) => ({ day: shortDay(k), key: k, revenue: map[k] || 0 }));
  }, [completed, range]);

  // status breakdown
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      fill: STATUS_COLORS[status] || "#9A7A6E",
    }));
  }, [filtered]);

  // top products by quantity in completed orders
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    completed.forEach((o) => {
      o.items?.forEach((item) => {
        const id = item.product?.id || item.product?.name || "unknown";
        const name = item.product?.name || "Unknown";
        const price = Number(item.product?.price || 0);
        if (!map[id]) map[id] = { name, qty: 0, revenue: 0 };
        map[id].qty += item.quantity || 0;
        map[id].revenue += price * (item.quantity || 0);
      });
    });
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [completed]);

  // top customers by spend
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; phone: string; orders: number; spent: number }> = {};
    completed.forEach((o) => {
      const key = (o.phone || o.email || o.customerName || "unknown").toLowerCase();
      if (!map[key]) map[key] = { name: o.customerName, phone: o.phone, orders: 0, spent: 0 };
      map[key].orders += 1;
      map[key].spent += o.total;
    });
    return Object.values(map)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8);
  }, [completed]);

  // category revenue from products joined with order items
  const categorySales = useMemo(() => {
    const productCat: Record<string, string> = {};
    products.forEach((p) => {
      productCat[p.id] = p.category;
    });
    const map: Record<string, number> = {};
    completed.forEach((o) => {
      o.items?.forEach((item) => {
        const cat = productCat[item.product?.id] || "Other";
        const price = Number(item.product?.price || 0);
        map[cat] = (map[cat] || 0) + price * (item.quantity || 0);
      });
    });
    return Object.entries(map)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [completed, products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[#C9A227]" size={28} />
      </div>
    );
  }

  const kpis = [
    {
      label: "Revenue",
      value: fmt(revenue),
      sub: `${completed.length} completed orders`,
      icon: TrendingUp,
      color: "bg-[#F2B8A8]/20 text-[#C9A227]",
    },
    {
      label: "Orders",
      value: String(orderCount),
      sub: `${pending} pending · ${delivered} delivered`,
      icon: ShoppingBag,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Avg order value",
      value: fmt(aov),
      sub: "Per completed order",
      icon: Crown,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Customers",
      value: String(customers),
      sub: `${unitsSold} units sold`,
      icon: Users,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold text-[#1A0F0A]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Analytics
          </h1>
          <p className="text-[#5C3D2E]/70 text-sm mt-1">
            See how the store is performing
          </p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Calendar size={14} className="text-[#9A7A6E] shrink-0" />
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                range === r.id
                  ? "bg-[#1A0F0A] text-[#F2B8A8]"
                  : "bg-white border border-[#F9DEDA] text-[#5C3D2E] hover:border-[#C9A227]/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      
      <section className="mb-6 rounded-3xl border border-[#F1DDD7] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#1A0F0A]">Live visitors</h2>
          <span className="text-sm font-semibold text-emerald-700">🟢 {live.active} active</span>
        </div>
        <div className="mt-3 space-y-2">
          {(live.visitors || []).length === 0 ? (
            <p className="text-xs text-[#9A7A6E]">No shoppers on the storefront right now.</p>
          ) : (
            live.visitors.map((v: any) => (
              <div key={v.sessionId} className="flex items-center justify-between rounded-xl bg-[#FFF8F6] px-3 py-2 text-xs">
                <span className="font-mono text-[#B5784A]">{v.sessionId}</span>
                <span className="text-[#5C3D2E]">{v.productName || v.section}{v.lastSeenAt ? ` · ${new Date(v.lastSeenAt).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}` : ""}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mb-6 rounded-3xl border border-[#F1DDD7] bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-[#1A0F0A]">Visitor overview</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Visitors", visitorStats?.visitors],
            ["Page views", visitorStats?.pageViews],
            ["Product views", visitorStats?.productViews],
            ["Searches", visitorStats?.searches],
            ["Add to cart", visitorStats?.addToCarts],
            ["Checkouts", visitorStats?.checkouts],
            ["Orders", visitorStats?.orders],
            ["Revenue", visitorStats ? fmt(visitorStats.revenue || 0) : "—"],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-[#FFF8F6] px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#9A7A6E]">{label}</div>
              <div className="mt-1 text-lg font-bold text-[#1A0F0A]">{value ?? "—"}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#9A7A6E]">Most viewed</h3>
            {(visitorStats?.topViewed || []).map((p: any) => (
              <div key={p.productId} className="mt-1 text-sm text-[#1A0F0A]">{p.name} — {p.count}</div>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#9A7A6E]">Most added to cart</h3>
            {(visitorStats?.topAddedToCart || []).map((p: any) => (
              <div key={p.productId} className="mt-1 text-sm text-[#1A0F0A]">{p.name} — {p.count}</div>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#9A7A6E]">Most purchased</h3>
            {(visitorStats?.topPurchased || []).map((p: any) => (
              <div key={p.productId || p.name} className="mt-1 text-sm text-[#1A0F0A]">{p.name} — {p.count}</div>
            ))}
          </div>
        </div>
        <div className="mt-5 text-xs leading-6 text-[#7D645A]">
          Funnel: {visitorStats?.visitors ?? 0} visitors → {visitorStats?.productViews ?? 0} product views → {visitorStats?.addToCarts ?? 0} add to cart → {visitorStats?.checkouts ?? 0} checkout → {visitorStats?.purchases ?? visitorStats?.orders ?? 0} purchase
        </div>
      </section>

<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 md:p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7A6E]">
                {k.label}
              </span>
              <span className={`p-2 rounded-xl ${k.color}`}>
                <k.icon size={15} />
              </span>
            </div>
            <div
              className="text-xl md:text-2xl font-bold text-[#1A0F0A] tabular-nums"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {k.value}
            </div>
            <p className="text-[11px] text-[#9A7A6E] mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 md:p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#1A0F0A] uppercase tracking-wider">
              Revenue trend
            </h2>
            <p className="text-xs text-[#9A7A6E] mt-0.5">Completed orders only</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <ArrowUpRight size={14} />
            {fmt(revenue)}
          </div>
        </div>
        <div className="h-56 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F9DEDA" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#9A7A6E" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9A7A6E" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #F9DEDA",
                  fontSize: 12,
                }}
                formatter={(value: number) => [fmt(value), "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#C9A227"
                strokeWidth={2.5}
                fill="url(#revFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Orders by status */}
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 md:p-6 shadow-sm">
          <h2 className="text-sm font-bold text-[#1A0F0A] uppercase tracking-wider mb-1">
            Orders by status
          </h2>
          <p className="text-xs text-[#9A7A6E] mb-4">In selected period</p>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-[#9A7A6E]">No orders</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F9DEDA" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9A7A6E" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="status"
                    width={80}
                    tick={{ fontSize: 11, fill: "#5C3D2E" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #F9DEDA", fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={18}>
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category sales */}
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 md:p-6 shadow-sm">
          <h2 className="text-sm font-bold text-[#1A0F0A] uppercase tracking-wider mb-1">
            Sales by category
          </h2>
          <p className="text-xs text-[#9A7A6E] mb-4">From completed orders</p>
          {categorySales.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-[#9A7A6E]">No sales data</div>
          ) : (
            <div className="space-y-3">
              {categorySales.map((c) => {
                const max = categorySales[0]?.revenue || 1;
                const pct = Math.round((c.revenue / max) * 100);
                return (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-[#1A0F0A]">{c.category}</span>
                      <span className="text-[#9A7A6E] font-medium">{fmt(c.revenue)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#FAF7F5] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C9A227] to-[#F2B8A8]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-[#C9A227]" />
            <h2 className="text-sm font-bold text-[#1A0F0A] uppercase tracking-wider">
              Best sellers
            </h2>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-[#9A7A6E] py-8 text-center">No product sales yet</p>
          ) : (
            <div className="divide-y divide-[#F9DEDA]/40">
              {topProducts.map((p, i) => (
                <div key={p.name + i} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#FAF7F5] text-[10px] font-bold text-[#9A7A6E] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1A0F0A] truncate">{p.name}</div>
                      <div className="text-[11px] text-[#9A7A6E]">{p.qty} sold</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[#1A0F0A] shrink-0">{fmt(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top customers */}
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-[#C9A227]" />
            <h2 className="text-sm font-bold text-[#1A0F0A] uppercase tracking-wider">
              Top customers
            </h2>
          </div>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-[#9A7A6E] py-8 text-center">No customer data yet</p>
          ) : (
            <div className="divide-y divide-[#F9DEDA]/40">
              {topCustomers.map((c, i) => (
                <div key={c.phone + i} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#FAF7F5] text-[10px] font-bold text-[#9A7A6E] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1A0F0A] truncate">{c.name}</div>
                      <div className="text-[11px] text-[#9A7A6E]">
                        {c.phone} · {c.orders} order{c.orders !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[#C9A227] shrink-0">{fmt(c.spent)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick insight strip */}
      <div className="mt-6 rounded-2xl bg-[#1A0F0A] text-[#F2B8A8] p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2">
          <Clock size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Snapshot</span>
        </div>
        <div className="text-sm flex-1">
          {orderCount === 0 ? (
            "No orders in this period yet. Share the store link to get your first sales."
          ) : (
            <>
              <strong className="text-white">{orderCount}</strong> order{orderCount !== 1 ? "s" : ""} ·{" "}
              <strong className="text-white">{fmt(revenue)}</strong> revenue ·{" "}
              <strong className="text-white">{customers}</strong> customer{customers !== 1 ? "s" : ""}
              {topProducts[0] ? (
                <> · Best seller: <strong className="text-white">{topProducts[0].name}</strong></>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
