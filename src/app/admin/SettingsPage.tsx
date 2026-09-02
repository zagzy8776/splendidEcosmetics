import React, { useState } from "react";
import { Eye, EyeOff, Loader2, Shield, Check } from "lucide-react";
import { changeAdminPassword } from "../../api";

export default function SettingsPage() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setSuccess("");
    if (!current || !newPw || !confirm) { setErr("All fields are required."); return; }
    if (newPw.length < 6) { setErr("New password must be at least 6 characters."); return; }
    if (newPw !== confirm) { setErr("New passwords do not match."); return; }
    setLoading(true);
    try {
      await changeAdminPassword(current, newPw);
      setSuccess("Password changed successfully. Use your new password next time you log in.");
      setCurrent(""); setNewPw(""); setConfirm("");
    } catch (error: any) {
      setErr(error?.message || "Failed to change password. Check your current password.");
    } finally { setLoading(false); }
  }

  return (
    <div className="p-5 md:p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>Settings</h1>
        <p className="text-[#5C3D2E]/70 text-sm mt-1">Security and account settings</p>
      </div>
      <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-[#F2B8A8]/20"><Shield size={20} className="text-[#C9A227]" /></div>
          <div>
            <h2 className="font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>Change Password</h2>
            <p className="text-xs text-[#9A7A6E] mt-0.5">Your password is stored securely. Only you can change it.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PwField label="Current password" value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent((s) => !s)} />
          <PwField label="New password" value={newPw} onChange={setNewPw} show={showNew} onToggle={() => setShowNew((s) => !s)} />
          <PwField label="Confirm new password" value={confirm} onChange={setConfirm} show={showNew} onToggle={() => setShowNew((s) => !s)} />
          {err && <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-red-600 text-sm">{err}</div>}
          {success && <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-emerald-700 text-sm flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0" />{success}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#1A0F0A] text-[#F2B8A8] font-semibold py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-[#2A1A12] transition">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null} Update password
          </button>
        </form>
      </div>
      <div className="mt-6 rounded-2xl bg-[#FAF7F5] border border-[#F9DEDA]/40 p-4 text-xs text-[#5C3D2E]/80 leading-relaxed">
        <strong className="text-[#1A0F0A]">Note:</strong> After changing your password, the new one becomes permanent. Redeploys will no longer reset it.
      </div>
    </div>
  );
}

function PwField({ label, value, onChange, show, onToggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/15" />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A7A6E] hover:text-[#1A0F0A]">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
