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
  return res.json();
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

export default API_BASE;