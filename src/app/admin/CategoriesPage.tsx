import React, { useEffect, useState } from "react";
import { Loader2, Upload, Trash2, Plus, X, Check } from "lucide-react";
import {
  fetchProducts,
  fetchCategories,
  fetchCategoriesList,
  saveCategoryPhoto,
  deleteCategoryPhoto,
  cloudinaryUpload,
} from "../../api";
import type { Product } from "./types";

type CatRow = { name: string; image: string | null; productCount: number };

export default function CategoriesPage() {
  const [rows, setRows] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [uploadingNew, setUploadingNew] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const [prods, list, map] = await Promise.all([
        fetchProducts().catch(() => []),
        fetchCategoriesList().catch(() => []),
        fetchCategories().catch(() => ({})),
      ]);

      const countMap: Record<string, number> = {};
      for (const p of prods as any[]) {
        const c = p.category;
        if (c) countMap[c] = (countMap[c] || 0) + 1;
      }

      const names = new Set<string>();
      for (const c of list) names.add(c.name);
      for (const c of Object.keys(map || {})) names.add(c);
      for (const c of Object.keys(countMap)) names.add(c);

      const imageByName: Record<string, string | null> = {};
      for (const c of list) imageByName[c.name] = c.image;
      for (const [n, img] of Object.entries(map || {})) {
        if (img) imageByName[n] = img as string;
      }

      const next: CatRow[] = Array.from(names)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({
          name,
          image: imageByName[name] || null,
          productCount: countMap[name] || 0,
        }));
      setRows(next);
    } catch {
      showToast("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(cat: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(cat);
    try {
      const url = await cloudinaryUpload(file);
      await saveCategoryPhoto(cat, url);
      setRows((prev) => prev.map((r) => (r.name === cat ? { ...r, image: url } : r)));
      showToast("Photo saved for " + cat);
    } catch (err: any) {
      showToast(err.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleRemovePhoto(cat: string) {
    if (!window.confirm("Remove photo for " + cat + "?")) return;
    try {
      await saveCategoryPhoto(cat, null as any);
      // keep category row, clear image — or deleteCategoryPhoto removes whole category
      await saveCategoryPhoto(cat, "");
      setRows((prev) => prev.map((r) => (r.name === cat ? { ...r, image: null } : r)));
      showToast("Photo removed");
    } catch (err: any) {
      showToast(err.message || "Failed to remove photo");
    }
  }

  async function handleDeleteCategory(cat: string) {
    if (!window.confirm(`Delete category "${cat}"? Products using it will keep the name but the category entry and photo will be removed.`)) return;
    try {
      await deleteCategoryPhoto(cat);
      setRows((prev) => prev.filter((r) => r.name !== cat));
      showToast("Category deleted");
    } catch (err: any) {
      showToast(err.message || "Failed to delete");
    }
  }

  async function handleNewImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingNew(true);
    setAddErr("");
    try {
      const url = await cloudinaryUpload(file);
      setNewImage(url);
    } catch (err: any) {
      setAddErr(err.message || "Upload failed");
    } finally {
      setUploadingNew(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setAddErr("Category name is required.");
      return;
    }
    if (rows.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setAddErr("This category already exists.");
      return;
    }
    setAdding(true);
    setAddErr("");
    try {
      await saveCategoryPhoto(name, newImage || null);
      setRows((prev) =>
        [...prev, { name, image: newImage || null, productCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setShowAdd(false);
      setNewName("");
      setNewImage("");
      showToast("Category added");
    } catch (err: any) {
      setAddErr(err.message || "Failed to add category");
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A227]" size={28} />
      </div>
    );
  }

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
            Categories
          </h1>
          <p className="text-[#5C3D2E]/70 text-sm mt-1">
            Add categories and upload photos shown on the store
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddErr(""); setNewName(""); setNewImage(""); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A0F0A] text-[#F2B8A8] text-sm font-semibold hover:bg-[#2A1A12] transition"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-12 text-center">
          <p className="text-[#9A7A6E] text-sm mb-4">No categories yet.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A0F0A] text-[#F2B8A8] text-sm font-semibold"
          >
            <Plus size={16} /> Add your first category
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((cat) => (
            <div key={cat.name} className="bg-white rounded-2xl border border-[#F9DEDA]/50 overflow-hidden shadow-sm">
              <div className="aspect-[4/3] bg-[#FAF7F5] relative">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#9A7A6E] text-sm">No photo</div>
                )}
                {uploading === cat.name && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={24} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="font-semibold text-[#1A0F0A]">{cat.name}</div>
                <div className="text-xs text-[#9A7A6E] mt-0.5">
                  {cat.productCount} product{cat.productCount !== 1 ? "s" : ""}
                </div>
                <div className="flex gap-2 mt-3">
                  <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#F9DEDA] text-xs font-semibold text-[#1A0F0A] cursor-pointer hover:border-[#C9A227]/50 transition">
                    <Upload size={13} />
                    {cat.image ? "Change photo" : "Upload photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(cat.name, e)} />
                  </label>
                  <button
                    onClick={() => handleDeleteCategory(cat.name)}
                    className="p-2 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition"
                    title="Delete category"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Category Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F9DEDA]/40">
              <h3 className="font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Add Category
              </h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-[#FAF7F5]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">
                  Category name
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Foundation, Serum, Perfume"
                  autoFocus
                  className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">
                  Photo (optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="w-24 h-24 rounded-xl border-2 border-dashed border-[#F9DEDA] bg-[#FAF7F5] flex items-center justify-center cursor-pointer overflow-hidden relative hover:border-[#C9A227]/50">
                    {uploadingNew ? (
                      <Loader2 size={18} className="animate-spin text-[#C9A227]" />
                    ) : newImage ? (
                      <img src={newImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-[#9A7A6E]">
                        <Upload size={16} className="mx-auto" />
                        <span className="text-[9px]">Upload</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleNewImage} />
                  </label>
                  {newImage && (
                    <button type="button" onClick={() => setNewImage("")} className="text-xs text-red-500 font-medium">
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              {addErr && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-red-600 text-sm">{addErr}</div>
              )}

              <button
                type="submit"
                disabled={adding}
                className="w-full rounded-xl bg-[#1A0F0A] text-[#F2B8A8] font-semibold py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Add category
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
