import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { propertyLockKey } from "@/lib/ownership";
import { assertTransition } from "@/lib/state-machines";
import {
  completeLinkedDealInTx,
  createCompletedDealInTx,
  notifyDealCompleted,
  type CompletedDealResult,
} from "@/lib/deal-completion";
import {
  CONTRACT_TARGET_STATUSES,
  normalizeCycleStatus,
  resolveContractAmounts,
} from "@/lib/deal-cycle-rules";
import {
  CYCLE_READ_ROLES,
  CYCLE_WRITE_ROLES,
  contractScopeWhere,
  describeCycleError,
  serializeContract,
  setPropertyStatusInTx,
} from "@/lib/deal-cycle";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const CONTRACT_INCLUDE = {
  property: { select: { id: true, title: true, projectName: true, unitNumber: true, status: true } },
  customer: { select: { id: true, name: true, phone: true } },
  reservation: { select: { id: true, status: true, amount: true } },
  deal: { select: { id: true, status: true, finalPrice: true } },
} as const;

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(CYCLE_READ_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, ...contractScopeWhere(session) },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });

    return NextResponse.json(
      { contract: serializeContract(contract) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Get contract error:", error);
    return NextResponse.json({ error: "تعذّر تحميل العقد" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(CYCLE_WRITE_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, ...contractScopeWhere(session) },
      select: {
        id: true,
        status: true,
        propertyId: true,
        customerId: true,
        dealId: true,
        reservationId: true,
        terms: true,
        signedAt: true,
        approvedById: true,
      },
    });
    if (!contract) return NextResponse.json({ error: "العقد غير موجود" }, { status: 404 });

    const body = await request.json();
    const target = normalizeCycleStatus(body.status);
    if (!CONTRACT_TARGET_STATUSES.has(target)) {
      return NextResponse.json({ error: "حالة العقد غير صالحة" }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (contract.status === target) {
      const current = await prisma.contract.findUnique({
        where: { id },
        include: CONTRACT_INCLUDE,
      });
      return NextResponse.json({ contract: serializeContract(current!) });
    }

    assertTransition({
      entity: "Contract",
      from: contract.status,
      to: target,
      reason,
      actorRole: session.role,
    });

    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${propertyLockKey(contract.propertyId)})`;

      const fresh = await tx.contract.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          propertyId: true,
          customerId: true,
          dealId: true,
          reservationId: true,
          terms: true,
        },
      });
      if (!fresh) throw new Error("CONTRACT_NOT_FOUND");
      if (fresh.status !== contract.status) throw new Error("STATUS_CONFLICT");

      let dealResult: CompletedDealResult | null = null;

      if (target === "SIGNED") {
        const property = await tx.property.findUnique({
          where: { id: fresh.propertyId },
          select: { id: true, status: true, price: true },
        });
        if (!property) throw new Error("PROPERTY_NOT_FOUND");
        if (property.status === "SOLD") throw new Error("PROPERTY_SOLD");

        await setPropertyStatusInTx(tx, {
          propertyId: fresh.propertyId,
          to: "SOLD",
          reason: reason || `توقيع العقد ${id}`,
          session,
        });

        if (fresh.reservationId) {
          const reservation = await tx.reservation.findUnique({
            where: { id: fresh.reservationId },
            select: { id: true, status: true, amount: true },
          });
          if (reservation && reservation.status === "APPROVED") {
            assertTransition({
              entity: "Reservation",
              from: reservation.status,
              to: "CONVERTED",
              reason: `تحويل الحجز بعد توقيع العقد ${id}`,
              actorRole: session.role,
            });
            await tx.reservation.update({
              where: { id: reservation.id },
              data: { status: "CONVERTED" },
            });
          }
        }

        if (fresh.dealId) {
          const linkedDeal = await tx.deal.findUnique({
            where: { id: fresh.dealId },
            select: { customerId: true, propertyId: true },
          });
          if (!linkedDeal || linkedDeal.customerId !== fresh.customerId || linkedDeal.propertyId !== fresh.propertyId) {
            throw new Error("CONTRACT_DEAL_MISMATCH");
          }
          dealResult = await completeLinkedDealInTx(tx, {
            dealId: fresh.dealId,
            actorId: session.id,
            contractId: id,
          });
        } else {
          const reservationAmount = fresh.reservationId
            ? (await tx.reservation.findUnique({
                where: { id: fresh.reservationId },
                select: { amount: true },
              }))?.amount
            : null;
          const amounts = resolveContractAmounts({
            terms: fresh.terms,
            propertyPrice: property.price,
            reservationAmount,
          });
          if (amounts.finalPrice <= 0) throw new Error("CONTRACT_AMOUNT_REQUIRED");

          dealResult = await createCompletedDealInTx(tx, {
            session,
            customerId: fresh.customerId,
            propertyId: fresh.propertyId,
            ...amounts,
            contractId: id,
          });

          await tx.contract.update({
            where: { id },
            data: { dealId: dealResult.deal.id },
          });
        }
      }

      const updated = await tx.contract.update({
        where: { id },
        data: {
          status: target,
          signedAt: target === "SIGNED" ? new Date() : contract.signedAt,
          approvedById: target === "APPROVED" ? session.id : contract.approvedById,
        },
        include: CONTRACT_INCLUDE,
      });

      return { updated, dealResult };
    });

    if (outcome.dealResult) {
      await notifyDealCompleted(session, outcome.dealResult);
    }

    return NextResponse.json(
      {
        contract: serializeContract(outcome.updated),
        ...(outcome.dealResult ? { deal: outcome.dealResult.deal } : {}),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const mapped = describeCycleError(error);
    if (mapped.status === 500) console.error("Update contract error:", error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
