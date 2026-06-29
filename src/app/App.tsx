import React, { useState, useEffect, useRef } from "react";
import { fetchProducts, createOrder, fetchOrders, updateOrderStatus, createProduct, updateProduct, deleteProduct, adminLogin, adminLogout, getAdminToken, clearAdminToken, changeAdminPassword, cloudinaryUpload } from "../api";
import {
  ShoppingBag, X, Menu, Instagram, Facebook, Phone, MapPin,
  Star, Plus, Minus, Trash2, Package, Settings, LogOut, Check,
  Clock, Truck, Eye, EyeOff, RefreshCw, Shield, Sparkles, Heart, MessageCircle,
  Copy, CheckCircle, AlertTriangle, Pencil, ChevronRight, ChevronLeft,
  ArrowUp, Search,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Category = string; // Dynamic — "All" or any custom category name
type OrderStatus = "pending" | "verifying" | "confirmed" | "dispatched" | "delivered";
type AdminTab = "orders" | "products" | "categories" | "security";
type AppView = "store" | "admin";
type CheckoutStep = "info" | "payment";

interface Product {
  id: string;
  name: string;
  category: Exclude<Category, "All">;
  price: number;
  image: string;
  images?: string[];   // up to 4 gallery images
  videoUrl?: string;   // Instagram Reel or TikTok URL
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
  email: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const WHATSAPP_NUMBER = "2348104748683";
const BANK_NAME = "Moniepoint";
const BANK_ACCOUNT_NAME = "Splendid Dam Enterprise";
const BANK_ACCOUNT_NUMBER = "5224231596";

const INITIAL_PRODUCTS: Product[] = [
  { id: "p1", name: "Velvet Matte Foundation", category: "Foundation", price: 8500, image: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=500&h=500&fit=crop", description: "Full-coverage foundation with a luxurious velvet matte finish. 24-hour wear.", inStock: true, badge: "NEW", rating: 4.8, reviews: 124 },
  { id: "p2", name: "Rose Petal Lip Gloss", category: "Lipstick", price: 3200, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=500&fit=crop", description: "Hydrating gloss with a stunning rose petal tint. Kiss-proof formula.", inStock: true, badge: "BESTSELLER", rating: 4.9, reviews: 89 },
  { id: "p3", name: "24K Glow Serum 30ml", category: "Serum", price: 12500, image: "https://images.unsplash.com/photo-1582616698198-f978da534162?w=500&h=500&fit=crop", description: "Gold-infused brightening serum. Visibly radiant skin in 7 days.", inStock: true, badge: "HOT", rating: 4.7, reviews: 203 },
  { id: "p4", name: "Precision Eyeliner Pen", category: "Eyeliner", price: 2800, image: "https://images.unsplash.com/photo-1531646317777-0619c7c5d1d3?w=500&h=500&fit=crop", description: "Ultra-fine tip for perfect wings every time. Waterproof 36hr wear.", inStock: true, rating: 4.6, reviews: 67 },
  { id: "p5", name: "Ivory Shea Moisturizer", category: "Moisturizer", price: 6800, image: "https://images.unsplash.com/photo-1643168186368-c42359c82573?w=500&h=500&fit=crop", description: "Rich hydrating cream with shea butter & vitamin E. For all skin types.", inStock: true, rating: 4.8, reviews: 156 },
  { id: "p6", name: "Nude Lip Collection Set", category: "Lipstick", price: 4500, image: "https://images.unsplash.com/photo-1676570092589-a6c09ecbb373?w=500&h=500&fit=crop", description: "3 bestselling nude shades in matte, satin & glossy finishes.", inStock: true, badge: "SET", rating: 4.9, reviews: 312 },
  { id: "p7", name: "Empress Parfum 50ml", category: "Perfume", price: 18000, image: "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=500&h=500&fit=crop", description: "Signature floral-musk fragrance. Notes of rose, jasmine & amber.", inStock: false, badge: "IMPORT", rating: 4.9, reviews: 44 },
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

// Safe clipboard copy with fallback for HTTP / older Android WebViews
function safeCopy(text: string): void {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text: string): void {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  try { document.execCommand("copy"); } catch (_) {}
  document.body.removeChild(el);
}

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
    // Orders are fetched inside AdminPanel after authentication
  }, []);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const toastCounter = useRef(0);
  function addToast(msg: string) {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }

  // Premium Features & Hidden Admin States
  const [adminPromptOpen, setAdminPromptOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  // Prevent background scroll when any overlay modal or sidebar is active
  useEffect(() => {
    const isModalOpen = cartOpen || !!checkoutStep || !!quickViewProduct || quizOpen || adminPromptOpen;
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, checkoutStep, quickViewProduct, quizOpen, adminPromptOpen]);

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function addToCart(product: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    const label = product.name.length > 28 ? product.name.slice(0, 28) + "\u2026" : product.name;
    addToast(`${label} added to cart \uD83D\uDECD\uFE0F`);
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
    const payload = {
      id: orderId,
      customerName,
      phone: customerPhone,
      email: customerEmail,
      total: cartTotal,
      status: "pending" as const,
      items: cart.map(i => ({
        product: { id: i.product.id, name: i.product.name, price: i.product.price },
        quantity: i.quantity
      }))
    };

    createOrder(payload)
      .then(savedOrder => {
        const typedOrder = {
          ...savedOrder,
          status: savedOrder.status as OrderStatus
        };
        setOrders(prev => [typedOrder, ...prev]);
      })
      .catch(err => {
        console.error("Failed to save order to database:", err);
        setOrders(prev => [{ id: orderId, customerName, phone: customerPhone, email: customerEmail, items: [...cart], total: cartTotal, status: "pending", createdAt: new Date() }, ...prev]);
      });

    setCheckoutStep("payment");
  }

  function sendWhatsApp() {
    const lines = cart.map(i => `• ${i.product.name} x${i.quantity} — ${fmt(i.product.price * i.quantity)}`).join("\n");
    const msg = `Hello, Splendid Empire! 👋\n\nI've completed a bank transfer of *${fmt(cartTotal)}* for order *${orderId}*.\n\n*Items:*\n${lines}\n\n*Name:* ${customerName}\n*Phone:* ${customerPhone}\n\nPlease confirm receipt when convenient. Thank you!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "verifying" } : o));
  }

  function copyAccount() {
    safeCopy(BANK_ACCOUNT_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // Dismiss checkout without clearing the cart (customer can re-open cart)
  function closeCheckout() {
    setCheckoutStep(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
  }

  // Called after WhatsApp notification sent — order is complete, clear cart
  function finishAndClose() {
    setCheckoutStep(null);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
  }

  const filtered = products.filter(p =>
    p.inStock &&
    (activeCategory === "All" || p.category === activeCategory) &&
    (!searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Derive unique categories dynamically from products
  const allCategories: Category[] = ["All", ...Array.from(new Set(products.map(p => p.category))).sort()];

  if (view === "admin") {
    return <AdminPanel products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} onExit={() => setView("store")} />;
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "'Raleway', sans-serif", backgroundColor: "#FFF6F3", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#1A0F0A", letterSpacing: "-0.02em" }}>SPLENDID</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, letterSpacing: "0.45em", color: "#C9A227", fontWeight: 600 }}>EMPIRE COSMETICS</div>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(201,162,39,0.2)", borderTopColor: "#C9A227", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Raleway', sans-serif", backgroundColor: "#FFF6F3", minHeight: "100dvh", overflowX: "hidden" }}>
      <Navbar
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        onAdminRequest={() => setAdminPromptOpen(true)}
        onSearch={(q) => {
          setSearchQuery(q);
          if (q) setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }), 100);
        }}
      />
      <HeroSection onQuizOpen={() => setQuizOpen(true)} />
      <CategorySection active={activeCategory} onSelect={setActiveCategory} categories={allCategories} />
      <ProductsSection products={filtered} active={activeCategory} onFilter={setActiveCategory} onAdd={addToCart} onQuickView={setQuickViewProduct} categories={allCategories} />
      <WhyUsSection />
      <TestimonialsSection />
      <FAQSection />
      <LocationSection />
      <SEOSection />
      <SiteFooter onSelectCategory={setActiveCategory} categories={allCategories} />

      {cartOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} onClick={() => setCartOpen(false)} />}

      <CartDrawer open={cartOpen} cart={cart} total={cartTotal} onClose={() => setCartOpen(false)} onRemove={removeFromCart} onQty={updateQty} onCheckout={beginCheckout} />

      {/* Scroll Progress Bar */}
      <ScrollProgress />

      {/* Back to Top Button */}
      <BackToTop />

      {/* Sticky Cart Bar — shows when cart has items */}
      {cartCount > 0 && !cartOpen && !checkoutStep && (
        <div
          onClick={() => setCartOpen(true)}
          style={{
            position: "fixed",
            bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            background: "#1A0F0A",
            borderRadius: 999,
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 8px 32px rgba(26,15,10,0.35)",
            cursor: "pointer",
            border: "1px solid rgba(201,162,39,0.3)",
            minWidth: 260,
            justifyContent: "space-between",
            transition: "transform 0.2s",
            animation: "slideUpBar 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#C9A227", borderRadius: 999, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingBag size={14} color="#fff" />
            </div>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600 }}>
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </span>
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", color: "#F9DEDA", fontSize: 18, fontWeight: 700 }}>
            {fmt(cartTotal)}
          </span>
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", background: "#C9A227", padding: "6px 16px", borderRadius: 999 }}>
            VIEW CART →
          </span>
        </div>
      )}

      {checkoutStep && (
        <CheckoutModal
          step={checkoutStep}
          cart={cart}
          total={cartTotal}
          orderId={orderId}
          name={customerName}
          phone={customerPhone}
          email={customerEmail}
          onName={setCustomerName}
          onPhone={setCustomerPhone}
          onEmail={setCustomerEmail}
          onPlace={placeOrder}
          onWhatsApp={sendWhatsApp}
          onCopy={copyAccount}
          copied={copied}
          onClose={closeCheckout}
          onFinish={finishAndClose}
        />
      )}


      {/* Hidden Admin Passcode Modal */}
      {adminPromptOpen && (
        <PasscodeModal onClose={() => setAdminPromptOpen(false)} onSuccess={() => setView("admin")} />
      )}

      {/* Product Quick View Modal */}
      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAdd={(prod, qty) => {
            setCart(prev => {
              const ex = prev.find(i => i.product.id === prod.id);
              if (ex) return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + qty } : i);
              return [...prev, { product: prod, quantity: qty }];
            });
            setQuickViewProduct(null); // just close the modal, stay on page
          }}
        />
      )}

      {/* Beauty Consultation Quiz Modal */}
      {quizOpen && (
        <BeautyQuizModal products={products} onClose={() => setQuizOpen(false)} onAdd={addToCart} />
      )}

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="animate-float"
        style={{
          position: "fixed",
          bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          right: 16,
          zIndex: 45,
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "#25D366",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 24px rgba(37,211,102,0.45)",
          textDecoration: "none",
        }}
      >
        <MessageCircle size={26} color="#fff" fill="#fff" />
      </a>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────

interface PasscodeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function PasscodeModal({ onClose, onSuccess }: PasscodeModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    adminLogin(password)
      .then(res => {
        if (res.authenticated) {
          onSuccess();
          onClose();
        } else {
          setError(true);
          setTimeout(() => setError(false), 2000);
        }
      })
      .catch(() => {
        setError(true);
        setTimeout(() => setError(false), 2000);
      });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 7, 5, 0.6)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 20px 50px rgba(0,0,0,0.15)", border: "1px solid rgba(249,222,218,0.3)" }} className="animate-modal-zoom">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A0F0A" }}>Admin Verification</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A7A6E" }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <p style={{ color: "#5C3D2E", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>Please enter the administrator passcode to access management settings.</p>
          <input
            type="password"
            placeholder="Enter Admin Passcode"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: error ? "1.5px solid #ef4444" : "1px solid rgba(201,162,39,0.3)", outline: "none", fontSize: 14, marginBottom: 16, transition: "border-color 0.2s" }}
          />
          {error && <p style={{ color: "#ef4444", fontSize: 12, marginTop: -8, marginBottom: 16, fontWeight: 600 }}>Invalid passcode. Please try again.</p>}
          <button type="submit" style={{ width: "100%", background: "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)", color: "#fff", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, fontSize: 12, letterSpacing: "0.15em", cursor: "pointer", boxShadow: "0 10px 20px rgba(201,162,39,0.2)" }}>
            VERIFY PASSWORD
          </button>
        </form>
      </div>
    </div>
  );
}

interface ProductQuickViewProps {
  product: Product;
  onClose: () => void;
  onAdd: (p: Product, qty: number) => void;
}

function ProductQuickViewModal({ product: p, onClose, onAdd }: ProductQuickViewProps) {
  const [quantity, setQuantity] = useState(1);
  const gallery = [p.image, ...(p.images ?? [])];
  const [activeIdx, setActiveIdx] = useState(0);
  const hasMultiple = gallery.length > 1;

  // Reset gallery index when product changes
  useEffect(() => { setActiveIdx(0); }, [p.id]);

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setActiveIdx(i => (i + 1) % gallery.length); // swipe left → next
      else setActiveIdx(i => (i - 1 + gallery.length) % gallery.length); // swipe right → prev
    }
    touchStartX.current = null;
  }

  // Ingredient descriptions based on product category
  const ingredientsMap: Record<string, string> = {
    Foundation: "Aqua, Cyclopentasiloxane, Hyaluronic Acid, Tocopherol (Vitamin E), Shea Butter, Titanium Dioxide, Iron Oxides, Centella Asiatica Extract.",
    Lipstick: "Jojoba Esters, Rosa Canina (Rosehip) Fruit Oil, Cera Alba (Beeswax), Copernicia Cerifera Wax, Butyrospermum Parkii, Mica, Sweet Almond Oil.",
    Serum: "Pure 24K Gold Particles, Niacinamide (Vitamin B3), Sodium Hyaluronate, Ascorbic Acid (Vitamin C), Collagen Amino Acids, Glycerin, Chamomile Extract.",
    Eyeliner: "Water, Acrylates Copolymer, Carbon Black, Butylene Glycol, Aloe Barbadensis Leaf Juice, Tocopheryl Acetate, Xanthan Gum, Phenoxyethanol.",
    Moisturizer: "Butyrospermum Parkii (Shea Butter), Aloe Barbadensis Leaf Juice, Squalane, Argania Spinosa Kernel Oil, Panthenol, Lavender Essential Oil.",
    Perfume: "Alcohol Denat., Fragrance (Parfum), Benzyl Salicylate, Limonene, Linalool, Citronellol, Jasmine Flower Water, Amber Extract."
  };

  const usageMap: Record<string, string> = {
    Foundation: "Dispense a small pump onto the back of your hand. Using a damp beauty sponge or foundation brush, buff into skin starting from the center of the face outwards for a seamless velvet matte finish.",
    Lipstick: "Glide directly over clean lips. Start at the cupid's bow and blend outwards. Apply a second coat for maximum color intensity or top with gloss for a radiant shine.",
    Serum: "Apply 3-4 drops onto freshly cleansed face and neck. Gently press and massage into skin using upward circular motions. Allow to dry completely before applying moisturizer.",
    Eyeliner: "Shake well before use. Place the tip close to the lash line and sweep across from the inner corner outwards. Build pressure slightly for a bolder wing effect.",
    Moisturizer: "Warm a pea-sized amount between fingertips. Smooth gently onto face and neck using upward strokes. Use morning and night after serums.",
    Perfume: "Spritz lightly onto pulse points—wrists, inner elbows, and neck. Do not rub the fragrance into skin, let it settle naturally to maintain note layers."
  };

  const ingredients = ingredientsMap[p.category] || "Natural mineral pigments, botanical extracts, nourishing vitamins, and hydrating elements.";
  const howToUse = usageMap[p.category] || "Apply a small amount to the target area and blend gently until fully absorbed.";

  function handleAdd() {
    onAdd(p, quantity);
    onClose();
  }

  // Determine if video URL looks like TikTok or Instagram
  const isTikTok = p.videoUrl?.includes("tiktok.com");
  const videoLabel = isTikTok ? "Watch on TikTok" : "Watch on Instagram / TikTok";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 7, 5, 0.6)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 800, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 70px rgba(0,0,0,0.2)", border: "1px solid rgba(249,222,218,0.3)" }} className="animate-modal-zoom">
        <div style={{ position: "sticky", top: 0, background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid rgba(201,162,39,0.1)", zIndex: 10 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.15em", fontWeight: 700, color: "#C9A227" }}>PRODUCT QUICK VIEW</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A7A6E" }}><X size={20} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, padding: 24 }} className="md:grid-cols-2">
          {/* Left: Gallery Viewer */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "fit-content" }}>
            {/* Main image area with arrows */}
            <div
              style={{ position: "relative", aspectRatio: "1", borderRadius: 16, overflow: "hidden", backgroundColor: "#FFF0EB", userSelect: "none" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={gallery[activeIdx]}
                alt={`${p.name} — image ${activeIdx + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.2s" }}
              />
              {p.badge && (
                <span style={{ position: "absolute", top: 16, left: 16, background: "#C9A227", color: "#fff", fontSize: 9, letterSpacing: "0.18em", fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>{p.badge}</span>
              )}
              <span style={{ position: "absolute", bottom: 16, right: 16, background: p.inStock ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)", color: "#fff", fontSize: 9, letterSpacing: "0.1em", fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
                {p.inStock ? "IN STOCK" : "OUT OF STOCK"}
              </span>

              {/* Left / Right arrows — only shown when multiple images */}
              {hasMultiple && (
                <>
                  <button
                    onClick={() => setActiveIdx(i => (i - 1 + gallery.length) % gallery.length)}
                    aria-label="Previous image"
                    style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", zIndex: 5 }}
                  >
                    <ChevronLeft size={16} color="#1A0F0A" />
                  </button>
                  <button
                    onClick={() => setActiveIdx(i => (i + 1) % gallery.length)}
                    aria-label="Next image"
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", zIndex: 5 }}
                  >
                    <ChevronRight size={16} color="#1A0F0A" />
                  </button>
                </>
              )}
            </div>

            {/* Dot indicators — only shown when multiple images */}
            {hasMultiple && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    aria-label={`View image ${i + 1}`}
                    style={{
                      width: i === activeIdx ? 20 : 8,
                      height: 8,
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      background: i === activeIdx ? "#C9A227" : "rgba(201,162,39,0.3)",
                      padding: 0,
                      transition: "all 0.25s",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Details Container */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", gap: 2, marginBottom: 8, alignItems: "center" }}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} fill={i < Math.floor(p.rating) ? "#C9A227" : "none"} color="#C9A227" />)}
                <span style={{ color: "#9A7A6E", fontSize: 11, marginLeft: 6 }}>({p.reviews} verified reviews)</span>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#1A0F0A", marginBottom: 8, lineHeight: 1.25 }}>{p.name}</h2>
              <div style={{ display: "inline-block", backgroundColor: "rgba(201,162,39,0.1)", color: "#C9A227", fontSize: 9, letterSpacing: "0.1em", fontWeight: 700, padding: "4px 8px", borderRadius: 6, marginBottom: 16 }}>
                {p.category.toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#C9A227", marginBottom: 16 }}>
                {fmt(p.price)}
              </div>
              
              <div style={{ borderBottom: "1px solid rgba(201,162,39,0.1)", paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ color: "#1A0F0A", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", marginBottom: 6 }}>DESCRIPTION</h4>
                <p style={{ color: "#5C3D2E", fontSize: 13, lineHeight: 1.6 }}>{p.description}</p>
              </div>

            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {/* Watch on Instagram / TikTok button */}
              {p.videoUrl && (
                <a
                  href={p.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px 16px", borderRadius: 12,
                    border: "1.5px solid rgba(201,162,39,0.4)",
                    background: "#FFF6F3",
                    color: "#1A0F0A", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                    textDecoration: "none", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C9A227"; (e.currentTarget as HTMLElement).style.background = "rgba(201,162,39,0.06)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,162,39,0.4)"; (e.currentTarget as HTMLElement).style.background = "#FFF6F3"; }}
                >
                  {isTikTok ? <TikTokIcon size={14} /> : <Instagram size={14} />}
                  {videoLabel.toUpperCase()}
                </a>
              )}

              {p.inStock ? (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(201,162,39,0.3)", borderRadius: 12, overflow: "hidden" }}>
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: "#5C3D2E" }}><Minus size={13} /></button>
                    <span style={{ padding: "0 10px", fontSize: 13, fontWeight: 700, color: "#1A0F0A", minWidth: 24, textAlign: "center" }}>{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} style={{ padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: "#5C3D2E" }}><Plus size={13} /></button>
                  </div>
                  <button onClick={handleAdd} style={{ flex: 1, background: "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)", color: "#fff", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, fontSize: 11, letterSpacing: "0.15em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 10px 24px rgba(201,162,39,0.25)" }}>
                    <ShoppingBag size={14} /> ADD TO CART — {fmt(p.price * quantity)}
                  </button>
                </div>
              ) : (
                <div style={{ padding: "14px", textAlign: "center", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#ef4444", fontSize: 12, fontWeight: 700, backgroundColor: "rgba(239,68,68,0.05)" }}>
                  OUT OF STOCK
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BeautyQuizModalProps {
  products: Product[];
  onClose: () => void;
  onAdd: (p: Product) => void;
}

function BeautyQuizModal({ products, onClose, onAdd }: BeautyQuizModalProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ skinType: "", coverage: "", undertone: "" });
  const [recs, setRecs] = useState<Product[]>([]);

  const questions = [
    {
      key: "skinType",
      title: "What is your skin type?",
      subtitle: "Helps us match the right formula to your skin.",
      options: [
        { label: "Dry & Flaky", desc: "Feels tight, needs intensive hydration." },
        { label: "Oily & Shiny", desc: "Excess sebum, prone to shine, needs matte formulas." },
        { label: "Combination", desc: "Oily in T-zone, dry on cheeks." },
        { label: "Normal & Balanced", desc: "Smooth texture, even skin tone." }
      ]
    },
    {
      key: "coverage",
      title: "What level of coverage do you prefer?",
      subtitle: "From barely-there to full cover.",
      options: [
        { label: "Sheer & Natural", desc: "Lightweight, lets your natural skin shine through." },
        { label: "Medium & Buildable", desc: "Covers blemishes, feels natural." },
        { label: "Full & Flawless", desc: "Maximum coverage, airbrushed finish." }
      ]
    },
    {
      key: "undertone",
      title: "What is your skin undertone?",
      subtitle: "Helps us find shades that complement your complexion.",
      options: [
        { label: "Cool (Pinkish/Rosy)", desc: "Veins look blue/purple; silver jewelry looks best." },
        { label: "Warm (Golden/Yellow)", desc: "Veins look green; gold jewelry looks best." },
        { label: "Neutral (Balanced)", desc: "Veins look blue-green; both metals look great." }
      ]
    }
  ];

  function handleSelect(optionLabel: string) {
    const key = questions[step - 1].key;
    const nextAnswers = { ...answers, [key]: optionLabel };
    setAnswers(nextAnswers);

    if (step < questions.length) {
      setStep(step + 1);
    } else {
      const recommendedList: Product[] = [];

      if (nextAnswers.skinType.includes("Dry") || nextAnswers.skinType.includes("Combination")) {
        const serum = products.find(p => p.id === "p3");
        if (serum) recommendedList.push(serum);
        const moist = products.find(p => p.id === "p5");
        if (moist) recommendedList.push(moist);
      } else {
        const serum = products.find(p => p.id === "p3");
        if (serum) recommendedList.push(serum);
      }

      if (nextAnswers.coverage.includes("Full")) {
        const found = products.find(p => p.id === "p1");
        if (found) recommendedList.push(found);
      } else {
        const conc = products.find(p => p.id === "p8");
        if (conc) recommendedList.push(conc);
      }

      if (nextAnswers.undertone.includes("Warm")) {
        const lip = products.find(p => p.id === "p6");
        if (lip) recommendedList.push(lip);
      } else {
        const lip = products.find(p => p.id === "p2");
        if (lip) recommendedList.push(lip);
      }

      setRecs(recommendedList.filter(Boolean));
      setStep(questions.length + 1);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 7, 5, 0.6)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 550, maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "0 24px 70px rgba(0,0,0,0.2)", border: "1px solid rgba(249,222,218,0.3)" }} className="animate-modal-zoom">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.15em", fontWeight: 700, color: "#C9A227" }}>BEAUTY CONSULTATION</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A7A6E" }}><X size={20} /></button>
        </div>

        {step === 0 && (
          <div style={{ textAlign: "center" }} className="animate-slide-up">
            <Sparkles size={40} color="#C9A227" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#1A0F0A", marginBottom: 8 }}>Your Personalised Beauty Edit</h3>
            <p style={{ color: "#5C3D2E", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>Answer three quick questions and we'll recommend products matched to your skin type, tone, and finish preference.</p>
            <button onClick={() => setStep(1)} style={{ background: "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)", color: "#fff", border: "none", padding: "14px 28px", borderRadius: 12, fontWeight: 700, fontSize: 11, letterSpacing: "0.15em", cursor: "pointer", boxShadow: "0 10px 24px rgba(201,162,39,0.2)" }}>
              BEGIN MY EDIT
            </button>
          </div>
        )}

        {step > 0 && step <= questions.length && (
          <div className="animate-slide-up">
            <div style={{ fontSize: 11, fontWeight: 700, color: "#C9A227", marginBottom: 6 }}>STEP {step} OF {questions.length}</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A0F0A", marginBottom: 4 }}>{questions[step - 1].title}</h3>
            <p style={{ color: "#9A7A6E", fontSize: 12, marginBottom: 20 }}>{questions[step - 1].subtitle}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {questions[step - 1].options.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => handleSelect(opt.label)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "16px 20px",
                    borderRadius: 14,
                    border: "1px solid rgba(201,162,39,0.25)",
                    background: "linear-gradient(180deg, #FFFFFF 0%, #FFFDFD 100%)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#C9A227";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(4px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(201,162,39,0.06)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,162,39,0.25)";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#1A0F0A", fontSize: 13, marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ color: "#5C3D2E", fontSize: 11 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step > questions.length && (
          <div className="animate-slide-up">
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <CheckCircle size={36} color="#22c55e" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#1A0F0A", marginBottom: 4 }}>Your Personalized Routine</h3>
              <p style={{ color: "#9A7A6E", fontSize: 12 }}>Based on your {answers.skinType} skin & {answers.coverage} coverage preference:</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {recs.map(rec => (
                <div key={rec.id} style={{ display: "flex", gap: 14, padding: 14, borderRadius: 16, border: "1px solid rgba(201,162,39,0.15)", background: "#FFFBF9", alignItems: "center" }}>
                  <img src={rec.image} alt={rec.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 12, color: "#1A0F0A" }}>{rec.name}</div>
                    <div style={{ color: "#C9A227", fontWeight: 600, fontSize: 11, marginTop: 2 }}>{fmt(rec.price)}</div>
                  </div>
                  <button onClick={() => { onAdd(rec); }} style={{ background: "#C9A227", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#A8841A")} onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#C9A227")}>
                    ADD
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(0)} style={{ flex: 1, border: "1px solid rgba(201,162,39,0.4)", color: "#C9A227", background: "none", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>RETAKE QUIZ</button>
              <button onClick={onClose} style={{ flex: 1, background: "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)", color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>DONE</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Navbar({ cartCount, onCartOpen, onAdminRequest, onSearch }: { cartCount: number; onCartOpen: () => void; onAdminRequest: () => void; onSearch: (q: string) => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [animOut, setAnimOut] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const clickCount = useRef(0);
  const clickTimeout = useRef<any>(null);

  const handleSecretClick = () => {
    clickCount.current += 1;
    if (clickCount.current >= 3) {
      onAdminRequest();
      clickCount.current = 0;
    }
    clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      clickCount.current = 0;
    }, 400);
  };

  const menuScrollY = useRef(0);
  // Lock body scroll when mobile menu is open (saves + restores scroll position)
  useEffect(() => {
    if (open) {
      menuScrollY.current = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${menuScrollY.current}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, menuScrollY.current);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [open]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScrollSpy = () => {
      const sections = ["home", "products", "categories", "location", "contact"];
      const scrollPosition = window.scrollY + 120;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScrollSpy);
    handleScrollSpy();
    return () => window.removeEventListener("scroll", handleScrollSpy);
  }, []);

  const navStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
    boxShadow: scrolled ? "0 1px 12px rgba(201,162,39,0.12)" : "none",
    transition: "all 0.3s",
  };

  function toggleMenu() {
    if (open) {
      setAnimOut(true);
      setTimeout(() => { setOpen(false); setAnimOut(false); }, 280);
    } else {
      setOpen(true);
    }
  }

  function closeMenu() {
    setAnimOut(true);
    setTimeout(() => { setOpen(false); setAnimOut(false); }, 280);
  }

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    closeMenu();
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, open ? 300 : 0);
  };

  const navLinks = [["HOME", "#home"], ["SHOP", "#products"], ["CATEGORIES", "#categories"], ["FIND US", "#location"], ["CONTACT", "#contact"]];

  return (
    <>
      <header className="glass" style={navStyle}>
        <div style={{ backgroundColor: "#C9A227", color: "#fff", textAlign: "center", padding: "5px 12px", fontSize: 10, letterSpacing: "0.15em", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          FREE DELIVERY IN OWERRI ON ORDERS ABOVE ₦15,000 &nbsp;·&nbsp; ORDER VIA WHATSAPP IN MINUTES
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={handleSecretClick} style={{ lineHeight: 1.1, flexShrink: 0, cursor: "pointer", userSelect: "none", WebkitUserSelect: "none" }} title="Tap 3 times fast to enter Admin Panel">
            <img
              src="/logo.jpg"
              alt="Splendid Empire Cosmetics"
              style={{ height: 48, width: 48, borderRadius: "50%", objectFit: "cover", display: "block", boxShadow: "0 2px 10px rgba(201,162,39,0.25)" }}
            />
          </div>

          <nav style={{ gap: 28, fontSize: 11, letterSpacing: "0.15em", fontWeight: 700, color: "#1A0F0A", flexShrink: 0 }} className="hidden md:flex">
            {navLinks.map(([l, h]) => {
              const targetSection = h.substring(1);
              const isActive = activeSection === targetSection;
              return (
                <a key={l} href={h} 
                  onClick={e => handleScrollTo(e, targetSection)}
                  style={{ textDecoration: "none", color: isActive ? "#C9A227" : "inherit", transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#C9A227")}
                  onMouseLeave={e => (e.currentTarget.style.color = isActive ? "#C9A227" : "#1A0F0A")}
                >{l}</a>
              );
            })}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label={searchOpen ? "Close search" : "Open search"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#1A0F0A", display: searchOpen ? "none" : "flex" }}
              className="flex md:hidden"
            >
              <Search size={22} />
            </button>
            <button onClick={onCartOpen} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 8, color: "#1A0F0A" }}>
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, background: "#C9A227", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={toggleMenu}
              aria-label={open ? "Close menu" : "Open menu"}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 8, color: "#1A0F0A", display: "flex",
                position: "relative",
                transition: "transform 0.3s ease",
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
              }}
              className="flex md:hidden"
            >
              <Menu
                size={22}
                style={{
                  transition: "opacity 0.25s ease, transform 0.25s ease",
                  opacity: open ? 0 : 1,
                  transform: open ? "rotate(-90deg) scale(0.6)" : "rotate(0deg) scale(1)",
                  position: "absolute",
                }}
              />
              <X
                size={22}
                style={{
                  transition: "opacity 0.25s ease, transform 0.25s ease",
                  opacity: open ? 1 : 0,
                  transform: open ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.6)",
                }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Search Bar — slides down on mobile */}
      <div
        style={{
          position: "fixed",
          top: "calc((scrolled ? 60 : 72) + env(safe-area-inset-top, 0px))",
          left: 0,
          right: 0,
          zIndex: 9997,
          backgroundColor: "#fff",
          borderBottom: "1px solid rgba(201,162,39,0.15)",
          padding: "12px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          transform: searchOpen ? "translateY(0)" : "translateY(-100%)",
          opacity: searchOpen ? 1 : 0,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          visibility: searchOpen ? "visible" : "hidden",
        }}
        className="md:hidden"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  onSearch(searchQuery.trim());
                  setSearchOpen(false);
                  setSearchQuery("");
                }
              }}
              autoFocus
              style={{
                width: "100%",
                padding: "12px 16px 12px 40px",
                borderRadius: 12,
                border: "1px solid rgba(201,162,39,0.3)",
                backgroundColor: "#FFF6F3",
                fontSize: 14,
                outline: "none",
                color: "#1A0F0A",
                boxSizing: "border-box",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#C9A227")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(201,162,39,0.3)")}
            />
            <Search size={16} color="#9A7A6E" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          <button
            onClick={() => {
              if (searchQuery.trim()) {
                onSearch(searchQuery.trim());
              } else {
                onSearch("");
              }
              setSearchOpen(false);
              setSearchQuery("");
            }}
            style={{
              background: searchQuery.trim() ? "#C9A227" : "rgba(201,162,39,0.1)",
              border: "none",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 11,
              fontWeight: 700,
              color: searchQuery.trim() ? "#fff" : "#C9A227",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {searchQuery.trim() ? "SEARCH" : "CANCEL"}
          </button>
        </div>
      </div>

      {/* Backdrop overlay for mobile menu */}
      <div
        onClick={closeMenu}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 7, 5, 0.55)",
          zIndex: 9998,
          opacity: open && !animOut ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
          WebkitBackdropFilter: "blur(2px)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Mobile dropdown menu — slides in from the right */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(320px, 82vw)",
          zIndex: 9999,
          backgroundColor: "#fff",
          boxShadow: open && !animOut
            ? "-12px 0 40px rgba(15, 7, 5, 0.2)"
            : "none",
          display: "flex",
          flexDirection: "column",
          transform: open && !animOut
            ? "translateX(0)"
            : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Mobile menu header */}
        <div style={{
          padding: "24px 24px 16px",
          borderBottom: "1px solid rgba(201,162,39,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ lineHeight: 1.1 }}>
            <img
              src="/logo.jpg"
              alt="Splendid Empire Cosmetics"
              style={{ height: 44, width: 44, borderRadius: "50%", objectFit: "cover", boxShadow: "0 2px 8px rgba(201,162,39,0.2)" }}
            />
          </div>
          <button
            onClick={closeMenu}
            aria-label="Close menu"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#5C3D2E", display: "flex" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation links */}
        <div style={{ flex: 1, padding: "16px 0" }}>
          {navLinks.map(([l, h], idx) => {
            const targetSection = h.substring(1);
            const isActive = activeSection === targetSection;
            return (
              <a
                key={l}
                href={h}
                onClick={e => handleScrollTo(e, targetSection)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "18px 24px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: isActive ? "#C9A227" : "#1A0F0A",
                  textDecoration: "none",
                  letterSpacing: "0.12em",
                  borderLeft: `3px solid ${isActive ? "#C9A227" : "transparent"}`,
                  backgroundColor: isActive ? "#FFF6F3" : "transparent",
                  transition: "all 0.2s ease",
                  animation: open && !animOut
                    ? `mobileNavFadeIn 0.3s ease ${idx * 0.05}s both`
                    : "none",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#FFF6F3";
                  (e.currentTarget as HTMLElement).style.borderLeftColor = "#C9A227";
                  (e.currentTarget as HTMLElement).style.color = "#C9A227";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = isActive ? "#FFF6F3" : "transparent";
                  (e.currentTarget as HTMLElement).style.borderLeftColor = isActive ? "#C9A227" : "transparent";
                  (e.currentTarget as HTMLElement).style.color = isActive ? "#C9A227" : "#1A0F0A";
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  backgroundColor: "#C9A227", marginRight: 14, flexShrink: 0,
                  opacity: isActive ? 1 : 0.4,
                }} />
                {l}
              </a>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div style={{
          padding: "20px 24px 28px",
          borderTop: "1px solid rgba(201,162,39,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          <div style={{ color: "#1A0F0A", fontWeight: 700, fontSize: 10, letterSpacing: "0.1em" }}>NEED HELP\?</div>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#C9A227", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <MessageCircle size={13} /> WHATSAPP CHAT
          </a>
          <a href="mailto:obilodoris15@gmail.com" style={{ textDecoration: "none", color: "#5C3D2E", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Eye size={13} /> obilodoris15@gmail.com
          </a>
        </div>
      </div>
    </>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function HeroSection({ onQuizOpen }: { onQuizOpen: () => void }) {
  return (
    <section id="home" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 80, paddingBottom: 40 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 15% 20%, rgba(249,222,218,0.65) 0, transparent 28%), radial-gradient(circle at 85% 10%, rgba(201,162,39,0.18) 0, transparent 30%), linear-gradient(135deg, #FFF7F4 0%, #FAE8E2 52%, #F9DEDA 100%)" }} />

      <div style={{ position: "absolute", inset: 0, opacity: 0.15 }} className="md:hidden">
        <img src="https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=600&h=600&fit=crop" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px)" }} />
      </div>

      <div style={{ position: "absolute", right: 0, top: 0, width: "55%", height: "100%", overflow: "hidden" }} className="hidden md:block">
        <img src="https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=1000&h=1000&fit=crop" alt="Premium skincare products" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #FDE8E0 0%, rgba(253,232,224,0.62) 38%, rgba(26,15,10,0.08) 100%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", width: "100%" }} className="px-4 py-8 sm:px-6 md:py-10 lg:px-8">
        <div className="flex flex-col items-center gap-8 text-center md:max-w-[48%] md:items-start md:text-left">
          <div className="md:hidden" style={{ width: "min(82vw, 300px)", aspectRatio: "1", borderRadius: "50%", overflow: "hidden", boxShadow: "0 24px 70px rgba(201,162,39,0.3), 0 0 0 4px rgba(201,162,39,0.2)", border: "3px solid rgba(201,162,39,0.4)" }}>
            <img src="/logo.jpg" alt="Splendid Empire Cosmetics" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.58)", border: "1px solid rgba(201,162,39,0.25)", borderRadius: 999, padding: "6px 14px", marginBottom: 0, flexWrap: "wrap", justifyContent: "center", boxShadow: "0 10px 30px rgba(201,162,39,0.12)", backdropFilter: "blur(10px)" }}>
            <Sparkles size={12} color="#C9A227" />
            <span style={{ color: "#C9A227", fontSize: 9, letterSpacing: "0.2em", fontWeight: 700 }}>OWERRI'S AUTHENTIC SKINCARE DESTINATION</span>
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1A0F0A", lineHeight: 1.05, marginBottom: 0, fontSize: "clamp(34px, 9vw, 62px)" }}>
            Authentic Skincare,<br />
            <span style={{ color: "#C9A227", fontStyle: "italic" }}>Delivered.</span>
          </h1>

          <p style={{ color: "#5C3D2E", fontSize: 14, lineHeight: 1.65, marginBottom: 0, maxWidth: 500 }} className="mx-auto md:mx-0 sm:text-base">
            Foreign skincare & beauty products. Same-day delivery in Owerri. Order in minutes via WhatsApp.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }} className="w-full flex-col justify-center md:justify-start sm:w-auto sm:flex-row">
            <a href="#products" style={{ background: "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)", color: "#fff", padding: "12px 28px", borderRadius: 999, fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, textDecoration: "none", boxShadow: "0 12px 28px rgba(201,162,39,0.34)", width: "100%", maxWidth: 280, textAlign: "center" }} className="sm:w-auto">
              SHOP NOW
            </a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ border: "2px solid #C9A227", color: "#C9A227", background: "rgba(255,255,255,0.55)", padding: "12px 28px", borderRadius: 999, fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, textDecoration: "none", width: "100%", maxWidth: 280, textAlign: "center", backdropFilter: "blur(10px)" }} className="sm:w-auto">
              WHATSAPP ORDER
            </a>
            <button onClick={onQuizOpen} style={{ border: "2px solid rgba(201,162,39,0.4)", color: "#C9A227", background: "rgba(255,255,255,0.55)", padding: "12px 28px", borderRadius: 999, fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, cursor: "pointer", width: "100%", maxWidth: 280, textAlign: "center", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} className="sm:w-auto">
              <Sparkles size={13} /> FIND MY PRODUCTS
            </button>
          </div>

          <div style={{ display: "flex", gap: 18, paddingTop: 20, borderTop: "1px solid rgba(201,162,39,0.2)", flexWrap: "wrap" }} className="justify-center md:justify-start">
            {[["500+", "Products"], ["1,200+", "Satisfied Clients"], ["5★", "Google Rating"]].map(([v, l]) => (
              <div key={l} style={{ minWidth: 80 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#C9A227" }}>{v}</div>
                <div style={{ fontSize: 9, color: "#5C3D2E", letterSpacing: "0.12em", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social sidebar */}
      <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", zIndex: 10, display: "flex", flexDirection: "column", gap: 10 }} className="hidden md:flex">
        {[
          { href: "https://www.instagram.com/owerriskincarevendor15?igsh=NnN6bW14bzlsNmp2&utm_source=qr", icon: <Instagram size={15} />, label: "Instagram" },
          { href: "https://www.facebook.com/share/1DxNBDKZcb/?mibextid=wwXIfr", icon: <Facebook size={15} />, label: "Facebook" },
          { href: "https://www.tiktok.com/@owerriskincarevendor15?_r=1&_t=ZS-97Rwyw2sb1J", icon: <TikTokIcon size={15} />, label: "TikTok" },
          { href: `https://wa.me/${WHATSAPP_NUMBER}`, icon: <MessageCircle size={15} />, label: "WhatsApp" }
        ].map(({ href, icon, label }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A227", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", transition: "all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#C9A227"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.85)"; (e.currentTarget as HTMLElement).style.color = "#C9A227"; }}
          >{icon}</a>
        ))}
      </div>
    </section>
  );
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

function CategorySection({ active, onSelect, categories }: { active: Category; onSelect: (c: Category) => void; categories: Category[] }) {
  const cats = categories;
  return (
    <section id="categories" style={{ padding: "60px 0", backgroundColor: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#1A0F0A", marginBottom: 8 }}>Shop By Category</h2>
          <p style={{ color: "#5C3D2E", fontSize: 13, letterSpacing: "0.05em" }}>Find your signature look</p>
        </div>
        <div 
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 no-scrollbar flex-nowrap sm:flex-wrap justify-start sm:justify-center w-full px-4 sm:px-0 scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {cats.map(cat => {
            const isActive = active === cat;
            const img = cat === "All" ? "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150&h=150&fit=crop" : (CAT_IMAGES[cat as Exclude<Category, "All">] ?? "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150&h=150&fit=crop");
            return (
              <button 
                key={cat} 
                onClick={() => {
                  onSelect(cat);
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                }} 
                className="flex flex-col items-center gap-2 flex-shrink-0"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <div 
                  className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-full overflow-hidden flex-shrink-0"
                  style={{ 
                    border: `3px solid ${isActive ? "#C9A227" : "transparent"}`, 
                    boxShadow: isActive ? "0 6px 20px rgba(201,162,39,0.25)" : "none", 
                    transform: isActive ? "scale(1.1)" : "scale(1)", 
                    transition: "all 0.3s" 
                  }}
                >
                  <img src={img} alt={cat} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, color: isActive ? "#C9A227" : "#5C3D2E" }}>{cat.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

function ProductsSection({ products, active, onFilter, onAdd, onQuickView, categories }: { products: Product[]; active: Category; onFilter: (c: Category) => void; onAdd: (p: Product) => void; onQuickView: (p: Product) => void; categories: Category[] }) {
  const tabs = categories;
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [active]);

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

  return (
    <section id="products" style={{ background: "linear-gradient(180deg, #FFF6F3 0%, #FFFDFC 100%)" }} className="py-10 sm:py-14">
      <div style={{ maxWidth: 1200, margin: "0 auto" }} className="px-3 sm:px-5 lg:px-6">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#1A0F0A", marginBottom: 6 }}>Our Collection</h2>
          <p style={{ color: "#5C3D2E", fontSize: 12 }}>Beauty picks you’ll love</p>
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 32, justifyContent: "center", flexWrap: "wrap" }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => onFilter(tab)} style={{ padding: "7px 16px", borderRadius: 999, fontSize: 9, letterSpacing: "0.15em", fontWeight: 700, border: `1px solid ${active === tab ? "#C9A227" : "rgba(201,162,39,0.3)"}`, background: active === tab ? "#C9A227" : "transparent", color: active === tab ? "#fff" : "#5C3D2E", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#5C3D2E" }}>
            <Package size={40} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
            <p style={{ fontSize: 13 }}>Nothing here just yet — check back soon.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid" }} className="grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:gap-6">
              {paginatedProducts.map(p => <ProductCard key={p.id} product={p} onAdd={onAdd} onQuickView={onQuickView} />)}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 40 }}>
                <button
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  disabled={currentPage === 1}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    border: "1px solid rgba(201,162,39, 0.3)",
                    background: "transparent",
                    color: currentPage === 1 ? "#d1d5db" : "#5C3D2E",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  PREV
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const isPageActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        fontSize: 11,
                        fontWeight: 700,
                        border: isPageActive ? "none" : "1px solid rgba(201,162,39, 0.2)",
                        background: isPageActive ? "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)" : "transparent",
                        color: isPageActive ? "#fff" : "#5C3D2E",
                        cursor: "pointer",
                        boxShadow: isPageActive ? "0 4px 12px rgba(201,162,39,0.2)" : "none",
                        transition: "all 0.2s"
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    border: "1px solid rgba(201,162,39, 0.3)",
                    background: "transparent",
                    color: currentPage === totalPages ? "#d1d5db" : "#5C3D2E",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  NEXT
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ProductCard({ product: p, onAdd, onQuickView }: { product: Product; onAdd: (p: Product) => void; onQuickView: (p: Product) => void }) {
  const [wished, setWished] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const extraImages = p.images ?? [];
  const galleryCount = 1 + extraImages.length; // main + extras
  const hasMultiple = extraImages.length > 0;
  const hasVideo = !!p.videoUrl;

  function handleAdd() {
    onAdd(p);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F5 100%)", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 24px rgba(201,162,39,0.09)", transition: "all 0.3s", border: "1px solid rgba(249,222,218,0.22)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(201,162,39,0.18)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(201,162,39,0.09)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
    >
      <div onClick={() => onQuickView(p)} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", backgroundColor: "#FFF0EB", cursor: "pointer" }}>
        <img src={p.image} alt={p.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }}
          onMouseEnter={e => ((e.target as HTMLElement).style.transform = "scale(1.08)")}
          onMouseLeave={e => ((e.target as HTMLElement).style.transform = "scale(1)")}
        />
        {p.badge && (
          <span style={{ position: "absolute", top: 8, left: 8, background: "#C9A227", color: "#fff", fontSize: 8, letterSpacing: "0.1em", fontWeight: 700, padding: "2px 6px", borderRadius: 999 }}>{p.badge}</span>
        )}
        <button onClick={e => { e.stopPropagation(); setWished(!wished); }} style={{ position: "absolute", top: 8, right: 8, width: 36, height: 36, background: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", zIndex: 10 }}>
          <Heart size={16} fill={wished ? "#C9A227" : "none"} color={wished ? "#C9A227" : "#1A0F0A"} />
        </button>

        {/* ▶ Watch badge — opens video in new tab */}
        {hasVideo && (
          <button
            onClick={e => { e.stopPropagation(); window.open(p.videoUrl, "_blank", "noopener,noreferrer"); }}
            style={{
              position: "absolute", bottom: hasMultiple ? 24 : 8, left: 8,
              background: "rgba(26,15,10,0.82)", backdropFilter: "blur(4px)",
              color: "#fff", border: "none", borderRadius: 999,
              padding: "4px 10px", fontSize: 10, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              letterSpacing: "0.04em", zIndex: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            ▶ Watch
          </button>
        )}

        {/* Gallery dot indicator */}
        {hasMultiple && (
          <div style={{
            position: "absolute", bottom: 8, left: 0, right: 0,
            display: "flex", justifyContent: "center", gap: 4, zIndex: 10,
          }}>
            {Array.from({ length: Math.min(galleryCount, 4) }).map((_, i) => (
              <div key={i} style={{
                width: i === 0 ? 6 : 5,
                height: i === 0 ? 6 : 5,
                borderRadius: "50%",
                background: i === 0 ? "#fff" : "rgba(255,255,255,0.55)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                transition: "background 0.2s",
              }} />
            ))}
          </div>
        )}
      </div>
      <div className="p-2 sm:p-4">
        <div style={{ display: "flex", gap: 1, marginBottom: 4, alignItems: "center" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={8} fill={i < Math.floor(p.rating) ? "#C9A227" : "none"} color="#C9A227" className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px]" />
          ))}
          <span style={{ color: "#9A7A6E", fontSize: 9, marginLeft: 2 }} className="text-[8px] sm:text-[10px]">({p.reviews})</span>
        </div>
        <h3 onClick={() => onQuickView(p)} style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: "#1A0F0A", lineHeight: 1.35, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", cursor: "pointer" }} className="text-[11px] sm:text-sm hover:text-[#C9A227] transition-colors">{p.name}</h3>
        <p style={{ color: "#5C3D2E", fontSize: 11, lineHeight: 1.55, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} className="hidden sm:block">{p.description}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#C9A227" }} className="text-xs sm:text-base">{fmt(p.price)}</span>
          <button onClick={e => { e.stopPropagation(); handleAdd(); }} className="w-11 h-11 flex items-center justify-center rounded-full text-white cursor-pointer transition-all duration-200" style={{ border: "none", background: justAdded ? "#22c55e" : "#C9A227", transform: justAdded ? "scale(1.15)" : "scale(1)", minWidth: 44, minHeight: 44, flexShrink: 0 }}>
            {justAdded ? <Check size={14} /> : <Plus size={14} />}
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
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8 }}>The Splendid Difference</h2>
          <p style={{ color: "#9A7A6E", fontSize: 13 }}>Why discerning clients choose us</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
          {[
            { icon: <Shield size={30} />, title: "Genuine Products", desc: "Every item sourced directly from trusted foreign distributors. What you order is exactly what you receive." },
            { icon: <Truck size={30} />, title: "Swift Delivery", desc: "Same-day within Owerri. Next-day to Port Harcourt." },
            { icon: <MessageCircle size={30} />, title: "WhatsApp Support", desc: "Direct line to our team. We respond within minutes, every time." },
            { icon: <Star size={30} />, title: "Authentic Quality", desc: "Global brands curated specifically for Nigerian skin tones and climate." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ textAlign: "center" }}>
              <div style={{ color: "#F9DEDA", marginBottom: 16, display: "flex", justifyContent: "center" }}>{icon}</div>
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
    { name: "Chioma Adeola", loc: "Owerri", text: "Perfect shade match, delivered the same day. I honestly expected to wait — Splendid Empire proved me wrong.", stars: 5 },
    { name: "Blessing Okafor", loc: "Port Harcourt", text: "My skin has never looked better. The serum is genuinely transformative — and I can see real results from a quality imported product.", stars: 5 },
    { name: "Adaeze Nwosu", loc: "Owerri", text: "The whole experience — browsing, ordering, paying — felt effortless. This is what online shopping in Nigeria should feel like.", stars: 5 },
  ];

  return (
    <section style={{ padding: "60px 0", backgroundColor: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#1A0F0A", marginBottom: 8 }}>What Our Clients Say</h2>
          <p style={{ color: "#5C3D2E", fontSize: 13 }}>Real reviews from real clients</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {reviews.map(({ name, loc, text, stars }) => (
            <div key={name} style={{ background: "#FFF6F3", borderRadius: 20, padding: 28, border: "1px solid rgba(249,222,218,0.3)" }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                {Array.from({ length: stars }).map((_, i) => <Star key={i} size={14} fill="#C9A227" color="#C9A227" />)}
              </div>
              <p style={{ color: "#5C3D2E", fontSize: 13, lineHeight: 1.8, marginBottom: 20, fontStyle: "italic" }}>"{text}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,162,39,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A227", fontWeight: 700, fontSize: 14 }}>{name[0]}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: "#1A0F0A", fontSize: 14 }}>{name}</div>
                  <div style={{ color: "#C9A227", fontSize: 11, letterSpacing: "0.08em" }}>{loc}</div>
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
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  function handleCopyAddr() {
    navigator.clipboard.writeText("Shop D, World Centre, By IMSU Junction, 470 Works Layout, Owerri, Imo State");
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  }

  function handleCopyEmail() {
    navigator.clipboard.writeText("obilodoris15@gmail.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }

  return (
    <section id="location" style={{ background: "linear-gradient(180deg, #FFFDFC 0%, #FFF6F3 100%)" }} className="py-10 sm:py-14">
      <div style={{ maxWidth: 1200, margin: "0 auto" }} className="px-4 sm:px-6">
        <div style={{ borderRadius: 24, overflow: "hidden", display: "grid", boxShadow: "0 24px 70px rgba(26,15,10,0.16)", border: "1px solid rgba(249,222,218,0.28)" }} className="grid-cols-1 md:grid-cols-2">
          <div style={{ background: "radial-gradient(circle at 18% 15%, rgba(201,162,39,0.34) 0, transparent 28%), linear-gradient(145deg, #1A0F0A 0%, #2A160E 100%)", display: "flex", flexDirection: "column", justifyContent: "center" }} className="p-6 sm:p-8 lg:p-10">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Find Us</h2>
            <p style={{ color: "#F9DEDA", fontSize: 13, marginBottom: 28, letterSpacing: "0.05em" }}>Come see us in Owerri</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(201,162,39,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MapPin size={14} color="#C9A227" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>Shop D, World Centre</div>
                    <button onClick={handleCopyAddr} style={{ background: "none", border: "none", color: copiedAddr ? "#22c55e" : "#C9A227", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontWeight: 700 }}>
                      <Copy size={10} /> {copiedAddr ? "COPIED" : "COPY"}
                    </button>
                  </div>
                  <div style={{ color: "#9A7A6E", fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-line" }}>By IMSU Junction, 470 Works Layout{"\n"}Owerri 460212, Imo State</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(201,162,39,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Phone size={14} color="#C9A227" />
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: 12, marginBottom: 2 }}>WhatsApp Us</div>
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ color: "#9A7A6E", fontSize: 11, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "#9A7A6E"}>
                    Message us on WhatsApp
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(201,162,39,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Clock size={14} color="#C9A227" />
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: 12, marginBottom: 2 }}>Mon – Sat</div>
                  <div style={{ color: "#9A7A6E", fontSize: 11, lineHeight: 1.6 }}>9:00am – 7:00pm</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(201,162,39,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Eye size={14} color="#C9A227" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>Email Support</div>
                    <button onClick={handleCopyEmail} style={{ background: "none", border: "none", color: copiedEmail ? "#22c55e" : "#C9A227", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontWeight: 700 }}>
                      <Copy size={10} /> {copiedEmail ? "COPIED" : "COPY"}
                    </button>
                  </div>
                  <a href="mailto:obilodoris15@gmail.com" style={{ color: "#9A7A6E", fontSize: 11, textDecoration: "none" }}>obilodoris15@gmail.com</a>
                </div>
              </div>
            </div>

            <a href="https://share.google/0alXyLa5msMwqjFq6" target="_blank" rel="noopener noreferrer"
              style={{ marginTop: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)", color: "#fff", padding: "10px 20px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textDecoration: "none", width: "fit-content", boxShadow: "0 10px 24px rgba(201,162,39,0.3)" }} className="max-sm:w-full">
              <MapPin size={13} /> GET DIRECTIONS
            </a>
          </div>
          <div style={{ position: "relative", minHeight: "350px" }} className="min-h-[280px] sm:min-h-[350px] md:min-h-full overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop" 
              alt="Splendid Empire Cosmetics Store storefront display" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,15,10,0.5) 0%, transparent 100%)" }} />
            <div style={{ position: "absolute", bottom: 18, left: 18, right: 18, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", borderRadius: 16, padding: "12px 16px", boxShadow: "0 12px 30px rgba(26,15,10,0.14)" }} className="sm:right-auto sm:p-5">
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1A0F0A", fontSize: 14 }}>Splendid Empire Cosmetics</div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={10} fill="#C9A227" color="#C9A227" />)}
                <span style={{ color: "#5C3D2E", fontSize: 10, marginLeft: 4 }}>Owerri Store</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


// ─── FAQ SECTION ──────────────────────────────────────────────────────────────

function FAQSection() {
  const [open, setOpen] = React.useState<number | null>(null);
  const faqs = [
    { q: "Where is the best cosmetics store in Owerri?", a: "Splendid Empire Cosmetics is Owerri's most trusted beauty store, located at Shop D, World Centre, by IMSU Junction, 470 Works Layout, Owerri, Imo State. We stock authentic imported foundations, serums, lipsticks, moisturizers, eyeliners, and perfumes — all carefully selected for Nigerian skin tones." },
    { q: "Do you offer same-day delivery in Owerri?", a: "Yes. We offer same-day delivery within Owerri on orders placed before 5pm, and next-day delivery to Port Harcourt and other parts of Imo State. Message us on WhatsApp at +2348104748683 to arrange delivery." },
    { q: "Are your products genuine foreign brands?", a: "Yes. Every product at Splendid Empire Cosmetics is sourced directly from trusted foreign distributors. We do not stock counterfeits or unverified products. What you see is what you get — real, imported skincare and beauty." },
    { q: "How do I place an order?", a: "Shop directly on our website — add items to your cart, enter your name and WhatsApp number, then make a bank transfer to our Moniepoint account (5224231596 — Splendid Dam Enterprise). Once you notify us on WhatsApp, we verify and start packing immediately. You can also walk into our store in Works Layout, Owerri." },
    { q: "Do you deliver to Port Harcourt?", a: "Yes. We offer next-day delivery to Port Harcourt, and we can arrange shipping to other cities across Nigeria. Contact us on WhatsApp to confirm delivery to your specific location." },
    { q: "What skincare products do you sell?", a: "We sell a full range of imported skincare and beauty products: foundations, concealers, lip glosses, lipsticks, brightening serums, moisturizers, precision eyeliners, and perfumes — all handpicked for Nigerian skin tones and climate. New stock arrives regularly." },
  ];
  return (
    <section style={{ padding: "60px 0", backgroundColor: "#FFF6F3" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ color: "#C9A227", fontSize: 10, letterSpacing: "0.25em", fontWeight: 700, marginBottom: 10 }}>EVERYTHING YOU NEED TO KNOW</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#1A0F0A", marginBottom: 8 }}>Frequently Asked Questions</h2>
          <p style={{ color: "#5C3D2E", fontSize: 13 }}>About Splendid Empire Cosmetics, Owerri</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderRadius: 14, border: "1px solid rgba(201,162,39,0.18)", overflow: "hidden", backgroundColor: open === i ? "#fff" : "rgba(255,255,255,0.6)", transition: "all 0.2s" }}>
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: "#1A0F0A", fontSize: 15, lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: open === i ? "#C9A227" : "rgba(201,162,39,0.12)", color: open === i ? "#fff" : "#C9A227", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, transition: "all 0.2s", transform: open === i ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
              </button>
              {open === i && (
                <div style={{ padding: "0 22px 20px", borderTop: "1px solid rgba(201,162,39,0.1)" }}>
                  <p style={{ color: "#5C3D2E", fontSize: 13, lineHeight: 1.8, marginTop: 14 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 36 }}>
          <p style={{ color: "#5C3D2E", fontSize: 13, marginBottom: 12 }}>Still have a question? We are one message away.</p>
          <a href="https://wa.me/2348104748683" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#25D366", color: "#fff", padding: "12px 24px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textDecoration: "none", boxShadow: "0 8px 20px rgba(37,211,102,0.25)" }}>
            <MessageCircle size={14} /> ASK US ON WHATSAPP
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── SEO SECTION ──────────────────────────────────────────────────────────────
// Visually hidden but fully DOM-rendered for Googlebot.

function SEOSection() {
  return (
    <section aria-label="About Splendid Empire Cosmetics Owerri" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
      <h2>Number One Cosmetics Store in Owerri — Splendid Empire Cosmetics</h2>
      <p>Splendid Empire Cosmetics is the best cosmetics store in Owerri, Imo State, Nigeria. We have served over 1,200 clients across Owerri, Port Harcourt, and Imo State. Our store is at Shop D, World Centre, by IMSU Junction, 470 Works Layout, Owerri 460212. Open Monday to Saturday, 9am to 7pm.</p>
      <h3>Why Splendid Empire Is Owerri Number One Beauty Store</h3>
      <ul>
        <li>Best cosmetics store in Owerri — 5-star rated by over 1,200 clients</li>
        <li>Number one skincare vendor in Owerri, Imo State</li>
        <li>Genuine imported skincare products sourced from trusted foreign distributors</li>
        <li>Same-day cosmetics delivery in Owerri on orders before 5pm</li>
        <li>Next-day delivery to Port Harcourt and across Imo State</li>
        <li>Easy WhatsApp ordering — +2348104748683</li>
        <li>Largest selection of cosmetics in Owerri — foundations, serums, lipsticks, perfumes, eyeliners, moisturizers</li>
        <li>Products curated for Nigerian skin tones and climate</li>
        <li>Trusted by makeup artists and skincare lovers in Owerri</li>
        <li>Located near IMSU Junction, Works Layout — easy to find</li>
      </ul>
      <h3>Buy Foundation in Owerri</h3>
      <p>Looking for the best foundation in Owerri? Splendid Empire Cosmetics stocks full-coverage velvet matte liquid foundations for all Nigerian skin tones. 24-hour wear. Keywords: foundation vendor Owerri, buy foundation Owerri, liquid foundation Owerri, matte foundation Nigeria, full coverage foundation Owerri, foundation for dark skin Owerri, concealer Owerri.</p>
      <h3>Buy Serum in Owerri — Brightening and Anti-Ageing Serums</h3>
      <p>Authentic imported brightening serums in Owerri. 24K gold-infused glow serum with niacinamide, sodium hyaluronate, vitamin C, and collagen. Radiant skin in 7 days. Keywords: serum vendor Owerri, brightening serum Owerri, Vitamin C serum Owerri, niacinamide serum Owerri, glow serum Nigeria, skincare serum delivery Owerri.</p>
      <h3>Buy Lipstick and Lip Gloss in Owerri</h3>
      <p>Matte lipsticks, satin lipsticks, nude lip sets, hydrating lip glosses. All shades suited for Nigerian skin tones. Keywords: lipstick vendor Owerri, lip gloss Owerri, matte lipstick Nigeria, nude lipstick Owerri, buy lipstick Owerri, lip collection Imo State.</p>
      <h3>Buy Moisturizer in Owerri</h3>
      <p>Authentic imported moisturizers with shea butter, aloe vera, squalane, and argan oil. Same-day delivery in Owerri. Keywords: moisturizer Owerri, shea butter cream Owerri, face cream Nigeria, body lotion Owerri, buy moisturizer Owerri.</p>
      <h3>Buy Eyeliner in Owerri</h3>
      <p>Precision waterproof eyeliner, ultra-fine tip, 36-hour wear. Keywords: eyeliner Owerri, waterproof eyeliner Nigeria, eyeliner vendor Owerri, buy eyeliner Owerri, winged eyeliner Nigeria.</p>
      <h3>Buy Perfume in Owerri</h3>
      <p>Authentic imported perfumes in Owerri. Floral musk fragrances, rose jasmine amber. Keywords: perfume shop Owerri, buy perfume Owerri, imported fragrance Owerri, foreign perfume Nigeria, perfume vendor Owerri, fragrance Owerri delivery.</p>
      <h3>Same-Day Cosmetics Delivery in Owerri and Port Harcourt</h3>
      <p>Fastest cosmetics delivery in Owerri. Order before 5pm — delivered same-day to Aladinma, New Owerri, Housing, Works Layout, Ikenegbu, Uratta, Oforola, Akwakuma, Egbeada. Next-day to Port Harcourt. Keywords: cosmetics delivery Owerri, makeup delivery Owerri, skincare delivery Imo State, WhatsApp cosmetics Owerri.</p>
      <h3>Cosmetics Store Near IMSU Works Layout Owerri</h3>
      <p>Nearest best-rated beauty store to IMSU Owerri, Works Layout, World Centre Owerri, Aladinma, New Owerri. Keywords: cosmetics shop near IMSU Owerri, beauty store Works Layout, makeup shop World Centre Owerri, beauty shop Owerri near me.</p>
      <h3>All Owerri Skincare & Cosmetics Keywords</h3>
      <p>cosmetic store owerri, best cosmetics shop in owerri, splendid empire cosmetics owerri, skincare vendor owerri, authentic makeup owerri, beauty shop owerri, foundation owerri, lipstick owerri, serum owerri, perfume owerri, moisturizer owerri, eyeliner owerri, owerri beauty store, works layout cosmetics, imsu junction beauty shop, imo state skincare, buy cosmetics owerri, same day delivery cosmetics owerri, whatsapp cosmetics order owerri, authentic skincare nigeria, nigerian skincare vendor, foreign cosmetics owerri, makeup shop near imsu, skin care products owerri, face foundation owerri, glow serum nigeria, body moisturizer owerri, lip gloss owerri, precision eyeliner nigeria, perfume shop owerri, cosmetics delivery owerri, online cosmetics store nigeria, port harcourt cosmetics delivery, imo state beauty products, imported skincare owerri, foreign beauty products nigeria, best skincare vendor owerri, authentic cosmetics imo state, makeup delivery owerri, beauty products near imsu, cosmetics aladinma owerri, cosmetics new owerri, beauty shop housing owerri, where to buy cosmetics in owerri, cosmetics shop works layout owerri, best foundation for nigerian skin, brightening serum nigeria, buy serum owerri, buy moisturizer owerri, buy perfume owerri, buy lipstick owerri, buy eyeliner owerri, skincare near imsu owerri, best beauty store imo state, genuine cosmetics owerri, trusted cosmetics vendor owerri, imported beauty products nigeria, splendid empire owerri, splendidcosmetics.com.ng, number one beauty store owerri, top cosmetics shop owerri, skincare products owerri nigeria, face cream owerri, lip gloss vendor owerri, matte lipstick owerri, concealer owerri nigeria, buy concealer owerri, nude lipstick owerri, hydrating serum owerri, vitamin c serum owerri, niacinamide serum owerri, collagen serum nigeria, brightening cream owerri, shea butter moisturizer owerri, argan oil cream owerri, waterproof eyeliner owerri, winged eyeliner owerri, floral perfume owerri, musk fragrance owerri, rose perfume nigeria, jasmine perfume owerri, amber fragrance nigeria, cosmetics store near aladinma, beauty shop near new owerri, makeup shop near ikenegbu, cosmetics shop near uratta, beauty products near oforola, cosmetics near akwakuma, skincare near egbeada, beauty shop near owerri municipal, makeup vendor works layout, cosmetics dealer owerri, skincare dealer imo state, beauty products imo state nigeria, online beauty store owerri, fast delivery cosmetics owerri, affordable cosmetics owerri, cheap cosmetics owerri, quality cosmetics owerri, best makeup brand owerri, foreign makeup brands nigeria, imported foundation nigeria, korean skincare nigeria, european cosmetics nigeria, international beauty products owerri, makeup starter kit owerri, skincare routine products owerri, glowing skin products owerri, dark spot corrector owerri, hyperpigmentation treatment owerri, skin brightening products nigeria, even skin tone products owerri, face glow products owerri, foundation for dark skin nigeria, foundation for light skin nigeria, foundation for brown skin owerri, full coverage makeup owerri, light coverage foundation owerri, bb cream owerri, cc cream nigeria, setting powder owerri, beauty influencer owerri, skincare influencer owerri, makeup artist supplies owerri, professional makeup owerri, cosmetics wholesale owerri, cosmetics retail owerri, buy beauty products online nigeria, pay on delivery cosmetics nigeria, whatsapp order beauty products nigeria, splendid empire cosmetics review, splendid empire cosmetics instagram, owerriskincarevendor15, skincare vendor owerri instagram, beauty store imo state instagram</p>
      <address><strong>Splendid Empire Cosmetics — Best Cosmetics Store in Owerri</strong> Shop D, World Centre, By IMSU Junction, 470 Works Layout, Owerri 460212, Imo State, Nigeria. WhatsApp: +2348104748683. Email: obilodoris15@gmail.com. Hours: Monday to Saturday, 9am to 7pm.</address>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function SiteFooter({ onSelectCategory, categories }: { onSelectCategory?: (c: Category) => void; categories?: Category[] }) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  function handleCopyEmail() {
    navigator.clipboard.writeText("obilodoris15@gmail.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer id="contact" style={{ backgroundColor: "#110B09", borderTop: "1px solid rgba(201,162,39, 0.25)", paddingTop: 60, paddingBottom: 28 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 36, marginBottom: 48 }}>
          <div>
            <img src="/logo.jpg" alt="Splendid Empire Cosmetics" style={{ height: 56, width: 56, borderRadius: "50%", objectFit: "cover", marginBottom: 12, border: "2px solid rgba(201,162,39,0.4)" }} />
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, letterSpacing: "0.45em", color: "#C9A227", marginBottom: 16, fontWeight: 600 }}>EMPIRE COSMETICS</div>
            <p style={{ color: "#9A7A6E", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>Premium cosmetics, curated for the modern Nigerian woman. From skincare to fragrance — every product earned its place in our collection.</p>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { href: "https://www.instagram.com/owerriskincarevendor15?igsh=NnN6bW14bzlsNmp2&utm_source=qr", icon: <Instagram size={14} />, label: "Instagram" },
                { href: "https://www.facebook.com/share/1DxNBDKZcb/?mibextid=wwXIfr", icon: <Facebook size={14} />, label: "Facebook" },
                { href: "https://www.tiktok.com/@owerriskincarevendor15?_r=1&_t=ZS-97Rwyw2sb1J", icon: <TikTokIcon size={14} />, label: "TikTok" },
                { href: `https://wa.me/${WHATSAPP_NUMBER}`, icon: <MessageCircle size={14} />, label: "WhatsApp" }
              ].map(({ href, icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: "1px solid rgba(201,162,39, 0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#9A7A6E", textDecoration: "none", transition: "all 0.25s ease"
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "#C9A227";
                    (e.currentTarget as HTMLElement).style.color = "#fff";
                    (e.currentTarget as HTMLElement).style.borderColor = "#C9A227";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(201,162,39, 0.4)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#9A7A6E";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,162,39, 0.25)";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >{icon}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", marginBottom: 20 }}>QUICK LINKS</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Home", "home"], ["Shop Products", "products"], ["Shop Categories", "categories"], ["Find Our Store", "location"], ["Contact Support", "contact"]].map(([l, id]) => (
                <a key={l} href={`#${id}`} 
                  onClick={e => scrollToSection(e, id)}
                  style={{ color: "#9A7A6E", fontSize: 13, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = "#C9A227")}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = "#9A7A6E")}
                >{l}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", marginBottom: 20 }}>CATEGORIES</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(categories?.filter(c => c !== "All") ?? ["Foundation", "Lipstick", "Serum", "Eyeliner", "Moisturizer", "Perfume"]).map(c => (
                <a key={c} href="#products" 
                  onClick={e => {
                    e.preventDefault();
                    if (onSelectCategory) {
                      onSelectCategory(c as Category);
                    }
                    const el = document.getElementById("products");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{ color: "#9A7A6E", fontSize: 13, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = "#C9A227")}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = "#9A7A6E")}
                >{c}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", marginBottom: 20 }}>CONTACT INFORMATION</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ color: "#9A7A6E", fontSize: 13, lineHeight: 1.7, margin: 0 }}>Shop D, World Centre, By IMSU Junction, 470 Works Layout, Owerri 460212, Imo State</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <a href="mailto:obilodoris15@gmail.com" style={{ color: "#9A7A6E", fontSize: 13, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "#9A7A6E"}>
                  obilodoris15@gmail.com
                </a>
                <button onClick={handleCopyEmail} style={{ background: "none", border: "none", color: copiedEmail ? "#22c55e" : "#C9A227", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontWeight: 700 }}>
                  <Copy size={10} /> {copiedEmail ? "COPIED" : "COPY"}
                </button>
              </div>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ color: "#9A7A6E", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 8, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "#9A7A6E"}>
                <MessageCircle size={13} color="#C9A227" /> WhatsApp Support
              </a>
              <p style={{ color: "#C9A227", fontSize: 13, fontWeight: 600, margin: 0 }}>Mon–Sat: 9:00am – 7:00pm</p>
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

// ─── SCROLL PROGRESS BAR ──────────────────────────────────────────────────────

function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      setProgress(scrollPercent);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 99999,
        backgroundColor: "transparent",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #C9A227, #A8841A)",
          transition: "width 0.1s ease",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}

// ─── BACK TO TOP BUTTON ───────────────────────────────────────────────────────

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      style={{
        position: "fixed",
        bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
        right: 16,
        zIndex: 45,
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "#1A0F0A",
        border: "2px solid rgba(201,162,39,0.4)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#C9A227",
        boxShadow: "0 4px 16px rgba(26,15,10,0.3)",
        transition: "all 0.2s",
        animation: "slideUpIn 0.3s ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "#C9A227";
        (e.currentTarget as HTMLElement).style.color = "#fff";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "#1A0F0A";
        (e.currentTarget as HTMLElement).style.color = "#C9A227";
      }}
    >
      <ArrowUp size={20} />
    </button>
  );
}

// ─── CART DRAWER ──────────────────────────────────────────────────────────────

function CartDrawer({ open, cart, total, onClose, onRemove, onQty, onCheckout }: { open: boolean; cart: CartItem[]; total: number; onClose: () => void; onRemove: (id: string) => void; onQty: (id: string, d: number) => void; onCheckout: () => void }) {
  return (
    <div style={{ position: "fixed", top: 0, right: 0, height: "100%", width: "min(420px, 100vw)", zIndex: 50, backgroundColor: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s ease-in-out" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(249,222,218,0.3)" }} className="px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A0F0A" }}>Your Cart</h2>
          {cart.length > 0 && <p style={{ color: "#5C3D2E", fontSize: 12, marginTop: 2 }}>{cart.length} item{cart.length !== 1 ? "s" : ""}</p>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#5C3D2E", borderRadius: 8, display: "flex" }}>
          <X size={20} />
        </button>
      </div>

      {cart.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#5C3D2E" }} className="p-6 sm:p-8">
          <ShoppingBag size={52} style={{ opacity: 0.15 }} />
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 500 }}>Nothing here yet</p>
          <p style={{ fontSize: 13, color: "#9A7A6E", textAlign: "center" }}>Browse the collection and find something you love.</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#C9A227", fontSize: 13, textDecoration: "underline", marginTop: 8 }}>Back to Collection</button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }} className="gap-3 p-3 sm:gap-4 sm:p-5">
            {cart.map(({ product: p, quantity: q }) => (
              <div key={p.id} style={{ display: "flex", background: "linear-gradient(180deg, #FFF8F5 0%, #FFF1EB 100%)", borderRadius: 14, border: "1px solid rgba(249,222,218,0.28)" }} className="gap-3 p-3 sm:gap-4 sm:p-3.5">
                <img src={p.image} alt={p.name} style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0 }} className="h-14 w-14 sm:h-[68px] sm:w-[68px]" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: "#1A0F0A", lineHeight: 1.4, marginBottom: 4 }}>{p.name}</h4>
                  <p style={{ fontFamily: "'Playfair Display', serif", color: "#C9A227", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{fmt(p.price)}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {[{ delta: -1, icon: <Minus size={10} /> }, { delta: 1, icon: <Plus size={10} /> }].map(({ delta, icon }, idx) => (
                      <button key={idx} onClick={() => onQty(p.id, delta)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(201,162,39,0.4)", background: "none", color: "#C9A227", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</button>
                    )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key="q" style={{ fontSize: 13, fontWeight: 700, color: "#1A0F0A", minWidth: 20, textAlign: "center" }}>{q}</span>, el], [] as React.ReactNode[])}
                    <button onClick={() => onRemove(p.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9A7A6E", display: "flex", padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(249,222,218,0.3)", backgroundColor: "#fff" }} className="p-4 sm:p-6">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ color: "#5C3D2E", fontWeight: 500, fontSize: 14 }}>Subtotal</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#C9A227" }} className="text-xl sm:text-2xl">{fmt(total)}</span>
            </div>
            <button onClick={onCheckout} style={{ width: "100%", background: "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)", color: "#fff", border: "none", borderRadius: 999, padding: "16px 20px", fontSize: 12, letterSpacing: "0.2em", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 8px 22px rgba(201,162,39,0.32)" }}>
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

function CheckoutModal({ step, cart, total, orderId, name, phone, email, onName, onPhone, onEmail, onPlace, onWhatsApp, onCopy, copied, onClose, onFinish }: { 
  step: CheckoutStep; cart: CartItem[]; total: number; orderId: string; 
  name: string; phone: string; email: string; 
  onName: (v: string) => void; onPhone: (v: string) => void; onEmail: (v: string) => void; 
  onPlace: () => void; onWhatsApp: () => void; onCopy: () => void; 
  copied: boolean; onClose: () => void; onFinish: () => void;
}) {
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
  const canProceed = name.trim().length >= 2 && phone.trim().replace(/\D/g, "").length >= 10 && isValidEmail(email.trim());
  const emailTouched = email.length > 0;
  const emailError = emailTouched && !isValidEmail(email.trim()) ? "Please enter a valid email address" : "";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }} className="sm:items-center sm:p-4">
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div className="glass" style={{ position: "relative", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 -20px 60px rgba(0,0,0,0.2)", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>

        <div style={{ background: "#C9A227", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: 20, fontWeight: 700 }}>{step === "info" ? "Your Details" : "Complete Your Order"}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "monospace", fontWeight: 700, marginTop: 2 }}>{orderId}</p>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to close? You can return later.")) {
                onClose();
              }
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", display: "flex" }}
            aria-label="Close checkout"
          ><X size={20} /></button>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid rgba(249,222,218,0.3)", flexShrink: 0 }}>
          {[["info", "1. Details"], ["payment", "2. Payment"]].map(([s, label]) => (
            <div key={s} style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontSize: 10, letterSpacing: "0.15em", fontWeight: 700, color: step === s ? "#C9A227" : "#9A7A6E", borderBottom: step === s ? "2px solid #C9A227" : "2px solid transparent", transition: "all 0.2s" }}>{label}</div>
          ))}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: 24 }}>
          {step === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#FFF6F3", borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: "#1A0F0A", fontSize: 14 }}>Your Order</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#C9A227", fontSize: 11, background: "rgba(201,162,39,0.1)", padding: "2px 10px", borderRadius: 999 }}>{orderId}</span>
                </div>
                {cart.map(({ product: p, quantity: q }) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#5C3D2E", padding: "4px 0" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 16 }}>{p.name} × {q}</span>
                    <span style={{ fontWeight: 600, color: "#1A0F0A", flexShrink: 0 }}>{fmt(p.price * q)}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(249,222,218,0.4)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span style={{ color: "#1A0F0A" }}>Total</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", color: "#C9A227", fontSize: 20 }}>{fmt(total)}</span>
                </div>
              </div>

              {[{ label: "Full Name", val: name, set: onName, ph: "Your name", type: "text", ac: "name", im: undefined }, { label: "WhatsApp Number", val: phone, set: onPhone, ph: "08012345678", type: "tel", ac: "tel", im: "numeric" as const }].map(({ label, val, set, ph, type, ac, im }) => (
                <div key={label}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1A0F0A", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</label>
                  <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph} autoComplete={ac} inputMode={im} style={{ width: "100%", border: "1px solid rgba(249,222,218,0.6)", borderRadius: 12, padding: "12px 16px", fontSize: 16, outline: "none", backgroundColor: "#FFF6F3", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1A0F0A", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => onEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  style={{ width: "100%", border: emailError ? "1.5px solid #ef4444" : "1px solid rgba(249,222,218,0.6)", borderRadius: 12, padding: "12px 16px", fontSize: 16, outline: "none", backgroundColor: "#FFF6F3", boxSizing: "border-box" }}
                />
                {emailError && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 6, fontWeight: 600 }}>{emailError}</p>}
                <p style={{ color: "#9A7A6E", fontSize: 11, marginTop: 6 }}>Your order confirmation will be sent here</p>
              </div>

              <button onClick={onPlace} disabled={!canProceed} style={{ width: "100%", background: canProceed ? "#C9A227" : "#d1b8a8", color: "#fff", border: "none", borderRadius: 999, padding: "16px 24px", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, cursor: canProceed ? "pointer" : "not-allowed", boxShadow: canProceed ? "0 6px 20px rgba(201,162,39,0.3)" : "none", transition: "all 0.2s" }}>
                CONTINUE TO PAYMENT →
              </button>
            </div>
          )}

          {step === "payment" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#FFF6F3", borderRadius: 16, padding: 20, textAlign: "center" }}>
                <p style={{ color: "#5C3D2E", fontSize: 12, letterSpacing: "0.1em", marginBottom: 6 }}>TRANSFER EXACTLY</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: "#C9A227", margin: 0 }}>{fmt(total)}</p>
                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,162,39,0.12)", borderRadius: 999, padding: "4px 14px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#C9A227", letterSpacing: "0.1em" }}>USE AS REFERENCE:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1A0F0A", fontSize: 11 }}>{orderId}</span>
                </div>
              </div>

              <div style={{ background: "#1A0F0A", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <h3 style={{ color: "#F9DEDA", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", marginBottom: 4 }}>TRANSFER TO</h3>
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
                    <button onClick={onCopy} style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#4ade80" : "#F9DEDA", display: "flex" }}>
                      {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#9A7A6E", fontSize: 13 }}>Reference</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#F9DEDA", fontSize: 14 }}>{orderId}</span>
                </div>
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: 14, display: "flex", gap: 12 }}>
                <AlertTriangle size={17} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: "#92400e", fontSize: 12, lineHeight: 1.7, margin: 0 }}>Once your transfer is complete, tap below. We'll verify and begin packing your order right away.</p>
              </div>

              <button onClick={onWhatsApp} style={{ width: "100%", background: "#25D366", color: "#fff", border: "none", borderRadius: 999, padding: "16px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 6px 20px rgba(37,211,102,0.3)" }}>
                <MessageCircle size={20} /> NOTIFY US ON WHATSAPP
              </button>

              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#5C3D2E", fontSize: 13, textAlign: "center", padding: 8 }}>
                Close & Back to Collection
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
  const [authed, setAuthed] = useState(() => !!getAdminToken());
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState<AdminTab>("orders");
  const contentRef = useRef<HTMLDivElement>(null);

  function switchTab(t: AdminTab) {
    setTab(t);
    // Always scroll content area back to top when switching tabs
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }

  // Lock body scroll while admin panel is mounted (works on iOS too)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevWidth = document.body.style.width;
    const prevTop = document.body.style.top;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = `-${scrollY}px`;

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.width = prevWidth;
      document.body.style.top = prevTop;
      window.scrollTo(0, scrollY);
    };
  }, []);

  function login() {
    setLoginLoading(true);
    setErr("");
    adminLogin(pw)
      .then(res => {
        if (res.authenticated) {
          setAuthed(true);
          setErr("");
          fetchOrders()
            .then(data => setOrders(data.map((o: any) => ({ ...o, status: o.status as OrderStatus }))))
            .catch(() => {});
        } else {
          setErr("Incorrect password. Try again.");
        }
      })
      .catch(() => {
        setErr("Login failed. Please check your connection and try again.");
      })
      .finally(() => setLoginLoading(false));
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#1A0F0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Raleway', sans-serif", position: "relative", overflow: "hidden" }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -120, right: -80, width: 400, height: 400, background: "radial-gradient(circle, rgba(201,162,39,0.12) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 350, height: 350, background: "radial-gradient(circle, rgba(249,222,218,0.07) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ borderRadius: 24, padding: "44px 40px", width: "100%", maxWidth: 400, boxShadow: "0 0 0 1px rgba(201,162,39,0.35), 0 24px 64px rgba(0,0,0,0.55)", background: "rgba(30,18,12,0.85)", backdropFilter: "blur(20px)", position: "relative" }}>
          {/* Glow ring */}
          <div style={{ position: "absolute", inset: -1, borderRadius: 25, background: "linear-gradient(135deg, rgba(201,162,39,0.5) 0%, transparent 50%, rgba(201,162,39,0.2) 100%)", zIndex: -1, pointerEvents: "none" }} />

          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <img src="/logo.jpg" alt="Splendid Empire Cosmetics" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", border: "3px solid rgba(201,162,39,0.5)", boxShadow: "0 8px 24px rgba(201,162,39,0.2)", background: "#F9DEDA" }} />
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 9, letterSpacing: "0.45em", color: "#C9A227", marginTop: 4, marginBottom: 20, fontWeight: 600 }}>ADMIN COMMAND CENTRE</div>
            <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(201,162,39,0.5), transparent)", margin: "0 auto" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: "0.2em" }}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !loginLoading && login()}
                  placeholder="Enter admin password"
                  style={{ width: "100%", border: "1px solid rgba(201,162,39,0.3)", borderRadius: 12, padding: "13px 48px 13px 16px", fontSize: 14, outline: "none", backgroundColor: "rgba(255,255,255,0.06)", color: "#fff", boxSizing: "border-box", transition: "border-color 0.2s" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#C9A227")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(201,162,39,0.3)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", padding: 0 }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {err && (
              <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", color: "#fca5a5", fontSize: 12, fontWeight: 600 }}>
                {err}
              </div>
            )}

            <button
              onClick={login}
              disabled={loginLoading}
              style={{ background: loginLoading ? "rgba(201,162,39,0.5)" : "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 12, letterSpacing: "0.2em", fontWeight: 700, cursor: loginLoading ? "not-allowed" : "pointer", boxShadow: loginLoading ? "none" : "0 8px 24px rgba(201,162,39,0.3)", transition: "all 0.2s" }}
            >
              {loginLoading ? "VERIFYING..." : "LOGIN →"}
            </button>

            <button
              onClick={onExit}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 12, letterSpacing: "0.1em", fontWeight: 600, paddingTop: 4 }}
            >
              ← Back to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const statsData: Array<[string, string | number]> = [
    ["Total Orders", orders.length],
    ["Pending", orders.filter(o => o.status === "pending").length],
    ["Confirmed", orders.filter(o => o.status === "confirmed").length],
    ["Dispatched", orders.filter(o => o.status === "dispatched").length],
    ["Revenue", fmt(orders.filter(o => ["verifying", "confirmed", "dispatched", "delivered"].includes(o.status)).reduce((s, o) => s + o.total, 0))],
  ];

  return (
    <div style={{ height: "100dvh", backgroundColor: "#FFF6F3", fontFamily: "'Raleway', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", width: "100%", boxSizing: "border-box" }}>

      {/* ── Sticky Header ── */}
      <div style={{ backgroundColor: "#1A0F0A", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 2px 16px rgba(0,0,0,0.35)", height: 60, width: "100%", boxSizing: "border-box", zIndex: 30, position: "sticky", top: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.jpg" alt="Splendid Empire Cosmetics" style={{ height: 36, width: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(201,162,39,0.5)", background: "#F9DEDA" }} />
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "0.04em", lineHeight: 1 }}>SPLENDID EMPIRE</div>
            <div style={{ color: "#C9A227", fontSize: 8, letterSpacing: "0.4em", fontWeight: 700, marginTop: 2 }}>ADMIN</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={onExit}
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.1em", padding: "8px 14px", borderRadius: 8, transition: "all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
          >
            <Eye size={13} /> VIEW STORE
          </button>
          <button
            onClick={() => {
              if (window.confirm("Log out of admin panel?")) {
                adminLogout(); setAuthed(false); setPw(""); onExit();
              }
            }}
            style={{ background: "rgba(201,162,39,0.15)", border: "1px solid rgba(201,162,39,0.3)", cursor: "pointer", color: "#C9A227", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.1em", padding: "8px 14px", borderRadius: 8, transition: "all 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,162,39,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,162,39,0.15)"; }}
          >
            <LogOut size={13} /> LOGOUT
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(249,222,218,0.25)", padding: "12px 16px", width: "100%", boxSizing: "border-box", flexShrink: 0, position: "sticky", top: 0, zIndex: 15 }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
          {statsData.map(([label, value]) => (
            <div key={label} style={{ background: "#fff", borderRadius: 14, padding: "12px 20px", textAlign: "center", boxShadow: "0 1px 6px rgba(201,162,39,0.08)", border: "1px solid rgba(249,222,218,0.2)", flexShrink: 0, minWidth: 110 }}>
              <div style={{ fontSize: 9, color: "#9A7A6E", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>{label}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: label === "Revenue" ? "#C9A227" : "#1A0F0A", fontSize: label === "Revenue" ? 16 : 22, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(249,222,218,0.25)", width: "100%", boxSizing: "border-box", overflowX: "auto", flexShrink: 0, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 16px", display: "flex" }}>
          {([["orders", "Orders"], ["products", "Products"], ["categories", "Categories"], ["security", "Security"]] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                padding: "14px 20px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                border: "none",
                borderBottom: tab === t ? "2px solid #C9A227" : "2px solid transparent",
                background: "transparent",
                color: tab === t ? "#C9A227" : "#9A7A6E",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: -1,
                whiteSpace: "nowrap",
              }}
            >
              {label.toUpperCase()}
              {t === "orders" && pendingCount > 0 && (
                <span style={{ background: "#C9A227", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, lineHeight: 1.4 }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content — scrolls independently ── */}
      <div ref={contentRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "28px 16px 60px", boxSizing: "border-box" }}>
          {tab === "orders" && <AdminOrders orders={orders} setOrders={setOrders} />}
          {tab === "products" && <AdminProducts products={products} setProducts={setProducts} />}
          {tab === "categories" && <AdminCategories products={products} setProducts={setProducts} />}
          {tab === "security" && <AdminSecurity />}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN SECURITY ───────────────────────────────────────────────────────────

function AdminSecurity() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function handleChange(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPw.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirm) {
      setError("New passwords don't match.");
      return;
    }

    setLoading(true);
    changeAdminPassword(current, newPw)
      .then(() => {
        setSuccess("Password changed! You'll need to log in again next time.");
        setCurrent("");
        setNewPw("");
        setConfirm("");
      })
      .catch(err => setError(err.message || "Something went wrong."))
      .finally(() => setLoading(false));
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A0F0A", marginBottom: 8 }}>Change Admin Password</h2>
      <p style={{ color: "#9A7A6E", fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
        Enter your current password, then choose a new one. You can do this anytime from your phone — no need to go to the server dashboard.
      </p>

      <form onSubmit={handleChange} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {[
          { label: "Current Password", val: current, set: setCurrent, ph: "Enter current password" },
          { label: "New Password", val: newPw, set: setNewPw, ph: "At least 6 characters" },
          { label: "Confirm New Password", val: confirm, set: setConfirm, ph: "Repeat new password" },
        ].map(({ label, val, set, ph }) => (
          <div key={label}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1A0F0A", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</label>
            <input
              type="password"
              value={val}
              onChange={e => set(e.target.value)}
              placeholder={ph}
              required
              style={{ width: "100%", border: "1px solid rgba(249,222,218,0.6)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", backgroundColor: "#FFF6F3", boxSizing: "border-box" }}
            />
          </div>
        ))}

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", color: "#16a34a", fontSize: 13, fontWeight: 600 }}>
            ✓ {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ background: loading ? "#d1b8a8" : "#C9A227", color: "#fff", border: "none", borderRadius: 999, padding: "14px 24px", fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 6px 20px rgba(201,162,39,0.3)", transition: "all 0.2s" }}
        >
          {loading ? "SAVING..." : "UPDATE PASSWORD"}
        </button>
      </form>
    </div>
  );
}

// ─── ADMIN ORDERS ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<OrderStatus, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#854d0e", icon: <Clock size={11} /> },
  verifying: { label: "Verifying", bg: "#dbeafe", color: "#1d4ed8", icon: <Eye size={11} /> },
  confirmed: { label: "Confirmed", bg: "#dcfce7", color: "#15803d", icon: <Check size={11} /> },
  dispatched: { label: "Dispatched", bg: "#f3e8ff", color: "#7e22ce", icon: <Truck size={11} /> },
  delivered: { label: "Delivered", bg: "#fce7f3", color: "#be185d", icon: <Heart size={11} /> },
};
const NEXT: Record<OrderStatus, OrderStatus | null> = { pending: "verifying", verifying: "confirmed", confirmed: "dispatched", dispatched: "delivered", delivered: null };
const NEXT_LABEL: Record<OrderStatus, string | null> = { pending: "Mark Verifying", verifying: "Approve Payment ✓", confirmed: "Mark Dispatched", dispatched: "Mark Delivered 📦", delivered: null };

function AdminOrders({ orders, setOrders }: { orders: Order[]; setOrders: React.Dispatch<React.SetStateAction<Order[]>> }) {
  const [filterStatus, setFilterStatus] = useState<"All" | OrderStatus>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [advanceToast, setAdvanceToast] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders()
        .then(data => { setOrders(data.map((o: any) => ({ ...o, status: o.status as OrderStatus }))); setLastRefresh(new Date()); })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  function manualRefresh() {
    setRefreshing(true);
    fetchOrders()
      .then(data => { setOrders(data.map((o: any) => ({ ...o, status: o.status as OrderStatus }))); setLastRefresh(new Date()); })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }

  function showToast(msg: string) {
    setAdvanceToast(msg);
    setTimeout(() => setAdvanceToast(null), 2500);
  }

  function advance(id: string) {
    const o = orders.find(ord => ord.id === id);
    if (!o) return;
    const n = NEXT[o.status];
    if (!n) return;

    updateOrderStatus(id, n)
      .then(updated => {
        const typedUpdated = { ...updated, status: updated.status as OrderStatus };
        setOrders(prev => prev.map(item => item.id === id ? typedUpdated : item));
        showToast(`✔ Order ${id} → ${STATUS_CFG[n].label}`);
      })
      .catch(err => {
        console.error("Failed to update order status:", err);
        showToast(`⚠ Update failed — retrying locally`);
        setOrders(prev => prev.map(item => item.id === id ? { ...item, status: n } : item));
      });
  }

  function waCustomer(o: Order) {
    const msgs: Record<OrderStatus, string> = {
      pending: `Hi ${o.customerName}! 👋\n\nWe received your order *${o.id}* (${fmt(o.total)}). Kindly send your payment proof to this number so we can verify and confirm your order.\n\n— Splendid Empire Cosmetics`,
      verifying: `Hi ${o.customerName}! 🔍\n\nWe’re currently verifying your payment for order *${o.id}* (${fmt(o.total)}). We’ll confirm shortly.\n\n— Splendid Empire Cosmetics`,
      confirmed: `Hi ${o.customerName}, great news! ✨\n\nYour payment for order *${o.id}* (${fmt(o.total)}) has been received and confirmed. We’re packing your items now and will dispatch shortly.\n\nThank you for shopping with Splendid Empire Cosmetics. 🛍️`,
      dispatched: `Hi ${o.customerName}! 🚚\n\nYour order *${o.id}* is on its way. You’ll receive it very soon.\n\nFor any questions, just reply here. — Splendid Empire Cosmetics`,
      delivered: `Hi ${o.customerName}! ❤️\n\nWe hope you love your items from order *${o.id}*. Thank you for choosing Splendid Empire Cosmetics! We’d love your review. 😊`,
    };
    window.open(`https://wa.me/${o.phone.replace(/^0/, "234").replace(/\D/g, "")}?text=${encodeURIComponent(msgs[o.status])}`, "_blank");
  }

  const filterOptions: Array<"All" | OrderStatus> = ["All", "pending", "verifying", "confirmed", "dispatched", "delivered"];
  const filterLabels: Record<string, string> = { All: "All", pending: "Pending", verifying: "Verifying", confirmed: "Confirmed", dispatched: "Dispatched", delivered: "Delivered" };

  const displayOrders = (filterStatus === "All" ? orders : orders.filter(o => o.status === filterStatus))
    .filter(o => !searchTerm ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.phone.includes(searchTerm) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (orders.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#5C3D2E" }}>
        <Package size={52} style={{ margin: "0 auto 16px", opacity: 0.15 }} />
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, marginBottom: 8, color: "#1A0F0A" }}>No orders yet</p>
        <p style={{ fontSize: 13, color: "#9A7A6E" }}>New orders will appear here the moment a customer checks out.</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Advance toast */}
      {advanceToast && (
        <div style={{ position: "fixed", top: "calc(70px + env(safe-area-inset-top, 0px))", right: 16, zIndex: 999, background: "#1A0F0A", color: "#fff", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, boxShadow: "0 6px 20px rgba(0,0,0,0.3)", border: "1px solid rgba(201,162,39,0.4)", animation: "slideUpIn 0.3s ease" }}>
          {advanceToast}
        </div>
      )}

      {/* Search + refresh row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} color="#9A7A6E" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone or order ID…"
            style={{ width: "100%", border: "1px solid rgba(201,162,39,0.25)", borderRadius: 10, padding: "10px 12px 10px 34px", fontSize: 13, outline: "none", backgroundColor: "#fff", boxSizing: "border-box", color: "#1A0F0A" }}
          />
        </div>
        <button
          onClick={manualRefresh}
          title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "#fff", border: "1px solid rgba(201,162,39,0.25)", borderRadius: 10, cursor: "pointer", color: "#C9A227", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} /> REFRESH
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {filterOptions.map(status => {
          const count = status === "All" ? orders.length : orders.filter(o => o.status === status).length;
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                border: `1px solid ${isActive ? "#C9A227" : "rgba(201,162,39,0.25)"}`,
                background: isActive ? "#C9A227" : "#fff",
                color: isActive ? "#fff" : "#9A7A6E",
                cursor: "pointer",
                transition: "all 0.18s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {filterLabels[status]}
              <span style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(201,162,39,0.12)", color: isActive ? "#fff" : "#C9A227", borderRadius: 999, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {displayOrders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9A7A6E" }}>
          <Package size={36} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
          <p style={{ fontSize: 14, fontWeight: 600 }}>No {filterStatus} orders</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {displayOrders.map(o => {
            const cfg = STATUS_CFG[o.status];
            const btn = NEXT_LABEL[o.status];
            return (
              <div key={o.id} style={{ backgroundColor: "#fff", borderRadius: 20, border: "1px solid rgba(249,222,218,0.2)", overflow: "hidden", boxShadow: "0 2px 16px rgba(201,162,39,0.07)" }}>
                <div style={{ padding: "20px 22px" }}>

                  {/* Top row: ID + status badge + date */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#C9A227", fontSize: 14, letterSpacing: "0.05em" }}>{o.id}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: cfg.bg, color: cfg.color, padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <span style={{ color: "#9A7A6E", fontSize: 11, fontWeight: 600 }}>{o.createdAt.toLocaleString("en-NG")}</span>
                  </div>

                  {/* Middle row: customer info */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1A0F0A", fontSize: 18, lineHeight: 1.2, marginBottom: 4 }}>{o.customerName}</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span style={{ color: "#5C3D2E", fontSize: 13, fontWeight: 600 }}>{o.phone}</span>
                      {o.email && <span style={{ color: "#9A7A6E", fontSize: 12 }}>{o.email}</span>}
                    </div>
                  </div>

                  {/* Items row */}
                  <div style={{ backgroundColor: "#FFF6F3", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
                    {o.items.map(({ product: p, quantity: q }) => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid rgba(201,162,39,0.07)" }}>
                        <span style={{ color: "#5C3D2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 16 }}>{p.name} <span style={{ color: "#9A7A6E" }}>×{q}</span></span>
                        <span style={{ color: "#1A0F0A", fontWeight: 600, flexShrink: 0 }}>{fmt(p.price * q)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total + action buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, color: "#C9A227" }}>{fmt(o.total)}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} className="flex-col sm:flex-row">
                      {btn && (
                        <button
                          onClick={() => advance(o.id)}
                          style={{ background: "linear-gradient(135deg, #C9A227 0%, #A8841A 100%)", color: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", fontSize: 12, fontWeight: 700, cursor: "pointer", minHeight: 44, letterSpacing: "0.04em", boxShadow: "0 4px 14px rgba(201,162,39,0.25)", transition: "opacity 0.2s" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                        >
                          {btn}
                        </button>
                      )}
                      {o.status !== "delivered" && (
                        <button
                          onClick={() => waCustomer(o)}
                          style={{ display: "flex", alignItems: "center", gap: 8, background: "#25D366", color: "#fff", border: "none", borderRadius: 999, padding: "11px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", minHeight: 44, boxShadow: "0 4px 14px rgba(37,211,102,0.2)", transition: "opacity 0.2s" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                        >
                          <MessageCircle size={14} /> WhatsApp Customer
                        </button>
                      )}
                    </div>
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

// ─── ADMIN CATEGORIES ─────────────────────────────────────────────────────────

function AdminCategories({ products, setProducts }: { products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>> }) {
  const [newCat, setNewCat] = useState("");
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  function flash(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  }

  function handleAdd() {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) { flash("err", `"${trimmed}" already exists.`); return; }
    // Category is stored on products — adding it means it'll appear once a product uses it.
    // We'll mark it by creating a placeholder that the admin can see and delete if unused.
    flash("ok", `Category "${trimmed}" is ready. Assign it to a product in the Products tab.`);
    setNewCat("");
  }

  function startRename(cat: string) {
    setRenamingCat(cat);
    setRenameVal(cat);
  }

  function commitRename(cat: string) {
    const trimmed = renameVal.trim();
    if (!trimmed || trimmed === cat) { setRenamingCat(null); return; }
    if (categories.includes(trimmed)) { flash("err", `"${trimmed}" already exists.`); return; }
    // Update all products in this category
    const toUpdate = products.filter(p => p.category === cat);
    Promise.all(toUpdate.map(p => updateProduct(p.id, { category: trimmed })))
      .then(() => {
        setProducts(prev => prev.map(p => p.category === cat ? { ...p, category: trimmed } : p));
        flash("ok", `Renamed "${cat}" → "${trimmed}" across ${toUpdate.length} product(s).`);
      })
      .catch(() => flash("err", "Failed to rename. Please try again."))
      .finally(() => setRenamingCat(null));
  }

  function handleDelete(cat: string) {
    const count = products.filter(p => p.category === cat).length;
    if (count > 0) {
      flash("err", `Cannot delete — ${count} product(s) are in "${cat}". Reassign them first.`);
      return;
    }
    flash("ok", `"${cat}" removed. It had no products.`);
  }

  const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#5C3D2E", marginBottom: 6, letterSpacing: "0.15em", textTransform: "uppercase" };
  const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid rgba(249,222,218,0.6)", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", backgroundColor: "#FFF6F3", boxSizing: "border-box" };

  return (
    <div style={{ paddingBottom: 48, maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A0F0A", margin: 0 }}>Manage Categories</h2>
        <p style={{ color: "#9A7A6E", fontSize: 12, margin: "4px 0 0" }}>Add, rename, or remove product categories</p>
      </div>

      {/* Quick Add Category */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid rgba(249,222,218,0.2)", marginBottom: 24, boxShadow: "0 2px 12px rgba(201,162,39,0.06)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#5C3D2E", marginBottom: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>Quick Add Category</label>
            <input
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Type new category name..."
              style={{ width: "100%", border: "1px solid rgba(249,222,218,0.6)", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", backgroundColor: "#FFF6F3", boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={handleAdd}
            style={{ padding: "10px 20px", background: "#C9A227", color: "#fff", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", height: 42 }}
          >
            ADD
          </button>
        </div>
      </div>

      {/* Informative helper on how categories work */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid rgba(249,222,218,0.2)", marginBottom: 24, boxShadow: "0 2px 12px rgba(201,162,39,0.06)", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ fontSize: 20, marginTop: 2 }}>💡</div>
        <div>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1A0F0A", marginBottom: 4 }}>Tip:</h4>
          <p style={{ color: "#9A7A6E", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            You can also create categories directly when adding products in the <strong>Products</strong> tab.
          </p>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.type === "ok" ? "#86efac" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", color: msg.type === "ok" ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {msg.type === "ok" ? "✓ " : "⚠ "}{msg.text}
        </div>
      )}

      {/* Category list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {categories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9A7A6E", fontSize: 13 }}>No categories yet. Add products to create categories.</div>
        ) : (
          categories.map(cat => {
            const count = products.filter(p => p.category === cat).length;
            const isRenaming = renamingCat === cat;
            return (
              <div key={cat} style={{ background: "#fff", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(249,222,218,0.2)", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 6px rgba(201,162,39,0.06)" }}>
                <div style={{ flex: 1 }}>
                  {isRenaming ? (
                    <input
                      value={renameVal}
                      autoFocus
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") commitRename(cat); if (e.key === "Escape") setRenamingCat(null); }}
                      style={{ ...inputStyle, padding: "6px 10px", fontSize: 14, fontWeight: 700 }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1A0F0A", fontSize: 15 }}>{cat}</span>
                      <span style={{ background: "#FFF0EB", color: "#C9A227", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", padding: "3px 10px", borderRadius: 999 }}>{count} PRODUCT{count !== 1 ? "S" : ""}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {isRenaming ? (
                    <>
                      <button onClick={() => commitRename(cat)} style={{ padding: "7px 14px", background: "#C9A227", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>SAVE</button>
                      <button onClick={() => setRenamingCat(null)} style={{ padding: "7px 12px", background: "#FFF6F3", border: "1px solid rgba(201,162,39,0.3)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#5C3D2E" }}>CANCEL</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startRename(cat)} style={{ padding: "7px 12px", background: "#FFF6F3", border: "1px solid rgba(201,162,39,0.2)", borderRadius: 8, cursor: "pointer", color: "#5C3D2E", display: "flex", alignItems: "center", justifyContent: "center" }} title="Rename">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(cat)} style={{ padding: "7px 12px", background: "#fff1f2", border: "1px solid #fecaca", borderRadius: 8, cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── ADMIN PRODUCTS ───────────────────────────────────────────────────────────

type PForm = { name: string; category: Exclude<Category, "All">; price: string; image: string; images: string[]; videoUrl: string; description: string; badge: string; inStock: boolean };
const EMPTY: PForm = { name: "", category: "Foundation", price: "", image: "", images: [], videoUrl: "", description: "", badge: "", inStock: true };

function AdminProducts({ products, setProducts }: { products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>> }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PForm>(EMPTY);
  const [fErr, setFErr] = useState("");
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [customCatInput, setCustomCatInput] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  // Derive unique categories from existing products
  const existingCategories = Array.from(new Set(products.map(p => p.category))).sort();

  function openAdd() { setForm(EMPTY); setEditId(null); setFErr(""); setShowForm(true); }
  function openEdit(p: Product) { setForm({ name: p.name, category: p.category, price: String(p.price), image: p.image, images: p.images ?? [], videoUrl: p.videoUrl ?? "", description: p.description, badge: p.badge || "", inStock: p.inStock }); setEditId(p.id); setFErr(""); setShowForm(true); }

  async function handleSlotUpload(e: React.ChangeEvent<HTMLInputElement>, slot: number) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowedTypes.includes(file.type)) { setFErr("Please upload a JPEG, PNG, or WebP image."); return; }
    if (file.size > 15 * 1024 * 1024) { setFErr("Image is too large. Max 15MB."); return; }

    setUploadingSlot(slot);
    setFErr("");
    try {
      const url = await cloudinaryUpload(file);
      if (slot === 0) {
        setForm(f => ({ ...f, image: url }));
      } else {
        setForm(f => {
          const next = [...f.images];
          next[slot - 1] = url;
          return { ...f, images: next };
        });
      }
    } catch (err: any) {
      setFErr(err.message || "Upload failed. Please try again.");
    } finally {
      setUploadingSlot(null);
    }
  }

  function removeSlot(slot: number) {
    if (slot === 0) {
      setForm(f => ({ ...f, image: "" }));
    } else {
      setForm(f => {
        const next = [...f.images];
        next[slot - 1] = "";
        return { ...f, images: next };
      });
    }
  }

  function save() {
    if (!form.name.trim()) { setFErr("Product name is required."); return; }
    if (!form.price || isNaN(Number(form.price))) { setFErr("Enter a valid price."); return; }
    if (form.videoUrl.trim() && !form.videoUrl.trim().startsWith("https://")) {
      setFErr("Video URL must start with https://");
      return;
    }

    if (editId) {
      const updateData = {
        name: form.name.trim(),
        category: form.category,
        price: Number(form.price),
        image: form.image.trim() || "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=500&h=500&fit=crop",
        images: form.images.filter(u => u.trim()),
        videoUrl: form.videoUrl.trim() || undefined,
        description: form.description.trim(),
        badge: form.badge.trim() || undefined,
        inStock: form.inStock
      };
      updateProduct(editId, updateData)
        .then(updated => { setProducts(prev => prev.map(p => p.id === editId ? { ...p, ...updated } : p)); setShowForm(false); setEditId(null); setFErr(""); })
        .catch(() => setFErr("Failed to update product. Please try again."));
    } else {
      const createData = {
        id: "",
        name: form.name.trim(),
        category: form.category,
        price: Number(form.price),
        image: form.image.trim() || "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=500&h=500&fit=crop",
        images: form.images.filter(u => u.trim()),
        videoUrl: form.videoUrl.trim() || undefined,
        description: form.description.trim(),
        badge: form.badge.trim() || undefined,
        inStock: form.inStock,
        rating: 4.8,
        reviews: 0
      };
      createProduct(createData)
        .then(created => { setProducts(prev => [created, ...prev]); setShowForm(false); setEditId(null); setFErr(""); })
        .catch(() => setFErr("Failed to add product. Please try again."));
    }
  }

  function del(id: string) {
    deleteProduct(id)
      .then(() => { setProducts(prev => prev.filter(p => p.id !== id)); setConfirmDeleteId(null); })
      .catch(() => { setConfirmDeleteId(null); alert("Failed to delete product. Please try again."); });
  }

  function toggle(id: string) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    updateProduct(id, { inStock: !p.inStock })
      .then(updated => setProducts(prev => prev.map(item => item.id === id ? { ...item, inStock: updated.inStock } : item)))
      .catch(() => {});
  }

  function sf(k: keyof PForm) { return (v: string | boolean) => setForm(f => ({ ...f, [k]: v })); }

  const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid rgba(249,222,218,0.6)", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", backgroundColor: "#FFF6F3", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#5C3D2E", marginBottom: 6, letterSpacing: "0.15em", textTransform: "uppercase" };

  // Build slot data: [main, extra0, extra1, extra2]
  const slots = [
    { label: "Main", url: form.image },
    { label: "Image 2", url: form.images[0] ?? "" },
    { label: "Image 3", url: form.images[1] ?? "" },
    { label: "Image 4", url: form.images[2] ?? "" },
  ];

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#1A0F0A", margin: 0 }}>{products.length} Products</h2>
          <p style={{ color: "#9A7A6E", fontSize: 12, margin: "4px 0 0" }}>Manage your store inventory</p>
        </div>
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #C9A227, #A8841A)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(201,162,39,0.3)", letterSpacing: "0.05em" }}>
          <Plus size={15} /> ADD PRODUCT
        </button>
      </div>

      {/* Full-screen modal overlay for Add/Edit */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          className="sm:items-center sm:p-4"
          onTouchMove={e => e.preventDefault()} // prevent background scroll on mobile
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(26,15,10,0.7)", backdropFilter: "blur(6px)" }} onClick={() => {
            if (window.confirm("Discard unsaved changes?")) setShowForm(false);
          }} onTouchMove={e => e.preventDefault()} />
          <div
            style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 640, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 -20px 60px rgba(0,0,0,0.3)", overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}
            className="sm:rounded-3xl"
            onTouchMove={e => e.stopPropagation()} // allow scroll inside modal
          >
            {/* Modal Header */}
            <div style={{ background: "#1A0F0A", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderRadius: "24px 24px 0 0" }}>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>{editId ? "Edit Product" : "Add New Product"}</h3>
                <p style={{ color: "#C9A227", fontSize: 11, margin: "4px 0 0", letterSpacing: "0.1em" }}>SPLENDID EMPIRE COSMETICS</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }} className="sm:padding-24">
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }} className="sm:grid-cols-2">
                <div style={{ gridColumn: "1 / -1" }}>
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
                    {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input value={customCatInput} onChange={e => setCustomCatInput(e.target.value)} placeholder="Or type new category..." style={{ ...inputStyle, flex: 1 }} />
                    <button type="button" onClick={() => { const t = customCatInput.trim(); if (t) { sf("category")(t); setCustomCatInput(""); } }} style={{ padding: "10px 14px", background: "#C9A227", color: "#fff", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>USE</button>
                  </div>
                  {form.category && !existingCategories.includes(form.category) && (
                    <p style={{ fontSize: 11, color: "#C9A227", marginTop: 6, fontWeight: 600 }}>✦ New category: "{form.category}"</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Badge (optional)</label>
                  <input value={form.badge} onChange={e => sf("badge")(e.target.value)} placeholder="e.g. NEW, HOT, BESTSELLER" style={inputStyle} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#1A0F0A" }}>In Stock</label>
                  <button type="button" onClick={() => sf("inStock")(!form.inStock)} style={{ width: 52, height: 28, borderRadius: 999, background: form.inStock ? "#C9A227" : "#d1d5db", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 3, width: 22, height: 22, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s", left: form.inStock ? 27 : 3 }} />
                  </button>
                  <span style={{ fontSize: 12, color: form.inStock ? "#15803d" : "#dc2626", fontWeight: 700 }}>{form.inStock ? "In Stock" : "Out of Stock"}</span>
                </div>
              </div>

              {/* ── Image Slots Grid ── */}
              <div>
                <label style={labelStyle}>Product Photos (tap to upload from gallery)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {slots.map((slot, slotIdx) => {
                    const isUploading = uploadingSlot === slotIdx;
                    const isMain = slotIdx === 0;
                    return (
                      <div key={slotIdx} style={{ position: "relative" }}>
                        {/* Hidden file input */}
                        <input
                          id={`img-slot-${slotIdx}`}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                          onChange={e => handleSlotUpload(e, slotIdx)}
                          disabled={uploadingSlot !== null}
                          style={{ display: "none" }}
                        />
                        <label
                          htmlFor={`img-slot-${slotIdx}`}
                          style={{
                            display: "block",
                            aspectRatio: "1",
                            borderRadius: 12,
                            overflow: "hidden",
                            border: `2px ${slot.url ? "solid" : "dashed"} ${isMain && !slot.url ? "#C9A227" : "rgba(201,162,39,0.35)"}`,
                            background: slot.url ? "transparent" : "#FFF6F3",
                            cursor: uploadingSlot !== null ? "not-allowed" : "pointer",
                            position: "relative",
                          }}
                        >
                          {slot.url ? (
                            <img src={slot.url} alt={slot.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 8, boxSizing: "border-box" }}>
                              {isUploading ? (
                                <div style={{ width: 24, height: 24, border: "3px solid rgba(201,162,39,0.2)", borderTopColor: "#C9A227", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                              ) : (
                                <>
                                  <div style={{ fontSize: 22 }}>📷</div>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: "#9A7A6E", textAlign: "center", letterSpacing: "0.05em" }}>{isMain ? "MAIN PHOTO" : slot.label.toUpperCase()}</span>
                                </>
                              )}
                            </div>
                          )}
                          {/* Uploading overlay on filled slot */}
                          {isUploading && slot.url && (
                            <div style={{ position: "absolute", inset: 0, background: "rgba(26,15,10,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            </div>
                          )}
                        </label>

                        {/* Remove button */}
                        {slot.url && !isUploading && (
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); removeSlot(slotIdx); }}
                            aria-label={`Remove ${slot.label}`}
                            style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(26,15,10,0.75)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}
                          >
                            <X size={11} color="#fff" />
                          </button>
                        )}

                        {/* Main badge */}
                        {isMain && (
                          <span style={{ position: "absolute", bottom: 6, left: 6, background: "#C9A227", color: "#fff", fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 999, letterSpacing: "0.08em", pointerEvents: "none" }}>MAIN</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: "#9A7A6E", marginTop: 8, lineHeight: 1.5 }}>Tap any slot to pick a photo from your device. Auto-cropped to a clean square.</p>
              </div>

              {/* Social Video URL */}
              <div>
                <label style={labelStyle}>Instagram Reel or TikTok URL (optional)</label>
                <input
                  value={form.videoUrl}
                  onChange={e => sf("videoUrl")(e.target.value)}
                  placeholder="https://www.instagram.com/reel/... or https://www.tiktok.com/..."
                  style={{ ...inputStyle, borderColor: form.videoUrl && !form.videoUrl.startsWith("https://") ? "#fca5a5" : undefined }}
                />
                {form.videoUrl && !form.videoUrl.startsWith("https://") && (
                  <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6, fontWeight: 600 }}>Video URL must start with https://</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} onChange={e => sf("description")(e.target.value)} placeholder="Short product description..." rows={3} style={{ ...inputStyle, resize: "none" }} />
              </div>

              {fErr && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{fErr}</div>}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(249,222,218,0.2)", display: "flex", gap: 12, flexShrink: 0, paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
              <button onClick={save} disabled={uploadingSlot !== null} style={{ flex: 1, background: uploadingSlot !== null ? "rgba(201,162,39,0.5)" : "linear-gradient(135deg, #C9A227, #A8841A)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 13, fontWeight: 700, cursor: uploadingSlot !== null ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(201,162,39,0.3)" }}>
                {editId ? "SAVE CHANGES" : "ADD PRODUCT"}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: "14px 20px", background: "#FFF6F3", border: "1px solid rgba(201,162,39,0.3)", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#5C3D2E" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Search + Grid */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={14} color="#9A7A6E" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          value={productSearch}
          onChange={e => setProductSearch(e.target.value)}
          placeholder="Search products by name or category…"
          style={{ width: "100%", border: "1px solid rgba(201,162,39,0.25)", borderRadius: 10, padding: "10px 12px 10px 34px", fontSize: 13, outline: "none", backgroundColor: "#fff", boxSizing: "border-box", color: "#1A0F0A" }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {products.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
          <div key={p.id} style={{ backgroundColor: "#fff", borderRadius: 20, border: "1px solid rgba(249,222,218,0.2)", overflow: "hidden", boxShadow: "0 2px 16px rgba(201,162,39,0.07)", display: "flex", flexDirection: "column" }}>
            {/* Image */}
            <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", backgroundColor: "#FFF0EB" }}>
              <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {p.badge && (
                <span style={{ position: "absolute", top: 10, left: 10, background: "#C9A227", color: "#fff", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", padding: "4px 10px", borderRadius: 999 }}>{p.badge}</span>
              )}
              <span style={{ position: "absolute", top: 10, right: 10, background: p.inStock ? "rgba(21,128,61,0.9)" : "rgba(220,38,38,0.9)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "4px 8px", borderRadius: 999 }}>
                {p.inStock ? "IN STOCK" : "OUT"}
              </span>
            </div>

            {/* Info */}
            <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ background: "#FFF0EB", color: "#C9A227", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", padding: "3px 10px", borderRadius: 999, alignSelf: "flex-start" }}>{p.category.toUpperCase()}</span>
              <h4 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1A0F0A", fontSize: 14, lineHeight: 1.3, margin: 0 }}>{p.name}</h4>
              <div style={{ fontFamily: "'Playfair Display', serif", color: "#C9A227", fontWeight: 700, fontSize: 16 }}>{fmt(p.price)}</div>
            </div>

            {/* Actions */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(249,222,218,0.15)", display: "flex", gap: 8 }}>
              <button onClick={() => toggle(p.id)} style={{ flex: 1, padding: "10px 8px", minHeight: 44, borderRadius: 8, border: `1px solid ${p.inStock ? "#bbf7d0" : "#fecaca"}`, background: p.inStock ? "#f0fdf4" : "#fff1f2", color: p.inStock ? "#15803d" : "#dc2626", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {p.inStock ? <><Check size={10} /> Stock</> : <><X size={10} /> Restock</>}
              </button>
              <button onClick={() => openEdit(p)} style={{ padding: "10px 12px", minHeight: 44, borderRadius: 8, background: "#FFF6F3", border: "1px solid rgba(201,162,39,0.2)", cursor: "pointer", color: "#5C3D2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Pencil size={13} />
              </button>
              {confirmDeleteId === p.id ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => del(p.id)} style={{ padding: "10px 12px", minHeight: 44, borderRadius: 8, background: "#dc2626", border: "none", cursor: "pointer", color: "#fff", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>YES</button>
                  <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "10px 12px", minHeight: 44, borderRadius: 8, background: "#FFF6F3", border: "1px solid #fecaca", cursor: "pointer", color: "#5C3D2E", fontSize: 10, fontWeight: 700 }}>NO</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(p.id)} style={{ padding: "10px 12px", minHeight: 44, borderRadius: 8, background: "#fff1f2", border: "1px solid #fecaca", cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TOAST CONTAINER ──────────────────────────────────────────────────────────
function ToastContainer({ toasts }: { toasts: { id: number; msg: string }[] }) {
  return (
    <div
      className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:top-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[340px] mx-auto sm:mx-0"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="animate-slideUpIn"
          style={{
            background: "#1A0F0A",
            color: "#fff",
            borderRadius: 12,
            padding: "12px 18px",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 10px 25px rgba(26,15,10,0.15)",
            border: "1px solid rgba(201,162,39,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            pointerEvents: "auto",
          }}
        >
          <div style={{ background: "#C9A227", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Check size={11} color="#fff" />
          </div>
          <span style={{ flex: 1 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

