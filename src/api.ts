// API configuration with safe fallback for production & local development
let configuredApiBase: string = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== "")
  ? import.meta.env.VITE_API_URL.trim().replace(/\/$/, "")
  : "";

if (configuredApiBase.includes("onrender.com")) {
  configuredApiBase = "";
}

const API_BASE: string = configuredApiBase;

// Helper function to auto-retry GET requests when server is waking up from sleep
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delayMs = 1500): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || i === retries - 1) return res;
    } catch (err) {
      if (i === retries - 1) throw err;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
  }
  return fetch(url, options);
}

// ─── AUTH TOKEN ───────────────────────────────────────────────────────────────
// Stored in sessionStorage so it clears when the browser tab/session closes.
export function getAdminToken(): string | null {
  return sessionStorage.getItem("admin_token");
}

function setAdminToken(token: string) {
  sessionStorage.setItem("admin_token", token);
}

export function clearAdminToken() {
  sessionStorage.removeItem("admin_token");
}

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleAdminResponse(res: Response, fallbackMsg: string) {
  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || fallbackMsg);
  }
  return res.json();
}



export interface ProductData {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  images?: string[];
  videoUrl?: string;
  description: string;
  inStock: boolean;
  badge?: string;
  rating?: number;
  reviews?: number;
}

export interface OrderData {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  total: number;
  status: string;
  items: Array<{
    product: { id: string; name: string; price: number };
    quantity: number;
  }>;
}

export async function fetchProducts(): Promise<ProductData[]> {
  const res = await fetchWithRetry(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  const data = await res.json();
  return data.map((p: any) => ({
    ...p,
    images: typeof p.images === "string" ? (() => { try { return JSON.parse(p.images); } catch { return []; } })() : (Array.isArray(p.images) ? p.images : []),
  }));
}

export async function createOrder(order: OrderData & { installationId?: string | null }) {
  const payload: Record<string, unknown> = { ...order };
  // Optional: associate this browser's push subscription with the order
  if (order.installationId) {
    payload.installationId = order.installationId;
  } else {
    delete payload.installationId;
  }
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create order");
  const data = await res.json();
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    items: data.items.map((i: any) => ({
      product: { id: i.productId, name: i.name, price: Number(i.price) },
      quantity: i.quantity
    }))
  };
}

export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/api/orders`, {
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch orders");
  const data = await res.json();
  return data.map((o: any) => ({
    ...o,
    createdAt: new Date(o.createdAt),
    items: o.items.map((i: any) => ({
      product: { id: i.productId, name: i.name, price: Number(i.price) },
      quantity: i.quantity
    }))
  }));
}

export async function updateOrderStatus(id: string, status: string) {
  const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update order");
  const data = await res.json();
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    items: data.items.map((i: any) => ({
      product: { id: i.productId, name: i.name, price: Number(i.price) },
      quantity: i.quantity
    }))
  };
}

export async function deleteOrder(id: string) {
  const res = await fetch(`${API_BASE}/api/orders/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete order");
  return res.json();
}

export async function updateOrder(id: string, data: { customerName?: string; phone?: string; email?: string; notes?: string; status?: string }) {
  const res = await fetch(`${API_BASE}/api/orders/${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update order");
  const updated = await res.json();
  return {
    ...updated,
    createdAt: new Date(updated.createdAt),
    items: updated.items.map((i: any) => ({
      product: { id: i.productId, name: i.name, price: Number(i.price) },
      quantity: i.quantity,
    })),
  };
}

export async function createProduct(data: ProductData) {
  const res = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (res.status === 401) { clearAdminToken(); throw new Error("Session expired. Please log in again."); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create product");
  }
  return res.json();
}

export async function updateProduct(id: string, data: Partial<ProductData>) {
  const res = await fetch(`${API_BASE}/api/products/${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (res.status === 401) { clearAdminToken(); throw new Error("Session expired. Please log in again."); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update product");
  }
  return res.json();
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${API_BASE}/api/products/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (res.status === 401) { clearAdminToken(); throw new Error("Session expired. Please log in again."); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete product");
  }
  return res.json();
}

export async function adminLogin(password: string) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Login failed");
  }
  const data = await res.json();
  if (data.token) setAdminToken(data.token);
  return data;
}

export async function adminLogout() {
  const token = getAdminToken();
  if (token) {
    await fetch(`${API_BASE}/api/admin/logout`, {
      method: "POST",
      headers: adminHeaders(),
    }).catch(() => {}); // best-effort
  }
  clearAdminToken();
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/api/admin/change-password`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to change password");
  return data;
}

export async function cloudinaryUpload(file: File): Promise<string> {
  // Step 1: get a signed signature from our backend (never exposes secret to browser)
  const sigRes = await fetch(`${API_BASE}/api/admin/cloudinary-upload-signature`, {
    method: "POST",
    headers: adminHeaders(),
  });
  if (sigRes.status === 401) {
    clearAdminToken();
    throw new Error("Session expired. Please log in again.");
  }
  if (!sigRes.ok) {
    const err = await sigRes.json().catch(() => ({}));
    throw new Error(err.error || `Failed to get upload signature (HTTP ${sigRes.status})`);
  }
  const { signature, timestamp, api_key, cloud_name, folder, eager, eager_async } = await sigRes.json();

  // Step 2: upload directly to Cloudinary with the signed params
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", api_key);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("eager", eager);
  form.append("eager_async", eager_async);

  const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
    method: "POST",
    body: form,
  });
  const json = await upRes.json();
  if (json.error) {
    // Provide a detailed error so the admin knows exactly what's wrong
    const detail = json.error.message || JSON.stringify(json.error);
    console.error(`[Cloudinary Upload Failed] HTTP ${upRes.status}: ${detail}`);
    throw new Error(`Image upload rejected by Cloudinary (${upRes.status}): ${detail}. 
      Check that CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are correctly set in the backend environment variables.`);
  }

  // Prefer the eager-transformed URL (clean 800×800 square), fall back to original
  return json.eager?.[0]?.secure_url ?? json.secure_url;
}

export async function fetchCategoriesList(): Promise<Array<{ name: string; image: string | null }>> {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/categories?list=1`, {
      headers: { Accept: "application/json+list" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    // fallback if server returned map
    return Object.entries(data || {}).map(([name, image]) => ({ name, image: image as string }));
  } catch {
    return [];
  }
}

export async function fetchCategories(): Promise<Record<string, string>> {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/categories`);
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch categories from database:", err);
    return {};
  }
}

export async function saveCategoryPhoto(name: string, image: string | null) {
  const res = await fetch(`${API_BASE}/api/categories`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ name, image: image || null }),
  });
  if (res.status === 401) { clearAdminToken(); throw new Error("Session expired. Please log in again."); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save category");
  }
  return res.json();
}

export async function deleteCategoryPhoto(name: string) {
  const res = await fetch(`${API_BASE}/api/categories/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete category photo");
  return res.json();
}

export default API_BASE;

/** Public order status (no auth) — used by /order/:id tracking page */
export async function fetchPublicOrder(id: string) {
  const res = await fetchWithRetry(`${API_BASE}/api/orders/${encodeURIComponent(id)}/public`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Order not found");
    throw new Error("Failed to load order");
  }
  return res.json();
}
