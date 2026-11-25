import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scopedCustomerWhere, scopedDealWhere } from "@/lib/access-scope";
import {
  CYCLE_READ_ROLES,
  CYCLE_WRITE_ROLES,
  contractScopeWhere,
  serializeContract,
} from "@/lib/deal-cycle";

export const dynamic = "force-dynamic";

const CONTRACT_INCLUDE = {
  property: { select: { id: true, title: true, projectName: true, unitNumber: true, status: true } },
  customer: { select: { id: true, name: true, phone: true } },
  reservation: { select: { id: true, status: true, amount: true } },
  deal: { select: { id: true, status: true, finalPrice: true } },
} as const;

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(CYCLE_READ_ROLES);
    if (session instanceof NextResponse) return session;

    const params = request.nextUrl.searchParams;
    const propertyId = params.get("propertyId");
    const customerId = params.get("customerId");
    const dealId = params.get("dealId");
    const status = params.get("status");

    const rows = await prisma.contract.findMany({
      where: {
        ...contractScopeWhere(session),
        ...(propertyId ? { propertyId } : {}),
        ...(customerId ? { customerId } : {}),
        ...(dealId ? { dealId } : {}),
        ...(status ? { status: status.toUpperCase() } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: CONTRACT_INCLUDE,
    });

    return NextResponse.json(
      { contracts: rows.map(serializeContract) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("List contracts error:", error);
    return NextResponse.json({ error: "تعذّر تحميل العقود" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(CYCLE_WRITE_ROLES);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const customerId = typeof body.customerId === "string" ? body.customerId : "";
    const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
    if (!customerId || !propertyId) {
      return NextResponse.json({ error: "العميل والوحدة مطلوبان" }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: scopedCustomerWhere(session, { id: customerId }),
      select: { id: true },
    });
    if (!customer) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, status: true },
    });
    if (!property) return NextResponse.json({ error: "الوحدة غير موجودة" }, { status: 404 });
    if (property.status === "SOLD") {
      return NextResponse.json({ error: "لا يمكن إنشاء عقد لوحدة تم بيعها" }, { status: 409 });
    }

    const dealId = typeof body.dealId === "string" && body.dealId ? body.dealId : null;
    if (dealId) {
      const deal = await prisma.deal.findFirst({
        where: scopedDealWhere(session, { id: dealId }),
        select: { id: true, customerId: true, propertyId: true },
      });
      if (!deal) return NextResponse.json({ error: "الصفقة غير موجودة" }, { status: 404 });
      if (deal.customerId !== customerId || deal.propertyId !== propertyId) {
        return NextResponse.json({ error: "الصفقة لا تطابق العميل والوحدة" }, { status: 409 });
      }

      const activeContract = await prisma.contract.findFirst({
        where: { dealId, status: { notIn: ["CANCELLED", "REJECTED", "TERMINATED"] } },
        select: { id: true },
      });
      if (activeContract) {
        return NextResponse.json({ error: "يوجد عقد نشط لهذه الصفقة بالفعل" }, { status: 409 });
      }
    }

    const reservationId = typeof body.reservationId === "string" && body.reservationId
      ? body.reservationId
      : null;
    if (reservationId) {
      const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, propertyId, customerId },
        select: { id: true, status: true },
      });
      if (!reservation) {
        return NextResponse.json({ error: "الحجز غير موجود أو لا يطابق العميل والوحدة" }, { status: 404 });
      }
      if (!["APPROVED", "CONVERTED"].includes(reservation.status)) {
        return NextResponse.json({ error: "يجب اعتماد الحجز قبل إنشاء العقد" }, { status: 409 });
      }
    }

    const rawTerms = body.terms && typeof body.terms === "object" && !Array.isArray(body.terms)
      ? body.terms as Record<string, unknown>
      : {};
    const terms: Record<string, unknown> = { ...rawTerms };
    for (const key of ["finalPrice", "value", "commission", "commissionAmt", "price"] as const) {
      if (body[key] !== undefined) terms[key] = body[key];
    }

    const parseOptionalDate = (value: unknown): Date | null => {
      if (!value) return null;
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const startDate = parseOptionalDate(body.startDate);
    const endDate = parseOptionalDate(body.endDate);
    if ((body.startDate && !startDate) || (body.endDate && !endDate)) {
      return NextResponse.json({ error: "تاريخ العقد غير صالح" }, { status: 400 });
    }
    if (startDate && endDate && endDate < startDate) {
      return NextResponse.json({ error: "تاريخ نهاية العقد قبل بدايته" }, { status: 400 });
    }

    const contract = await prisma.contract.create({
      data: {
        customerId,
        propertyId,
        dealId,
        reservationId,
        type: typeof body.type === "string" && body.type.trim()
          ? body.type.trim().toUpperCase().slice(0, 24)
          : "SALE",
        status: "DRAFT",
        terms: Object.keys(terms).length ? (terms as Prisma.InputJsonValue) : undefined,
        startDate,
        endDate,
        documentKey: typeof body.documentKey === "string" && body.documentKey.trim()
          ? body.documentKey.trim().slice(0, 255)
          : null,
        createdById: session.id,
      },
      include: CONTRACT_INCLUDE,
    });

    return NextResponse.json(
      { contract: serializeContract(contract) },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Create contract error:", error);
    return NextResponse.json({ error: "تعذّر إنشاء العقد" }, { status: 500 });
  }
}
