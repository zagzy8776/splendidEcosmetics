import {
  THRESHOLDS,
  pct,
  classifyProduct,
  classifySource,
  classifyInventoryDemand,
} from "./analyticsIntelligence.js";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "view_item",
  "view_item_list",
  "search",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
]);

const PRESENCE_TTL_MS = 2 * 60 * 1000;
const MAX_EVENTS = 20;
const MAX_STR = 200;

function cleanId(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v.length < 8 || v.length > 80) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return null;
  return v;
}

function cleanText(value, max = MAX_STR) {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, max);
  return v || null;
}

function cleanInt(value, { min = 0, max = 1_000_000 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min || i > max) return null;
  return i;
}

export function nigeriaRange(range = "today", now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const todayStart = new Date(`${day}T00:00:00+01:00`);
  const todayEnd = new Date(`${day}T24:00:00+01:00`);
  if (range === "yesterday") {
    const start = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    return { start, end: todayStart, label: "yesterday" };
  }
  if (range === "week") {
    return { start: new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000), end: todayEnd, label: "week" };
  }
  if (range === "month") {
    const parts = day.split("-").map(Number);
    const start = new Date(`${parts[0]}-${String(parts[1]).padStart(2, "0")}-01T00:00:00+01:00`);
    return { start, end: todayEnd, label: "month" };
  }
  if (range === "lifetime") {
    return { start: new Date("2020-01-01T00:00:00+01:00"), end: todayEnd, label: "lifetime" };
  }
  return { start: todayStart, end: todayEnd, label: "today" };
}

export function previousLagosDay(now = new Date()) {
  const { start } = nigeriaRange("today", now);
  const prev = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(prev);
  return { start: prev, end: start, key };
}

export async function ingestEvents(prisma, body) {
  const sessionId = cleanId(body?.sessionId);
  const visitorId = cleanId(body?.visitorId);
  if (!sessionId || !visitorId) return { accepted: 0, error: "Invalid session" };
  const incoming = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS) : [];
  const rows = [];
  for (const ev of incoming) {
    const eventType = typeof ev?.type === "string" ? ev.type : ev?.eventType;
    if (!ALLOWED_EVENTS.has(eventType)) continue;
    const payload = ev?.payload && typeof ev.payload === "object" ? ev.payload : {};
    const productId = cleanId(payload.productId) || cleanText(payload.productId, 80);
    rows.push({
      sessionId,
      visitorId,
      eventType,
      productId: productId || null,
      payload: JSON.stringify({
        productName: cleanText(payload.productName, 120),
        category: cleanText(payload.category, 80),
        price: cleanInt(payload.price, { min: 0, max: 100_000_000 }),
        quantity: cleanInt(payload.quantity, { min: 1, max: 1000 }),
        currency: "NGN",
        section: cleanText(payload.section, 40),
        searchTerm: cleanText(payload.searchTerm, 80),
      }),
    });
  }
  if (!rows.length) return { accepted: 0 };
  await prisma.analyticsEvent.createMany({ data: rows });
  await rememberSession(prisma, body).catch(() => {});
  return { accepted: rows.length };
}

export async function rememberSession(prisma, body) {
  const sessionId = cleanId(body?.sessionId);
  const visitorId = cleanId(body?.visitorId);
  if (!sessionId || !visitorId) return;
  const source = classifySource(body?.source, body?.referrer);
  const medium = cleanText(body?.medium, 40);
  const campaign = cleanText(body?.campaign, 80);
  const existing = await prisma.analyticsSession.findUnique({ where: { sessionId } }).catch(() => null);
  if (existing) return;
  await prisma.analyticsSession.create({
    data: { sessionId, visitorId, source, medium, campaign, createdAt: new Date() },
  });
}

export async function recordPurchase(prisma, order) {
  if (!order?.id) return;
  const existing = await prisma.analyticsEvent.findFirst({
    where: { eventType: "purchase", transactionId: String(order.id) },
    select: { id: true },
  });
  if (existing) return;
  const items = (order.items || []).map((item) => ({
    productId: item.productId,
    productName: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
  await prisma.analyticsEvent.create({
    data: {
      sessionId: "server",
      visitorId: "server",
      eventType: "purchase",
      transactionId: String(order.id),
      payload: JSON.stringify({
        value: Number(order.total) || 0,
        currency: "NGN",
        items,
      }),
    },
  });
}

export async function upsertPresence(prisma, body) {
  const sessionId = cleanId(body?.sessionId);
  const visitorId = cleanId(body?.visitorId);
  if (!sessionId || !visitorId) return { ok: false };
  await rememberSession(prisma, body).catch(() => {});
  await prisma.visitorPresence.upsert({
    where: { sessionId },
    create: {
      sessionId,
      visitorId,
      section: cleanText(body.section, 40) || "home",
      productId: cleanText(body.productId, 80),
      productName: cleanText(body.productName, 120),
      lastSeenAt: new Date(),
    },
    update: {
      visitorId,
      section: cleanText(body.section, 40) || "home",
      productId: cleanText(body.productId, 80),
      productName: cleanText(body.productName, 120),
      lastSeenAt: new Date(),
    },
  });
  return { ok: true };
}

export async function listLiveVisitors(prisma) {
  const cutoff = new Date(Date.now() - PRESENCE_TTL_MS);
  await prisma.visitorPresence.deleteMany({ where: { lastSeenAt: { lt: cutoff } } }).catch(() => {});
  const rows = await prisma.visitorPresence.findMany({
    where: { lastSeenAt: { gte: cutoff } },
    orderBy: { lastSeenAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    sessionId: row.sessionId.slice(0, 8),
    section: row.section,
    productId: row.productId,
    productName: row.productName,
    lastSeenAt: row.lastSeenAt,
  }));
}

async function countDistinct(prisma, where) {
  const rows = await prisma.analyticsEvent.findMany({
    where,
    distinct: ["visitorId"],
    select: { visitorId: true },
  });
  return rows.length;
}

async function countEvents(prisma, where) {
  return prisma.analyticsEvent.count({ where });
}

async function topProducts(prisma, eventType, start, end, take = 5) {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["productId"],
    where: {
      eventType,
      createdAt: { gte: start, lt: end },
      productId: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
    take,
  });
  const ids = rows.map((r) => r.productId).filter(Boolean);
  const products = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const names = Object.fromEntries(products.map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    productId: r.productId,
    name: names[r.productId] || r.productId,
    count: r._count._all,
  }));
}

export async function summarizeAnalytics(prisma, rangeKey = "today") {
  const { start, end, label } = nigeriaRange(rangeKey);
  const created = { createdAt: { gte: start, lt: end } };
  const salesStatuses = ["confirmed", "dispatched", "delivered"];

  const [
    visitors,
    pageViews,
    productViews,
    searches,
    addToCarts,
    checkouts,
    purchases,
    ordersPlaced,
    salesAgg,
    mostViewed,
    mostCarted,
    mostPurchased,
  ] = await Promise.all([
    countDistinct(prisma, { ...created, eventType: { in: [...ALLOWED_EVENTS] } }),
    countEvents(prisma, { ...created, eventType: "page_view" }),
    countEvents(prisma, { ...created, eventType: "view_item" }),
    countEvents(prisma, { ...created, eventType: "search" }),
    countEvents(prisma, { ...created, eventType: "add_to_cart" }),
    countEvents(prisma, { ...created, eventType: "begin_checkout" }),
    countEvents(prisma, { ...created, eventType: "purchase" }),
    prisma.order.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: start, lt: end }, status: { in: salesStatuses } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    topProducts(prisma, "view_item", start, end),
    topProducts(prisma, "add_to_cart", start, end),
    topPurchasedFromOrders(prisma, start, end),
  ]);

  const revenue = Number(salesAgg._sum.total || 0);
  const [productPerformance, abandoned, traffic, demand] = await Promise.all([
    productIntelligence(prisma, start, end),
    abandonedIntelligence(prisma, start, end, ordersPlaced),
    trafficIntelligence(prisma, start, end),
    inventoryDemandIntelligence(prisma, start, end),
  ]);
  return {
    range: label,
    start: start.toISOString(),
    end: end.toISOString(),
    visitors,
    pageViews,
    productViews,
    searches,
    addToCarts,
    checkouts,
    purchases,
    orders: ordersPlaced,
    revenue,
    conversionRate: pct(ordersPlaced, visitors),
    topViewed: mostViewed,
    topAddedToCart: mostCarted,
    topPurchased: mostPurchased,
    productPerformance,
    needsAttention: productPerformance.filter((p) => p.tone === "alert" || p.tone === "warn").slice(0, 5),
    abandoned,
    traffic,
    demand,
    thresholds: THRESHOLDS,
  };
}

async function countByProduct(prisma, eventType, start, end) {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["productId"],
    where: { eventType, createdAt: { gte: start, lt: end }, productId: { not: null } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.productId, r._count._all]));
}

async function productIntelligence(prisma, start, end) {
  const [views, carts, paid] = await Promise.all([
    countByProduct(prisma, "view_item", start, end),
    countByProduct(prisma, "add_to_cart", start, end),
    prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end }, status: { in: ["confirmed", "dispatched", "delivered"] } },
      select: { items: { select: { productId: true, name: true, quantity: true, price: true } } },
    }),
  ]);
  const units = {};
  const revenue = {};
  const names = {};
  for (const order of paid) {
    for (const item of order.items || []) {
      const id = item.productId;
      units[id] = (units[id] || 0) + Number(item.quantity || 0);
      revenue[id] = (revenue[id] || 0) + Number(item.price || 0) * Number(item.quantity || 0);
      names[id] = item.name;
    }
  }
  const ids = new Set([...Object.keys(views), ...Object.keys(carts), ...Object.keys(units)]);
  const products = ids.size
    ? await prisma.product.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true } })
    : [];
  for (const p of products) names[p.id] = p.name;
  const rows = [...ids].map((id) => {
    const v = views[id] || 0;
    const c = carts[id] || 0;
    const u = units[id] || 0;
    const tag = classifyProduct({ views: v, carts: c, purchases: u });
    return {
      productId: id,
      name: names[id] || id,
      views: v,
      carts: c,
      purchases: u,
      units: u,
      revenue: revenue[id] || 0,
      viewToCart: pct(c, v),
      cartToPurchase: pct(u, c),
      viewToPurchase: pct(u, v),
      label: tag.label,
      tone: tag.tone,
    };
  });
  return rows.sort((a, b) => b.views - a.views || b.revenue - a.revenue).slice(0, 30);
}

async function abandonedIntelligence(prisma, start, end, purchaseCount) {
  const created = { createdAt: { gte: start, lt: end } };
  const [cartSess, checkSess, cartEvents, checkEvents] = await Promise.all([
    prisma.analyticsEvent.findMany({ where: { ...created, eventType: "add_to_cart" }, distinct: ["sessionId"], select: { sessionId: true } }),
    prisma.analyticsEvent.findMany({ where: { ...created, eventType: "begin_checkout" }, distinct: ["sessionId"], select: { sessionId: true } }),
    prisma.analyticsEvent.findMany({ where: { ...created, eventType: "add_to_cart" }, select: { sessionId: true, payload: true } }),
    prisma.analyticsEvent.findMany({ where: { ...created, eventType: "begin_checkout" }, select: { sessionId: true, payload: true } }),
  ]);
  const checkoutSet = new Set(checkSess.map((s) => s.sessionId));
  let abandonedCartValue = 0;
  const seenCart = new Set();
  for (const ev of cartEvents) {
    if (checkoutSet.has(ev.sessionId) || seenCart.has(ev.sessionId)) continue;
    seenCart.add(ev.sessionId);
    try {
      const payload = JSON.parse(ev.payload || "{}");
      abandonedCartValue += Number(payload.price || 0) * Number(payload.quantity || 1);
    } catch {}
  }
  let checkoutDropValue = 0;
  const seenCheck = new Set();
  for (const ev of checkEvents) {
    if (seenCheck.has(ev.sessionId)) continue;
    seenCheck.add(ev.sessionId);
    try {
      const payload = JSON.parse(ev.payload || "{}");
      checkoutDropValue += Number(payload.price || 0);
    } catch {}
  }
  return {
    cartsCreated: cartSess.length,
    checkoutStarts: checkSess.length,
    purchases: purchaseCount,
    abandonedBeforeCheckout: Math.max(0, cartSess.length - checkSess.length),
    abandonedAfterCheckout: Math.max(0, checkSess.length - purchaseCount),
    estimatedAbandonedCartValue: abandonedCartValue,
    estimatedCheckoutDropValue: checkoutDropValue,
    note: "Checkout drop-off is estimated against orders in the same dates. Sessions are anonymous.",
  };
}

async function trafficIntelligence(prisma, start, end) {
  const sessions = await prisma.analyticsSession.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { sessionId: true, source: true },
  }).catch(() => []);
  const bySource = new Map();
  for (const s of sessions) {
    const key = s.source || "Direct";
    if (!bySource.has(key)) bySource.set(key, { source: key, sessionIds: new Set() });
    bySource.get(key).sessionIds.add(s.sessionId);
  }
  const rows = [];
  for (const row of bySource.values()) {
    const ids = [...row.sessionIds];
    const [views, carts, checkouts] = await Promise.all([
      prisma.analyticsEvent.count({ where: { sessionId: { in: ids }, eventType: "view_item", createdAt: { gte: start, lt: end } } }),
      prisma.analyticsEvent.count({ where: { sessionId: { in: ids }, eventType: "add_to_cart", createdAt: { gte: start, lt: end } } }),
      prisma.analyticsEvent.count({ where: { sessionId: { in: ids }, eventType: "begin_checkout", createdAt: { gte: start, lt: end } } }),
    ]);
    const paid = await prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lt: end },
        attributionSource: row.source,
        status: { in: ["confirmed", "dispatched", "delivered"] },
      },
      _count: { _all: true },
      _sum: { total: true },
    });
    const orders = paid._count._all;
    const revenue = Number(paid._sum.total || 0);
    rows.push({
      source: row.source,
      visitors: ids.length,
      productViews: views,
      carts,
      checkouts,
      orders,
      revenue,
      conversionRate: ids.length ? Math.round((orders / ids.length) * 1000) / 10 : 0,
    });
  }
  const unknown = await prisma.order.aggregate({
    where: {
      createdAt: { gte: start, lt: end },
      attributionSource: null,
    },
    _count: { _all: true },
    _sum: { total: true },
  });
  if (unknown._count._all) {
    rows.push({
      source: "Unknown",
      visitors: 0,
      productViews: 0,
      carts: 0,
      checkouts: 0,
      orders: unknown._count._all,
      revenue: Number(unknown._sum.total || 0),
      conversionRate: 0,
    });
  }
  return rows.sort((a, b) => b.visitors - a.visitors || b.orders - a.orders);
}

async function inventoryDemandIntelligence(prisma, start, end) {
  const [views, carts, products, paid] = await Promise.all([
    countByProduct(prisma, "view_item", start, end),
    countByProduct(prisma, "add_to_cart", start, end),
    prisma.product.findMany({
      select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true, inStock: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end }, status: { in: ["confirmed", "dispatched", "delivered"] } },
      select: { items: { select: { productId: true, quantity: true } } },
    }),
  ]);
  const units = {};
  for (const order of paid) {
    for (const item of order.items || []) {
      units[item.productId] = (units[item.productId] || 0) + Number(item.quantity || 0);
    }
  }
  return products.map((p) => {
    const v = views[p.id] || 0;
    const c = carts[p.id] || 0;
    const u = units[p.id] || 0;
    const tag = classifyInventoryDemand({
      views: v,
      carts: c,
      purchases: u,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      inStock: p.inStock,
    });
    return {
      productId: p.id,
      name: p.name,
      views: v,
      carts: c,
      purchases: u,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      label: tag.label,
      tone: tag.tone,
    };
  }).filter((p) => p.tone !== "neutral" && p.tone !== "ok").slice(0, 20);
}

async function topPurchasedFromOrders(prisma, start, end, take = 5) {
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      status: { in: ["confirmed", "dispatched", "delivered"] },
    },
    select: { items: { select: { productId: true, name: true, quantity: true } } },
  });
  const map = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      const key = item.productId || item.name;
      const cur = map.get(key) || { productId: item.productId, name: item.name, count: 0 };
      cur.count += Number(item.quantity) || 0;
      map.set(key, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, take);
}

export function formatDailyReport(summary) {
  const lines = [
    `👥 Visitors: ${summary.visitors ?? 0}`,
    `👀 Page views: ${summary.pageViews ?? 0}`,
    `🛍️ Product views: ${summary.productViews ?? 0}`,
    `🛒 Add-to-carts: ${summary.addToCarts ?? 0}`,
    `💳 Checkouts: ${summary.checkouts ?? 0}`,
    `💰 Orders: ${summary.orders ?? 0}`,
    `💵 Revenue: ₦${Number(summary.revenue || 0).toLocaleString("en-NG")}`,
  ];
  const viewed = summary.topViewed?.[0];
  if (viewed) lines.push(`🔥 Most viewed: ${viewed.name} — ${viewed.count} views`);
  const carted = summary.topAddedToCart?.[0];
  if (carted) lines.push(`🛒 Most added: ${carted.name} — ${carted.count} carts`);
  const bought = summary.topPurchased?.[0];
  if (bought) lines.push(`💰 Most purchased: ${bought.name} — ${bought.count} units`);
  const attention = summary.needsAttention?.[0];
  if (attention) lines.push(`⚠️ Needs attention: ${attention.name} — ${attention.views} views, ${attention.purchases} purchases`);
  const traffic = summary.traffic?.[0];
  if (traffic) lines.push(`📈 Top source: ${traffic.source} — ${traffic.visitors} visitors`);
  return {
    title: "📊 Splendid E-Cosmetics",
    body: `Yesterday\n\n${lines.join("\n")}`,
  };
}

export async function runDailyReport(prisma, sendToOwner) {
  const { start, end, key } = previousLagosDay();
  const settingKey = `daily_analytics_report:${key}`;
  const already = await prisma.adminSetting.findUnique({ where: { key: settingKey } }).catch(() => null);
  if (already) return { sent: false, reason: "already-sent", day: key };

  const summary = await summarizeAnalytics(prisma, "yesterday");
  const copy = formatDailyReport(summary);
  await prisma.notificationLog.create({
    data: {
      title: copy.title,
      body: copy.body,
      audience: "owner-daily",
      sentCount: 0,
      failedCount: 0,
    },
  }).catch(() => {});

  let sent = 0;
  if (typeof sendToOwner === "function") {
    const result = await sendToOwner(copy);
    sent = Number(result?.sent || 0);
  }

  await prisma.adminSetting.upsert({
    where: { key: settingKey },
    create: { key: settingKey, value: String(sent) },
    update: { value: String(sent) },
  });
  return { sent: true, day: key, summary, fcmSent: sent };
}
