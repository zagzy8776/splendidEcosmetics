import { useState, useEffect } from "react";
import { fetchProducts, createOrder, fetchOrders, updateOrderStatus, createProduct, updateProduct, deleteProduct } from "../api";
import {
  ShoppingBag, X, Menu, Instagram, Facebook, Phone, MapPin,
  Star, Plus, Minus, Trash2, Package, Settings, LogOut, Check,
  Clock, Truck, Eye, Shield, Sparkles, Heart, MessageCircle,
  Copy, CheckCircle, AlertTriangle, Pencil, ChevronRight,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Category = "All" | "Foundation" | "Lipstick" | "Serum" | "Eyeliner" | "Moisturizer" | "Perfume";
type OrderStatus = "pending" | "verifying" | "confirmed" | "dispatched";
type AdminTab = "orders" | "products";
type AppView = "store" | "admin";
type CheckoutStep = "info" | "payment";

interface Product {
  id: string;
  name: string;
  category: Exclude<Category, "All">;
  price: number;
  image: string;
  description: string;
  inStock: boolean;
  badge?: string;
  rating: number;
  reviews: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Order {
  id: string;
  customerName: string;
  phone: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const WHATSAPP_NUMBER = "2348012345678";
const BANK_NAME = "Access Bank";
const BANK_ACCOUNT_NAME = "Splendid Empire Cosmetics";
const BANK_ACCOUNT_NUMBER = "0123456789";
const ADMIN_PASSWORD = "SEC@Admin2024";

const INITIAL_PRODUCTS: Product[] = [
  { id: "p1", name: "Velvet Matte Foundation", category: "Foundation", price: 8500, image: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=500&h=500&fit=crop", description: "Full-coverage foundation with a luxurious velvet matte finish. 24-hour wear.", inStock: true, badge: "NEW", rating: 4.8, reviews: 124 },
  { id: "p2", name: "Rose Petal Lip Gloss", category: "Lipstick", price: 3200, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=500&fit=crop", description: "Hydrating gloss with a stunning rose petal tint. Kiss-proof formula.", inStock: true, badge: "BESTSELLER", rating: 4.9, reviews: 89 },
  { id: "p3", name: "24K Glow Serum 30ml", category: "Serum", price: 12500, image: "https://images.unsplash.com/photo-1582616698198-f978da534162?w=500&h=500&fit=crop", description: "Gold-infused brightening serum. Visibly radiant skin in 7 days.", inStock: true, badge: "HOT", rating: 4.7, reviews: 203 },
  { id: "p4", name: "Precision Eyeliner Pen", category: "Eyeliner", price: 2800, image: "https://images.unsplash.com/photo-1531646317777-0619c7c5d1d3?w=500&h=500&fit=crop", description: "Ultra-fine tip for perfect wings every time. Waterproof 36hr wear.", inStock: true, rating: 4.6, reviews: 67 },
  { id: "p5", name: "Ivory Shea Moisturizer", category: "Moisturizer", price: 6800, image: "https://images.unsplash.com/photo-1643168186368-c42359c82573?w=500&h=500&fit=crop", description: "Rich hydrating cream with shea butter & vitamin E. For all skin types.", inStock: true, rating: 4.8, reviews: 156 },
  { id: "p6", name: "Nude Lip Collection Set", category: "Lipstick", price: 4500, image: "https://images.unsplash.com/photo-1676570092589-a6c09ecbb373?w=500&h=500&fit=crop", description: "3 bestselling nude shades in matte, satin & glossy finishes.", inStock: true, badge: "SET", rating: 4.9, reviews: 312 },
  { id: "p7", name: "Empress Parfum 50ml", category: "Perfume", price: 18000, image: "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=500&h=500&fit=crop", description: "Signature floral-musk fragrance. Notes of rose, jasmine & amber.", inStock: false, badge: "LUXURY", rating: 4.9, reviews: 44 },
  { id: "p8", name: "Flawless Concealer", category: "Foundation", price: 5200, image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&h=500&fit=crop", description: "Medium-to-full coverage. Blends seamlessly into all Nigerian skin tones.", inStock: true, rating: 4.7, reviews: 98 },
];

const CAT_IMAGES: Record<Exclude<Category, "All">, string> = {
  Foundation: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=150&h=150&fit=crop",
  Lipstick: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=150&h=150&fit=crop",
  Serum: "https://images.unsplash.com/photo-1582616698198-f978da534162?w=150&h=150&fit=crop",
  Eyeliner: "https://images.unsplash.com/photo-1531646317777-0619c7c5d1d3?w=150&h=150&fit=crop",
  Moisturizer: "https://images.unsplash.com/photo-1643168186368-c42359c82573?w=150&h=150&fit=crop",
  Perfume: "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=150&h=150&fit=crop",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function genId() { return "SEC-" + Math.floor(1000 + Math.random() * 9000); }
function fmt(n: number) { return "₦" + n.toLocaleString("en-NG"); }

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.56a8.16 8.16 0 0 0 4.77 1.52V6.65a4.84 4.84 0 0 1-1-.04z" />
    </svg>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<AppView>("store");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts()
      .then(data => setProducts(data))
      .catch(() => setProducts(INITIAL_PRODUCTS))
      .finally(() => setLoading(false));
  }, []);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [copied, setCopied] = useState(false);

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function addToCart(product: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(i => i.product.id !== id)); }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.flatMap(i => {
      if (i.product.id !== id) return [i];
      const q = i.quantity + delta;
      return q <= 0 ? [] : [{ ...i, quantity: q }];
    }));
  }

  function beginCheckout() {
    setOrderId(genId());
    setCheckoutStep("info");
    setCartOpen(false);
  }

  function placeOrder() {
    setOrders(prev => [{ id: orderId, customerName, phone: customerPhone, items: [...cart], total: cartTotal, status: "pending", createdAt: new Date() }, ...prev]);
    setCheckoutStep("payment");
  }

  function sendWhatsApp() {
    const lines = cart.map(i => `• ${i.product.name} x${i.quantity} — ${fmt(i.product.price * i.quantity)}`).join("\n");
    const msg = `Hi! I have made a bank transfer of *${fmt(cartTotal)}* for my order *${orderId}*.\n\nItems ordered:\n${lines}\n\nMy name: *${customerName}*\nPhone: *${customerPhone}*\n\nKindly confirm my payment. Thank you!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "verifying" } : o));
  }

  function copyAccount() {
    navigator.clipboard.writeText(BANK_ACCOUNT_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function closeCheckout() {
    setCheckoutStep(null);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
  }

  const filtered = products.filter(p => p.inStock && (activeCategory === "All" || p.category === activeCategory));

  if (view === "admin") {
    return <AdminPanel products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} onExit={() => setView("store")} />;
  }

  return (
    <div style={{ fontFamily: "'Raleway', sans-serif", backgroundColor: "#FFF6F3", minHeight: "100vh" }}>
      <Navbar cartCount={cartCount} onCartOpen={() => setCartOpen(true)} onAdmin={() => setView("admin")} />
      <HeroSection />
      <CategorySection active={activeCategory} onSelect={setActiveCategory} />
      <ProductsSection products={filtered} active={activeCategory} onFilter={setActiveCategory} onAdd={addToCart} />
      <WhyUsSection />
      <TestimonialsSection />
      <LocationSection />
      <SiteFooter />

      {cartOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} onClick={() => setCartOpen(false)} />}

      <CartDrawer open={cartOpen} cart={cart} total={cartTotal} onClose={() => setCartOpen(false)} onRemove={removeFromCart} onQty={updateQty} onCheckout={beginCheckout} />

      {checkoutStep && (
        <CheckoutModal step={checkoutStep} cart={cart} total={cartTotal} orderId={orderId} name={customerName} phone={customerPhone} onName={setCustomerName} onPhone={setCustomerPhone} onPlace={placeOrder} onWhatsApp={sendWhatsApp} onCopy={copyAccount} copied={copied} onClose={closeCheckout} />
      )}
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────

function Navbar({ cartCount, onCartOpen, onAdmin }: { cartCount: number; onCartOpen: () => void; onAdmin: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const navStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: scrolled ? "#fff" : "rgba(255,255,255,0.93)",
    boxShadow: scrolled ? "0 1px 12px rgba(181,120,74,0.12)" : "none",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s",
  };

  return (
    <header style={navStyle}>
      <div style={{ backgroundColor: "#B5784A", color: "#fff", textAlign: "center", padding: "6px 16px", fontSize: 11, letterSpacing: "0.18em", fontWeight: 700 }}>
        FREE DELIVERY IN OWERRI ON ORDERS ABOVE ₦15,000 &nbsp;·&nbsp; WHATSAPP TO ORDER NOW
      </div>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#1A0F0A", letterSpacing: "-0.02em" }}>SPLENDID</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, letterSpacing: "0.45em", color: "#B5784A", fontWeight: 600 }}>EMPIRE COSMETICS</div>
        </div>

        <nav style={{ display: "flex", gap: 28, fontSize: 11, letterSpacing: "0.15em", fontWeight: 700, color: "#1A0F0A" }} className="hidden md:flex">
          {[["HOME", "#"], ["SHOP", "#products"], ["CATEGORIES", "#categories"], ["FIND US", "#location"], ["CONTACT", "#contact"]].map(([l, h]) => (
            <a key={l} href={h} style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#B5784A")}
              onMouseLeave={e => (e.currentTarget.style.color = "#1A0F0A")}
            >{l}</a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onAdmin} title="Admin" style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#9A7A6E", display: "none" }} className="md:block">
            <Settings size={17} />
          </button>
          <button onClick={onCartOpen} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 8, color: "#1A0F0A" }}>
            <ShoppingBag size={22} />
            {cartCount > 0 && (
              <span style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, background: "#B5784A", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {cartCount}
              </span>
            )}
          </button>
          <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#1A0F0A", display: "flex" }} className="md:hidden">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ backgroundColor: "#fff", borderTop: "1px solid rgba(242,184,168,0.3)", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
          {[["HOME", "#"], ["SHOP", "#products"], ["CATEGORIES", "#categories"], ["FIND US", "#location"], ["CONTACT", "#contact"]].map(([l, h]) => (
            <a key={l} href={h} onClick={() => setOpen(false)} style={{ padding: "10px 0", borderBottom: "1px solid rgba(242,184,168,0.2)", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, color: "#1A0F0A", textDecoration: "none" }}>{l}</a>
          ))}
          <button onClick={() => { setOpen(false); onAdmin(); }} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "10px 0", color: "#B5784A", fontSize: 12, fontWeight: 700 }}>⚙ Admin Panel</button>
        </div>
      )}
    </header>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 88 }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #FFF0EB 0%, #FDE8E0 50%, #FDDDD0 100%)" }} />

      <div style={{ position: "absolute", right: 0, top: 0, width: "55%", height: "100%", overflow: "hidden" }} className="hidden md:block">
        <img src="https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=1000&h=1000&fit=crop" alt="Luxury cosmetics" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #FDE8E0 0%, rgba(253,232,224,0.5) 40%, transparent 100%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "80px 32px", width: "100%" }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(181,120,74,0.1)", border: "1px solid rgba(181,120,74,0.25)", borderRadius: 999, padding: "6px 16px", marginBottom: 24 }}>
            <Sparkles size={13} color="#B5784A" />
            <span style={{ color: "#B5784A", fontSize: 10, letterSpacing: "0.25em", fontWeight: 700 }}>OWERRI'S FINEST BEAUTY DESTINATION</span>
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(42px, 6vw, 68px)", fontWeight: 700, color: "#1A0F0A", lineHeight: 1.1, marginBottom: 20 }}>
            Your Beauty,<br />
            <span style={{ color: "#B5784A", fontStyle: "italic" }}>Elevated.</span>
          </h1>

          <p style={{ color: "#5C3D2E", fontSize: 17, lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}>
            Luxury cosmetics curated for the confident woman. From foundation to fragrance — the world's finest beauty, now in Owerri & Port Harcourt.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 52 }}>
            <a href="#products" style={{ background: "#B5784A", color: "#fff", padding: "14px 32px", borderRadius: 999, fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px rgba(181,120,74,0.3)" }}>
              SHOP NOW
            </a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ border: "2px solid #B5784A", color: "#B5784A", padding: "14px 32px", borderRadius: 999, fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, textDecoration: "none" }}>
              WHATSAPP ORDER
            </a>
          </div>

          <div style={{ display: "flex", gap: 40, paddingTop: 28, borderTop: "1px solid rgba(181,120,74,0.2)" }}>
            {[["500+", "Products"], ["1,200+", "Happy Clients"], ["5★", "Google Rating"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: "#B5784A" }}>{v}</div>
                <div style={{ fontSize: 10, color: "#5C3D2E", letterSpacing: "0.15em", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social sidebar */}
      <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", zIndex: 10, display: "flex", flexDirection: "column", gap: 10 }} className="hidden md:flex">
        {[{ href: "https://instagram.com", icon: <Instagram size={15} />, label: "Instagram" }, { href: "https://facebook.com", icon: <Facebook size={15} />, label: "Facebook" }, { href: "https://tiktok.com", icon: <TikTokIcon size={15} />, label: "TikTok" }, { href: `https://wa.me/${WHATSAPP_NUMBER}`, icon: <MessageCircle size={15} />, label: "WhatsApp" }].map(({ href, icon, label }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#B5784A", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", transition: "all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#B5784A"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.85)"; (e.currentTarget as HTMLElement).style.color = "#B5784A"; }}
          >{icon}</a>
        ))}
      </div>
    </section>
  );
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

function CategorySection({ active, onSelect }: { active: Category; onSelect: (c: Category) => void }) {
  const cats: Category[] = ["All", "Foundation", "Lipstick", "Serum", "Eyeliner", "Moisturizer", "Perfume"];
  return (
    <section id="categories" style={{ padding: "60px 0", backgroundColor: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#1A0F0A", marginBottom: 8 }}>Shop By Category</h2>
          <p style={{ color: "#5C3D2E", fontSize: 13, letterSpacing: "0.05em" }}>Find your perfect beauty essential</p>
        </div>
        <div style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {cats.map(cat => {
            const isActive = active === cat;
            const img = cat === "All" ? "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150&h=150&fit=crop" : CAT_IMAGES[cat as Exclude<Category, "All">];
            return (
              <button key={cat} onClick={() => onSelect(cat)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: `3px solid ${isActive ? "#B5784A" : "transparent"}`, boxShadow: isActive ? "0 6px 20px rgba(181,120,74,0.25)" : "none", transform: isActive ? "scale(1.1)" : "scale(1)", transition: "all 0.3s" }}>
                  <img src={img} alt={cat} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, color: isActive ? "#B5784A" : "#5C3D2E" }}>{cat.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

function ProductsSection({ products, active, onFilter, onAdd }: { products: Product[]; active: Category; onFilter: (c: Category) => void; onAdd: (p: Product) => void }) {
  const tabs: Category[] = ["All", "Foundation", "Lipstick", "Serum", "Eyeliner", "Moisturizer", "Perfume"];
  return (
    <section id="products" style={{ padding: "60px 0", backgroundColor: "#FFF6F3" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#1A0F0A", marginBottom: 8 }}>Our Products</h2>
          <p style={{ color: "#5C3D2E", fontSize: 13 }}>Handpicked for perfection</p>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 40, justifyContent: "center", flexWrap: "wrap" }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => onFilter(tab)} style={{ padding: "8px 20px", borderRadius: 999, fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, border: `1px solid ${active === tab ? "#B5784A" : "rgba(181,120,74,0.3)"}`, background: active === tab ? "#B5784A" : "transparent", color: active === tab ? "#fff" : "#5C3D2E", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#5C3D2E" }}>
            <Package size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
            <p>No products in this category right now.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {products.map(p => <ProductCard key={p.id} product={p} onAdd={onAdd} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function ProductCard({ product: p, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const [wished, setWished] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    onAdd(p);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(181,120,74,0.08)", transition: "all 0.3s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(181,120,74,0.18)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(181,120,74,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", backgroundColor: "#FFF0EB" }}>
        <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }}
          onMouseEnter={e => ((e.target as HTMLElement).style.transform = "scale(1.08)")}
          onMouseLeave={e => ((e.target as HTMLElement).style.transform = "scale(1)")}
        />
        {p.badge && (
          <span style={{ position: "absolute", top: 12, left: 12, background: "#B5784A", color: "#fff", fontSize: 9, letterSpacing: "0.18em", fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>{p.badge}</span>
        )}
        <button onClick={() => setWished(!wished)} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, background: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <Heart size={13} fill={wished ? "#B5784A" : "none"} color={wished ? "#B5784A" : "#1A0F0A"} />
        </button>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={10} fill={i < Math.floor(p.rating) ? "#B5784A" : "none"} color="#B5784A" />)}
          <span style={{ color: "#9A7A6E", fontSize: 10, marginLeft: 4 }}>({p.reviews})</span>
        </div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "#1A0F0A", lineHeight: 1.4, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.name}</h3>
        <p style={{ color: "#5C3D2E", fontSize: 11, lineHeight: 1.6, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#B5784A", fontSize: 16 }}>{fmt(p.price)}</span>
          <button onClick={handleAdd} style={{ width: 32, height: 32, borderRadius: "50%", background: justAdded ? "#22c55e" : "#B5784A", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", transform: justAdded ? "scale(1.15)" : "scale(1)" }}>
            {justAdded ? <Check size={13} /> : <Plus size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WHY US ───────────────────────────────────────────────────────────────────

function WhyUsSection() {
  return (
    <section style={{ padding: "60px 0", backgroundColor: "#1A0F0A" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Why Choose Us</h2>
          <p style={{ color: "#9A7A6E", fontSize: 13 }}>The Splendid Empire difference</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
          {[
            { icon: <Shield size={30} />, title: "100% Authentic", desc: "All products sourced directly from certified distributors. No fakes, ever." },
            { icon: <Truck size={30} />, title: "Fast Delivery", desc: "Same-day in Owerri. Next-day delivery across Port Harcourt." },
            { icon: <MessageCircle size={30} />, title: "WhatsApp Support", desc: "Chat with us anytime. We respond within minutes." },
            { icon: <Star size={30} />, title: "Premium Quality", desc: "The world's leading beauty brands, curated for you." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ textAlign: "center" }}>
              <div style={{ color: "#F2B8A8", marginBottom: 16, display: "flex", justifyContent: "center" }}>{icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontWeight: 600, marginBottom: 8, fontSize: 16 }}>{title}</h3>
              <p style={{ color: "#9A7A6E", fontSize: 12, lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────

function TestimonialsSection() {
  const reviews = [
    { name: "Chioma Adeola", loc: "Owerri", text: "The foundation I ordered was a perfect shade match for my skin! Delivery was same day. This is now my go-to beauty shop in Owerri.", stars: 5 },
    { name: "Blessing Okafor", loc: "Port Harcourt", text: "The 24K glow serum completely transformed my skin. Authentic products at the right price. I've already referred 5 friends!", stars: 5 },
    { name: "Adaeze Nwosu", loc: "Owerri", text: "Super professional experience. The WhatsApp payment confirmation was so smooth — felt like shopping from a real luxury online store!", stars: 5 },
  ];

  return (
    <section style={{ padding: "60px 0", backgroundColor: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#1A0F0A", marginBottom: 8 }}>What Our Clients Say</h2>
          <p style={{ color: "#5C3D2E", fontSize: 13 }}>Real words from real queens 👑</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {reviews.map(({ name, loc, text, stars }) => (
            <div key={name} style={{ background: "#FFF6F3", borderRadius: 20, padding: 28, border: "1px solid rgba(242,184,168,0.3)" }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                {Array.from({ length: stars }).map((_, i) => <Star key={i} size={14} fill="#B5784A" color="#B5784A" />)}
              </div>
              <p style={{ color: "#5C3D2E", fontSize: 13, lineHeight: 1.8, marginBottom: 20, fontStyle: "italic" }}>"{text}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(181,120,74,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#B5784A", fontWeight: 700, fontSize: 14 }}>{name[0]}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: "#1A0F0A", fontSize: 14 }}>{name}</div>
                  <div style={{ color: "#B5784A", fontSize: 11, letterSpacing: "0.08em" }}>{loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── LOCATION ─────────────────────────────────────────────────────────────────

function LocationSection() {
  return (
    <section id="location" style={{ padding: "60px 0", backgroundColor: "#FFF6F3" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ borderRadius: 24, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", boxShadow: "0 20px 60px rgba(26,15,10,0.15)" }} className="location-grid">
          <div style={{ backgroundColor: "#1A0F0A", padding: "56px 48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Visit Our Store</h2>
            <p style={{ color: "#F2B8A8", fontSize: 13, marginBottom: 36, letterSpacing: "0.05em" }}>Experience luxury beauty in person</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { icon: <MapPin size={16} color="#B5784A" />, main: "Shop D, World Centre", sub: "By IMSU Junction, 470 Works Layout\nOwerri 460212, Imo State" },
                { icon: <Phone size={16} color="#B5784A" />, main: "WhatsApp Us", sub: "Click to chat now" },
                { icon: <Clock size={16} color="#B5784A" />, main: "Mon – Sat", sub: "9:00am – 7:00pm" },
              ].map(({ icon, main, sub }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(181,120,74,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{main}</div>
                    <div style={{ color: "#9A7A6E", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <a href="https://maps.google.com/?q=IMSU+Junction+Works+Layout+Owerri+Imo+State" target="_blank" rel="noopener noreferrer"
              style={{ marginTop: 36, display: "inline-flex", alignItems: "center", gap: 8, background: "#B5784A", color: "#fff", padding: "12px 28px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textDecoration: "none", width: "fit-content" }}>
              <MapPin size={14} /> GET DIRECTIONS
            </a>
          </div>
          <div style={{ position: "relative", minHeight: 320 }}>
            <img src="https://images.unsplash.com/photo-1676570092589-a6c09ecbb373?w=700&h=600&fit=crop" alt="Store" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "rgba(181,120,74,0.15)" }} />
            <div style={{ position: "absolute", bottom: 24, left: 24, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderRadius: 16, padding: "12px 20px" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1A0F0A", fontSize: 14 }}>Splendid Empire Cosmetics</div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={10} fill="#B5784A" color="#B5784A" />)}
                <span style={{ color: "#5C3D2E", fontSize: 10, marginLeft: 4 }}>on Google Maps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function SiteFooter() {
  return (
    <footer id="contact" style={{ backgroundColor: "#0F0705", paddingTop: 60, paddingBottom: 32 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1 }}>SPLENDID</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, letterSpacing: "0.45em", color: "#B5784A", marginBottom: 16 }}>EMPIRE COSMETICS</div>
            <p style={{ color: "#9A7A6E", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>Owerri's premier luxury beauty destination. Serving queens since 2020.</p>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ href: "https://instagram.com", icon: <Instagram size={14} />, label: "Instagram" }, { href: "https://facebook.com", icon: <Facebook size={14} />, label: "Facebook" }, { href: "https://tiktok.com", icon: <TikTokIcon size={14} />, label: "TikTok" }, { href: `https://wa.me/${WHATSAPP_NUMBER}`, icon: <MessageCircle size={14} />, label: "WhatsApp" }].map(({ href, icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
                  style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#9A7A6E", textDecoration: "none", transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#B5784A"; (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#B5784A"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9A7A6E"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
                >{icon}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", marginBottom: 16 }}>QUICK LINKS</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["Home", "Shop", "Categories", "About Us", "Find Us"].map(l => (
                <a key={l} href="#" style={{ color: "#9A7A6E", fontSize: 13, textDecoration: "none" }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = "#F2B8A8")}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = "#9A7A6E")}
                >{l}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", marginBottom: 16 }}>CATEGORIES</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["Foundation", "Lipstick", "Serum", "Eyeliner", "Moisturizer", "Perfume"].map(c => (
                <a key={c} href="#products" style={{ color: "#9A7A6E", fontSize: 13, textDecoration: "none" }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = "#F2B8A8")}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = "#9A7A6E")}
                >{c}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", marginBottom: 16 }}>CONTACT US</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ color: "#9A7A6E", fontSize: 13, lineHeight: 1.7 }}>Shop D, World Centre, By IMSU Junction, 470 Works Layout, Owerri 460212, Imo State</p>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ color: "#9A7A6E", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                <MessageCircle size={13} /> WhatsApp Us
              </a>
              <p style={{ color: "#B5784A", fontSize: 13, fontWeight: 600 }}>Mon–Sat: 9am – 7pm</p>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ color: "#9A7A6E", fontSize: 12 }}>© {new Date().getFullYear()} Splendid Empire Cosmetics. All rights reserved.</p>
          <p style={{ color: "#9A7A6E", fontSize: 12 }}>Owerri • Port Harcourt • Nigeria</p>
        </div>
      </div>
    </footer>
  );
}

// ─── CART DRAWER ──────────────────────────────────────────────────────────────

function CartDrawer({ open, cart, total, onClose, onRemove, onQty, onCheckout }: { open: boolean; cart: CartItem[]; total: number; onClose: () => void; onRemove: (id: string) => void; onQty: (id: string, d: number) => void; onCheckout: () => void }) {
  return (
    <div style={{ position: "fixed", top: 0, right: 0, height: "100%", width: "min(420px, 100vw)", zIndex: 50, backgroundColor: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s ease-in-out" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(242,184,168,0.3)" }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A0F0A" }}>Your Cart</h2>
          {cart.length > 0 && <p style={{ color: "#5C3D2E", fontSize: 12, marginTop: 2 }}>{cart.length} item{cart.length !== 1 ? "s" : ""}</p>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#5C3D2E", borderRadius: 8, display: "flex" }}>
          <X size={20} />
        </button>
      </div>

      {cart.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, color: "#5C3D2E" }}>
          <ShoppingBag size={52} style={{ opacity: 0.15 }} />
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 500 }}>Your cart is empty</p>
          <p style={{ fontSize: 13, color: "#9A7A6E", textAlign: "center" }}>Add some luxury to your life!</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#B5784A", fontSize: 13, textDecoration: "underline", marginTop: 8 }}>Continue Shopping</button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            {cart.map(({ product: p, quantity: q }) => (
              <div key={p.id} style={{ display: "flex", gap: 16, backgroundColor: "#FFF6F3", borderRadius: 14, padding: 14 }}>
                <img src={p.image} alt={p.name} style={{ width: 68, height: 68, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: "#1A0F0A", lineHeight: 1.4, marginBottom: 4 }}>{p.name}</h4>
                  <p style={{ fontFamily: "'Playfair Display', serif", color: "#B5784A", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{fmt(p.price)}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {[{ delta: -1, icon: <Minus size={10} /> }, { delta: 1, icon: <Plus size={10} /> }].map(({ delta, icon }, idx) => (
                      <button key={idx} onClick={() => onQty(p.id, delta)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(181,120,74,0.4)", background: "none", color: "#B5784A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</button>
                    )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key="q" style={{ fontSize: 13, fontWeight: 700, color: "#1A0F0A", minWidth: 20, textAlign: "center" }}>{q}</span>, el], [] as React.ReactNode[])}
                    <button onClick={() => onRemove(p.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9A7A6E", display: "flex", padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(242,184,168,0.3)", backgroundColor: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ color: "#5C3D2E", fontWeight: 500, fontSize: 14 }}>Subtotal</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: "#B5784A" }}>{fmt(total)}</span>
            </div>
            <button onClick={onCheckout} style={{ width: "100%", background: "#B5784A", color: "#fff", border: "none", borderRadius: 999, padding: "16px 24px", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 20px rgba(181,120,74,0.3)" }}>
              PROCEED TO CHECKOUT <ChevronRight size={16} />
            </button>
            <p style={{ textAlign: "center", color: "#9A7A6E", fontSize: 10, marginTop: 10 }}>Secure bank transfer · Confirmed via WhatsApp</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── CHECKOUT MODAL ───────────────────────────────────────────────────────────

function CheckoutModal({ step, cart, total, orderId, name, phone, onName, onPhone, onPlace, onWhatsApp, onCopy, copied, onClose }: { step: CheckoutStep; cart: CartItem[]; total: number; orderId: string; name: string; phone: string; onName: (v: string) => void; onPhone: (v: string) => void; onPlace: () => void; onWhatsApp: () => void; onCopy: () => void; copied: boolean; onClose: () => void }) {
  const canProceed = name.trim().length >= 2 && phone.trim().replace(/\D/g, "").length >= 10;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }} className="sm:items-center sm:p-4">
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", backgroundColor: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 -20px 60px rgba(0,0,0,0.2)" }}>

        <div style={{ background: "#B5784A", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: 20, fontWeight: 700 }}>{step === "info" ? "Your Details" : "Complete Payment"}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "monospace", fontWeight: 700, marginTop: 2 }}>{orderId}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", display: "flex" }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid rgba(242,184,168,0.3)", flexShrink: 0 }}>
          {[["info", "1. Your Details"], ["payment", "2. Pay & Confirm"]].map(([s, label]) => (
            <div key={s} style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontSize: 10, letterSpacing: "0.15em", fontWeight: 700, color: step === s ? "#B5784A" : "#9A7A6E", borderBottom: step === s ? "2px solid #B5784A" : "2px solid transparent", transition: "all 0.2s" }}>{label}</div>
          ))}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: 24 }}>
          {step === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#FFF6F3", borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: "#1A0F0A", fontSize: 14 }}>Order Summary</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#B5784A", fontSize: 11, background: "rgba(181,120,74,0.1)", padding: "2px 10px", borderRadius: 999 }}>{orderId}</span>
                </div>
                {cart.map(({ product: p, quantity: q }) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#5C3D2E", padding: "4px 0" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 16 }}>{p.name} × {q}</span>
                    <span style={{ fontWeight: 600, color: "#1A0F0A", flexShrink: 0 }}>{fmt(p.price * q)}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(242,184,168,0.4)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span style={{ color: "#1A0F0A" }}>Total</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", color: "#B5784A", fontSize: 20 }}>{fmt(total)}</span>
                </div>
              </div>

              {[{ label: "Full Name *", val: name, set: onName, ph: "Enter your full name" }, { label: "WhatsApp / Phone *", val: phone, set: onPhone, ph: "e.g. 08012345678" }].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1A0F0A", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</label>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ width: "100%", border: "1px solid rgba(242,184,168,0.6)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", backgroundColor: "#FFF6F3", boxSizing: "border-box" }} />
                </div>
              ))}

              <button onClick={onPlace} disabled={!canProceed} style={{ width: "100%", background: canProceed ? "#B5784A" : "#d1b8a8", color: "#fff", border: "none", borderRadius: 999, padding: "16px 24px", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, cursor: canProceed ? "pointer" : "not-allowed", boxShadow: canProceed ? "0 6px 20px rgba(181,120,74,0.3)" : "none", transition: "all 0.2s" }}>
                PROCEED TO PAYMENT →
              </button>
            </div>
          )}

          {step === "payment" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#FFF6F3", borderRadius: 16, padding: 20, textAlign: "center" }}>
                <p style={{ color: "#5C3D2E", fontSize: 12, letterSpacing: "0.1em", marginBottom: 6 }}>AMOUNT TO TRANSFER</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: "#B5784A", margin: 0 }}>{fmt(total)}</p>
                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(181,120,74,0.12)", borderRadius: 999, padding: "4px 14px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#B5784A", letterSpacing: "0.1em" }}>NARRATION / REFERENCE:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1A0F0A", fontSize: 11 }}>{orderId}</span>
                </div>
              </div>

              <div style={{ background: "#1A0F0A", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <h3 style={{ color: "#F2B8A8", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", marginBottom: 4 }}>BANK TRANSFER DETAILS</h3>
                {[["Bank", BANK_NAME], ["Account Name", BANK_ACCOUNT_NAME]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#9A7A6E", fontSize: 13 }}>{l}</span>
                    <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#9A7A6E", fontSize: 13 }}>Account Number</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 22, letterSpacing: "0.06em" }}>{BANK_ACCOUNT_NUMBER}</span>
                    <button onClick={onCopy} style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#4ade80" : "#F2B8A8", display: "flex" }}>
                      {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#9A7A6E", fontSize: 13 }}>Reference</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#F2B8A8", fontSize: 14 }}>{orderId}</span>
                </div>
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: 14, display: "flex", gap: 12 }}>
                <AlertTriangle size={17} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: "#92400e", fontSize: 12, lineHeight: 1.7, margin: 0 }}>After making the transfer, tap the button below to send us a WhatsApp notification. We'll confirm and pack your order immediately.</p>
              </div>

              <button onClick={onWhatsApp} style={{ width: "100%", background: "#25D366", color: "#fff", border: "none", borderRadius: 999, padding: "16px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 6px 20px rgba(37,211,102,0.3)" }}>
                <MessageCircle size={20} /> I HAVE PAID — CONFIRM ON WHATSAPP
              </button>

              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#5C3D2E", fontSize: 13, textAlign: "center", padding: 8 }}>
                Close & Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

function AdminPanel({ products, setProducts, orders, setOrders, onExit }: { products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>; orders: Order[]; setOrders: React.Dispatch<React.SetStateAction<Order[]>>; onExit: () => void }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<AdminTab>("orders");

  function login() {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setErr(""); }
    else setErr("Incorrect password. Try again.");
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#1A0F0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Raleway', sans-serif" }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 24, padding: 40, width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: "#1A0F0A" }}>SPLENDID</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 9, letterSpacing: "0.45em", color: "#B5784A", marginBottom: 12 }}>EMPIRE COSMETICS</div>
            <div style={{ height: 1, background: "rgba(181,120,74,0.2)", margin: "0 auto 12px", width: 60 }} />
            <p style={{ color: "#5C3D2E", fontSize: 13, fontWeight: 600 }}>Admin Command Centre</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1A0F0A", marginBottom: 8, letterSpacing: "0.15em" }}>PASSWORD</label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="Enter admin password" style={{ width: "100%", border: "1px solid rgba(242,184,168,0.6)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", backgroundColor: "#FFF6F3", boxSizing: "border-box" }} />
            </div>
            {err && <p style={{ color: "#ef4444", fontSize: 12, fontWeight: 500 }}>{err}</p>}
            <button onClick={login} style={{ background: "#B5784A", color: "#fff", border: "none", borderRadius: 999, padding: "14px 24px", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, cursor: "pointer" }}>LOGIN TO DASHBOARD</button>
            <button onClick={onExit} style={{ background: "none", border: "none", cursor: "pointer", color: "#5C3D2E", fontSize: 13 }}>← Back to Store</button>
          </div>
        </div>
      </div>
    );
  }

  const stats = [["Total", orders.length], ["Pending", orders.filter(o => o.status === "pending").length], ["Verifying", orders.filter(o => o.status === "verifying").length], ["Confirmed", orders.filter(o => o.status === "confirmed").length], ["Revenue", fmt(orders.filter(o => ["confirmed", "dispatched"].includes(o.status)).reduce((s, o) => s + o.total, 0))]];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFF6F3", fontFamily: "'Raleway', sans-serif" }}>
      <div style={{ backgroundColor: "#1A0F0A", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>SPLENDID EMPIRE</div>
          <div style={{ color: "#B5784A", fontSize: 9, letterSpacing: "0.3em", fontWeight: 600 }}>ADMIN PANEL</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <button onClick={onExit} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A7A6E", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.1em" }}><Eye size={14} /> VIEW STORE</button>
          <button onClick={() => { setAuthed(false); setPw(""); onExit(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A7A6E", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.1em" }}><LogOut size={14} /> LOGOUT</button>
        </div>
      </div>

      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(242,184,168,0.3)", padding: "16px 24px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 48, justifyContent: "center", minWidth: "max-content" }}>
          {stats.map(([l, v]) => (
            <div key={l as string} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#9A7A6E", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>{l as string}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1A0F0A", fontSize: 26 }}>{v as string | number}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[["orders", "📋 Orders"], ["products", "🛍️ Products"]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as AdminTab)} style={{ padding: "10px 24px", borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", border: "1px solid", borderColor: tab === t ? "#B5784A" : "rgba(242,184,168,0.5)", background: tab === t ? "#B5784A" : "#fff", color: tab === t ? "#fff" : "#5C3D2E", cursor: "pointer", transition: "all 0.2s" }}>{label}</button>
          ))}
        </div>
        {tab === "orders" && <AdminOrders orders={orders} setOrders={setOrders} />}
        {tab === "products" && <AdminProducts products={products} setProducts={setProducts} />}
      </div>
    </div>
  );
}

// ─── ADMIN ORDERS ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<OrderStatus, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#854d0e", icon: <Clock size={11} /> },
  verifying: { label: "Verifying", bg: "#dbeafe", color: "#1d4ed8", icon: <Eye size={11} /> },
  confirmed: { label: "Confirmed", bg: "#dcfce7", color: "#15803d", icon: <Check size={11} /> },
  dispatched: { label: "Dispatched", bg: "#f3e8ff", color: "#7e22ce", icon: <Truck size={11} /> },
};
const NEXT: Record<OrderStatus, OrderStatus | null> = { pending: "verifying", verifying: "confirmed", confirmed: "dispatched", dispatched: null };
const NEXT_LABEL: Record<OrderStatus, string | null> = { pending: "Mark Verifying", verifying: "Approve Payment ✓", confirmed: "Mark Dispatched", dispatched: null };

function AdminOrders({ orders, setOrders }: { orders: Order[]; setOrders: React.Dispatch<React.SetStateAction<Order[]>> }) {
  function advance(id: string) {
    setOrders(prev => prev.map(o => { if (o.id !== id) return o; const n = NEXT[o.status]; return n ? { ...o, status: n } : o; }));
  }

  function waCustomer(o: Order) {
    const msg = o.status === "confirmed"
      ? `Hi ${o.customerName}! 🎉 Your payment for order *${o.id}* (${fmt(o.total)}) has been *confirmed*! Your beauty products are being packed. We'll deliver soon. Thank you for choosing Splendid Empire Cosmetics! 💄👑`
      : `Hi ${o.customerName}! Your order *${o.id}* has been *dispatched*! 🚚 It will reach you very soon. Thank you — Splendid Empire Cosmetics 💕`;
    window.open(`https://wa.me/${o.phone.replace(/^0/, "234").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (orders.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#5C3D2E" }}>
        <Package size={52} style={{ margin: "0 auto 16px", opacity: 0.15 }} />
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 500, marginBottom: 8 }}>No orders yet</p>
        <p style={{ fontSize: 13, color: "#9A7A6E" }}>Orders will appear here as soon as customers checkout.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 48 }}>
      {orders.map(o => {
        const cfg = STATUS_CFG[o.status];
        const btn = NEXT_LABEL[o.status];
        return (
          <div key={o.id} style={{ backgroundColor: "#fff", borderRadius: 20, border: "1px solid rgba(242,184,168,0.2)", overflow: "hidden", boxShadow: "0 2px 12px rgba(181,120,74,0.06)" }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#B5784A", fontSize: 14 }}>{o.id}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{cfg.icon} {cfg.label}</span>
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: "#1A0F0A", fontSize: 16 }}>{o.customerName}</div>
                  <div style={{ color: "#5C3D2E", fontSize: 13 }}>{o.phone}</div>
                  <div style={{ color: "#9A7A6E", fontSize: 11, marginTop: 2 }}>{o.createdAt.toLocaleString("en-NG")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 24, color: "#B5784A" }}>{fmt(o.total)}</div>
                  <div style={{ color: "#9A7A6E", fontSize: 11 }}>{o.items.reduce((s, i) => s + i.quantity, 0)} item(s)</div>
                </div>
              </div>

              <div style={{ backgroundColor: "#FFF6F3", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                {o.items.map(({ product: p, quantity: q }) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                    <span style={{ color: "#5C3D2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 16 }}>{p.name} × {q}</span>
                    <span style={{ color: "#1A0F0A", fontWeight: 600, flexShrink: 0 }}>{fmt(p.price * q)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {btn && (
                  <button onClick={() => advance(o.id)} style={{ flex: 1, background: "#B5784A", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", minWidth: 140 }}>{btn}</button>
                )}
                {(o.status === "confirmed" || o.status === "dispatched") && (
                  <button onClick={() => waCustomer(o)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#25D366", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    <MessageCircle size={14} /> WhatsApp Customer
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ADMIN PRODUCTS ───────────────────────────────────────────────────────────

type PForm = { name: string; category: Exclude<Category, "All">; price: string; image: string; description: string; badge: string; inStock: boolean };
const EMPTY: PForm = { name: "", category: "Foundation", price: "", image: "", description: "", badge: "", inStock: true };

function AdminProducts({ products, setProducts }: { products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>> }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PForm>(EMPTY);
  const [fErr, setFErr] = useState("");

  function openAdd() { setForm(EMPTY); setEditId(null); setFErr(""); setShowForm(true); }
  function openEdit(p: Product) { setForm({ name: p.name, category: p.category, price: String(p.price), image: p.image, description: p.description, badge: p.badge || "", inStock: p.inStock }); setEditId(p.id); setFErr(""); setShowForm(true); }

  function save() {
    if (!form.name.trim()) { setFErr("Product name is required."); return; }
    if (!form.price || isNaN(Number(form.price))) { setFErr("Enter a valid price."); return; }
    const data: Product = { id: editId || "p" + Date.now(), name: form.name.trim(), category: form.category, price: Number(form.price), image: form.image.trim() || "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=500&h=500&fit=crop", description: form.description.trim(), badge: form.badge.trim() || undefined, inStock: form.inStock, rating: 4.8, reviews: 0 };
    if (editId) setProducts(prev => prev.map(p => p.id === editId ? { ...data, rating: p.rating, reviews: p.reviews } : p));
    else setProducts(prev => [...prev, data]);
    setShowForm(false); setEditId(null); setFErr("");
  }

  function del(id: string) { if (window.confirm("Delete this product?")) setProducts(prev => prev.filter(p => p.id !== id)); }
  function toggle(id: string) { setProducts(prev => prev.map(p => p.id === id ? { ...p, inStock: !p.inStock } : p)); }
  function sf(k: keyof PForm) { return (v: string | boolean) => setForm(f => ({ ...f, [k]: v })); }

  const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid rgba(242,184,168,0.6)", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", backgroundColor: "#FFF6F3", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#5C3D2E", marginBottom: 6, letterSpacing: "0.15em", textTransform: "uppercase" };

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A0F0A" }}>{products.length} Products</h2>
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 8, background: "#B5784A", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: "#fff", borderRadius: 20, border: "1px solid rgba(242,184,168,0.3)", padding: 24, marginBottom: 24, boxShadow: "0 4px 20px rgba(181,120,74,0.08)" }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1A0F0A", fontSize: 18, marginBottom: 20 }}>{editId ? "Edit Product" : "Add New Product"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Product Name *</label>
              <input value={form.name} onChange={e => sf("name")(e.target.value)} placeholder="e.g. Velvet Matte Foundation" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Price (₦) *</label>
              <input type="number" value={form.price} onChange={e => sf("price")(e.target.value)} placeholder="e.g. 8500" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Category *</label>
              <select value={form.category} onChange={e => sf("category")(e.target.value)} style={inputStyle}>
                {(["Foundation", "Lipstick", "Serum", "Eyeliner", "Moisturizer", "Perfume"] as const).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Badge (optional)</label>
              <input value={form.badge} onChange={e => sf("badge")(e.target.value)} placeholder="e.g. NEW, HOT, BESTSELLER" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Image URL</label>
              <input value={form.image} onChange={e => sf("image")(e.target.value)} placeholder="Paste an image URL (leave blank for default)" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => sf("description")(e.target.value)} placeholder="Short product description..." rows={2} style={{ ...inputStyle, resize: "none" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#1A0F0A" }}>In Stock</label>
              <button type="button" onClick={() => sf("inStock")(!form.inStock)} style={{ width: 48, height: 24, borderRadius: 999, background: form.inStock ? "#B5784A" : "#d1d5db", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", transition: "left 0.2s", left: form.inStock ? 26 : 2 }} />
              </button>
            </div>
          </div>
          {fErr && <p style={{ color: "#ef4444", fontSize: 12, fontWeight: 500, marginTop: 12 }}>{fErr}</p>}
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button onClick={save} style={{ background: "#B5784A", color: "#fff", border: "none", borderRadius: 999, padding: "10px 24px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{editId ? "Save Changes" : "Add Product"}</button>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "1px solid rgba(242,184,168,0.6)", borderRadius: 999, padding: "10px 24px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#5C3D2E" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {products.map(p => (
          <div key={p.id} style={{ backgroundColor: "#fff", borderRadius: 16, border: "1px solid rgba(242,184,168,0.2)", overflow: "hidden", boxShadow: "0 2px 12px rgba(181,120,74,0.06)" }}>
            <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden", backgroundColor: "#FFF0EB" }}>
              <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {p.badge && <span style={{ position: "absolute", top: 8, left: 8, background: "#B5784A", color: "#fff", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", padding: "3px 8px", borderRadius: 999 }}>{p.badge}</span>}
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <h4 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: "#1A0F0A", fontSize: 14, lineHeight: 1.4, flex: 1 }}>{p.name}</h4>
                <span style={{ fontFamily: "'Playfair Display', serif", color: "#B5784A", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{fmt(p.price)}</span>
              </div>
              <span style={{ display: "inline-block", background: "#FFF0EB", color: "#B5784A", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", padding: "2px 10px", borderRadius: 999, marginBottom: 12 }}>{p.category.toUpperCase()}</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => toggle(p.id)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 999, border: "1px solid", borderColor: p.inStock ? "#bbf7d0" : "#fecaca", background: p.inStock ? "#f0fdf4" : "#fff1f2", color: p.inStock ? "#15803d" : "#dc2626", cursor: "pointer" }}>
                  {p.inStock ? <><Check size={10} /> In Stock</> : <><X size={10} /> Out of Stock</>}
                </button>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openEdit(p)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#FFF6F3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#5C3D2E" }}><Pencil size={12} /></button>
                  <button onClick={() => del(p.id)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#FFF6F3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#5C3D2E" }}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
