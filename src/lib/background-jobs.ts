import { prisma } from "./db";

export interface JobRecord {
  id: string;
  type: string;
  payload: any;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  runAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Claims a batch of jobs for execution safely using PostgreSQL row-level locking (SKIP LOCKED).
 * Never uses invalid "UPDATE ... ORDER BY ... LIMIT" syntax.
 * Overlapping workers will skip currently claimed jobs without blocking or deadlocks.
 */
export async function claimBackgroundJobs(
  workerId: string,
  batchSize = 5,
  leaseMinutes = 5
): Promise<JobRecord[]> {
  try {
    const claimed = await prisma.$queryRaw<JobRecord[]>`
      WITH claimable AS (
        SELECT id
        FROM "JobQueue"
        WHERE (status = 'PENDING' AND "runAt" <= NOW())
           OR (status = 'PROCESSING' AND "lockedAt" < NOW() - (${leaseMinutes} * INTERVAL '1 minute'))
        ORDER BY "runAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "JobQueue"
      SET status = 'PROCESSING',
          "lockedAt" = NOW(),
          "lockedBy" = ${workerId},
          attempts = attempts + 1,
          "updatedAt" = NOW()
      FROM claimable
      WHERE "JobQueue".id = claimable.id
      RETURNING "JobQueue".*;
    `;

    return claimed || [];
  } catch (error) {
    console.error("claimBackgroundJobs error:", error);
    return [];
  }
}

/**
 * Enqueues a new background job.
 * type: e.g. "REMINDER_SEND", "PUSH_NOTIFY", etc.
 * payload: job‑specific data.
 * runAt: when the job should first be considered (default now).
 */
export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  runAt?: Date
): Promise<JobRecord> {
  const id = crypto.randomUUID();
  const created = await prisma.jobQueue.create({
    data: {
      id,
      type,
      payload: JSON.stringify(payload ?? {}),
      status: "PENDING",
      runAt: runAt ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return {
    id: created.id,
    type: created.type,
    payload: typeof created.payload === "string" ? JSON.parse(created.payload) : created.payload,
    status: created.status,
    attempts: created.attempts,
    maxAttempts: created.maxAttempts,
    lastError: created.lastError,
    lockedAt: created.lockedAt ?? null,
    lockedBy: created.lockedBy ?? null,
    runAt: created.runAt,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * Marks a claimed job as COMPLETED upon successful processing.
 */
export async function completeJob(jobId: string): Promise<void> {
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      lockedAt: null,
      lockedBy: null,
    },
  });
}

/**
 * Handles job failure with exponential backoff or marks FAILED if maxAttempts reached.
 */
export async function failJob(
  jobId: string,
  currentAttempts: number,
  maxAttempts: number,
  errorMessage: string
): Promise<void> {
  const isFinal = currentAttempts >= maxAttempts;
  const backoffMinutes = Math.min(60, Math.pow(2, currentAttempts)); // 2, 4, 8, 16... mins
  const nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

  await prisma.jobQueue.update({
    where: { id: jobId },
    data: {
      status: isFinal ? "FAILED" : "PENDING",
      lastError: errorMessage.slice(0, 500),
      lockedAt: null,
      lockedBy: null,
      runAt: isFinal ? undefined : nextRunAt,
    },
  });
}

/**
 * Process a single job according to its type.
 * Returns true on success, false on failure.
 */
export async function processJob(job: JobRecord): Promise<void> {
  const payload = typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload;
  switch (job.type) {
    case "REMINDER_SEND": {
      // payload: { reminderId: string }
      const { reminderId } = payload as { reminderId: string };
      await processReminderSend(reminderId);
      break;
    }
    case "PUSH_NOTIFY": {
      // payload: { userId: string, title: string, body: string, link?: string }
      const { userId, title, body, link } = payload as { userId: string; title: string; body: string; link?: string };
      const { dispatchNotification } = await import("./notification-dispatcher");
      await dispatchNotification({ userId, title, body, link });
      break;
    }
    default:
      console.warn(`[JobProcessor] Unknown job type: ${job.type}`);
      // Mark as completed to avoid infinite retry
      await completeJob(job.id);
      return;
  }
  await completeJob(job.id);
}

async function processReminderSend(reminderId: string) {
  // Fetch reminder with customer
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: { customer: { select: { id: true, name: true, assignedToId: true } } },
  });
  if (!reminder || reminder.status !== "PENDING") return;

  const targetUserId = reminder.userId || reminder.customer?.assignedToId;
  if (!targetUserId) return;

  // Create in-app notification
  await prisma.notification.create({
    data: {
      userId: targetUserId,
      title: `تذكير: ${reminder.title}`,
      body: `موعد المتابعة للعميل ${reminder.customer?.name || ""}`,
      type: "INFO",
      link: `/dashboard/customers/${reminder.customerId}`,
    },
  });

  // Dispatch push if VAPID configured
  const { dispatchNotification } = await import("./notification-dispatcher");
  await dispatchNotification({
    userId: targetUserId,
    title: `تذكير: ${reminder.title}`,
    body: `موعد المتابعة للعميل ${reminder.customer?.name || ""}`,
    link: `/dashboard/customers/${reminder.customerId}`,
    createInAppRecord: false, // already created
  });
}
