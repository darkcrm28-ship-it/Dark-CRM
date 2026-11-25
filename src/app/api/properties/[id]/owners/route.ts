import { NextRequest, NextResponse } from "next/server";
import { requireRole, ROLE, type AppRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { propertyLockKey, validateOwnershipSplit } from "@/lib/ownership";

export const dynamic = "force-dynamic";

const READ_ROLES: readonly AppRole[] = [
  ROLE.GENERAL_MANAGER,
  ROLE.SALES_MANAGER,
  ROLE.SALES_EMPLOYEE,
  ROLE.ACCOUNTING_MANAGER,
];
const WRITE_ROLES: readonly AppRole[] = [ROLE.GENERAL_MANAGER, ROLE.SALES_MANAGER];

type Context = { params: Promise<{ id: string }> };

function serializeLink(link: {
  id: string;
  propertyId: string;
  ownerId: string;
  percentage: { toString(): string };
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
  notes: string | null;
}) {
  return {
    id: link.id,
    propertyId: link.propertyId,
    ownerId: link.ownerId,
    percentage: link.percentage.toString(),
    effectiveFrom: link.effectiveFrom.toISOString(),
    effectiveTo: link.effectiveTo?.toISOString() ?? null,
    isCurrent: link.isCurrent,
    notes: link.notes,
  };
}

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(READ_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!property) return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });

    const links = await prisma.propertyOwner.findMany({
      where: { propertyId: id },
      orderBy: [{ isCurrent: "desc" }, { effectiveFrom: "desc" }],
      include: {
        owner: { select: { id: true, name: true, phone: true, nationalId: true, type: true } },
      },
    });

    return NextResponse.json({
      owners: links.map((link) => ({ ...serializeLink(link), owner: link.owner })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("List property owners error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(WRITE_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!property) return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });

    const body = await request.json();
    const rawShares = Array.isArray(body.owners)
      ? body.owners
      : [{ ownerId: body.ownerId, percentage: body.percentage }];
    const shares = validateOwnershipSplit(rawShares);

    const ownersExist = await prisma.owner.count({
      where: { id: { in: shares.map((share) => share.ownerId) } },
    });
    if (ownersExist !== shares.length) {
      return NextResponse.json({ error: "أحد المالكين غير موجود" }, { status: 400 });
    }

    const now = new Date();
    const effectiveFrom = body.effectiveFrom
      ? new Date(String(body.effectiveFrom))
      : now;
    if (Number.isNaN(effectiveFrom.getTime())) {
      return NextResponse.json({ error: "تاريخ بدء الملكية غير صالح" }, { status: 400 });
    }
    const notes = typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim().slice(0, 1000)
      : null;

    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${propertyLockKey(id)})`;

      const current = await tx.propertyOwner.findMany({
        where: { propertyId: id, isCurrent: true },
        select: { id: true, ownerId: true, percentage: true, effectiveFrom: true, notes: true },
      });
      if (current.length) {
        await tx.propertyOwner.updateMany({
          where: { propertyId: id, isCurrent: true },
          data: { isCurrent: false, effectiveTo: now },
        });
      }

      return tx.propertyOwner.createManyAndReturn({
        data: shares.map((share) => ({
          propertyId: id,
          ownerId: share.ownerId,
          percentage: share.percentage,
          effectiveFrom,
          isCurrent: true,
          notes,
        })),
        select: {
          id: true,
          propertyId: true,
          ownerId: true,
          percentage: true,
          effectiveFrom: true,
          effectiveTo: true,
          isCurrent: true,
          notes: true,
        },
      });
    });

    return NextResponse.json({ owners: created.map(serializeLink) }, { status: 201 });
  } catch (error) {
    console.error("Set property owners error:", error);
    const message = error instanceof Error ? error.message : "تعذّر تحديث الملكية";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
