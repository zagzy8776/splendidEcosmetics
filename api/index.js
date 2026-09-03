import { PrismaClient } from "@prisma/client";
import app from "../backend/server.js";

const globalForDashboardPrisma = globalThis;
const prisma =
  globalForDashboardPrisma.__splendidDashboardPrisma ||
  new PrismaClient();

globalForDashboardPrisma.__splendidDashboardPrisma = prisma;

// Reuse the exact requireAdminAuth middleware already registered by server.js.
// This keeps dashboard-summary behind the existing Bearer authentication.
const orderRoute = app?._router?.stack?.find(
  (layer) => layer?.route?.path === "/api/orders"
);
const requireAdminAuth = orderRoute?.route?.stack?.find(
  (layer) => layer?.name === "requireAdminAuth"
)?.handle;

function getNigeriaDayRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const start = new Date(`${values.year}-${values.month}-${values.day}T00:00:00+01:00`);
  const end = new Date(`${values.year}-${values.month}-${values.day}T24:00:00+01:00`);
  return { start, end };
}

if (typeof requireAdminAuth === "function") {
  app.get("/api/admin/dashboard-summary", requireAdminAuth, async (_req, res) => {
    try {
      const { start, end } = getNigeriaDayRange();
      const salesStatuses = ["confirmed", "dispatched", "delivered"];
      const attentionStatuses = ["verifying", "confirmed", "pending"];

      const [statusGroups, todayOrders, todaySales, recentOrders, attentionByStatus] = await Promise.all([
        prisma.order.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.order.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: start, lt: end },
            status: { in: salesStatuses },
          },
          _sum: { total: true },
          _count: { _all: true },
        }),
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            customerName: true,
            total: true,
            status: true,
            createdAt: true,
          },
        }),
        Promise.all(
          attentionStatuses.map((status) =>
            prisma.order.findMany({
              where: { status },
              orderBy: { createdAt: "asc" },
              take: 6,
              select: {
                id: true,
                customerName: true,
                total: true,
                status: true,
                createdAt: true,
              },
            })
          )
        ),
      ]);

      const statusCounts = {
        pending: 0,
        verifying: 0,
        confirmed: 0,
        dispatched: 0,
        delivered: 0,
      };

      for (const group of statusGroups) {
        if (Object.prototype.hasOwnProperty.call(statusCounts, group.status)) {
          statusCounts[group.status] = group._count._all;
        }
      }

      const todaysSales = Number(todaySales._sum.total || 0);
      const qualifyingSalesOrders = Number(todaySales._count._all || 0);
      const averageOrderValue = qualifyingSalesOrders
        ? Math.round(todaysSales / qualifyingSalesOrders)
        : 0;

      const needsAttention = attentionByStatus
        .flat()
        .sort((a, b) => {
          const priority = attentionStatuses.indexOf(a.status) - attentionStatuses.indexOf(b.status);
          if (priority !== 0) return priority;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        })
        .slice(0, 6)
        .map((order) => ({
          id: order.id,
          customerName: order.customerName,
          total: Number(order.total || 0),
          status: order.status,
          createdAt: order.createdAt.toISOString(),
        }));

      res.json({
        ordersToProcess: statusCounts.pending + statusCounts.verifying + statusCounts.confirmed,
        paymentReview: statusCounts.verifying,
        readyToDispatch: statusCounts.confirmed,
        dispatched: statusCounts.dispatched,
        todaysSales,
        todaysOrderCount: todayOrders,
        averageOrderValue,
        statusCounts,
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          customerName: order.customerName,
          total: Number(order.total || 0),
          status: order.status,
          createdAt: order.createdAt.toISOString(),
        })),
        needsAttention,
      });
    } catch (err) {
      console.error("[admin dashboard summary]", err);
      res.status(500).json({ error: "Failed to load dashboard summary" });
    }
  });
}

export default app;
