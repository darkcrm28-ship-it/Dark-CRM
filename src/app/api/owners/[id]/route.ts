import { NextRequest, NextResponse } from "next/server";
import { requireRole, ROLE, type AppRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const READ_ROLES: readonly AppRole[] = [
  ROLE.GENERAL_MANAGER,
  ROLE.SALES_MANAGER,
  ROLE.ACCOUNTING_MANAGER,
];
const WRITE_ROLES: readonly AppRole[] = [ROLE.GENERAL_MANAGER, ROLE.SALES_MANAGER];

type Context = { params: Promise<{ id: string }> };

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(READ_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const owner = await prisma.owner.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        nationalId: true,
        address: true,
        type: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        properties: {
          orderBy: { effectiveFrom: "desc" },
          select: {
            id: true,
            percentage: true,
            effectiveFrom: true,
            effectiveTo: true,
            isCurrent: true,
            property: {
              select: { id: true, title: true, unitNumber: true, projectName: true, status: true },
            },
          },
        },
      },
    });
    if (!owner) return NextResponse.json({ error: "المالك غير موجود" }, { status: 404 });

    return NextResponse.json({
      owner: {
        ...owner,
        properties: owner.properties.map((link) => ({
          ...link,
          percentage: link.percentage.toString(),
          effectiveFrom: link.effectiveFrom.toISOString(),
          effectiveTo: link.effectiveTo?.toISOString() ?? null,
        })),
        createdAt: owner.createdAt.toISOString(),
        updatedAt: owner.updatedAt.toISOString(),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Get owner error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(WRITE_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, string | null> = {};
    for (const field of ["name", "phone", "email", "nationalId", "address", "notes", "type"] as const) {
      if (field in body) data[field] = clean(body[field]);
    }
    if ("name" in data && !data.name) {
      return NextResponse.json({ error: "اسم المالك مطلوب" }, { status: 400 });
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    const owner = await prisma.owner.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        nationalId: true,
        type: true,
        address: true,
        notes: true,
      },
    });
    return NextResponse.json({ owner });
  } catch (error) {
    console.error("Update owner error:", error);
    return NextResponse.json({ error: "تعذّر تعديل المالك" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const session = await requireRole(WRITE_ROLES);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const links = await prisma.propertyOwner.count({ where: { ownerId: id } });
    if (links > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف مالك مرتبط بعقارات. انقل ملكيته أولاً." },
        { status: 409 }
      );
    }
    await prisma.owner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete owner error:", error);
    return NextResponse.json({ error: "تعذّر حذف المالك" }, { status: 500 });
  }
}
