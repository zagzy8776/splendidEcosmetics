import React, { useEffect, useState } from "react";
import { Search, RefreshCw, Pencil, Trash2, Loader2, X, Check, MessageCircle } from "lucide-react";
import { useSearchParams } from "react-router";
import { fetchOrders, updateOrderStatus, updateOrder, deleteOrder } from "../../api";
import { fmt, type Order, type OrderStatus } from "./types";

const STATUSES: OrderStatus[] = ["pending", "verifying", "confirmed", "dispatched", "delivered"];

const statusStyle: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verifying: "bg-orange-50 text-orange-700 border-orange-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  dispatched: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function itemName(item: Order["items"][number]) {
  return item.product?.name || "Item";
}

function itemPrice(item: Order["items"][number]) {
  return Number(item.product?.price || 0) * item.quantity;
}

function whatsappUrl(phone: string, orderId: string, name: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  const intl = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  const text = encodeURIComponent(`Hello ${name}, this is Splendid Empire Cosmetics regarding order ${orderId}.`);
  return `https://wa.me/${intl}?text=${text}`;
}

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedOrderId = searchParams.get("order");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"All" | OrderStatus>("All");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<OrderStatus>("pending");
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function loadOrders(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(
        data.map((o: any) => ({
          ...o,
          status: o.status as OrderStatus,
          createdAt: o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt),
        }))
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function advanceStatus(order: Order) {
    const idx = STATUSES.indexOf(order.status);
    if (idx < 0 || idx >= STATUSES.length - 1) return;
    const next = STATUSES[idx + 1];
    try {
      await updateOrderStatus(order.id, next);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
      showToast("Order moved to " + next);
    } catch {
      showToast("Failed to update status");
    }
  }

  function openEdit(order: Order) {
    setEditing(order);
    setEditName(order.customerName);
    setEditPhone(order.phone);
    setEditEmail(order.email || "");
    setEditStatus(order.status);
    setEditErr("");
  }

  useEffect(() => {
    if (!requestedOrderId || loading || editing) return;
    const requested = orders.find((order) => order.id === requestedOrderId);
    if (!requested) return;
    openEdit(requested);
    setSearchParams({}, { replace: true });
  }, [requestedOrderId, orders, loading, editing, setSearchParams]);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editName.trim() || !editPhone.trim()) {
      setEditErr("Name and phone are required.");
      return;
    }
    setEditLoading(true);
    setEditErr("");
    try {
      await updateOrder(editing.id, {
        customerName: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim().toLowerCase(),
        status: editStatus,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editing.id
            ? { ...o, customerName: editName.trim(), phone: editPhone.trim(), email: editEmail.trim(), status: editStatus }
            : o
        )
      );
      setEditing(null);
      showToast("Order updated");
    } catch {
      setEditErr("Failed to save. Try again.");
    } finally {
      setEditLoading(false);
    }
  }

  async function removeOrder(id: string) {
    if (!window.confirm("Delete order " + id + "? This cannot be undone.")) return;
    try {
      await deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      showToast("Order deleted");
    } catch {
      showToast("Failed to delete order");
    }
  }

  const filtered = orders.filter((o) => {
    if (filter !== "All" && o.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.customerName.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1A0F0A] text-[#F2B8A8] px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Orders
          </h1>
          <p className="text-[#5C3D2E]/70 text-sm mt-1">
            {orders.length} total - {orders.filter((o) => o.status === "pending" || o.status === "verifying").length} pending
          </p>
        </div>
        <button
          onClick={() => void loadOrders(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#F9DEDA] bg-white text-sm font-medium text-[#1A0F0A] hover:border-[#C9A227]/50 transition"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A7A6E]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, order ID..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#F9DEDA] bg-white text-sm outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/15"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(["All", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition ${
                filter === s
                  ? "bg-[#1A0F0A] text-[#F2B8A8]"
                  : "bg-white border border-[#F9DEDA] text-[#5C3D2E] hover:border-[#C9A227]/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#C9A227]" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-12 text-center text-[#9A7A6E] text-sm">
          No orders found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const wa = whatsappUrl(order.phone, order.id, order.customerName);
            return (
            <div key={order.id} className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 md:p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#1A0F0A] text-sm">{order.customerName}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusStyle[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#9A7A6E] mt-1">
                    {order.id} - {order.phone}
                    {order.email ? " - " + order.email : ""} - {new Date(order.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-[#5C3D2E] space-y-0.5">
                    {order.items?.map((item, i) => (
                      <div key={i}>
                        {item.quantity}x {itemName(item)} - {fmt(itemPrice(item))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right mr-2">
                    <div className="font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {fmt(Number(order.total))}
                    </div>
                  </div>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border border-emerald-100 text-emerald-600 hover:bg-emerald-50 transition"
                      title="WhatsApp customer"
                    >
                      <MessageCircle size={14} />
                    </a>
                  )}
                  {order.status !== "delivered" && (
                    <button
                      onClick={() => advanceStatus(order)}
                      className="px-3 py-1.5 rounded-lg bg-[#1A0F0A] text-[#F2B8A8] text-xs font-semibold hover:bg-[#2A1A12] transition"
                      title="Advance status"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(order)}
                    className="p-1.5 rounded-lg border border-[#F9DEDA] text-[#5C3D2E] hover:border-[#C9A227] transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => removeOrder(order.id)}
                    className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Edit Order
              </h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-[#FAF7F5]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">Customer Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">Phone</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">Email</label>
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as OrderStatus)} className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {editErr && <div className="text-red-600 text-sm">{editErr}</div>}
              <button type="submit" disabled={editLoading} className="w-full rounded-xl bg-[#1A0F0A] text-[#F2B8A8] font-semibold py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {editLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Save changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
