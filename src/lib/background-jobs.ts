import { prisma } from "./db";
import { dispatchNotification } from "./notification-dispatcher";

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
  claimToken: string | null;
  runAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ProcessJobResult =
  | { outcome: "COMPLETED" }
  | { outcome: "RETRY_SCHEDULED"; error: string }
  | { outcome: "FAILED"; error: string }
  | { outcome: "OWNERSHIP_LOST" };

type PushOutcome = { endpoint: string; outcome: string; statusCode?: number };

/**
 * An unresolved push attempt is retriable work. PROVIDER_ACCEPTED and EXPIRED
 * are terminal. SKIPPED_NO_KEYS means configuration is missing, so the job must
 * not be silently completed.
 */
function assertPushOutcomes(outcomes: PushOutcome[]): void {
  const retryable = outcomes.filter((o) =>
    ["FAILED", "UNKNOWN", "SKIPPED_NO_KEYS"].includes(o.outcome)
  );
  if (retryable.length > 0) {
    throw new Error(
      `Push delivery unresolved for ${retryable.length} subscription(s): ` +
        retryable.map((o) => `${o.outcome}${o.statusCode ? `(${o.statusCode})` : ""}`).join(", ")
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

/**
 * Claims a batch of jobs atomically using FOR UPDATE SKIP LOCKED and rotates a
 * unique claimToken (generated in Postgres, so no Node crypto is needed in the
 * Worker bundle). Infrastructure errors are rethrown instead of being masked as
 * "no jobs".
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
        WHERE (status = 'PENDING' AND "runAt" <= (NOW() AT TIME ZONE 'UTC'))
           OR (status = 'PROCESSING' AND "lockedAt" < (NOW() AT TIME ZONE 'UTC') - (${leaseMinutes} * INTERVAL '1 minute'))
        ORDER BY "runAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "JobQueue"
      SET status = 'PROCESSING',
          "lockedAt" = (NOW() AT TIME ZONE 'UTC'),
          "lockedBy" = ${workerId},
          attempts = attempts + 1,
          "claimToken" = gen_random_uuid()::text,
          "updatedAt" = (NOW() AT TIME ZONE 'UTC')
      FROM claimable
      WHERE "JobQueue".id = claimable.id
      RETURNING "JobQueue".*;
    `;
    return claimed || [];
  } catch (error) {
    console.error("claimBackgroundJobs error:", error);
    throw error;
  }
}

/** Enqueues a new background job. */
export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  runAt?: Date
): Promise<JobRecord> {
  const created = await prisma.jobQueue.create({
    data: {
      type,
      payload: (payload ?? {}) as any,
      status: "PENDING",
      runAt: runAt ?? new Date(),
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
    claimToken: null,
    runAt: created.runAt,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * Marks a claimed job COMPLETED. Fenced by claimToken so a stale worker cannot
 * complete a job that was reclaimed by another worker.
 */
export async function completeJob(jobId: string, claimToken: string): Promise<boolean> {
  if (!claimToken) return false;
  const res = await prisma.jobQueue.updateMany({
    where: { id: jobId, claimToken },
    data: { status: "COMPLETED", lockedAt: null, lockedBy: null, claimToken: null },
  });
  return res.count > 0;
}

/**
 * Marks failure with exponential backoff, or FAILED when attempts are exhausted.
 * Fenced by claimToken. runAt is preserved on terminal failure.
 */
export async function failJob(
  jobId: string,
  currentAttempts: number,
  maxAttempts: number,
  errorMessage: string,
  claimToken: string,
  currentRunAt?: Date,
  forceFinal = false
): Promise<{ ok: boolean; final: boolean }> {
  if (!claimToken) return { ok: false, final: false };

  const isFinal = forceFinal || currentAttempts >= maxAttempts;
  const data: Record<string, unknown> = {
    status: isFinal ? "FAILED" : "PENDING",
    lastError: errorMessage.slice(0, 500),
    lockedAt: null,
    lockedBy: null,
    claimToken: null,
  };

  if (isFinal) {
    if (currentRunAt) data.runAt = currentRunAt;
  } else {
    const backoffMinutes = Math.min(60, Math.pow(2, currentAttempts));
    data.runAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
  }

  const res = await prisma.jobQueue.updateMany({ where: { id: jobId, claimToken }, data: data as any });
  return { ok: res.count > 0, final: isFinal };
}

/**
 * Processes one claimed job. Expected job-level failures are returned as a
 * result instead of thrown; the caller is responsible for complete/fail.
 */
export async function processJob(job: JobRecord): Promise<ProcessJobResult> {
  const claimToken = job.claimToken;
  if (!claimToken) return { outcome: "OWNERSHIP_LOST" };

  try {
    const current = await prisma.jobQueue.findUnique({
      where: { id: job.id },
      select: { claimToken: true, status: true },
    });
    if (!current || current.claimToken !== claimToken || current.status !== "PROCESSING") {
      return { outcome: "OWNERSHIP_LOST" };
    }

    const payload = (job.payload || {}) as Record<string, any>;

    switch (job.type) {
      case "NOOP": {
        // Lightweight health-check job used by integration tests and cron probes.
        return { outcome: "COMPLETED" };
      }

      case "PUSH_NOTIFY": {
        if (!payload.userId || !payload.title || !payload.body) {
          return { outcome: "FAILED", error: "PUSH_NOTIFY payload missing required fields" };
        }
        const dispatchKey = String(payload.dispatchKey || `PUSH_NOTIFY:${payload.userId}:${job.id}`);
        const result = await dispatchNotification({
          userId: String(payload.userId),
          title: String(payload.title),
          body: String(payload.body),
          link: payload.link ? String(payload.link) : undefined,
          type: payload.type ? String(payload.type) : "INFO",
          createInAppRecord: false,
          dispatchKey,
        });
        assertPushOutcomes(result.pushOutcomes);
        return { outcome: "COMPLETED" };
      }

      case "REMINDER_SEND":
      case "REMINDER_DUE": {
        if (!payload.reminderId) {
          return { outcome: "FAILED", error: "REMINDER job payload missing reminderId" };
        }
        await processReminderDue(String(payload.reminderId), payload.dispatchKey ? String(payload.dispatchKey) : undefined);
        return { outcome: "COMPLETED" };
      }

      default:
        return { outcome: "FAILED", error: `Unknown job type: ${job.type}` };
    }
  } catch (err: any) {
    if (err?.message === "OWNERSHIP_LOST") return { outcome: "OWNERSHIP_LOST" };
    return { outcome: "RETRY_SCHEDULED", error: String(err?.message || err) };
  }
}

/**
 * Creates at most one Notification per reminder dispatch (dedupKey) and records
 * at most one outbox row per (dispatchKey, endpoint). A status change after the
 * first attempt cannot create a second notification because the key is derived
 * from the due date, not from updatedAt.
 */
export async function processReminderDue(reminderId: string, dispatchKeyOverride?: string): Promise<void> {
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: { customer: { select: { id: true, name: true, assignedToId: true } } },
  });
  if (!reminder) throw new Error("Reminder not found");
  if (reminder.status !== "PENDING") return; // completed/cancelled reminders have no work
  if (reminder.dueDate.getTime() > Date.now()) throw new Error("Reminder is not due yet");

  const targetUserId = reminder.userId || reminder.customer?.assignedToId;
  if (!targetUserId) throw new Error("No target user for reminder");

  const dispatchKey =
    dispatchKeyOverride || `REMINDER_SEND:${reminderId}:${reminder.dueDate.getTime()}`;
  const title = `تذكير: ${reminder.title}`;
  const body = `تذكير للعميل ${reminder.customer?.name || ""}`;
  const link = `/dashboard/customers/${reminder.customerId}`;

  let notification = await prisma.notification.findUnique({ where: { dedupKey: dispatchKey } });
  if (notification && notification.userId !== targetUserId) {
    throw new Error("Reminder dedupKey already belongs to a different user");
  }
  if (!notification) {
    try {
      notification = await prisma.notification.create({
        data: {
          userId: targetUserId,
          title,
          body,
          type: "INFO",
          link,
          dedupKey: dispatchKey,
          dedupAt: new Date(),
        },
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      notification = await prisma.notification.findUnique({ where: { dedupKey: dispatchKey } });
      if (!notification) throw err;
      if (notification.userId !== targetUserId) {
        throw new Error("Reminder dedupKey already belongs to a different user");
      }
    }
  }

  const dispatched = await dispatchNotification({
    userId: targetUserId,
    title,
    body,
    link,
    type: "INFO",
    createInAppRecord: false,
    dispatchKey,
  });
  assertPushOutcomes(dispatched.pushOutcomes);
}

/**
 * Claims and processes a batch with per-job isolation and explicit counters.
 */
export async function runJobBatch(
  workerId: string,
  batchSize = 5,
  leaseMinutes = 5
): Promise<{
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
  ownershipLost: number;
  postProcessErrors: number;
  results: Array<{ jobId: string; outcome: string; error?: string }>;
}> {
  const jobs = await claimBackgroundJobs(workerId, batchSize, leaseMinutes);
  const summary = {
    claimed: jobs.length,
    completed: 0,
    retried: 0,
    failed: 0,
    ownershipLost: 0,
    postProcessErrors: 0,
    results: [] as Array<{ jobId: string; outcome: string; error?: string }>,
  };

  for (const job of jobs) {
    const token = job.claimToken as string;
    const result = await processJob(job);
    summary.results.push({ jobId: job.id, outcome: result.outcome, error: (result as any).error });

    try {
      if (result.outcome === "COMPLETED") {
        if (await completeJob(job.id, token)) summary.completed++;
        else summary.ownershipLost++;
      } else if (result.outcome === "OWNERSHIP_LOST") {
        summary.ownershipLost++;
      } else if (result.outcome === "FAILED") {
        const r = await failJob(
          job.id,
          job.maxAttempts,
          job.maxAttempts,
          (result as any).error || "Failed",
          token,
          job.runAt,
          true
        );
        if (r.ok) summary.failed++;
        else summary.ownershipLost++;
      } else {
        const r = await failJob(
          job.id,
          job.attempts,
          job.maxAttempts,
          (result as any).error || "Retry",
          token,
          job.runAt
        );
        if (r.ok) {
          if (r.final) summary.failed++;
          else summary.retried++;
        } else {
          summary.ownershipLost++;
        }
      }
    } catch (err: any) {
      summary.postProcessErrors++;
      const last = summary.results[summary.results.length - 1];
      last.error = `${last.error || ""} | post-process: ${String(err?.message || err)}`.trim();
      console.error(`[runJobBatch] post-process error for ${job.id}:`, err?.message || err);
    }
  }

  return summary;
}
