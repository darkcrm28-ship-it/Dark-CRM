import webpush from "web-push";
import { prisma } from "./db";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@dark-crm.com";

  if (!publicKey || !privateKey) return false;

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("VAPID config error:", err);
    return false;
  }
}

export type PushDeliveryOutcome = "PROVIDER_ACCEPTED" | "EXPIRED" | "FAILED" | "UNKNOWN" | "SKIPPED_NO_KEYS";

export interface DispatchNotificationOptions {
  userId: string;
  title: string;
  body: string;
  link?: string;
  type?: string;
  createInAppRecord?: boolean;
  dispatchKey?: string;
}

/**
 * Dispatches an in-app notification and attempts push delivery to all registered subscriptions.
 * Distinguishes in-app records from push provider acceptance and records delivery logs.
 */
export async function dispatchNotification(options: DispatchNotificationOptions): Promise<{
  notificationId?: string;
  pushOutcomes: Array<{ endpoint: string; outcome: PushDeliveryOutcome; statusCode?: number }>;
}> {
  const { userId, title, body, link, type = "INFO", createInAppRecord = true, dispatchKey } = options;

  let inAppNotificationId: string | undefined;

  // 1. Create In-App Notification Record (idempotent if dispatchKey provided)
  if (createInAppRecord) {
    const notif = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        link: link || null,
        read: false,
        dedupKey: dispatchKey || null,
        dedupAt: dispatchKey ? new Date() : null,
      },
    });
    inAppNotificationId = notif.id;
  }

  // 2. Fetch User's Push Subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { notificationId: inAppNotificationId, pushOutcomes: [] };
  }

  if (!ensureVapidConfigured()) {
    console.warn("[Push Dispatch] VAPID keys not configured; skipped push.");
    return {
      notificationId: inAppNotificationId,
      pushOutcomes: subscriptions.map((s) => ({
        endpoint: s.endpoint,
        outcome: "SKIPPED_NO_KEYS",
      })),
    };
  }

  // 3. Dispatch to Push Provider & Log Outcomes
  const pushOutcomes: Array<{ endpoint: string; outcome: PushDeliveryOutcome; statusCode?: number }> = [];

  for (const sub of subscriptions) {
    const pushConfig = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh },
    };

    try {
      const response = await webpush.sendNotification(
        pushConfig,
        JSON.stringify({ title, body, url: link })
      );

      const statusCode = response.statusCode;
      // PROVIDER_ACCEPTED: the push provider accepted the message for delivery.
      // This does NOT prove the device received it, only that the provider accepted it.
      const outcome: PushDeliveryOutcome = statusCode >= 200 && statusCode < 300 ? "PROVIDER_ACCEPTED" : "UNKNOWN";

      pushOutcomes.push({ endpoint: sub.endpoint, outcome, statusCode });

      // Log delivery attempt with dispatchKey for idempotency
      await prisma.pushDeliveryLog.create({
        data: {
          notificationId: inAppNotificationId || null,
          userId,
          endpoint: sub.endpoint,
          outcome,
          statusCode,
          dispatchKey: dispatchKey || null,
        },
      }).catch(() => {});
    } catch (err: any) {
      const statusCode = err?.statusCode;
      let outcome: PushDeliveryOutcome = "FAILED";

      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired or invalid; prune from database
        outcome = "EXPIRED";
        await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
      }

      pushOutcomes.push({ endpoint: sub.endpoint, outcome, statusCode });

      // Log failure/expiration with dispatchKey
      await prisma.pushDeliveryLog.create({
        data: {
          notificationId: inAppNotificationId || null,
          userId,
          endpoint: sub.endpoint,
          outcome,
          statusCode: statusCode || null,
          errorDetails: String(err?.message || err).slice(0, 500),
          dispatchKey: dispatchKey || null,
        },
      }).catch(() => {});
    }
  }

  return { notificationId: inAppNotificationId, pushOutcomes };
}

/**
 * Handles reminder state transitions (creation, completion, and reopening).
 * Reopening generates a distinct notification and audit event, preventing duplicate processing.
 */
export async function handleReminderStatusChange(params: {
  reminderId: string;
  isDone: boolean;
  operatorUserId: string;
}) {
  const { reminderId, isDone, operatorUserId } = params;

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.reminder.findUnique({
      where: { id: reminderId },
      include: {
        customer: { select: { id: true, name: true, assignedToId: true } },
      },
    });

    if (!existing) throw new Error("التذكير غير موجود.");

    const newStatus = isDone ? "COMPLETED" : "PENDING";
    if (existing.status === newStatus) {
      return existing; // Idempotent no-op
    }

    const updated = await tx.reminder.update({
      where: { id: reminderId },
      data: { status: newStatus },
    });

    const isReopening = existing.status === "COMPLETED" && newStatus === "PENDING";

    // Reopening generates a distinct event
    if (isReopening) {
      const targetUserId = existing.userId || existing.customer?.assignedToId;
      if (targetUserId) {
        await tx.notification.create({
          data: {
            userId: targetUserId,
            title: `إعادة فتح تذكير: ${existing.title}`,
            body: `تم إعادة فتح التذكير للعميل ${existing.customer?.name || ""}`,
            type: "WARNING",
            link: `/dashboard/customers/${existing.customerId}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: operatorUserId,
          action: "REOPEN_REMINDER",
          entity: "REMINDER",
          entityId: reminderId,
          details: `إعادة فتح تذكير: ${existing.title} للعميل ${existing.customer?.name}`,
        },
      });
    } else if (isDone) {
      await tx.auditLog.create({
        data: {
          userId: operatorUserId,
          action: "COMPLETE_REMINDER",
          entity: "REMINDER",
          entityId: reminderId,
          details: `إنجاز تذكير: ${existing.title} للعميل ${existing.customer?.name}`,
        },
      });
    }

    return updated;
  });
}
