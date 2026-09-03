import { sendToFid, isUnregisteredError, ensureMessaging } from "./firebaseAdmin.js";

/**
 * Shared send loop for a list of PushSubscription rows.
 * Disables invalid targets; never throws to the caller.
 */
async function sendToSubscriptions(prisma, subs, { title, body, data, link, image }) {
  const messaging = await ensureMessaging();
  if (!messaging) {
    return { sent: 0, failed: 0, error: "Push notifications are not configured on the server.", totalTargets: 0 };
  }

  const usable = (subs || []).filter(
    (s) =>
      (s.token && String(s.token).length > 80) ||
      (s.installationId && String(s.installationId).length > 80)
  );

  if (!usable.length) {
    return {
      sent: 0,
      failed: 0,
      errors: ["No usable push targets for this audience."],
      totalTargets: 0,
    };
  }

  let sent = 0;
  let failed = 0;
  const toDisable = [];
  const errors = [];
  const batchSize = 25;

  for (let i = 0; i < usable.length; i += batchSize) {
    const batch = usable.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (sub) => {
        const result = await sendToFid(sub.installationId, {
          title,
          body,
          data,
          link,
          image: image || null,
          token: sub.token || null,
        });
        if (result.success) {
          sent += 1;
          await prisma.pushSubscription
            .update({ where: { id: sub.id }, data: { lastSentAt: new Date(), failCount: 0 } })
            .catch(() => {});
        } else {
          failed += 1;
          if (errors.length < 5) errors.push(String(result.errorCode || "unknown"));
          if (
            isUnregisteredError(result.errorCode) ||
            String(result.errorCode).includes("invalid") ||
            String(result.errorCode).includes("not-found")
          ) {
            toDisable.push(sub.id);
          } else {
            await prisma.pushSubscription
              .update({ where: { id: sub.id }, data: { failCount: { increment: 1 } } })
              .catch(() => {});
            try {
              const row = await prisma.pushSubscription.findUnique({ where: { id: sub.id } });
              if (row && row.failCount >= 3) toDisable.push(sub.id);
            } catch {
              /* ignore */
            }
          }
        }
      })
    );
  }

  if (toDisable.length) {
    await prisma.pushSubscription
      .updateMany({ where: { id: { in: toDisable } }, data: { enabled: false } })
      .catch(() => {});
  }

  return { sent, failed, errors, totalTargets: usable.length };
}

/** Broadcast to every enabled subscriber (admin promotions, etc.) */
export async function sendToAllActive(prisma, { title, body, data, link, image }) {
  const messaging = await ensureMessaging();
  if (!messaging) {
    return { sent: 0, failed: 0, error: "Push notifications are not configured on the server." };
  }

  let subs = [];
  try {
    subs = await prisma.pushSubscription.findMany({
      where: { enabled: true },
      select: { id: true, installationId: true, token: true },
    });
  } catch (err) {
    console.error("[FCM] cannot read subscriptions (table may be missing):", err?.message);
    return { sent: 0, failed: 0, error: "Notification database table not ready yet." };
  }

  const junk = subs.filter(
    (s) =>
      !(s.token && String(s.token).length > 80) &&
      !(s.installationId && String(s.installationId).length > 80)
  );
  if (junk.length) {
    await prisma.pushSubscription
      .updateMany({ where: { id: { in: junk.map((j) => j.id) } }, data: { enabled: false } })
      .catch(() => {});
  }
  subs = subs.filter(
    (s) =>
      (s.token && String(s.token).length > 80) ||
      (s.installationId && String(s.installationId).length > 80)
  );

  if (!subs.length) {
    return {
      sent: 0,
      failed: 0,
      errors: [
        "No subscribers with a valid web push token. Customers must enable notifications again on the live site.",
      ],
      totalTargets: 0,
    };
  }

  return sendToSubscriptions(prisma, subs, { title, body, data, link, image });
}

/**
 * Targeted send: only devices linked to a specific order via OrderNotificationRecipient.
 */
export async function sendToOrderRecipients(prisma, orderId, { title, body, data, link, image }) {
  const messaging = await ensureMessaging();
  if (!messaging) {
    return { sent: 0, failed: 0, error: "Push notifications are not configured on the server.", totalTargets: 0 };
  }

  let links = [];
  try {
    links = await prisma.orderNotificationRecipient.findMany({
      where: { orderId },
      include: {
        pushSubscription: {
          select: { id: true, installationId: true, token: true, enabled: true },
        },
      },
    });
  } catch (err) {
    console.error("[FCM] cannot read order recipients:", err?.message);
    return { sent: 0, failed: 0, error: "Order notification table not ready yet.", totalTargets: 0 };
  }

  const subs = links
    .map((l) => l.pushSubscription)
    .filter((s) => s && s.enabled);

  if (!subs.length) {
    return { sent: 0, failed: 0, errors: [], totalTargets: 0 };
  }

  return sendToSubscriptions(prisma, subs, { title, body, data, link, image });
}

/** Non-blocking broadcast */
export function notifyAllSafe(prisma, payload) {
  setTimeout(() => {
    sendToAllActive(prisma, payload).catch((err) => {
      console.error("[FCM auto-notify]", err?.message || err);
    });
  }, 0);
}

/** Non-blocking order-targeted push + optional NotificationLog */
export function notifyOrderSafe(prisma, orderId, payload) {
  setTimeout(() => {
    (async () => {
      try {
        const result = await sendToOrderRecipients(prisma, orderId, payload);
        try {
          await prisma.notificationLog.create({
            data: {
              title: String(payload.title || "").slice(0, 200),
              body: String(payload.body || "").slice(0, 2000),
              audience: `order:${orderId}`,
              sentCount: result.sent || 0,
              failedCount: result.failed || 0,
            },
          });
        } catch (logErr) {
          console.error("[FCM order-notify] log failed:", logErr?.message || logErr);
        }
        if (result.error) {
          console.error("[FCM order-notify]", result.error);
        }
      } catch (err) {
        console.error("[FCM order-notify]", err?.message || err);
      }
    })();
  }, 0);
}

/** Polished copy for real order statuses in this project */
export function orderStatusPushCopy(orderId, status) {
  const id = String(orderId || "");
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return {
        title: "Order received 🛍️",
        body: `We've received your order #${id} and are reviewing it.`,
      };
    case "verifying":
      return {
        title: "Payment under review 💛",
        body: `We're verifying your payment for order #${id}. Hang tight!`,
      };
    case "confirmed":
      return {
        title: "Payment confirmed ✨",
        body: `Your payment for order #${id} has been confirmed.`,
      };
    case "dispatched":
      return {
        title: "Your order is on the way 🚚",
        body: `Order #${id} has been dispatched and is heading to you.`,
      };
    case "delivered":
      return {
        title: "Your order has arrived 🎉",
        body: `Order #${id} has been delivered. We hope you love it!`,
      };
    default:
      return {
        title: "Order update",
        body: `Your order #${id} status is now: ${status}.`,
      };
  }
}

/**
 * Link an enabled PushSubscription to an order (checkout-time association).
 * Never throws — order flow must not depend on push.
 */
export async function linkInstallationToOrder(prisma, orderId, installationId) {
  try {
    if (!orderId || !installationId || typeof installationId !== "string") return false;
    const fid = installationId.trim();
    if (fid.length < 16 || fid.length > 4096) return false;
    if (fid.startsWith("test-") || fid.includes("debug")) return false;

    const sub = await prisma.pushSubscription.findFirst({
      where: { installationId: fid, enabled: true },
      select: { id: true },
    });
    if (!sub) return false;

    await prisma.orderNotificationRecipient.upsert({
      where: {
        orderId_pushSubscriptionId: {
          orderId,
          pushSubscriptionId: sub.id,
        },
      },
      create: { orderId, pushSubscriptionId: sub.id },
      update: {},
    });
    return true;
  } catch (err) {
    console.error("[FCM link order]", err?.message || err);
    return false;
  }
}
