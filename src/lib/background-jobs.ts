import { prisma } from "./db";
import { randomUUID } from "crypto";

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
  claimToken: string | null;
}

/**
 * Claims a batch of jobs for execution safely using PostgreSQL row-level locking (SKIP LOCKED).
 * Each claim generates a unique claimToken for lease fencing.
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
          "updatedAt" = NOW(),
          claimToken = ${randomUUID()}
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
  const id = randomUUID();
  const dispatchKey = (payload as any).dispatchKey || randomUUID();

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
    claimToken: null,
  };
}

/**
 * Marks a claimed job as COMPLETED upon successful processing.
 * Requires the caller to present the correct claimToken (lease fencing).
 * If the token does not match (job was re-claimed by another worker), the update is skipped.
 */
export async function completeJob(jobId: string, claimToken: string): Promise<boolean> {
  const result = await prisma.$executeRaw`
    UPDATE "JobQueue"
    SET status = 'COMPLETED',
        lockedAt = NULL,
        lockedBy = NULL,
        claimToken = NULL,
        updatedAt = NOW()
    WHERE id = ${jobId}
      AND claimToken = ${claimToken}
      AND status = 'PROCESSING';
  `;

  if (result === 0) {
    console.warn(
      `[JobProcessor] completeJob skipped for job ${jobId}: claimToken mismatch or job not PROCESSING (possibly re-claimed)`
    );
    return false;
  }
  return true;
}

/**
 * Handles job failure with exponential backoff or marks FAILED if maxAttempts reached.
 * Requires the caller to present the correct claimToken (lease fencing).
 */
export async function failJob(
  jobId: string,
  currentAttempts: number,
  maxAttempts: number,
  errorMessage: string,
  claimToken: string
): Promise<boolean> {
  const isFinal = currentAttempts >= maxAttempts;
  const backoffMinutes = Math.min(60, Math.pow(2, currentAttempts));
  const nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

  const result = await prisma.$executeRaw`
    UPDATE "JobQueue"
    SET status = ${isFinal ? "FAILED" : "PENDING"},
        lastError = ${errorMessage.slice(0, 500)},
        lockedAt = NULL,
        lockedBy = NULL,
        claimToken = NULL,
        runAt = ${isFinal ? null : nextRunAt},
        updatedAt = NOW()
    WHERE id = ${jobId}
      AND claimToken = ${claimToken}
      AND status = 'PROCESSING';
  `;

  if (result === 0) {
    console.warn(
      `[JobProcessor] failJob skipped for job ${jobId}: claimToken mismatch or job not PROCESSING (possibly re-claimed)`
    );
    return false;
  }
  return true;
}

/**
 * Process a single job according to its type.
 * Handles its own success/failure status updates internally.
 * Errors are caught and logged; the job is marked failed with retry logic.
 */
export async function processJob(job: JobRecord): Promise<void> {
  const payload = typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload;
  const claimToken = job.claimToken;

  try {
    switch (job.type) {
      case "REMINDER_SEND": {
        const { reminderId, dispatchId } = payload as {
          reminderId: string;
          dispatchId: string;
        };
        await processReminderSend(reminderId, dispatchId);
        break;
      }
      case "PUSH_NOTIFY": {
        const { userId, title, body, link, dispatchKey } = payload as {
          userId: string;
          title: string;
          body: string;
          link?: string;
          dispatchKey: string;
        };
        const { dispatchNotification } = await import("./notification-dispatcher");
        await dispatchNotification({
          userId,
          title,
          body,
          link,
          dispatchKey,
        });
        break;
      }
      default: {
        console.warn(
          `[JobProcessor] Unknown job type: ${job.type} (ID: ${job.id}) — marking as FAILED, not COMPLETED`
        );
        await failJob(
          job.id,
          job.attempts,
          job.maxAttempts,
          `Unknown job type: ${job.type}`,
          claimToken || ""
        );
        return;
      }
    }

    // Mark job as completed (success)
    await completeJob(job.id, claimToken || "");
  } catch (error) {
    console.error(`[JobProcessor] Failed job ${job.id} (type: ${job.type}):`, error);

    // Handle failure with retry logic
    await failJob(
      job.id,
      job.attempts,
      job.maxAttempts,
      error instanceof Error ? error.message : String(error),
      claimToken || ""
    );
  }
}

/**
 * Process a REMINDER_SEND job with idempotency.
 * Uses dedupKey to ensure only one notification is created per (reminderId, dispatchId) pair.
 * If the notification already exists (duplicate dispatch), push is also skipped.
 */
async function processReminderSend(reminderId: string, dispatchId: string): Promise<void> {
  // Fetch reminder with customer
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: { customer: { select: { id: true, name: true, assignedToId: true } } },
  });

  if (!reminder) {
    console.warn(`[JobProcessor] Reminder ${reminderId} not found, skipping`);
    return;
  }

  if (reminder.status !== "PENDING") {
    console.log(`[JobProcessor] Reminder ${reminderId} is no longer PENDING (status: ${reminder.status}), skipping`);
    return;
  }

  const targetUserId = reminder.userId || reminder.customer?.assignedToId;
  if (!targetUserId) {
    console.warn(`[JobProcessor] Reminder ${reminderId} has no target user, skipping`);
    return;
  }

  const dedupKey = `REMINDER_SEND:${reminderId}:${dispatchId}`;

  // Create in-app notification idempotently
  try {
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: `تذكير: ${reminder.title}`,
        body: `موعد المتابعة للعميل ${reminder.customer?.name || ""}`,
        type: "INFO",
        link: `/dashboard/customers/${reminder.customerId}`,
        dedupKey,
        dedupAt: new Date(),
      },
    });
  } catch (err: any) {
    // P2002 = unique constraint violation → notification already exists for this dispatch
    if (err?.code === "P2002") {
      console.log(
        `[JobProcessor] Notification already exists for dedupKey=${dedupKey}, skipping push as well`
      );
      return;
    }
    throw err;
  }

  // Dispatch push if VAPID configured
  const { dispatchNotification } = await import("./notification-dispatcher");
  await dispatchNotification({
    userId: targetUserId,
    title: `تذكير: ${reminder.title}`,
    body: `موعد المتابعة للعميل ${reminder.customer?.name || ""}`,
    link: `/dashboard/customers/${reminder.customerId}`,
    dispatchKey: `REMINDER_PUSH:${reminderId}:${dispatchId}`,
    createInAppRecord: false,
  });
}