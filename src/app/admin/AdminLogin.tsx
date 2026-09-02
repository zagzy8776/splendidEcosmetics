import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Shield, Loader2 } from "lucide-react";
import { adminLogin, getAdminToken } from "../../api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAdminToken()) navigate("/admin", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const previous = meta.getAttribute("content");
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
    );
    return () => {
      if (previous) meta.setAttribute("content", previous);
    };
  }, []);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pw.trim()) { setErr("Please enter your password."); return; }
    setLoading(true); setErr("");
    try {
      const res = await adminLogin(pw);
      if (res.authenticated) navigate("/admin", { replace: true });
      else setErr("Incorrect password. Try again.");
    } catch (error: any) {
      setErr(error?.message || "Login failed. Check your connection and try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="admin-no-zoom min-h-dvh bg-[#1A0F0A] flex items-center justify-center p-6 relative overflow-hidden font-[Raleway,sans-serif]">
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#F2B8A8]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F2B8A8]/15 mb-4">
            <Shield className="text-[#F2B8A8]" size={28} />
          </div>
          <h1 className="text-[#F2B8A8] text-2xl font-bold tracking-[0.12em]" style={{ fontFamily: "'Playfair Display', serif" }}>SPLENDID EMPIRE</h1>
          <p className="text-white/40 text-xs tracking-[0.2em] mt-2 uppercase">Admin Portal</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-7 shadow-2xl shadow-black/30">
          <h2 className="text-[#1A0F0A] text-lg font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Welcome back</h2>
          <p className="text-[#5C3D2E]/70 text-sm mb-6">Enter your administrator password to continue.</p>
          <label className="block text-xs font-semibold text-[#5C3D2E] mb-1.5 tracking-wide uppercase">Password</label>
          <div className="relative mb-4">
            <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Enter admin password" autoFocus
              className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-4 py-3 pr-11 text-[#1A0F0A] text-base outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 transition" style={{ fontSize: 16 }} />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A7A6E] hover:text-[#1A0F0A]">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-red-600 text-sm">{err}</div>}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-[#1A0F0A] text-[#F2B8A8] font-semibold py-3 text-sm tracking-wide hover:bg-[#2A1A12] disabled:opacity-60 transition flex items-center justify-center gap-2">
            {loading ? (<><Loader2 size={16} className="animate-spin" /> Signing in…</>) : "Sign in"}
          </button>
        </form>
        <p className="text-center text-white/30 text-xs mt-6">Protected area · Authorized personnel only</p>
      </div>
    </div>
  );
}
