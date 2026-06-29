import express from "express";
import cors from "cors";
import crypto from "crypto";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;

// ─── ENV GUARDS ───────────────────────────────────────────────────────────────

const ADMIN_PASSWORD_ENV = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD_ENV) {
  console.error("FATAL: ADMIN_PASSWORD environment variable is not set.");
  process.exit(1);
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error("FATAL: RESEND_API_KEY environment variable is not set.");
  process.exit(1);
}

const RESEND_FROM = process.env.RESEND_FROM;
if (!RESEND_FROM) {
  console.error("FATAL: RESEND_FROM environment variable is not set.");
  process.exit(1);
}

const RESEND_REPLY_TO = process.env.RESEND_REPLY_TO;
if (!RESEND_REPLY_TO) {
  console.error("FATAL: RESEND_REPLY_TO environment variable is not set.");
  process.exit(1);
}

// ─── BUSINESS CONSTANTS ───────────────────────────────────────────────────────

const BANK_NAME = "Moniepoint";
const BANK_ACCOUNT_NAME = "Splendid Dam Enterprise";
const BANK_ACCOUNT_NUMBER = "5224231596";
const INSTAGRAM_URL = "https://www.instagram.com/owerriskincarevendor15";

// ─── RESEND CLIENT ────────────────────────────────────────────────────────────

const resend = new Resend(RESEND_API_KEY);

// ─── EMAIL HELPERS ────────────────────────────────────────────────────────────

function fmtNaira(n) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildItemRows(items) {
  return items.map(item =>
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(242,184,168,0.2);color:#5C3D2E;font-size:13px;">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(242,184,168,0.2);color:#5C3D2E;font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(242,184,168,0.2);color:#1A0F0A;font-size:13px;font-weight:600;text-align:right;">${fmtNaira(item.price * item.quantity)}</td>
    </tr>`
  ).join("");
}

function emailWrapper(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Splendid Empire Cosmetics</title></head>
<body style="margin:0;padding:0;background-color:#FFF6F3;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF6F3;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(181,120,74,0.12);">
        <!-- HEADER -->
        <tr>
          <td style="background-color:#1A0F0A;padding:28px 32px;text-align:center;">
            <h1 style="font-family:'Playfair Display',Georgia,serif;color:#F2B8A8;font-size:22px;font-weight:700;margin:0;letter-spacing:0.15em;">SPLENDID EMPIRE COSMETICS</h1>
            <p style="color:rgba(242,184,168,0.6);font-size:11px;margin:6px 0 0;letter-spacing:0.1em;">LUXURY BEAUTY · NIGERIA</p>
          </td>
        </tr>
        <!-- BODY -->
        <tr><td style="padding:32px;">${bodyContent}</td></tr>
        <!-- FOOTER -->
        <tr>
          <td style="background-color:#FFF6F3;padding:20px 32px;text-align:center;border-top:1px solid rgba(242,184,168,0.3);">
            <p style="color:#9A7A6E;font-size:11px;margin:0 0 4px;">Questions? Reply to this email for support.</p>
            <a href="mailto:${RESEND_REPLY_TO}" style="color:#B5784A;font-size:11px;text-decoration:none;">${RESEND_REPLY_TO}</a>
            <p style="color:#c4b0a8;font-size:10px;margin:12px 0 0;">© ${new Date().getFullYear()} Splendid Empire Cosmetics. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildConfirmationEmail(order) {
  const itemRows = buildItemRows(order.items);
  const body = `
    <p style="color:#5C3D2E;font-size:14px;margin:0 0 20px;">Hi <strong>${order.customerName}</strong>,</p>
    <p style="color:#5C3D2E;font-size:14px;line-height:1.7;margin:0 0 24px;">Thank you for your order! We've received it and it's being reviewed. Please complete your bank transfer using the details below.</p>

    <div style="background:#FFF6F3;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#9A7A6E;font-size:10px;letter-spacing:0.12em;font-weight:700;margin:0 0 8px;">ORDER REFERENCE</p>
      <p style="font-family:'Courier New',monospace;color:#B5784A;font-size:18px;font-weight:700;margin:0;">${order.id}</p>
      <p style="color:#9A7A6E;font-size:11px;margin:4px 0 0;">Use this exact reference when making your transfer</p>
    </div>

    <p style="color:#1A0F0A;font-size:12px;font-weight:700;letter-spacing:0.08em;margin:0 0 12px;">ORDER SUMMARY</p>
    <div style="overflow-x:auto;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="background:#1A0F0A;color:#F2B8A8;padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-align:left;">ITEM</th>
            <th style="background:#1A0F0A;color:#F2B8A8;padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-align:center;">QTY</th>
            <th style="background:#1A0F0A;color:#F2B8A8;padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-align:right;">PRICE</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px;font-weight:700;color:#1A0F0A;font-size:14px;">Total</td>
            <td style="padding:12px;font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#B5784A;font-size:20px;text-align:right;">${fmtNaira(order.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="background:#1A0F0A;border-radius:12px;padding:20px;margin-top:24px;">
      <p style="color:#F2B8A8;font-size:11px;font-weight:700;letter-spacing:0.12em;margin:0 0 14px;">TRANSFER TO</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="color:#9A7A6E;font-size:13px;padding:4px 0;">Bank</td><td style="color:#fff;font-weight:600;font-size:13px;text-align:right;">${BANK_NAME}</td></tr>
        <tr><td style="color:#9A7A6E;font-size:13px;padding:4px 0;">Account Name</td><td style="color:#fff;font-weight:600;font-size:13px;text-align:right;">${BANK_ACCOUNT_NAME}</td></tr>
        <tr><td style="color:#9A7A6E;font-size:13px;padding:4px 0;">Account Number</td><td style="color:#F2B8A8;font-family:'Courier New',monospace;font-weight:700;font-size:18px;text-align:right;letter-spacing:0.06em;">${BANK_ACCOUNT_NUMBER}</td></tr>
        <tr><td style="color:#9A7A6E;font-size:13px;padding:4px 0;">Reference</td><td style="color:#F2B8A8;font-family:'Courier New',monospace;font-weight:700;font-size:14px;text-align:right;">${order.id}</td></tr>
      </table>
    </div>
    <p style="color:#9A7A6E;font-size:12px;line-height:1.6;margin:20px 0 0;">After your transfer, kindly notify us on WhatsApp and we'll confirm your payment promptly. 🛍️</p>
  `;
  return emailWrapper(body);
}

function buildDispatchEmail(order) {
  const itemRows = buildItemRows(order.items);
  const body = `
    <p style="color:#5C3D2E;font-size:14px;margin:0 0 20px;">Hi <strong>${order.customerName}</strong>,</p>
    <div style="background:linear-gradient(135deg,#B5784A,#8F5731);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="color:#fff;font-size:28px;margin:0 0 8px;">🚚</p>
      <h2 style="font-family:'Playfair Display',Georgia,serif;color:#fff;font-size:20px;font-weight:700;margin:0 0 8px;">Your Glam Package is On Its Way!</h2>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;">Your order <strong>${order.id}</strong> has been dispatched and is heading to you right now.</p>
    </div>

    <p style="color:#5C3D2E;font-size:13px;line-height:1.7;margin:0 0 24px;">We've handed your package over to our delivery team. Expect it very soon. If you have any questions, just reply to this email.</p>

    <p style="color:#1A0F0A;font-size:12px;font-weight:700;letter-spacing:0.08em;margin:0 0 12px;">WHAT'S IN YOUR PACKAGE</p>
    <div style="overflow-x:auto;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="background:#1A0F0A;color:#F2B8A8;padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-align:left;">ITEM</th>
            <th style="background:#1A0F0A;color:#F2B8A8;padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-align:center;">QTY</th>
            <th style="background:#1A0F0A;color:#F2B8A8;padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-align:right;">PRICE</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <p style="color:#9A7A6E;font-size:12px;margin:20px 0 0;">Thank you for shopping with Splendid Empire Cosmetics. ✨</p>
  `;
  return emailWrapper(body);
}

function buildDeliveryEmail(order) {
  const itemRows = buildItemRows(order.items);
  const body = `
    <p style="color:#5C3D2E;font-size:14px;margin:0 0 20px;">Hi <strong>${order.customerName}</strong>,</p>
    <div style="background:#FFF6F3;border:2px solid #B5784A;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="font-size:32px;margin:0 0 8px;">✅</p>
      <h2 style="font-family:'Playfair Display',Georgia,serif;color:#1A0F0A;font-size:20px;font-weight:700;margin:0 0 8px;">Your Order Has Arrived!</h2>
      <p style="color:#5C3D2E;font-size:13px;margin:0;">Order <strong>${order.id}</strong> has been successfully delivered. We hope you love it! 💛</p>
    </div>

    <p style="color:#5C3D2E;font-size:13px;line-height:1.7;margin:0 0 24px;">We'd absolutely love to hear what you think. Your review helps other beauty lovers discover products that are right for them — and it means the world to our small business.</p>

    <div style="overflow-x:auto;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="background:#1A0F0A;color:#F2B8A8;padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-align:left;">ITEM</th>
            <th style="background:#1A0F0A;color:#F2B8A8;padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-align:center;">QTY</th>
            <th style="background:#1A0F0A;color:#F2B8A8;padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-align:right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px;font-weight:700;color:#1A0F0A;font-size:14px;">Total Paid</td>
            <td style="padding:12px;font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#B5784A;font-size:20px;text-align:right;">${fmtNaira(order.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="text-align:center;">
      <a href="${INSTAGRAM_URL}" style="display:inline-block;background:#B5784A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:13px;font-weight:700;letter-spacing:0.1em;">⭐ LEAVE A REVIEW ON INSTAGRAM</a>
    </div>
    <p style="color:#9A7A6E;font-size:12px;line-height:1.6;margin:20px 0 0;text-align:center;">Thank you for being a part of the Splendid Empire family. 🌸</p>
  `;
  return emailWrapper(body);
}

async function sendEmail(to, subject, html) {
  try {
    await resend.emails.send({ from: RESEND_FROM, reply_to: RESEND_REPLY_TO, to, subject, html });
  } catch (err) {
    console.error(`[Email Error] Failed to send "${subject}" to ${to}:`, err?.message || err);
  }
}

// ─── CORS + MIDDLEWARE ────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  "https://splendidcosmetics.com.ng",
  "https://www.splendidcosmetics.com.ng",
  "https://splendid-ecosmetics.vercel.app",
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json({ limit: "50kb" })); // Reject oversized payloads

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

// ─── RATE LIMITERS ────────────────────────────────────────────────────────────

// Strict: admin login — max 10 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate: order creation — max 20 orders per 10 min per IP (stops spam)
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General: all API routes — max 200 requests per min per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: "Too many requests." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", generalLimiter);

// ─── INPUT SANITISATION ────────────────────────────────────────────────────────
function sanitiseString(val, maxLen = 500) {
  if (typeof val !== "string") return val;
  return val.trim().slice(0, maxLen);
}

// ─── IN-MEMORY TOKEN STORE ────────────────────────────────────────────────────
const activeTokens = new Map();

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

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

app.get("/api/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
    const parsed = products.map(p => ({
      ...p,
      images: (() => {
        if (!p.images) return [];
        try { return JSON.parse(p.images); } catch { return []; }
      })(),
    }));
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/products", requireAdminAuth, async (req, res) => {
  try {
    const { id, createdAt, updatedAt, ...data } = req.body;
    if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
      return res.status(400).json({ error: "Product name is required" });
    }
    const price = Number(data.price);
    if (isNaN(price) || price <= 0 || price > 10_000_000) {
      return res.status(400).json({ error: "Invalid price" });
    }
    // Validate images array
    if (data.images !== undefined) {
      const imgs = Array.isArray(data.images) ? data.images : [];
      if (imgs.length > 3) return res.status(400).json({ error: "Extra images must not exceed 3" });
      for (const img of imgs) {
        if (typeof img !== "string" || img.trim().length === 0 || img.length > 2000) {
          return res.status(400).json({ error: "Each image URL must be a non-empty string under 2000 characters" });
        }
      }
      data.images = JSON.stringify(imgs.filter(u => u.trim()));
    }
    // Validate videoUrl
    if (data.videoUrl !== undefined && data.videoUrl !== null && data.videoUrl !== "") {
      if (typeof data.videoUrl !== "string" || data.videoUrl.length > 500) {
        return res.status(400).json({ error: "Invalid video URL" });
      }
      if (!data.videoUrl.startsWith("https://")) {
        return res.status(400).json({ error: "Video URL must start with https://" });
      }
    } else if (data.videoUrl === "") {
      data.videoUrl = null;
    }
    const safeData = {
      ...data,
      name: sanitiseString(data.name, 200),
      category: sanitiseString(data.category, 100),
      description: sanitiseString(data.description, 1000),
      badge: data.badge ? sanitiseString(data.badge, 50) : undefined,
      price,
    };
    const product = await prisma.product.create({ data: safeData });
    res.status(201).json({
      ...product,
      images: (() => { try { return JSON.parse(product.images ?? "[]"); } catch { return []; } })(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.patch("/api/products/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id, createdAt, updatedAt, ...safeData } = req.body;
    if (safeData.price !== undefined) {
      const price = Number(safeData.price);
      if (isNaN(price) || price <= 0) return res.status(400).json({ error: "Invalid price" });
      safeData.price = price;
    }
    if (safeData.name) safeData.name = sanitiseString(safeData.name, 200);
    if (safeData.description) safeData.description = sanitiseString(safeData.description, 1000);
    if (safeData.category) safeData.category = sanitiseString(safeData.category, 100);
    if (safeData.badge) safeData.badge = sanitiseString(safeData.badge, 50);
    // Validate and serialize images
    if (safeData.images !== undefined) {
      const imgs = Array.isArray(safeData.images) ? safeData.images : [];
      if (imgs.length > 3) return res.status(400).json({ error: "Extra images must not exceed 3" });
      for (const img of imgs) {
        if (typeof img !== "string" || img.trim().length === 0 || img.length > 2000) {
          return res.status(400).json({ error: "Each image URL must be a non-empty string under 2000 characters" });
        }
      }
      safeData.images = JSON.stringify(imgs.filter(u => u.trim()));
    }
    // Validate videoUrl
    if (safeData.videoUrl !== undefined && safeData.videoUrl !== null && safeData.videoUrl !== "") {
      if (typeof safeData.videoUrl !== "string" || safeData.videoUrl.length > 500) {
        return res.status(400).json({ error: "Invalid video URL" });
      }
      if (!safeData.videoUrl.startsWith("https://")) {
        return res.status(400).json({ error: "Video URL must start with https://" });
      }
    } else if (safeData.videoUrl === "") {
      safeData.videoUrl = null;
    }
    const product = await prisma.product.update({ where: { id: req.params.id }, data: safeData });
    res.json({
      ...product,
      images: (() => { try { return JSON.parse(product.images ?? "[]"); } catch { return []; } })(),
    });
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

// ─── ORDERS ───────────────────────────────────────────────────────────────────

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

app.post("/api/orders", orderLimiter, async (req, res) => {
  try {
    const { customerName, phone, email, total, items } = req.body;

    if (!customerName || !phone || !email || !total || !items?.length) {
      return res.status(400).json({ error: "Missing required order fields" });
    }

    // Input length validation
    if (typeof customerName !== "string" || customerName.trim().length < 2 || customerName.length > 100) {
      return res.status(400).json({ error: "Invalid customer name" });
    }
    if (typeof phone !== "string" || phone.trim().length < 7 || phone.length > 20) {
      return res.status(400).json({ error: "Invalid phone number" });
    }
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    const parsedTotal = Number(total);
    if (isNaN(parsedTotal) || parsedTotal <= 0 || parsedTotal > 100_000_000) {
      return res.status(400).json({ error: "Invalid order total" });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({ error: "Invalid items" });
    }

    const order = await prisma.order.create({
      data: {
        customerName: sanitiseString(customerName, 100),
        phone: sanitiseString(phone, 20),
        email: email.trim().toLowerCase().slice(0, 254),
        total: parsedTotal,
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

    // Fire-and-forget: send confirmation email
    sendEmail(
      order.email,
      `Your Order Confirmation – ${order.id}`,
      buildConfirmationEmail(order)
    );

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

const ALLOWED_STATUSES = ["pending", "verifying", "confirmed", "dispatched", "delivered"];

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

    // Fire-and-forget: send status emails
    if (order.email) {
      if (status === "dispatched") {
        sendEmail(
          order.email,
          "Your Splendid Package is On Its Way! 🚚",
          buildDispatchEmail(order)
        );
      } else if (status === "delivered") {
        sendEmail(
          order.email,
          "Your Order Has Arrived! We'd Love Your Feedback 💛",
          buildDeliveryEmail(order)
        );
      }
    } else {
      console.warn(`[Email] Order ${order.id} has no email address — skipping status email for "${status}"`);
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ─── ADMIN AUTH ───────────────────────────────────────────────────────────────

// Create table if needed, then ALWAYS sync password from ADMIN_PASSWORD env var.
// This means whatever is set in Render env is always what works — no stale hash issues.
async function ensureAdminPassword() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const hash = await bcrypt.hash(ADMIN_PASSWORD_ENV, 12);
  await prisma.adminSetting.upsert({
    where: { key: "admin_password" },
    update: { value: hash },
    create: { key: "admin_password", value: hash },
  });
  console.log("[Auth] Admin password synced from ADMIN_PASSWORD env var.");
}

async function getAdminPasswordHash() {
  const row = await prisma.adminSetting.findUnique({ where: { key: "admin_password" } });
  return row?.value ?? null;
}

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== "string" || password.length > 200) {
    return res.status(400).json({ error: "Password is required" });
  }

  try {
    const hash = await getAdminPasswordHash();
    if (!hash) return res.status(500).json({ error: "Admin account not configured" });

    const match = await bcrypt.compare(password, hash);
    if (match) {
      const token = generateToken();
      const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
      activeTokens.set(token, expiresAt);
      res.json({ authenticated: true, token });
    } else {
      // Uniform response time regardless of whether password matched
      res.status(401).json({ authenticated: false, error: "Invalid password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/admin/change-password", requireAdminAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Both currentPassword and newPassword are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  try {
    const hash = await getAdminPasswordHash();
    if (!hash) return res.status(500).json({ error: "Admin account not configured" });

    const match = await bcrypt.compare(currentPassword, hash);
    if (!match) return res.status(401).json({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.adminSetting.upsert({
      where: { key: "admin_password" },
      update: { value: newHash },
      create: { key: "admin_password", value: newHash },
    });

    // Invalidate all existing sessions so any old token stops working
    activeTokens.clear();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

app.post("/api/admin/logout", requireAdminAuth, (req, res) => {
  const token = req.headers["authorization"].slice(7);
  activeTokens.delete(token);
  res.json({ success: true });
});

// ─── CLOUDINARY SIGNED UPLOAD ────────────────────────────────────────────────

app.post("/api/admin/cloudinary-upload-signature", requireAdminAuth, async (req, res) => {
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "djup7klv2";

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: "Cloudinary credentials not configured on server." });
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    // Parameters that must be signed (alphabetical order, no 'file', no 'api_key')
    const paramsToSign = {
      eager:       "c_fill,g_auto,w_800,h_800,q_auto,f_auto",
      eager_async: "false",
      folder:      "splendid_products",
      timestamp,
    };

    // Build the string_to_sign: key=value pairs sorted alphabetically joined by &
    const stringToSign = Object.entries(paramsToSign)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&") + apiSecret;

    // SHA-1 of the string
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

    res.json({ signature, timestamp, api_key: apiKey, cloud_name: cloudName, folder: "splendid_products", eager: paramsToSign.eager, eager_async: paramsToSign.eager_async });
  } catch (err) {
    console.error("[Cloudinary Signature Error]", err);
    res.status(500).json({ error: "Failed to generate upload signature." });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── TEMP DEBUG (REMOVE BEFORE PRODUCTION) ───────────────────────────────────
// This endpoint is intentionally removed for security.

app.listen(PORT, async () => {
  await ensureAdminPassword();
  console.log(`Splendid Empire API running on port ${PORT}`);
});
