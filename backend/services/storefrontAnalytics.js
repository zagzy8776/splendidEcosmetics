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
  return { accepted: rows.length };
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
    revenue: Number(salesAgg._sum.total || 0),
    topViewed: mostViewed,
    topAddedToCart: mostCarted,
    topPurchased: mostPurchased,
  };
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
  const top = summary.topViewed?.[0];
  const topLine = top ? `\n🔥 Most viewed: ${top.name} — ${top.count} views` : "";
  return {
    title: "📊 Splendid E-Cosmetics — Daily Report",
    body: `${summary.visitors} visitors\n${summary.pageViews} page views\n${summary.productViews} product views\n${summary.addToCarts} add-to-carts\n${summary.checkouts} checkouts\n${summary.orders} orders${topLine}`,
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
