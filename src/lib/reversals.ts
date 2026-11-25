import type { Prisma, PrismaClient } from "@prisma/client";
import { roundCurrency } from "@/lib/financial";

export type ReversalInput = {
  originalTransactionId: string;
  reason: string;
  actorUserId: string;
  /** Optional explicit date; defaults to now. */
  date?: Date;
};

export type ReversalResult = {
  originalId: string;
  reversalId: string;
  alreadyReversed: boolean;
};

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Create a reversing financial transaction instead of mutating the original.
 *
 * Current-schema strategy (no migration required):
 * - original.status becomes "REVERSED"
 * - a new FinancialTransaction is created with opposite type and same amount
 * - new.description references the original id and reason
 * - new.relatedId is set to `reversal:<originalId>` for traceability
 *
 * For stronger integrity, add `reversalOfId` and a unique constraint in a future migration.
 */
export async function reverseFinancialTransaction(
  tx: Tx,
  input: ReversalInput,
): Promise<ReversalResult> {
  const reason = input.reason?.trim();
  if (!reason) {
    throw new Error("Reversal reason is required");
  }

  const original = await tx.financialTransaction.findUnique({
    where: { id: input.originalTransactionId },
  });

  if (!original) {
    throw new Error("Original financial transaction not found");
  }

  if (original.status === "REVERSED") {
    const existingReversal = await tx.financialTransaction.findFirst({
      where: { relatedId: `reversal:${original.id}` },
      select: { id: true },
    });
    return {
      originalId: original.id,
      reversalId: existingReversal?.id ?? "",
      alreadyReversed: true,
    };
  }

  const oppositeType = original.type === "INCOME" ? "EXPENSE" : "INCOME";
  const amount = roundCurrency(Number(original.amount));

  const reversal = await tx.financialTransaction.create({
    data: {
      type: oppositeType,
      category: original.category,
      amount,
      description: `عكس قيد ${original.id}: ${reason}`,
      status: "COMPLETED",
      relatedId: `reversal:${original.id}`,
      date: input.date ?? new Date(),
    },
  });

  await tx.financialTransaction.update({
    where: { id: original.id },
    data: {
      status: "REVERSED",
      description: `${original.description} [REVERSED:${reversal.id}]`,
    },
  });

  await tx.auditLog.create({
    data: {
      userId: input.actorUserId,
      action: "REVERSE",
      entity: "FINANCIAL_TRANSACTION",
      entityId: original.id,
      details: `Reversed by ${reversal.id}. Reason: ${reason}`,
    },
  });

  return { originalId: original.id, reversalId: reversal.id, alreadyReversed: false };
}
