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
 *
 * Note: dispatchKey is expected to be provided in payload for push delivery idempotency.
 * If not provided, dispatchKey will be constructed during processing based on the job type
 * and available identifiers (e.g. REMINDER_SEND: ${reminderId}:${dispatchId}).
 */
export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  runAt?: Date
): Promise<JobRecord> {
  const id = randomUUID();

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