import { prisma } from "./db";
import { roundCurrency } from "./financial";

export interface OwnershipRecord {
  id: string;
  propertyId: string;
  customerId: string;
  percentage: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
  transferReason: string | null;
  previousOwnerId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PROPERTY_LOCK_NAMESPACE = 8192000;

/**
 * Calculates a 32-bit integer hash from a property UUID for advisory transaction locking.
 */
function hashUuidToInt(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash << 5) - hash + uuid.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Validates that active ownerships for a property do not exceed 100%.
 * Supports partial/incomplete registration (sum can be < 100%).
 */
export async function validateActiveOwnershipSum(
  tx: any,
  propertyId: string,
  additionalPercentage = 0,
  excludeOwnershipId?: string
): Promise<{ totalActive: number; isValid: boolean; available: number }> {
  // Query all active ownership records for this property
  const activeRecords = await tx.propertyOwnership.findMany({
    where: {
      propertyId,
      isCurrent: true,
      effectiveTo: null,
      ...(excludeOwnershipId ? { id: { not: excludeOwnershipId } } : {}),
    },
    select: { id: true, percentage: true },
  });

  const currentTotal = activeRecords.reduce(
    (sum: number, r: { percentage: number }) => sum + r.percentage,
    0
  );
  const roundedCurrent = roundCurrency(currentTotal);
  const newTotal = roundCurrency(roundedCurrent + additionalPercentage);

  return {
    totalActive: newTotal,
    isValid: newTotal <= 100.0,
    available: roundCurrency(Math.max(0, 100.0 - roundedCurrent)),
  };
}

/**
 * Registers an initial or additional property owner.
 * Invariant: Sum of active percentages <= 100%.
 */
export async function registerPropertyOwnership(
  params: {
    propertyId: string;
    customerId: string;
    percentage: number;
    notes?: string;
    transferReason?: string;
  },
  operatorUserId: string
) {
  const { propertyId, customerId, percentage, notes, transferReason } = params;

  if (!Number.isFinite(percentage) || roundCurrency(percentage) <= 0 || percentage > 100) {
    throw new Error("نسبة الملكية يجب أن تكون أكبر من 0 وأقل من أو تساوي 100%.");
  }

  const roundedPercentage = roundCurrency(percentage);
  const lockKey = hashUuidToInt(propertyId);

  return await prisma.$transaction(async (tx) => {
    // 1. Concurrency-safe property lock
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${PROPERTY_LOCK_NAMESPACE}, ${lockKey});`;

    // 2. Verify property exists
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      select: { id: true, title: true, unitNumber: true },
    });
    if (!property) throw new Error("العقار غير موجود.");

    // 3. Verify customer exists
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, phone: true },
    });
    if (!customer) throw new Error("مالك العقار (العميل) غير موجود.");

    // 4. Invariant check: Total active percentage <= 100%
    const check = await validateActiveOwnershipSum(tx, propertyId, roundedPercentage);
    if (!check.isValid) {
      throw new Error(
        `تجاوزت نسبة الملكية الإجمالية 100%. النسبة المتاحة للتسجيل حالياً هي ${check.available}%.`
      );
    }

    // 5. Create Ownership Record
    const created = await tx.propertyOwnership.create({
      data: {
        propertyId,
        customerId,
        percentage: roundedPercentage,
        percentageDecimal: roundedPercentage,
        isCurrent: true,
        effectiveFrom: new Date(),
        effectiveTo: null,
        transferReason: transferReason || "INITIAL_REGISTRATION",
        notes: notes || null,
      },
    });

    // 6. Audit Log
    await tx.auditLog.create({
      data: {
        userId: operatorUserId,
        action: "OWNERSHIP_REGISTER",
        entity: "PROPERTY_OWNERSHIP",
        entityId: created.id,
        details: `تسجيل ملكية بنسبة ${roundedPercentage}% للعميل ${customer.name} على العقار ${property.title || property.id}`,
      },
    });

    return created;
  });
}

/**
 * Transfers ownership (full or partial) from an existing owner to a new owner.
 * Preserves historical records by marking previous record retired (isCurrent = false, effectiveTo = now).
 */
export async function transferPropertyOwnership(
  params: {
    propertyId: string;
    fromOwnershipId: string;
    toCustomerId: string;
    transferPercentage: number;
    reason: string;
    notes?: string;
  },
  operatorUserId: string
) {
  const { propertyId, fromOwnershipId, toCustomerId, transferPercentage, reason, notes } = params;

  if (!Number.isFinite(transferPercentage) || roundCurrency(transferPercentage) <= 0 || transferPercentage > 100) {
    throw new Error("نسبة التنازل يجب أن تكون أكبر من 0%.");
  }

  const roundedTransfer = roundCurrency(transferPercentage);
  const lockKey = hashUuidToInt(propertyId);

  return await prisma.$transaction(async (tx) => {
    // 1. Advisory Lock
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${PROPERTY_LOCK_NAMESPACE}, ${lockKey});`;

    // 2. Fetch existing active ownership
    const sourceOwnership = await tx.propertyOwnership.findFirst({
      where: { id: fromOwnershipId, propertyId, isCurrent: true, effectiveTo: null },
      include: { customer: { select: { id: true, name: true } } },
    });

    if (!sourceOwnership) {
      throw new Error("سجل الملكية الحالي غير موجود أو غير نشط.");
    }

    if (roundedTransfer > sourceOwnership.percentage) {
      throw new Error(
        `نسبة التنازل المطلوبة (${roundedTransfer}%) تتجاوز نسبة المالك الحالية (${sourceOwnership.percentage}%).`
      );
    }

    // 3. Verify target customer
    const targetCustomer = await tx.customer.findUnique({
      where: { id: toCustomerId },
      select: { id: true, name: true },
    });
    if (!targetCustomer) throw new Error("المالك الجديد غير موجود.");

    const now = new Date();

    // 4. Retire source ownership
    await tx.propertyOwnership.update({
      where: { id: sourceOwnership.id },
      data: {
        isCurrent: false,
        effectiveTo: now,
      },
    });

    // 5. If partial transfer, create retained balance record for source owner
    const remainingPercentage = roundCurrency(sourceOwnership.percentage - roundedTransfer);
    let retainedRecord = null;
    if (remainingPercentage > 0) {
      retainedRecord = await tx.propertyOwnership.create({
        data: {
          propertyId,
          customerId: sourceOwnership.customerId,
          percentage: remainingPercentage,
          percentageDecimal: remainingPercentage,
          isCurrent: true,
          effectiveFrom: now,
          effectiveTo: null,
          transferReason: `RETAINED_AFTER_PARTIAL_TRANSFER_TO_${toCustomerId}`,
          previousOwnerId: sourceOwnership.customerId,
          notes: `المتبقي بعد التنازل عن ${roundedTransfer}% لصالح ${targetCustomer.name}`,
        },
      });
    }

    // 6. Create new ownership record for recipient
    const recipientRecord = await tx.propertyOwnership.create({
      data: {
        propertyId,
        customerId: toCustomerId,
        percentage: roundedTransfer,
        percentageDecimal: roundedTransfer,
        isCurrent: true,
        effectiveFrom: now,
        effectiveTo: null,
        transferReason: reason || "TRANSFER",
        previousOwnerId: sourceOwnership.customerId,
        notes: notes || `تنازل من ${sourceOwnership.customer?.name || sourceOwnership.customerId}`,
      },
    });

    // 7. Audit Log
    await tx.auditLog.create({
      data: {
        userId: operatorUserId,
        action: "OWNERSHIP_TRANSFER",
        entity: "PROPERTY_OWNERSHIP",
        entityId: recipientRecord.id,
        details: `تنازل عن ملكية ${roundedTransfer}% من ${sourceOwnership.customer?.name} إلى ${targetCustomer.name}. السبب: ${reason}`,
      },
    });

    return {
      retiredOwnershipId: sourceOwnership.id,
      retainedOwnership: retainedRecord,
      newOwnership: recipientRecord,
    };
  });
}
