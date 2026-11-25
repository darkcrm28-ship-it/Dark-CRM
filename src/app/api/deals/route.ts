import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLE, SALES_ROLES, SALES_MANAGER_ROLES } from "@/lib/auth";
import { resolveContractAmounts } from "@/lib/deal-cycle-rules";
import { propertyLockKey } from "@/lib/ownership";
import {
  createCompletedDealInTx,
  notifyDealCompleted,
} from "@/lib/deal-completion";
import { describeCycleError } from "@/lib/deal-cycle";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole(SALES_ROLES);
  if (session instanceof NextResponse) return session;
  const isManager = session.role === ROLE.GENERAL_MANAGER || session.role === ROLE.SALES_MANAGER;
  const deals = await prisma.deal.findMany({
    where: isManager ? {} : { salesRepId: session.id },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, phone: true, unitNumber: true, projectName: true } },
      property: { select: { id: true, title: true } },
      salesRep: { select: { name: true } },
    },
  });
  return NextResponse.json(deals);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(SALES_MANAGER_ROLES);
    if (session instanceof NextResponse) return session;

    const body = await request.json().catch(() => null);
    const contractId = body?.contractId;
    if (typeof contractId !== "string" || !contractId.trim() || contractId.length > 100) {
      return NextResponse.json({ error: "معرّف العقد الموقّع مطلوب" }, { status: 400 });
    }
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { propertyId: true },
    });
    if (!contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${propertyLockKey(contract.propertyId)}::bigint)`;
      const signed = await tx.contract.findUnique({
        where: { id: contractId },
        select: {
          customerId: true, propertyId: true, status: true, dealId: true, terms: true,
          property: { select: { status: true, price: true } },
          reservation: { select: { amount: true } },
        },
      });
      if (!signed || signed.status !== "SIGNED") throw new Error("CONTRACT_REQUIRED");
      if (signed.dealId) throw new Error("CONTRACT_ALREADY_USED");
      if (signed.property.status !== "SOLD") throw new Error("CONTRACT_PROPERTY_NOT_SOLD");

      const amounts = resolveContractAmounts({
        terms: signed.terms,
        propertyPrice: signed.property.price,
        reservationAmount: signed.reservation?.amount,
      });
      if (amounts.finalPrice <= 0) throw new Error("CONTRACT_AMOUNT_REQUIRED");

      const created = await createCompletedDealInTx(tx, {
        session,
        customerId: signed.customerId,
        propertyId: signed.propertyId,
        ...amounts,
        contractId,
      });

      const claimed = await tx.contract.updateMany({
        where: { id: contractId, dealId: null, status: "SIGNED" },
        data: { dealId: created.deal.id },
      });
      if (claimed.count !== 1) throw new Error("CONTRACT_ALREADY_USED");
      return created;
    });

    await notifyDealCompleted(session, result);

    return NextResponse.json({ success: true, deal: result.deal });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTRACT_PROPERTY_NOT_SOLD") {
      return NextResponse.json({ error: "حالة الوحدة لا تطابق العقد الموقّع" }, { status: 409 });
    }
    const mapped = describeCycleError(error);
    if (mapped.status === 500) console.error("Create Deal Error:", error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
