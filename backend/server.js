import express from "express";
import cors from "cors";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;

// ADMIN_PASSWORD must be set as an environment variable — no hardcoded fallback
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error("FATAL: ADMIN_PASSWORD environment variable is not set.");
  process.exit(1);
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
  origin: [FRONTEND_URL],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ─── IN-MEMORY TOKEN STORE ────────────────────────────────────────────────
// Each token is valid for 8 hours. Stored in memory — clears on server restart.
const activeTokens = new Map(); // token -> expiresAt

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  const expiresAt = activeTokens.get(token);
  if (!expiresAt || Date.now() > expiresAt) {
    activeTokens.delete(token);
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
  next();
}

// ─── PRODUCTS ───────────────────────────────────────────────────────────

app.get("/api/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/products", requireAdminAuth, async (req, res) => {
  try {
    const { id, createdAt, updatedAt, ...data } = req.body;
    const product = await prisma.product.create({
      data: { ...data, price: Number(data.price) },
    });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.patch("/api/products/:id", requireAdminAuth, async (req, res) => {
  try {
    // Strip fields that should never be client-overridable
    const { id, createdAt, updatedAt, ...safeData } = req.body;
    if (safeData.price !== undefined) safeData.price = Number(safeData.price);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: safeData,
    });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", requireAdminAuth, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ─── ORDERS ──────────────────────────────────────────────────────────────

app.get("/api/orders", requireAdminAuth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { customerName, phone, total, items } = req.body;

    // Validate required fields
    if (!customerName || !phone || !total || !items?.length) {
      return res.status(400).json({ error: "Missing required order fields" });
    }

    const order = await prisma.order.create({
      data: {
        customerName,
        phone,
        total: Number(total),
        status: "pending",
        items: {
          create: items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            price: Number(item.product.price),
            quantity: Number(item.quantity),
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

const ALLOWED_STATUSES = ["pending", "verifying", "confirmed", "dispatched"];

app.patch("/api/orders/:id/status", requireAdminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}` });
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: true },
    });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ─── ADMIN AUTH ──────────────────────────────────────────────────────────

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  // Constant-time comparison to prevent timing attacks
  const provided = Buffer.from(password);
  const expected = Buffer.from(ADMIN_PASSWORD);
  const match =
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected);

  if (match) {
    const token = generateToken();
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
    activeTokens.set(token, expiresAt);
    res.json({ authenticated: true, token });
  } else {
    res.status(401).json({ authenticated: false, error: "Invalid password" });
  }
});

app.post("/api/admin/logout", requireAdminAuth, (req, res) => {
  const token = req.headers["authorization"].slice(7);
  activeTokens.delete(token);
  res.json({ success: true });
});

// ─── HEALTH CHECK ────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Splendid Empire API running on port ${PORT}`);
});
