import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Package, TrendingUp, Clock, ArrowRight, Loader2 } from "lucide-react";
import { fetchProducts, fetchOrders } from "../../api";
import { fmt, type Order, type Product, type OrderStatus } from "./types";

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchProducts().catch(() => []), fetchOrders().catch(() => [])]).then(([prods, ords]) => {
      setProducts(prods.map((p: any) => ({ ...p, rating: p.rating ?? 0, reviews: p.reviews ?? 0 })));
      setOrders(ords.map((o: any) => ({
        ...o,
        status: o.status as OrderStatus,
        createdAt: o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt),
      })));
      setLoading(false);
    });
  }, []);

  const pending = orders.filter((o) => o.status === "pending" || o.status === "verifying").length;
  const revenue = orders
    .filter((o) => ["delivered", "dispatched", "confirmed"].includes(o.status))
    .reduce((s, o) => s + Number(o.total), 0);
  const inStock = products.filter((p) => p.inStock).length;
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[#C9A227]" size={28} />
      </div>
    );
  }

  const stats = [
    { label: "Products", value: products.length, icon: Package, color: "bg-blue-50 text-blue-600" },
    { label: "In Stock", value: inStock, icon: Package, color: "bg-emerald-50 text-emerald-600" },
    { label: "Pending Orders", value: pending, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Revenue", value: fmt(revenue), icon: TrendingUp, color: "bg-[#F2B8A8]/20 text-[#C9A227]" },
  ];

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1A0F0A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Dashboard
        </h1>
        <p className="text-[#5C3D2E]/70 text-sm mt-1">Overview of your store performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-5 shadow-sm">
            <div className={`inline-flex p-2 rounded-xl ${s.color} mb-3`}>
              <s.icon size={18} />
            </div>
            <div className="text-xs font-semibold text-[#9A7A6E] uppercase tracking-wider">{s.label}</div>
            <div
              className="text-xl font-bold text-[#1A0F0A] mt-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-bold text-[#1A0F0A] uppercase tracking-wider mb-3">Quick Actions</h2>
          {[
            { to: "/admin/products", label: "Manage Products" },
            { to: "/admin/orders", label: "View Orders" },
            { to: "/admin/categories", label: "Categories" },
            { to: "/admin/settings", label: "Settings & Security" },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center justify-between bg-white rounded-xl border border-[#F9DEDA]/50 px-4 py-3.5 hover:border-[#C9A227]/40 hover:shadow-sm transition group"
            >
              <span className="text-sm font-medium text-[#1A0F0A]">{a.label}</span>
              <ArrowRight size={16} className="text-[#9A7A6E] group-hover:text-[#C9A227] transition" />
            </Link>
          ))}
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#1A0F0A] uppercase tracking-wider">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs font-semibold text-[#C9A227] hover:underline">
              View all
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 overflow-hidden shadow-sm">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-[#9A7A6E] text-sm">No orders yet</div>
            ) : (
              <div className="divide-y divide-[#F9DEDA]/40">
                {recentOrders.map((o) => (
                  <div key={o.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1A0F0A] truncate">{o.customerName}</div>
                      <div className="text-xs text-[#9A7A6E] mt-0.5">
                        {o.id} - {new Date(o.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[#1A0F0A]">{fmt(o.total)}</div>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
