export type OrderStatus = "pending" | "verifying" | "confirmed" | "dispatched" | "delivered";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  images?: string[];
  videoUrl?: string;
  description: string;
  inStock: boolean;
  stockQuantity?: number | null;
  lowStockThreshold?: number;
  badge?: string;
  rating: number;
  reviews: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

export type CategoryImages = Record<string, string>;

export function fmt(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

export function stockLabel(product: Pick<Product, "stockQuantity" | "lowStockThreshold" | "inStock">) {
  if (product.stockQuantity === null || product.stockQuantity === undefined) {
    return { text: "— — Not tracked", tone: "muted" as const };
  }
  if (product.stockQuantity === 0) {
    return { text: "0 — Out of stock", tone: "out" as const };
  }
  const threshold = product.lowStockThreshold ?? 3;
  if (product.stockQuantity <= threshold) {
    return { text: `${product.stockQuantity} — Low stock`, tone: "low" as const };
  }
  return { text: `${product.stockQuantity} — In stock`, tone: "ok" as const };
}
