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
