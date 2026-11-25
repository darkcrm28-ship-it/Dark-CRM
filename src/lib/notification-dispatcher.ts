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

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

export type PushDeliveryOutcome =
  | "PROVIDER_ACCEPTED"
  | "EXPIRED"
  | "FAILED"
  | "UNKNOWN"
  | "SKIPPED_NO_KEYS";

export interface DispatchNotificationOptions {
  userId: string;
  title: string;
  body: string;
  link?: string;
  type?: string;
  createInAppRecord?: boolean;
  dispatchKey?: string;
}

type OutcomeRow = {
  id: string;
  outcome: string;
  statusCode: number | null;
};

const TERMINAL_OUTCOMES = new Set(["PROVIDER_ACCEPTED", "EXPIRED"]);

async function findOrCreateNotification(params: {
  userId: string;
  title: string;
  body: string;
  link?: string;
  type: string;
  dispatchKey?: string;
}): Promise<string | undefined> {
  const { userId, title, body, link, type, dispatchKey } = params;

  if (dispatchKey) {
    const existing = await prisma.notification.findUnique({ where: { dedupKey: dispatchKey } });
    if (existing) {
      if (existing.userId !== userId) {
        throw new Error("dispatchKey already belongs to a different user");
      }
      return existing.id;
    }
  }

  try {
    const created = await prisma.notification.create({
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
    return created.id;
  } catch (err) {
    if (!dispatchKey || !isUniqueViolation(err)) throw err;
    const existing = await prisma.notification.findUnique({ where: { dedupKey: dispatchKey } });
    if (!existing || existing.userId !== userId) throw err;
    return existing.id;
  }
}

/**
 * Reserves an outbox slot for (dispatchKey, endpoint). Returns null when the
 * slot is already in a terminal state and no delivery should be attempted.
 */
async function reserveOutbox(params: {
  dispatchKey?: string;
  endpoint: string;
  notificationId?: string;
  userId: string;
}): Promise<OutcomeRow | null> {
  const { dispatchKey, endpoint, notificationId, userId } = params;
  if (!dispatchKey) {
    return await prisma.pushDeliveryLog.create({
      data: { notificationId: notificationId || null, userId, endpoint, outcome: "UNKNOWN" },
    });
  }

  let row = await prisma.pushDeliveryLog.findFirst({
    where: { dispatchKey, endpoint },
  });
  if (row && TERMINAL_OUTCOMES.has(row.outcome)) return null;

  if (!row) {
    try {
      row = await prisma.pushDeliveryLog.create({
        data: {
          notificationId: notificationId || null,
          userId,
          endpoint,
          outcome: "UNKNOWN",
          dispatchKey,
        },
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      row = await prisma.pushDeliveryLog.findFirst({ where: { dispatchKey, endpoint } });
      if (!row) throw err;
      if (TERMINAL_OUTCOMES.has(row.outcome)) return null;
    }
  }

  // Claim the unresolved slot conditionally so competing workers cannot both send.
  const claimed = await prisma.pushDeliveryLog.updateMany({
    where: {
      id: row.id,
      outcome: { in: ["UNKNOWN", "FAILED", "SKIPPED_NO_KEYS"] },
    },
    data: { outcome: "UNKNOWN", statusCode: null, errorDetails: null, updatedAt: new Date() },
  });
  if (claimed.count === 1) {
    return { ...row, outcome: "UNKNOWN", statusCode: null };
  }

  const current = await prisma.pushDeliveryLog.findUnique({ where: { id: row.id } });
  if (!current || TERMINAL_OUTCOMES.has(current.outcome)) return null;
  return { ...current, statusCode: current.statusCode ?? null };
}

async function settleOutbox(params: {
  id: string;
  dispatchKey?: string;
  endpoint: string;
  outcome: PushDeliveryOutcome;
  statusCode?: number;
  errorDetails?: string;
}): Promise<void> {
  const { id, dispatchKey, endpoint, outcome, statusCode, errorDetails } = params;
  const updated = await prisma.pushDeliveryLog.updateMany({
    where: { id, outcome: "UNKNOWN" },
    data: {
      outcome,
      statusCode: statusCode ?? null,
      errorDetails: errorDetails ? errorDetails.slice(0, 500) : null,
      updatedAt: new Date(),
    },
  });

  if (updated.count !== 1) {
    const current = await prisma.pushDeliveryLog.findFirst({
      where: dispatchKey ? { dispatchKey, endpoint } : { id },
    });
    if (!current) throw new Error("Push delivery log row disappeared before settlement");
  }
}

/**
 * Dispatches an in-app notification (optionally deduplicated by dispatchKey)
 * and attempts push delivery to every subscription, recording one outbox row
 * per (dispatchKey, endpoint).
 */
export async function dispatchNotification(options: DispatchNotificationOptions): Promise<{
  notificationId?: string;
  pushOutcomes: Array<{ endpoint: string; outcome: PushDeliveryOutcome; statusCode?: number }>;
}> {
  const {
    userId,
    title,
    body,
    link,
    type = "INFO",
    createInAppRecord = true,
    dispatchKey,
  } = options;

  const notificationId = createInAppRecord
    ? await findOrCreateNotification({ userId, title, body, link, type, dispatchKey })
    : undefined;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) {
    return { notificationId, pushOutcomes: [] };
  }

  const vapidReady = ensureVapidConfigured();
  const pushOutcomes: Array<{ endpoint: string; outcome: PushDeliveryOutcome; statusCode?: number }> = [];

  for (const sub of subscriptions) {
    const reserved = await reserveOutbox({
      dispatchKey,
      endpoint: sub.endpoint,
      notificationId,
      userId,
    });
    if (!reserved) {
      const terminal = await prisma.pushDeliveryLog.findFirst({
        where: dispatchKey ? { dispatchKey, endpoint: sub.endpoint } : { id: sub.id },
      });
      const outcome = (terminal?.outcome as PushDeliveryOutcome) || "PROVIDER_ACCEPTED";
      pushOutcomes.push({ endpoint: sub.endpoint, outcome, statusCode: terminal?.statusCode ?? undefined });
      continue;
    }

    if (!vapidReady) {
      await settleOutbox({
        id: reserved.id,
        dispatchKey,
        endpoint: sub.endpoint,
        outcome: "SKIPPED_NO_KEYS",
      });
      pushOutcomes.push({ endpoint: sub.endpoint, outcome: "SKIPPED_NO_KEYS" });
      continue;
    }

    try {
      const response = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        JSON.stringify({ title, body, url: link })
      );
      const outcome: PushDeliveryOutcome =
        response.statusCode >= 200 && response.statusCode < 300 ? "PROVIDER_ACCEPTED" : "UNKNOWN";
      await settleOutbox({
        id: reserved.id,
        dispatchKey,
        endpoint: sub.endpoint,
        outcome,
        statusCode: response.statusCode,
      });
      pushOutcomes.push({ endpoint: sub.endpoint, outcome, statusCode: response.statusCode });
    } catch (err: any) {
      const statusCode = typeof err?.statusCode === "number" ? err.statusCode : undefined;
      const expired = statusCode === 410 || statusCode === 404;
      const outcome: PushDeliveryOutcome = expired ? "EXPIRED" : "FAILED";
      await settleOutbox({
        id: reserved.id,
        dispatchKey,
        endpoint: sub.endpoint,
        outcome,
        statusCode,
        errorDetails: String(err?.message || err),
      });
      if (expired) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
      }
      pushOutcomes.push({ endpoint: sub.endpoint, outcome, statusCode });
    }
  }

  return { notificationId, pushOutcomes };
}

/**
 * Handles reminder state transitions (completion and reopening) atomically.
 * Reopening generates a distinct notification and audit event.
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
      include: { customer: { select: { id: true, name: true, assignedToId: true } } },
    });
    if (!existing) throw new Error("التذكير غير موجود.");

    const newStatus = isDone ? "COMPLETED" : "PENDING";
    if (existing.status === newStatus) return existing;

    const updated = await tx.reminder.update({
      where: { id: reminderId },
      data: { status: newStatus },
    });

    const isReopening = existing.status === "COMPLETED" && newStatus === "PENDING";
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
            dedupKey: `REMINDER_REOPENED:${reminderId}:${Date.now()}`,
            dedupAt: new Date(),
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
