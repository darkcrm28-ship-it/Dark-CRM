import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLE, SALES_ROLES } from "@/lib/auth";
import { parseCurrency, calculateCommission } from "@/lib/financial";
import {
  createCompletedDealInTx,
  notifyDealCompleted,
} from "@/lib/deal-completion";
import { describeCycleError } from "@/lib/deal-cycle";

export const dynamic = "force-dynamic";

type SignedContractRef = {
  id: string;
  customerId: string;
  propertyId: string | null;
  dealId: string | null;
};

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
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const { customerId, propertyId, salesRepId: requestedSalesRepId } = body;

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json({ error: "العميل مطلوب لإتمام الصفقة" }, { status: 400 });
    }

    const parsedFinalPrice = parseCurrency(body.finalPrice);
    const parsedNominalValue = parseCurrency(body.value);
    const finalPrice = parsedFinalPrice ?? parsedNominalValue;
    if (!finalPrice || finalPrice <= 0) {
      return NextResponse.json({ error: "قيمة الصفقة يجب أن تكون رقماً موجباً" }, { status: 400 });
    }
    const nominalValue = parsedNominalValue ?? finalPrice;

    const commissionPercent = body.commission !== undefined ? Math.max(0, parseFloat(body.commission) || 0) : 0;
    const commissionAmt = body.commissionAmt !== undefined
      ? Math.max(0, parseCurrency(body.commissionAmt) || 0)
      : calculateCommission(finalPrice, commissionPercent);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, assignedToId: true, status: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }
    if (session.role === ROLE.SALES_EMPLOYEE && customer.assignedToId !== session.id) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true, title: true },
      });
      if (!property) {
        return NextResponse.json({ error: "العقار المحدد غير موجود" }, { status: 404 });
      }
    }

    // A completed deal must be backed by a signed contract. Contract signing is
    // the normal path and creates the deal itself; this endpoint remains as a
    // repair path and will only accept a signed, unused contract.
    const requestedContractId = typeof body.contractId === "string" && body.contractId
      ? body.contractId
      : null;
    let signedContract: SignedContractRef | null;
    if (requestedContractId) {
      signedContract = await prisma.contract.findFirst({
        where: { id: requestedContractId, status: "SIGNED" },
        select: { id: true, customerId: true, propertyId: true, dealId: true },
      });
      if (!signedContract) {
        return NextResponse.json({ error: "لا يمكن إتمام صفقة بدون عقد موقّع" }, { status: 409 });
      }
      if (signedContract.customerId !== customerId || (propertyId && signedContract.propertyId !== propertyId)) {
        return NextResponse.json({ error: "العقد المحدد لا يطابق العميل أو الوحدة" }, { status: 400 });
      }
      if (signedContract.dealId) {
        return NextResponse.json(
          { error: "تم إتمام صفقة لهذا العقد بالفعل", dealId: signedContract.dealId },
          { status: 409 }
        );
      }
    } else {
      signedContract = await prisma.contract.findFirst({
        where: {
          status: "SIGNED",
          customerId,
          ...(propertyId ? { propertyId } : {}),
          dealId: null,
        },
        orderBy: { signedAt: "desc" },
        select: { id: true, customerId: true, propertyId: true, dealId: true },
      });
      if (!signedContract) {
        return NextResponse.json({
          error: "لا يمكن إتمام صفقة بدون عقد موقّع. أنشئ عقداً ووقّعه من دورة الصفقات أولاً.",
          code: "CONTRACT_REQUIRED",
        }, { status: 409 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await createCompletedDealInTx(tx, {
        session,
        customerId,
        propertyId: propertyId || null,
        finalPrice,
        nominalValue,
        commissionPercent,
        commissionAmt,
        requestedSalesRepId,
        contractId: signedContract!.id,
      });

      await tx.contract.update({
        where: { id: signedContract!.id },
        data: { dealId: created.deal.id },
      });

      return created;
    });

    await notifyDealCompleted(session, result);

    return NextResponse.json({ success: true, deal: result.deal });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error ?? "");
    if (rawMessage === "INVALID_SALES_REP") {
      return NextResponse.json({ error: "مندوب المبيعات المحدد غير صالح" }, { status: 400 });
    }
    const mapped = describeCycleError(error);
    if (mapped.status === 500) console.error("Create Deal Error:", error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
