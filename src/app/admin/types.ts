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
