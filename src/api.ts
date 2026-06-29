// API configuration
const API_BASE: string = import.meta.env.VITE_API_URL ?? (() => { throw new Error("VITE_API_URL is not set"); })();

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
  const res = await fetch(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  const data = await res.json();
  return data.map((p: any) => ({
    ...p,
    images: typeof p.images === "string" ? (() => { try { return JSON.parse(p.images); } catch { return []; } })() : (Array.isArray(p.images) ? p.images : []),
  }));
}

export async function createOrder(order: OrderData) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
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

export async function createProduct(data: ProductData) {
  const res = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}

export async function updateProduct(id: string, data: Partial<ProductData>) {
  const res = await fetch(`${API_BASE}/api/products/${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${API_BASE}/api/products/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete product");
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
  if (!sigRes.ok) {
    const err = await sigRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get upload signature");
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
  if (json.error) throw new Error(json.error.message || "Upload failed");

  // Prefer the eager-transformed URL (clean 800×800 square), fall back to original
  return json.eager?.[0]?.secure_url ?? json.secure_url;
}

export default API_BASE;