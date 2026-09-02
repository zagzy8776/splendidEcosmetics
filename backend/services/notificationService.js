import { sendToFid, isUnregisteredError, getMessaging } from "./firebaseAdmin.js";

/**
 * Send to all enabled subscribers. Deactivates invalid FIDs.
 * Non-throwing — always returns counts.
 */
export async function sendToAllActive(prisma, { title, body, data, link }) {
  if (!getMessaging()) {
    return { sent: 0, failed: 0, error: "Push notifications are not configured on the server." };
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { enabled: true },
    select: { id: true, installationId: true },
  });

  let sent = 0;
  let failed = 0;
  const toDisable = [];

  // Sequential batches of 25 to stay within serverless time limits
  const batchSize = 25;
  for (let i = 0; i < subs.length; i += batchSize) {
    const batch = subs.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (sub) => {
        const result = await sendToFid(sub.installationId, { title, body, data, link });
        if (result.success) {
          sent += 1;
          await prisma.pushSubscription
            .update({
              where: { id: sub.id },
              data: { lastSentAt: new Date(), failCount: 0 },
            })
            .catch(() => {});
        } else {
          failed += 1;
          if (isUnregisteredError(result.errorCode)) {
            toDisable.push(sub.id);
          } else {
            await prisma.pushSubscription
              .update({
                where: { id: sub.id },
                data: { failCount: { increment: 1 } },
              })
              .catch(() => {});
          }
        }
      })
    );
  }

  if (toDisable.length) {
    await prisma.pushSubscription
      .updateMany({
        where: { id: { in: toDisable } },
        data: { enabled: false },
      })
      .catch((e) => console.error("[FCM] disable invalid subs", e?.message));
  }

  return { sent, failed };
}

/** Fire-and-forget safe wrapper for automatic notifications */
export function notifyAllSafe(prisma, payload) {
  // Non-blocking; use setTimeout for Vercel serverless compatibility
  setTimeout(() => {
    sendToAllActive(prisma, payload).catch((err) => {
      console.error("[FCM auto-notify]", err?.message || err);
    });
  }, 0);
}
