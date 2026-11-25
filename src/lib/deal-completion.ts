import type { Deal, Prisma, PrismaClient } from "@prisma/client";
import { ROLE, type Session } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient | PrismaClient;

export type CompletedDealInput = {
  session: Session;
  customerId: string;
  propertyId: string | null;
  finalPrice: number;
  nominalValue: number;
  commissionPercent: number;
  commissionAmt: number;
  requestedSalesRepId?: string | null;
  contractId?: string | null;
};

export type CompletedDealResult = {
  deal: Deal;
  salesRepId: string;
  customerName: string;
  created: boolean;
};

/**
 * Shared deal-completion logic used by the legacy /api/deals endpoint and by
 * contract signing. Callers must run it inside a transaction and must have
 * already verified that a signed contract exists.
 */
export async function createCompletedDealInTx(
  tx: Tx,
  input: CompletedDealInput
): Promise<CompletedDealResult> {
  const currentCustomer = await tx.customer.findFirst({
    where: input.session.role === ROLE.SALES_EMPLOYEE
      ? { id: input.customerId, assignedToId: input.session.id }
      : { id: input.customerId },
    select: { id: true, name: true, assignedToId: true },
  });
  if (!currentCustomer) throw new Error("DEAL_CUSTOMER_ACCESS_DENIED");

  const recentDuplicate = await tx.deal.findFirst({
    where: {
      customerId: input.customerId,
      propertyId: input.propertyId || null,
      value: input.nominalValue,
      createdAt: { gte: new Date(Date.now() - 30 * 1000) },
    },
  });
  if (recentDuplicate) throw new Error("DUPLICATE_DEAL_DETECTED");

  let salesRepId = input.session.role === ROLE.SALES_EMPLOYEE
    ? input.session.id
    : (currentCustomer.assignedToId || input.session.id);
  if (input.requestedSalesRepId && input.session.role !== ROLE.SALES_EMPLOYEE) {
    const rep = await tx.user.findFirst({
      where: {
        id: input.requestedSalesRepId,
        role: { in: [ROLE.SALES_EMPLOYEE, ROLE.SALES_MANAGER] },
        isActive: true,
      },
      select: { id: true },
    });
    if (!rep) throw new Error("INVALID_SALES_REP");
    salesRepId = rep.id;
  }

  const deal = await tx.deal.create({
    data: {
      customerId: input.customerId,
      propertyId: input.propertyId || null,
      salesRepId,
      status: "COMPLETED",
      value: input.nominalValue,
      finalPrice: input.finalPrice,
      commission: input.commissionPercent,
      commissionAmt: input.commissionAmt,
      contractDate: new Date(),
    },
    include: {
      customer: { select: { id: true, name: true } },
      salesRep: { select: { id: true, name: true } },
    },
  });

  await tx.customer.update({
    where: { id: input.customerId },
    data: { status: "COMPLETED" },
  });

  if (input.commissionAmt > 0) {
    await tx.commission.create({
      data: {
        userId: salesRepId,
        amount: input.commissionAmt,
        notes: `عمولة صفقة العميل ${currentCustomer.name} (قيمة الصفقة: ${input.finalPrice.toLocaleString()} ج.م)`,
        status: "PENDING",
      },
    });
  }

  await tx.auditLog.create({
    data: {
      userId: input.session.id,
      action: "CREATE",
      entity: "DEAL",
      entityId: deal.id,
      details: `إتمام صفقة بقيمة ${input.finalPrice.toLocaleString()} ج.م للعميل ${currentCustomer.name}${input.contractId ? " بعد توقيع العقد" : ""}`,
    },
  });

  return {
    deal,
    salesRepId,
    customerName: currentCustomer.name,
    created: true,
  };
}

/** Marks an already-existing linked deal as completed without duplicating commission. */
export async function completeLinkedDealInTx(
  tx: Tx,
  input: { dealId: string; actorId: string; contractId: string }
): Promise<CompletedDealResult | null> {
  const deal = await tx.deal.findUnique({
    where: { id: input.dealId },
    include: {
      customer: { select: { id: true, name: true } },
      salesRep: { select: { id: true, name: true } },
    },
  });
  if (!deal) throw new Error("DEAL_NOT_FOUND");

  if (deal.status !== "COMPLETED") {
    await tx.deal.update({
      where: { id: deal.id },
      data: { status: "COMPLETED", contractDate: new Date() },
    });
    await tx.customer.update({
      where: { id: deal.customerId },
      data: { status: "COMPLETED" },
    });
    await tx.auditLog.create({
      data: {
        userId: input.actorId,
        action: "UPDATE",
        entity: "DEAL",
        entityId: deal.id,
        details: `إتمام الصفقة بعد توقيع العقد ${input.contractId}`,
      },
    });
  }

  return {
    deal,
    salesRepId: deal.salesRepId || input.actorId,
    customerName: deal.customer?.name || "العميل",
    created: false,
  };
}

/** Notifications stay outside transactions so a notification failure cannot roll back a deal. */
export async function notifyDealCompleted(
  session: Session,
  result: CompletedDealResult
): Promise<void> {
  const { finalPrice, commissionAmt } = result.deal;
  if (result.salesRepId !== session.id) {
    await prisma.notification.create({
      data: {
        userId: result.salesRepId,
        title: "🎉 تم تسجيل صفقة وعمولة جديدة لك!",
        body: `تم إتمام صفقة لعميلك ${result.customerName} بقيمة ${Number(finalPrice).toLocaleString()} ج.م. عمولتك المسجلة: ${Number(commissionAmt ?? 0).toLocaleString()} ج.م`,
        type: "SUCCESS",
        link: "/dashboard/deals",
      },
    }).catch(() => undefined);
  }

  await prisma.notification.create({
    data: {
      userId: session.id,
      title: "🎉 صفقة جديدة مكتملة",
      body: `تم إتمام صفقة مع ${result.customerName} بقيمة ${Number(finalPrice).toLocaleString()} جنيه`,
      type: "SUCCESS",
      link: "/dashboard/deals",
    },
  }).catch(() => undefined);
}
