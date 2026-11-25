import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { propertyLockKey } from "@/lib/ownership";
import { assertTransition } from "@/lib/state-machines";
import {
  isReservationReleaseStatus,
  normalizeCycleStatus,
  RESERVATION_TARGET_STATUSES,
} from "@/lib/deal-cycle-rules";
import {
  CYCLE_READ_ROLES,
  CYCLE_WRITE_ROLES,
  describeCycleError,
  releasePropertyIfUnheldInTx,
  reservationScopeWhere,
  serializeReservation,
  setPropertyStatusInTx,
} from "@/lib/deal-cycle";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const RESERVATION_INCLUDE = {
  property: { select: { id: true, title: true, projectName: true, unitNumber: true, status: true } },
  customer: { select: { id: true, name: true, phone: true } },
} as const;

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(CYCLE_READ_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { id, ...reservationScopeWhere(session) },
      include: RESERVATION_INCLUDE,
    });
    if (!reservation) return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });

    return NextResponse.json(
      { reservation: serializeReservation(reservation) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Get reservation error:", error);
    return NextResponse.json({ error: "تعذّر تحميل الحجز" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(CYCLE_WRITE_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { id, ...reservationScopeWhere(session) },
      select: {
        id: true,
        propertyId: true,
        status: true,
        customerId: true,
      },
    });
    if (!reservation) return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });

    const body = await request.json();
    const target = normalizeCycleStatus(body.status);
    if (!RESERVATION_TARGET_STATUSES.has(target)) {
      return NextResponse.json({ error: "حالة الحجز غير صالحة" }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    assertTransition({
      entity: "Reservation",
      from: reservation.status,
      to: target,
      reason,
      actorRole: session.role,
    });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${propertyLockKey(reservation.propertyId)})`;

      const fresh = await tx.reservation.findUnique({
        where: { id },
        select: { id: true, status: true, propertyId: true },
      });
      if (!fresh) throw new Error("PROPERTY_NOT_FOUND");
      if (fresh.status !== reservation.status) throw new Error("STATUS_CONFLICT");

      if (target === "APPROVED") {
        const conflict = await tx.reservation.findFirst({
          where: { propertyId: reservation.propertyId, status: "APPROVED", id: { not: id } },
          select: { id: true },
        });
        if (conflict) throw new Error("RESERVATION_CONFLICT");

        const property = await tx.property.findUnique({
          where: { id: reservation.propertyId },
          select: { id: true, status: true },
        });
        if (!property) throw new Error("PROPERTY_NOT_FOUND");
        if (property.status === "SOLD") throw new Error("PROPERTY_SOLD");

        await setPropertyStatusInTx(tx, {
          propertyId: reservation.propertyId,
          to: "RESERVED",
          reason: reason || `اعتماد الحجز ${id}`,
          session,
        });

        return tx.reservation.update({
          where: { id },
          data: { status: target, approvedById: session.id, releasedAt: null },
          include: RESERVATION_INCLUDE,
        });
      }

      const releasing = isReservationReleaseStatus(target);
      const result = await tx.reservation.update({
        where: { id },
        data: { status: target, releasedAt: releasing ? new Date() : null },
        include: RESERVATION_INCLUDE,
      });

      if (releasing) {
        await releasePropertyIfUnheldInTx(tx, {
          propertyId: reservation.propertyId,
          reason: `${target} الحجز ${id}`,
          session,
        });
      }
      return result;
    });

    return NextResponse.json(
      { reservation: serializeReservation(updated) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const mapped = describeCycleError(error);
    if (mapped.status === 500) console.error("Update reservation error:", error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
