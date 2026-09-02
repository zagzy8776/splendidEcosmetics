import { sendToFid, isUnregisteredError, ensureMessaging } from "./firebaseAdmin.js";

export async function sendToAllActive(prisma, { title, body, data, link }) {
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

  let sent = 0;
  let failed = 0;
  const toDisable = [];
  const errors = [];
  const batchSize = 25;

  for (let i = 0; i < subs.length; i += batchSize) {
    const batch = subs.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (sub) => {
        const result = await sendToFid(sub.installationId, {
          title,
          body,
          data,
          link,
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
          // Disable bad/test/invalid targets so they don't keep failing
          if (isUnregisteredError(result.errorCode) || String(result.errorCode).includes("invalid") || String(result.errorCode).includes("not-found")) {
            toDisable.push(sub.id);
          } else {
            await prisma.pushSubscription
              .update({ where: { id: sub.id }, data: { failCount: { increment: 1 } } })
              .catch(() => {});
            // After 3 failures, disable
            try {
              const row = await prisma.pushSubscription.findUnique({ where: { id: sub.id } });
              if (row && row.failCount >= 3) toDisable.push(sub.id);
            } catch { /* ignore */ }
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

  return { sent, failed, errors, totalTargets: subs.length };
}

export function notifyAllSafe(prisma, payload) {
  setTimeout(() => {
    sendToAllActive(prisma, payload).catch((err) => {
      console.error("[FCM auto-notify]", err?.message || err);
    });
  }, 0);
}
