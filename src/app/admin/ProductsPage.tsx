import React, { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, Loader2, X, Upload, Check } from "lucide-react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  cloudinaryUpload,
} from "../../api";
import { fmt, type Product } from "./types";

type PForm = {
  name: string;
  category: string;
  price: string;
  image: string;
  images: string[];
  videoUrl: string;
  description: string;
  badge: string;
  inStock: boolean;
};

const EMPTY: PForm = {
  name: "",
  category: "",
  price: "",
  image: "",
  images: ["", "", ""],
  videoUrl: "",
  description: "",
  badge: "",
  inStock: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PForm>(EMPTY);
  const [fErr, setFErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [customCat, setCustomCat] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  useEffect(() => {
    fetchProducts()
      .then((data) =>
        setProducts(data.map((p: any) => ({ ...p, rating: p.rating ?? 0, reviews: p.reviews ?? 0 })))
      )
      .catch(() => showToast("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  function openAdd() {
    setForm(EMPTY);
    setEditId(null);
    setCustomCat("");
    setFErr("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      category: p.category,
      price: String(p.price),
      image: p.image,
      images: [...(p.images ?? []), "", "", ""].slice(0, 3),
      videoUrl: p.videoUrl ?? "",
      description: p.description,
      badge: p.badge || "",
      inStock: p.inStock,
    });
    setEditId(p.id);
    setCustomCat("");
    setFErr("");
    setShowForm(true);
  }

  async function handleSlotUpload(e: React.ChangeEvent<HTMLInputElement>, slot: number) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowed.includes(file.type)) {
      setFErr("Please upload JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setFErr("Image too large (max 15MB).");
      return;
    }
    setUploadingSlot(slot);
    setFErr("");
    try {
      const url = await cloudinaryUpload(file);
      if (slot === 0) setForm((f) => ({ ...f, image: url }));
      else
        setForm((f) => {
          const next = [...f.images];
          next[slot - 1] = url;
          return { ...f, images: next };
        });
    } catch (err: any) {
      setFErr(err.message || "Upload failed");
    } finally {
      setUploadingSlot(null);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      setFErr("Product name is required.");
      return;
    }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      setFErr("Enter a valid price.");
      return;
    }
    const category = customCat.trim() || form.category.trim();
    if (!category) {
      setFErr("Category is required.");
      return;
    }

    setSaving(true);
    setFErr("");
    const payload = {
      name: form.name.trim(),
      category,
      price: Number(form.price),
      image:
        form.image.trim() ||
        "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=500&h=500&fit=crop",
      images: form.images.filter((u) => u.trim()),
      videoUrl: form.videoUrl.trim() || undefined,
      description: form.description.trim(),
      badge: form.badge.trim() || undefined,
      inStock: form.inStock,
    };

    try {
      if (editId) {
        const updated = await updateProduct(editId, payload);
        setProducts((prev) => prev.map((p) => (p.id === editId ? { ...p, ...updated } : p)));
        showToast("Product updated");
      } else {
        const created = await createProduct({
          ...payload,
          id: "",
          rating: 4.8,
          reviews: 0,
        } as any);
        setProducts((prev) => [{ ...created, rating: 4.8, reviews: 0 }, ...prev]);
        showToast("Product added");
      }
      setShowForm(false);
      setEditId(null);
    } catch {
      setFErr("Failed to save product. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast("Product deleted");
    } catch {
      showToast("Failed to delete");
    }
  }

  async function toggleStock(p: Product) {
    try {
      const updated = await updateProduct(p.id, { inStock: !p.inStock });
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, inStock: updated.inStock } : item))
      );
    } catch {
      showToast("Failed to update stock");
    }
  }

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.badge || "").toLowerCase().includes(q)
    );
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
            Products
          </h1>
          <p className="text-[#5C3D2E]/70 text-sm mt-1">{products.length} products</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A0F0A] text-[#F2B8A8] text-sm font-semibold hover:bg-[#2A1A12] transition"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A7A6E]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#F9DEDA] bg-white text-sm outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/15"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#C9A227]" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#F9DEDA]/50 p-12 text-center text-[#9A7A6E] text-sm">
          No products found
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-[#F9DEDA]/50 overflow-hidden shadow-sm flex flex-col">
              <div className="aspect-square bg-[#FAF7F5] relative">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                {!p.inStock && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white/90 text-[#1A0F0A] text-xs font-bold px-3 py-1 rounded-full">Out of stock</span>
                  </div>
                )}
                {p.badge && (
                  <span className="absolute top-2 left-2 bg-[#C9A227] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="text-[10px] font-semibold text-[#9A7A6E] uppercase tracking-wider">{p.category}</div>
                <div className="font-semibold text-[#1A0F0A] text-sm mt-0.5 line-clamp-2">{p.name}</div>
                <div className="text-[#C9A227] font-bold mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {fmt(p.price)}
                </div>
                <div className="mt-auto pt-3 flex items-center gap-2">
                  <button
                    onClick={() => toggleStock(p)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition ${
                      p.inStock
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                        : "border-[#F9DEDA] text-[#9A7A6E]"
                    }`}
                  >
                    {p.inStock ? "In Stock" : "Restock"}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-lg border border-[#F9DEDA] text-[#5C3D2E] hover:border-[#C9A227] transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="p-2 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92dvh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-[#F9DEDA]/40 px-5 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-[#1A0F0A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {editId ? "Edit Product" : "Add Product"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#FAF7F5]">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-2">Images</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((slot) => {
                    const url = slot === 0 ? form.image : form.images[slot - 1];
                    return (
                      <label
                        key={slot}
                        className="aspect-square rounded-xl border-2 border-dashed border-[#F9DEDA] bg-[#FAF7F5] flex items-center justify-center cursor-pointer overflow-hidden relative hover:border-[#C9A227]/50 transition"
                      >
                        {uploadingSlot === slot ? (
                          <Loader2 size={18} className="animate-spin text-[#C9A227]" />
                        ) : url ? (
                          <>
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                if (slot === 0) setForm((f) => ({ ...f, image: "" }));
                                else
                                  setForm((f) => {
                                    const next = [...f.images];
                                    next[slot - 1] = "";
                                    return { ...f, images: next };
                                  });
                              }}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-[#9A7A6E]">
                            <Upload size={16} className="mx-auto mb-0.5" />
                            <span className="text-[9px]">{slot === 0 ? "Main" : "+" + slot}</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSlotUpload(e, slot)} />
                      </label>
                    );
                  })}
                </div>
              </div>

              <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">Category</label>
                <select
                  value={customCat ? "__custom__" : form.category}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setCustomCat(" ");
                      setForm((f) => ({ ...f, category: "" }));
                    } else {
                      setCustomCat("");
                      setForm((f) => ({ ...f, category: e.target.value }));
                    }
                  }}
                  className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227] mb-2"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__custom__">+ New category</option>
                </select>
                {!!customCat && (
                  <input
                    value={customCat === " " ? "" : customCat}
                    onChange={(e) => setCustomCat(e.target.value)}
                    placeholder="Type new category name"
                    className="w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]"
                  />
                )}
              </div>
              <Field label="Price (NGN)" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} type="number" />
              <Field label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} multiline />
              <Field label="Badge (optional)" value={form.badge} onChange={(v) => setForm((f) => ({ ...f, badge: v }))} placeholder="NEW, SALE, SET..." />
              <Field label="Video URL (optional)" value={form.videoUrl} onChange={(v) => setForm((f) => ({ ...f, videoUrl: v }))} placeholder="Instagram / TikTok link" />

              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, inStock: !f.inStock }))}
                  className={`w-10 h-6 rounded-full transition relative ${form.inStock ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition"
                    style={{ left: form.inStock ? "1.25rem" : "0.125rem" }}
                  />
                </button>
                <span className="text-sm text-[#1A0F0A] font-medium">In stock</span>
              </label>

              {fErr && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{fErr}</div>}

              <button
                onClick={save}
                disabled={saving}
                className="w-full rounded-xl bg-[#1A0F0A] text-[#F2B8A8] font-semibold py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {editId ? "Save changes" : "Add product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const cls =
    "w-full rounded-xl border border-[#F9DEDA] bg-[#FAF7F5] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/15";
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C3D2E] block mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  );
}
