import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Search, RefreshCw, Phone, Mail, ShoppingBag } from "lucide-react";
import { clearAdminToken, getAdminToken } from "../../api";
import { fmt } from "./types";

type Customer = {
  key: string;
  name: string;
  phone: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  lastOrderId: string;
  lastStatus: string;
};

const API_BASE = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== ""
  ? import.meta.env.VITE_API_URL.trim().replace(/\/$/, "")
  : "");

async function loadCustomers(): Promise<Customer[]> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}/api/admin/customers`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Session expired. Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load customers");
  return data as Customer[];
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setRows(await loadCustomers());
    } catch (err: any) {
      setError(err?.message || "Failed to load customers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = rows.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Customers
          </h1>
          <p className="text-[#5C3D2E]/70 text-sm mt-1">{rows.length} unique customers from orders</p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#F9DEDA] bg-white text-sm font-medium text-[#1A0F0A]"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A7A6E]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#F9DEDA] bg-white text-sm outline-none focus:border-[#C9A227]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#C9A227]" size={28} />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center text-red-600 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-12 text-center text-[#9A7A6E] text-sm">
          No customers found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.key} className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-4 md:p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[#1A0F0A]">{c.name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9A7A6E]">
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} /> {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={12} /> {c.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-[#9A7A6E] font-bold">Orders</div>
                    <div className="font-semibold text-[#1A0F0A]">{c.orderCount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-[#9A7A6E] font-bold">Spent</div>
                    <div className="font-semibold text-[#1A0F0A]">{fmt(c.totalSpent)}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/orders?order=${encodeURIComponent(c.lastOrderId)}`)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A0F0A] text-[#F2B8A8] px-3 py-2 text-xs font-semibold"
                  >
                    <ShoppingBag size={13} /> Last order
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
