import express from "express";
import cors from "cors";
import crypto from "crypto";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import {
  InsufficientStockError,
  parseStockQuantity,
  parseLowStockThreshold,
  syncInStockFromQuantity,
  productIsAvailable,
  canFulfill,
  applyOrderStatusWithStock,
} from "./services/inventory.js";

async function loadPush() {
  try {
    const fa = await import("./services/firebaseAdmin.js");
    const ns = await import("./services/notificationService.js");
    return {
      getMessaging: fa.getMessaging,
      ensureMessaging: fa.ensureMessaging,
      getFirebaseConfigStatus: fa.getFirebaseConfigStatus,
      sendToAllActive: ns.sendToAllActive,
      notifyAllSafe: ns.notifyAllSafe,
      notifyOrderSafe: ns.notifyOrderSafe,
      orderStatusPushCopy: ns.orderStatusPushCopy,
      linkInstallationToOrder: ns.linkInstallationToOrder,
    };
  } catch (err) {
    console.error("[Push] unavailable:", err?.message || err);
    return {
      getMessaging: () => null,
      ensureMessaging: async () => null,
      getFirebaseConfigStatus: async () => ({ lastError: String(err?.message || err) }),
      sendToAllActive: async () => ({ sent: 0, failed: 0, error: "unavailable" }),
      notifyAllSafe: () => {},
      notifyOrderSafe: () => {},
      orderStatusPushCopy: (orderId, status) => ({ title: "Order update", body: String(status || "") }),
      linkInstallationToOrder: async () => false,
    };
  }
}


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
        <tr>
          <td style="background-color:#1A0F0A;padding:28px 32px;text-align:center;">
            <h1 style="font-family:'Playfair Display',Georgia,serif;color:#F2B8A8;font-size:22px;font-weight:700;margin:0;letter-spacing:0.15em;">SPLENDID EMPIRE COSMETICS</h1>
            <p style="color:rgba(242,184,168,0.6);font-size:11px;margin:6px 0 0;letter-spacing:0.1em;">LUXURY BEAUTY · NIGERIA</p>
          </td>
        </tr>
        <tr><td style="padding:32px;">${bodyContent}</td></tr>
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
  "http://localhost:5173",
  "http://localhost:3000",
  "https://splendidcosmetics.com.ng",
  "http://splendidcosmetics.com.ng",
  "https://www.splendidcosmetics.com.ng",
  "http://www.splendidcosmetics.com.ng",
  "https://splendid-ecosmetics.vercel.app",
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

const notifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many notification sends. Please wait and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many registration attempts." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: "Too many requests." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", generalLimiter);

function sanitiseString(val, maxLen = 500) {
  if (typeof val !== "string") return val;
  return val.trim().slice(0, maxLen);
}

// ─── STATELESS SIGNED TOKENS (works on Vercel serverless) ─────────────────────
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || ADMIN_PASSWORD_ENV;

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function signToken(sessionVersion) {
  const payload = JSON.stringify({
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days — so all-day posting never dies
    v: sessionVersion,
  });
  const payloadB64 = b64url(payload);
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("hex");
  return `${payloadB64}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadB64).digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function getSessionVersion() {
  const row = await prisma.adminSetting.findUnique({ where: { key: "session_version" } }).catch(() => null);
  return row ? Number(row.value) || 1 : 1;
}

async function bumpSessionVersion() {
  const current = await getSessionVersion();
  const next = current + 1;
  await prisma.adminSetting.upsert({
    where: { key: "session_version" },
    update: { value: String(next) },
    create: { key: "session_version", value: String(next) },
  });
  return next;
}

async function requireAdminAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
  const currentVersion = await getSessionVersion();
  if (payload.v !== currentVersion) {
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
    let stockQuantity;
    let lowStockThreshold;
    try {
      stockQuantity = parseStockQuantity(data.stockQuantity);
      lowStockThreshold = parseLowStockThreshold(data.lowStockThreshold);
    } catch (e) {
      return res.status(400).json({ error: e.message || "Invalid stock values" });
    }
    delete data.stockQuantity;
    delete data.lowStockThreshold;
    const safeData = {
      ...data,
      name: sanitiseString(data.name, 200),
      category: sanitiseString(data.category, 100),
      description: sanitiseString(data.description, 1000),
      badge: data.badge ? sanitiseString(data.badge, 50) : undefined,
      price,
    };
    if (stockQuantity !== undefined) {
      safeData.stockQuantity = stockQuantity;
      if (typeof safeData.inStock !== "boolean") safeData.inStock = true;
      safeData.inStock = syncInStockFromQuantity(stockQuantity, safeData.inStock);
    }
    if (lowStockThreshold !== undefined) safeData.lowStockThreshold = lowStockThreshold;
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
    try {
      if (Object.prototype.hasOwnProperty.call(safeData, "stockQuantity")) {
        safeData.stockQuantity = parseStockQuantity(safeData.stockQuantity);
        if (safeData.stockQuantity !== undefined) {
          const currentInStock = typeof safeData.inStock === "boolean" ? safeData.inStock : true;
          safeData.inStock = syncInStockFromQuantity(safeData.stockQuantity, currentInStock);
        }
      }
      if (Object.prototype.hasOwnProperty.call(safeData, "lowStockThreshold")) {
        safeData.lowStockThreshold = parseLowStockThreshold(safeData.lowStockThreshold);
      }
    } catch (e) {
      return res.status(400).json({ error: e.message || "Invalid stock values" });
    }
    if (safeData.price !== undefined) {
      const price = Number(safeData.price);
      if (isNaN(price) || price <= 0) return res.status(400).json({ error: "Invalid price" });
      safeData.price = price;
    }
    if (safeData.name) safeData.name = sanitiseString(safeData.name, 200);
    if (safeData.description) safeData.description = sanitiseString(safeData.description, 1000);
    if (safeData.category) safeData.category = sanitiseString(safeData.category, 100);
    if (safeData.badge) safeData.badge = sanitiseString(safeData.badge, 50);
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

function nigeriaDayBounds(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return {
    start: new Date(`${day}T00:00:00+01:00`),
    end: new Date(`${day}T24:00:00+01:00`),
  };
}

const DASHBOARD_ORDER_SELECT = {
  id: true,
  customerName: true,
  total: true,
  status: true,
  createdAt: true,
};

app.get("/api/admin/dashboard-summary", requireAdminAuth, async (req, res) => {
  try {
    const { start, end } = nigeriaDayBounds();
    const salesStatuses = ["confirmed", "dispatched", "delivered"];

    const [statusGroups, todaysPlaced, todaysSalesAgg, recentOrders, needsVerifying, needsConfirmed, needsPending, inventoryCounts] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.order.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
      prisma.order.aggregate({
        where: {
          status: { in: salesStatuses },
          createdAt: { gte: start, lt: end },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: DASHBOARD_ORDER_SELECT,
      }),
      prisma.order.findMany({
        where: { status: "verifying" },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: DASHBOARD_ORDER_SELECT,
      }),
      prisma.order.findMany({
        where: { status: "confirmed" },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: DASHBOARD_ORDER_SELECT,
      }),
      prisma.order.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: DASHBOARD_ORDER_SELECT,
      }),
      prisma.$queryRaw`
        SELECT
          COUNT(*) FILTER (
            WHERE stock_quantity IS NOT NULL
              AND stock_quantity > 0
              AND stock_quantity <= low_stock_threshold
          )::int AS low_stock,
          COUNT(*) FILTER (
            WHERE stock_quantity = 0
          )::int AS out_of_stock
        FROM products
      `,
    ]);

    const statusCounts = {
      pending: 0,
      verifying: 0,
      confirmed: 0,
      dispatched: 0,
      delivered: 0,
    };
    for (const row of statusGroups) {
      if (Object.prototype.hasOwnProperty.call(statusCounts, row.status)) {
        statusCounts[row.status] = row._count._all;
      }
    }

    const todaysSales = Number(todaysSalesAgg._sum.total || 0);
    const salesOrderCount = todaysSalesAgg._count._all || 0;
    const averageOrderValue = salesOrderCount > 0 ? Math.round(todaysSales / salesOrderCount) : 0;
    const needsAttention = [...needsVerifying, ...needsConfirmed, ...needsPending].slice(0, 20);

    res.json({
      ordersToProcess: statusCounts.pending + statusCounts.verifying + statusCounts.confirmed,
      paymentReview: statusCounts.verifying,
      readyToDispatch: statusCounts.confirmed,
      dispatched: statusCounts.dispatched,
      todaysSales,
      todaysOrderCount: todaysPlaced,
      averageOrderValue,
      statusCounts,
      recentOrders,
      needsAttention,
      lowStockProductCount: Number(inventoryCounts?.[0]?.low_stock || 0),
      outOfStockProductCount: Number(inventoryCounts?.[0]?.out_of_stock || 0),
    });
  } catch (err) {
    console.error("[dashboard-summary]", err?.message || err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

app.post("/api/orders", orderLimiter, async (req, res) => {
  try {
    const { customerName, phone, email, total, items, installationId } = req.body;
    if (!customerName || !phone || !email || !total || !items?.length) {
      return res.status(400).json({ error: "Missing required order fields" });
    }
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
    const normalizedItems = [];
    for (const item of items) {
      const productId = item?.product?.id || item?.productId;
      const quantity = Number(item?.quantity);
      if (!productId || typeof productId !== "string") {
        return res.status(400).json({ error: "Each item must reference a product" });
      }
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000) {
        return res.status(400).json({ error: "Invalid item quantity" });
      }
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return res.status(400).json({ error: "One or more products are no longer available" });
      }
      if (!canFulfill(product, quantity)) {
        const label = product.name || "A product";
        return res.status(400).json({ error: `${label} is unavailable or does not have enough stock` });
      }
      normalizedItems.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity,
      });
    }
    const order = await prisma.order.create({
      data: {
        customerName: sanitiseString(customerName, 100),
        phone: sanitiseString(phone, 20),
        email: email.trim().toLowerCase().slice(0, 254),
        total: parsedTotal,
        status: "pending",
        items: {
          create: normalizedItems,
        },
      },
      include: { items: true },
    });
    sendEmail(order.email, `Your Order Confirmation – ${order.id}`, buildConfirmationEmail(order));

    // Link this browser's push subscription to the order (optional, non-blocking)
    // Then notify ONLY that customer's device(s) — never broadcast private order details.
    loadPush().then(async (push) => {
      try {
        if (installationId && typeof installationId === "string") {
          await push.linkInstallationToOrder(prisma, order.id, installationId);
        }
        const copy = push.orderStatusPushCopy(order.id, "pending");
        push.notifyOrderSafe(prisma, order.id, {
          title: copy.title,
          body: copy.body,
          link: `/order/${order.id}`,
          data: {
            orderId: order.id,
            notificationType: "order_status",
            status: "pending",
            click_url: `/order/${order.id}`,
          },
        });
      } catch (e) {
        console.error("[order create push]", e?.message || e);
      }
      // Existing store-owner style broadcast (admin awareness) — keeps working
      push.notifyAllSafe(prisma, {
        title: "New order received 🛍️",
        body: `Order ${order.id} from ${order.customerName} — ₦${Number(order.total).toLocaleString("en-NG")}`,
        link: "/admin/orders",
        data: { type: "order.created", orderId: order.id },
      });
    }).catch(() => {});

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

    const result = await applyOrderStatusWithStock(prisma, req.params.id, status);
    if (result.kind === "missing") {
      return res.status(404).json({ error: "Order not found" });
    }
    if (result.kind === "stock") {
      return res.status(409).json({ error: result.error });
    }
    const order = result.order;
    const statusChanged = result.statusChanged;

    if (order.email && statusChanged) {
      if (status === "dispatched") {
        sendEmail(order.email, "Your Splendid Package is On Its Way! 🚚", buildDispatchEmail(order));
      } else if (status === "delivered") {
        sendEmail(order.email, "Your Order Has Arrived! We'd Love Your Feedback 💛", buildDeliveryEmail(order));
      }
    }

    // Targeted FCM only when status actually changes — never broadcast to all subscribers
    if (statusChanged) {
      loadPush().then((push) => {
        const copy = push.orderStatusPushCopy(order.id, status);
        push.notifyOrderSafe(prisma, order.id, {
          title: copy.title,
          body: copy.body,
          link: `/order/${order.id}`,
          data: {
            orderId: order.id,
            notificationType: "order_status",
            status: String(status),
            click_url: `/order/${order.id}`,
          },
        });
      }).catch(() => {});
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

app.delete("/api/orders/:id", requireAdminAuth, async (req, res) => {
  try {
    await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } });
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

app.patch("/api/orders/:id", requireAdminAuth, async (req, res) => {
  try {
    const { customerName, phone, email, status } = req.body;
    const data = {};
    if (customerName !== undefined) data.customerName = sanitiseString(customerName, 100);
    if (phone !== undefined) data.phone = sanitiseString(phone, 20);
    if (email !== undefined) data.email = email.trim().toLowerCase().slice(0, 254);
    if (status !== undefined && ALLOWED_STATUSES.includes(status)) data.status = status;

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: "Order not found" });
    }
    const previousStatus = existing.status;
    let order;
    let statusChanged = false;
    if (data.status !== undefined) {
      const nextStatus = data.status;
      delete data.status;
      if (Object.keys(data).length) {
        await prisma.order.update({ where: { id: req.params.id }, data });
      }
      const result = await applyOrderStatusWithStock(prisma, req.params.id, nextStatus);
      if (result.kind === "missing") {
        return res.status(404).json({ error: "Order not found" });
      }
      if (result.kind === "stock") {
        return res.status(409).json({ error: result.error });
      }
      order = result.order;
      statusChanged = result.statusChanged;
    } else {
      order = await prisma.order.update({
        where: { id: req.params.id },
        data,
        include: { items: true },
      });
    }

    if (statusChanged) {
      if (order.email) {
        if (order.status === "dispatched") {
          sendEmail(order.email, "Your Splendid Package is On Its Way! 🚚", buildDispatchEmail(order));
        } else if (order.status === "delivered") {
          sendEmail(order.email, "Your Order Has Arrived! We'd Love Your Feedback 💛", buildDeliveryEmail(order));
        }
      }
      loadPush().then((push) => {
        const copy = push.orderStatusPushCopy(order.id, order.status);
        push.notifyOrderSafe(prisma, order.id, {
          title: copy.title,
          body: copy.body,
          link: `/order/${order.id}`,
          data: {
            orderId: order.id,
            notificationType: "order_status",
            status: String(order.status),
            click_url: `/order/${order.id}`,
          },
        });
      }).catch(() => {});
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// ─── ADMIN PASSWORD (DB is source of truth — JessyLuxury pattern) ──────────────
async function ensureAdminTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureAdminPassword() {
  await ensureAdminTable();
  const existing = await prisma.adminSetting.findUnique({
    where: { key: "admin_password" },
  }).catch(() => null);
  if (!existing) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD_ENV, 12);
    await prisma.adminSetting.create({
      data: { key: "admin_password", value: hash },
    });
    await prisma.adminSetting.upsert({
      where: { key: "session_version" },
      update: {},
      create: { key: "session_version", value: "1" },
    });
    console.log("[Auth] Admin password seeded from ADMIN_PASSWORD env var (first run only).");
  }
}

async function getAdminPasswordHash() {
  await ensureAdminPassword();
  const row = await prisma.adminSetting.findUnique({ where: { key: "admin_password" } }).catch(() => null);
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
      const version = await getSessionVersion();
      const token = signToken(version);
      res.json({ authenticated: true, token });
    } else {
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
    await bumpSessionVersion();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

app.post("/api/admin/logout", requireAdminAuth, (req, res) => {
  res.json({ success: true });
});

app.get("/api/admin/cloudinary-status", requireAdminAuth, (req, res) => {
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "djup7klv2";
  res.json({
    cloud_name: cloudName,
    api_key_configured: !!apiKey,
    api_secret_configured: !!apiSecret,
    api_key_prefix: apiKey ? apiKey.slice(0, 6) + "..." : null,
  });
});

app.post("/api/admin/cloudinary-upload-signature", requireAdminAuth, async (req, res) => {
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "djup7klv2";
  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: "Cloudinary credentials not configured on server. Contact the administrator." });
  }
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
      eager:       "c_fill,g_auto,w_800,h_800,q_auto,f_auto",
      eager_async: "false",
      folder:      "splendid_products",
      timestamp,
    };
    const stringToSign = Object.entries(paramsToSign)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&") + apiSecret;
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");
    res.json({ signature, timestamp, api_key: apiKey, cloud_name: cloudName, folder: "splendid_products", eager: paramsToSign.eager, eager_async: paramsToSign.eager_async });
  } catch (err) {
    console.error("[Cloudinary Signature Error]", err);
    res.status(500).json({ error: "Failed to generate upload signature." });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    // Always return array for admin; also include images map for storefront compatibility
    const map = {};
    for (const c of categories) {
      if (c.image) map[c.name] = c.image;
    }
    const accept = (req.headers["accept"] || "").toLowerCase();
    const wantList = req.query.list === "1" || accept.includes("application/json+list");
    if (wantList) {
      return res.json(categories.map(c => ({ name: c.name, image: c.image || null })));
    }
    // Default: map (storefront) — if empty map but categories exist without images, still ok
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post("/api/categories", requireAdminAuth, async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const cleanName = sanitiseString(name, 100);
    const cleanImage = image ? String(image).trim() : null;
    const category = await prisma.category.upsert({
      where: { name: cleanName },
      update: { image: cleanImage },
      create: { name: cleanName, image: cleanImage },
    });
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save category photo" });
  }
});

app.delete("/api/categories/:name", requireAdminAuth, async (req, res) => {
  try {
    const cleanName = sanitiseString(req.params.name, 100);
    await prisma.category.deleteMany({ where: { name: cleanName } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});



// Public order status lookup (for notification click / tracking). No auth.
// Does not expose phone/email. Order IDs are opaque cuids.
app.get("/api/orders/:id/public", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id || id.length > 64) {
      return res.status(400).json({ error: "Invalid order id" });
    }
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        total: true,
        customerName: true,
        createdAt: true,
        updatedAt: true,
        items: { select: { name: true, quantity: true, price: true } },
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load order" });
  }
});

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────

app.post("/api/notifications/register", registerLimiter, async (req, res) => {
  try {
    const { installationId, token, userAgent, platform } = req.body || {};
    const fid = typeof installationId === "string" ? installationId.trim() : "";
    // Real FCM tokens are long; FIDs are shorter but still substantial
    if (!fid || fid.length < 16 || fid.length > 4096) {
      return res.status(400).json({ error: "Valid installationId is required" });
    }
    if (fid.startsWith("test-") || fid.includes("debug")) {
      return res.status(400).json({ error: "Invalid installationId" });
    }
    const ua = typeof userAgent === "string" ? userAgent.slice(0, 500) : null;
    const plat = typeof platform === "string" ? platform.slice(0, 80) : null;
    const tok = typeof token === "string" && token.trim() ? token.trim().slice(0, 512) : null;

    const sub = await prisma.pushSubscription.upsert({
      where: { installationId: fid },
      update: {
        enabled: true,
        lastSeenAt: new Date(),
        userAgent: ua || undefined,
        platform: plat || undefined,
        ...(tok ? { token: tok } : {}),
      },
      create: {
        installationId: fid,
        token: tok,
        userAgent: ua,
        platform: plat,
        enabled: true,
      },
    });
    res.json({ ok: true, id: sub.id });
  } catch (err) {
    console.error("[notify register]", err);
    res.status(500).json({ error: "Failed to register for notifications" });
  }
});

app.post("/api/notifications/unregister", registerLimiter, async (req, res) => {
  try {
    const { installationId } = req.body || {};
    const fid = typeof installationId === "string" ? installationId.trim() : "";
    if (!fid) return res.status(400).json({ error: "installationId is required" });
    await prisma.pushSubscription.updateMany({
      where: { installationId: fid },
      data: { enabled: false },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[notify unregister]", err);
    res.status(500).json({ error: "Failed to unregister" });
  }
});

app.get("/api/admin/notifications/stats", requireAdminAuth, async (req, res) => {
  try {
    const push = await loadPush();
    let messaging = null;
    let configDetail = null;
    try {
      messaging = await push.ensureMessaging();
      configDetail = push.getFirebaseConfigStatus
        ? await push.getFirebaseConfigStatus()
        : null;
    } catch (e) {
      console.error("[push stats] firebase init", e?.message || e);
      configDetail = { lastError: e?.message || String(e) };
    }

    let total = 0, active = 0, recent = [], dbError = null;
    let ordersWithPush = 0, orderRecipientLinks = 0, recentOrderLogs = [];
    try {
      [total, active, recent, ordersWithPush, orderRecipientLinks, recentOrderLogs] = await Promise.all([
        prisma.pushSubscription.count(),
        prisma.pushSubscription.count({ where: { enabled: true } }),
        prisma.notificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
        prisma.orderNotificationRecipient.groupBy({ by: ["orderId"] }).then((rows) => rows.length).catch(() => 0),
        prisma.orderNotificationRecipient.count().catch(() => 0),
        prisma.notificationLog.findMany({
          where: { audience: { startsWith: "order:" } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }).catch(() => []),
      ]);
    } catch (e) {
      dbError = e?.message || String(e);
      console.error("[push stats] db", dbError);
    }

    res.json({
      totalSubscribers: total,
      activeSubscribers: active,
      configured: !!messaging,
      configDetail,
      dbError,
      recent,
      ordersWithPush,
      orderRecipientLinks,
      recentOrderLogs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load notification stats" });
  }
});

app.get("/api/admin/notifications", requireAdminAuth, async (req, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

app.delete("/api/admin/notifications/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });
    await prisma.notificationLog.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("[notify delete]", err);
    res.status(500).json({ error: "Failed to delete notification log" });
  }
});

app.delete("/api/admin/notifications", requireAdminAuth, async (req, res) => {
  try {
    // Clear all logs
    const result = await prisma.notificationLog.deleteMany({});
    res.json({ ok: true, deleted: result.count });
  } catch (err) {
    console.error("[notify clear]", err);
    res.status(500).json({ error: "Failed to clear notification logs" });
  }
});

app.post("/api/admin/notifications/send", requireAdminAuth, notifyLimiter, async (req, res) => {
  try {
    let { title, body, audience, link, image } = req.body || {};
    title = typeof title === "string" ? title.trim().slice(0, 100) : "";
    body = typeof body === "string" ? body.trim().slice(0, 500) : "";
    audience = typeof audience === "string" ? audience.trim() : "all";
    link = typeof link === "string" ? link.trim().slice(0, 500) : "/";
    image = typeof image === "string" ? image.trim().slice(0, 2000) : "";

    if (!title || !body) {
      return res.status(400).json({ error: "Title and message are required" });
    }
    // Strip obvious HTML/script
    title = title.replace(/<[^>]*>/g, "");
    body = body.replace(/<[^>]*>/g, "");

    if (image && !image.startsWith("https://")) {
      return res.status(400).json({ error: "Image must be an https:// URL" });
    }
    if (link && link.startsWith("javascript:")) {
      return res.status(400).json({ error: "Invalid link" });
    }
    if (!link) link = "/";

    if (audience !== "all") {
      return res.status(400).json({ error: "Only audience 'all' is supported currently" });
    }

    const push = await loadPush();
    const result = await push.sendToAllActive(prisma, {
      title,
      body,
      link,
      image: image || null,
      data: { type: "broadcast" },
    });

    if (result.error) {
      return res.status(503).json({ error: result.error });
    }

    let log = null;
    try {
      log = await prisma.notificationLog.create({
        data: {
          title,
          body,
          audience: "all",
          sentCount: result.sent,
          failedCount: result.failed,
        },
      });
    } catch (logErr) {
      console.error("[notify send] log write failed:", logErr?.message || logErr);
    }

    res.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors || [],
      log,
      message:
        result.sent === 0 && result.failed === 0
          ? "No active subscribers yet. Open the store on a phone/browser and enable notifications first."
          : result.sent === 0 && result.failed > 0
            ? "Could not deliver. Subscriber may need to open the site and enable notifications again."
            : undefined,
    });
  } catch (err) {
    console.error("[notify send]", err);
    res.status(500).json({ error: err?.message || "Failed to send notification" });
  }
});


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    await ensureAdminPassword().catch(err => console.error("[Auth Seed Error]", err));
    console.log(`Splendid Empire API running on port ${PORT}`);
  });
}

export default app;
