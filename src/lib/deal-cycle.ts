import type { Prisma, PrismaClient } from "@prisma/client";
import { ROLE, type Session } from "@/lib/auth";
import { isManagerRole } from "@/lib/access-scope";
import { assertTransition } from "@/lib/state-machines";

type Tx = Prisma.TransactionClient | PrismaClient;

export const CYCLE_READ_ROLES = [
  ROLE.GENERAL_MANAGER,
  ROLE.SALES_MANAGER,
  ROLE.SALES_EMPLOYEE,
  ROLE.ACCOUNTING_MANAGER,
] as const;

export const CYCLE_WRITE_ROLES = [
  ROLE.GENERAL_MANAGER,
  ROLE.SALES_MANAGER,
  ROLE.SALES_EMPLOYEE,
] as const;

export const CYCLE_APPROVER_ROLES = [ROLE.GENERAL_MANAGER, ROLE.SALES_MANAGER] as const;

export function isCycleManager(session: Session): boolean {
  return isManagerRole(session.role);
}

/** Maps domain errors from the cycle routes to an HTTP status and Arabic message. */
export function describeCycleError(error: unknown): { status: number; error: string } {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message === "PROPERTY_NOT_FOUND") return { status: 404, error: "الوحدة غير موجودة" };
  if (message === "RESERVATION_CONFLICT") {
    return { status: 409, error: "هذه الوحدة محجوزة بالفعل بحجز معتمد آخر" };
  }
  if (message === "PROPERTY_SOLD") return { status: 409, error: "تم بيع هذه الوحدة بالفعل" };
  if (message === "STATUS_CONFLICT") {
    return { status: 409, error: "تغيّرت حالة السجل أثناء المعالجة، أعد المحاولة" };
  }
  if (message === "CONTRACT_REQUIRED") {
    return { status: 409, error: "لا يمكن إتمام صفقة بدون عقد موقّع" };
  }
  if (message === "CONTRACT_ALREADY_USED") {
    return { status: 409, error: "تم إتمام صفقة لهذا العقد بالفعل" };
  }
  if (message === "CONTRACT_DEAL_MISMATCH") {
    return { status: 409, error: "الصفقة المرتبطة لا تطابق العميل والوحدة في العقد" };
  }
  if (message === "CONTRACT_AMOUNT_REQUIRED") {
    return { status: 400, error: "يجب تحديد قيمة العقد قبل التوقيع" };
  }
  if (message === "INVALID_CONTRACT_AMOUNTS") {
    return { status: 400, error: "راجع السعر وقيمة العمولة ونسبتها في العقد" };
  }
  if (message === "DUPLICATE_DEAL_DETECTED") {
    return { status: 409, error: "تم إرسال هذه الصفقة مسبقاً، منعاً للتكرار" };
  }
  if (message === "DEAL_CUSTOMER_ACCESS_DENIED") {
    return { status: 404, error: "العميل غير موجود" };
  }
  if (message.startsWith("Invalid ")) {
    return { status: 400, error: "تغيير الحالة غير مسموح لهذا السجل" };
  }
  if (message.startsWith("Reason is required")) {
    return { status: 400, error: "يجب إدخال سبب لتغيير الحالة" };
  }
  return { status: 500, error: "تعذّر إتمام العملية" };
}

export function reservationScopeWhere(session: Session): Prisma.ReservationWhereInput {
  if (isManagerRole(session.role) || session.role === ROLE.ACCOUNTING_MANAGER) return {};
  if (session.role === ROLE.SALES_EMPLOYEE) {
    return {
      OR: [
        { customer: { assignedToId: session.id } },
        { createdById: session.id },
      ],
    };
  }
  return { id: "__no_access__" };
}

export function contractScopeWhere(session: Session): Prisma.ContractWhereInput {
  if (isManagerRole(session.role) || session.role === ROLE.ACCOUNTING_MANAGER) return {};
  if (session.role === ROLE.SALES_EMPLOYEE) {
    return {
      OR: [
        { customer: { assignedToId: session.id } },
        { createdById: session.id },
        { deal: { salesRepId: session.id } },
      ],
    };
  }
  return { id: "__no_access__" };
}

type ReservationRow = {
  id: string;
  propertyId: string;
  customerId: string;
  dealId: string | null;
  status: string;
  startAt: Date;
  endAt: Date;
  amount: { toString(): string };
  currency: string;
  notes: string | null;
  createdById: string | null;
  approvedById: string | null;
  releasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  property?: { id: string; title: string | null; projectName: string | null; unitNumber: string | null; status: string } | null;
  customer?: { id: string; name: string; phone: string | null } | null;
};

type ContractRow = {
  id: string;
  dealId: string | null;
  reservationId: string | null;
  customerId: string;
  propertyId: string;
  type: string;
  status: string;
  signedAt: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  documentKey: string | null;
  terms: unknown;
  createdById: string | null;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  property?: { id: string; title: string | null; projectName: string | null; unitNumber: string | null; status: string } | null;
  customer?: { id: string; name: string; phone: string | null } | null;
  reservation?: { id: string; status: string; amount: { toString(): string } } | null;
  deal?: { id: string; status: string; finalPrice: number | null } | null;
};

export function serializeReservation(row: ReservationRow) {
  return {
    id: row.id,
    propertyId: row.propertyId,
    customerId: row.customerId,
    dealId: row.dealId,
    status: row.status,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    amount: row.amount.toString(),
    currency: row.currency,
    notes: row.notes,
    createdById: row.createdById,
    approvedById: row.approvedById,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    property: row.property ?? null,
    customer: row.customer ?? null,
  };
}

export function serializeContract(row: ContractRow) {
  return {
    id: row.id,
    dealId: row.dealId,
    reservationId: row.reservationId,
    customerId: row.customerId,
    propertyId: row.propertyId,
    type: row.type,
    status: row.status,
    signedAt: row.signedAt?.toISOString() ?? null,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    documentKey: row.documentKey,
    terms: row.terms ?? null,
    createdById: row.createdById,
    approvedById: row.approvedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    property: row.property ?? null,
    customer: row.customer ?? null,
    reservation: row.reservation ?? null,
    deal: row.deal ?? null,
  };
}

/** Property transitions must go through the shared state machine. */
export async function setPropertyStatusInTx(
  tx: Tx,
  input: { propertyId: string; to: string; reason: string; session: Session }
): Promise<void> {
  const property = await tx.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true, status: true },
  });
  if (!property) throw new Error("PROPERTY_NOT_FOUND");
  if (property.status === input.to) return;

  assertTransition({
    entity: "Property",
    from: property.status,
    to: input.to,
    reason: input.reason,
    actorRole: input.session.role,
  });

  await tx.property.update({
    where: { id: input.propertyId },
    data: { status: input.to },
  });
}

/** Returns the unit to AVAILABLE only when no approved reservation still holds it. */
export async function releasePropertyIfUnheldInTx(
  tx: Tx,
  input: { propertyId: string; reason: string; session: Session }
): Promise<boolean> {
  const otherHold = await tx.reservation.findFirst({
    where: { propertyId: input.propertyId, status: "APPROVED" },
    select: { id: true },
  });
  if (otherHold) return false;

  const property = await tx.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true, status: true },
  });
  if (!property || property.status !== "RESERVED") return false;

  await setPropertyStatusInTx(tx, {
    propertyId: input.propertyId,
    to: "AVAILABLE",
    reason: input.reason,
    session: input.session,
  });
  return true;
}
