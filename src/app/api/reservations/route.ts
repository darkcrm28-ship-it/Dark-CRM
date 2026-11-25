import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseCurrency } from "@/lib/financial";
import { scopedCustomerWhere } from "@/lib/access-scope";
import {
  CYCLE_READ_ROLES,
  CYCLE_WRITE_ROLES,
  reservationScopeWhere,
  serializeReservation,
} from "@/lib/deal-cycle";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(CYCLE_READ_ROLES);
    if (session instanceof NextResponse) return session;

    const propertyId = request.nextUrl.searchParams.get("propertyId");
    const status = request.nextUrl.searchParams.get("status");
    const rows = await prisma.reservation.findMany({
      where: {
        ...reservationScopeWhere(session),
        ...(propertyId ? { propertyId } : {}),
        ...(status ? { status: status.toUpperCase() } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        property: { select: { id: true, title: true, projectName: true, unitNumber: true, status: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json(
      { reservations: rows.map(serializeReservation) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("List reservations error:", error);
    return NextResponse.json({ error: "تعذّر تحميل الحجوزات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(CYCLE_WRITE_ROLES);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
    const customerId = typeof body.customerId === "string" ? body.customerId : "";
    if (!propertyId || !customerId) {
      return NextResponse.json({ error: "الوحدة والعميل مطلوبان" }, { status: 400 });
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
    if (!["AVAILABLE", "RESERVED"].includes(property.status)) {
      return NextResponse.json({ error: "لا يمكن حجز وحدة غير متاحة" }, { status: 409 });
    }

    const startAt = new Date(String(body.startAt ?? ""));
    const endAt = new Date(String(body.endAt ?? ""));
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return NextResponse.json({ error: "تواريخ الحجز غير صالحة" }, { status: 400 });
    }

    const amount = parseCurrency(body.amount) ?? 0;
    if (amount < 0) return NextResponse.json({ error: "مبلغ الحجز غير صالح" }, { status: 400 });

    const notes = typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim().slice(0, 2000)
      : null;

    const reservation = await prisma.reservation.create({
      data: {
        propertyId,
        customerId,
        startAt,
        endAt,
        amount,
        currency: typeof body.currency === "string" && body.currency.trim()
          ? body.currency.trim().toUpperCase().slice(0, 8)
          : "EGP",
        notes,
        createdById: session.id,
        status: "PENDING",
      },
      include: {
        property: { select: { id: true, title: true, projectName: true, unitNumber: true, status: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json(
      { reservation: serializeReservation(reservation) },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Create reservation error:", error);
    return NextResponse.json({ error: "تعذّر إنشاء الحجز" }, { status: 500 });
  }
}
