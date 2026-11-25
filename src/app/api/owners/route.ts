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

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(READ_ROLES);
    if (session instanceof NextResponse) return session;

    const q = (request.nextUrl.searchParams.get("q") || "").trim();
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 50)));

    const owners = await prisma.owner.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { nationalId: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        nationalId: true,
        type: true,
        address: true,
        notes: true,
        createdAt: true,
        properties: {
          where: { isCurrent: true },
          select: {
            id: true,
            percentage: true,
            property: {
              select: { id: true, title: true, unitNumber: true, projectName: true, status: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      owners: owners.map((owner) => ({
        ...owner,
        properties: owner.properties.map((link) => ({
          id: link.id,
          percentage: link.percentage.toString(),
          property: link.property,
        })),
        createdAt: owner.createdAt.toISOString(),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("List owners error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(WRITE_ROLES);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const name = clean(body.name);
    if (!name) return NextResponse.json({ error: "اسم المالك مطلوب" }, { status: 400 });

    const nationalId = clean(body.nationalId);
    if (nationalId) {
      const existing = await prisma.owner.findFirst({
        where: { nationalId },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: "يوجد مالك مسجّل بهذا الرقم القومي" }, { status: 409 });
      }
    }

    const owner = await prisma.owner.create({
      data: {
        name,
        phone: clean(body.phone),
        email: clean(body.email),
        nationalId,
        address: clean(body.address),
        notes: clean(body.notes),
        type: clean(body.type) || "INDIVIDUAL",
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        nationalId: true,
        type: true,
        address: true,
        notes: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ owner: { ...owner, createdAt: owner.createdAt.toISOString() } }, {
      status: 201,
    });
  } catch (error) {
    console.error("Create owner error:", error);
    return NextResponse.json({ error: "تعذّر إضافة المالك" }, { status: 500 });
  }
}
