import React, { useEffect, useState } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import {
  fetchProducts, fetchCategories, saveCategoryPhoto, deleteCategoryPhoto, cloudinaryUpload,
} from "../../api";
import type { Product, CategoryImages } from "./types";

export default function CategoriesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<CategoryImages>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  useEffect(() => {
    Promise.all([fetchProducts().catch(() => []), fetchCategories().catch(() => ({}))]).then(
      ([prods, cats]) => {
        setProducts(prods.map((p: any) => ({ ...p, rating: p.rating ?? 0, reviews: p.reviews ?? 0 })));
        setImages(cats || {});
        setLoading(false);
      }
    );
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  async function handleUpload(cat: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(cat);
    try {
      const url = await cloudinaryUpload(file);
      await saveCategoryPhoto(cat, url);
      setImages((prev) => ({ ...prev, [cat]: url }));
      showToast("Photo saved for " + cat);
    } catch (err: any) {
      showToast(err.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleRemove(cat: string) {
    if (!window.confirm("Remove photo for " + cat + "?")) return;
    try {
      await deleteCategoryPhoto(cat);
      setImages((prev) => {
        const next = { ...prev };
        delete next[cat];
        return next;
      });
      showToast("Photo removed");
    } catch {
      showToast("Failed to remove photo");
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
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Categories
        </h1>
        <p className="text-[#5C3D2E]/70 text-sm mt-1">Manage category photos shown on the store</p>
      </div>
      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-12 text-center text-[#9A7A6E] text-sm">
          No categories yet. Add products first.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            const img = images[cat];
            return (
              <div key={cat} className="bg-white rounded-2xl border border-[#F9DEDA]/50 overflow-hidden shadow-sm">
                <div className="aspect-[4/3] bg-[#FAF7F5] relative">
                  {img ? (
                    <img src={img} alt={cat} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#9A7A6E] text-sm">No photo</div>
                  )}
                  {uploading === cat && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-semibold text-[#1A0F0A]">{cat}</div>
                  <div className="text-xs text-[#9A7A6E] mt-0.5">{count} product{count !== 1 ? "s" : ""}</div>
                  <div className="flex gap-2 mt-3">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#F9DEDA] text-xs font-semibold text-[#1A0F0A] cursor-pointer hover:border-[#C9A227]/50 transition">
                      <Upload size={13} />
                      {img ? "Change" : "Upload"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(cat, e)} />
                    </label>
                    {img && (
                      <button onClick={() => handleRemove(cat)} className="p-2 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
