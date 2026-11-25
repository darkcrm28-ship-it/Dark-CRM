import { createHash } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export type IdempotencyRecord = {
  key: string;
  scope: string;
  entityId: string;
  payloadHash: string;
};

export function hashIdempotencyPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
}

/**
 * Advisory-lock based idempotency guard for current schema.
 *
 * This is a pragmatic bridge until a dedicated `IdempotencyKey` table with a
 * unique constraint is added. It prevents concurrent duplicates when callers use
 * the same business key, but it is not a complete substitute for a persisted
 * unique idempotency record.
 */
export async function withAdvisoryIdempotency<T>(input: {
  tx: Tx;
  scope: string;
  key: string;
  run: () => Promise<T>;
}): Promise<T> {
  const lockKey = hashIdempotencyPayload({ scope: input.scope, key: input.key }).slice(0, 15);
  const lockInt = parseInt(lockKey, 16);
  await input.tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockInt})`;
  return input.run();
}

/**
 * Check-before-create helper for models that already have a unique business field.
 * Use this where schema already enforces uniqueness (e.g. dedupKey, claimToken).
 */
export async function findExistingByUnique<T>(
  finder: () => Promise<T | null>,
): Promise<T | null> {
  return finder();
}

export type IdempotencyKeyDraft = {
  /**
   * Suggested future schema:
   * model IdempotencyKey {
   *   id          String   @id @default(uuid())
   *   scope       String
   *   key         String
   *   payloadHash String
   *   status      String   @default("COMPLETED") // PROCESSING, COMPLETED, FAILED
   *   entityType  String?
   *   entityId    String?
   *   response    Json?
   *   createdAt   DateTime @default(now())
   *   updatedAt   DateTime @updatedAt
   *   @@unique([scope, key])
   *   @@index([entityType, entityId])
   * }
   */
  scope: string;
  key: string;
  payload: unknown;
};
