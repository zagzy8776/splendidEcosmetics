import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard, BarChart3, Package, ShoppingBag, Users, Tags, Bell, Settings, LogOut, Menu, X, ChevronLeft,
} from "lucide-react";
import { adminLogout, clearAdminToken, getAdminToken } from "../../api";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, end: true },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!getAdminToken()) navigate("/admin/login", { replace: true });
  }, [navigate]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // iPhone: lock viewport scale while in admin so forms never auto-zoom
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const previous = meta.getAttribute("content");
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
    );
    // Prevent double-tap zoom on iOS
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture, { passive: false } as any);
    return () => {
      if (previous) meta.setAttribute("content", previous);
      else {
        meta.setAttribute(
          "content",
          "width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover"
        );
      }
      document.removeEventListener("gesturestart", preventGesture as any);
    };
  }, []);

  async function handleLogout() {
    if (!window.confirm("Log out of admin panel?")) return;
    await adminLogout();
    clearAdminToken();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="admin-no-zoom min-h-dvh flex bg-[#FAF7F5] font-[Raleway,sans-serif]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[100] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`fixed lg:sticky top-0 left-0 z-[110] h-dvh w-64 flex flex-col bg-[#1A0F0A] text-white transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[#F2B8A8] font-bold tracking-[0.15em] text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>SPLENDID EMPIRE</div>
            <div className="text-white/40 text-[10px] tracking-widest mt-0.5 uppercase">Admin Portal</div>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="lg:hidden relative z-[120] flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 touch-manipulation"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink key={item.href} to={item.href} end={item.end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-11 touch-manipulation ${isActive ? "bg-[#F2B8A8]/15 text-[#F2B8A8]" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <button type="button" onClick={() => navigate("/")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/5 hover:text-white transition-colors min-h-11 touch-manipulation">
            <ChevronLeft size={18} /> Back to Store
          </button>
          <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-300/80 hover:bg-red-500/10 hover:text-red-300 transition-colors min-h-11 touch-manipulation">
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 min-h-dvh">
        <header className="lg:hidden sticky top-0 z-[100] relative bg-white border-b border-[#F9DEDA]/40 px-4 py-3 flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            aria-label="Open admin navigation"
            aria-expanded={sidebarOpen}
            aria-controls="admin-mobile-navigation"
            onClick={() => setSidebarOpen(true)}
            className="relative z-[120] flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-[#FAF7F5] touch-manipulation pointer-events-auto"
          >
            <Menu size={22} className="text-[#1A0F0A]" />
          </button>
          <div className="min-w-0 truncate text-[#1A0F0A] font-bold text-sm tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>Splendid Admin</div>
        </header>
        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
