import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLE, SALES_ROLES } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireRole(SALES_ROLES);
  if (session instanceof NextResponse) return session;

  const params = request.nextUrl.searchParams;
  const headers = { "Cache-Control": "private, no-store" };
  const q = (params.get("q") || "").trim().slice(0, 120);
  const propertiesOnly = params.get("scope") === "properties";
  const priceParam = params.get("priceMax");
  const priceMax = priceParam?.trim() ? Number(priceParam) : NaN;
  const hasPrice = Number.isFinite(priceMax) && priceMax > 0;
  if (q.length < 2 && !(propertiesOnly && hasPrice)) {
    return NextResponse.json({ customers: [], properties: [] }, { headers });
  }

  const [customers, properties] = await Promise.all([
    propertiesOnly ? [] : prisma.customer.findMany({
      where: {
        AND: [
          session.role === ROLE.SALES_EMPLOYEE ? { assignedToId: session.id } : {},
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { projectName: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      take: 6,
      select: { id: true, name: true, phone: true, status: true, projectName: true },
    }),
    prisma.property.findMany({
      where: {
        ...(propertiesOnly ? { status: "AVAILABLE" } : {}),
        ...(hasPrice ? { price: { lte: priceMax } } : {}),
        ...(q.length >= 2 ? { OR: [
          { title: { contains: q, mode: "insensitive" } },
          { zone: { contains: q, mode: "insensitive" } },
          { projectName: { contains: q, mode: "insensitive" } },
          { unitNumber: { contains: q } },
        ] } : {}),
      },
      take: 6,
      select: { id: true, title: true, zone: true, projectName: true, unitNumber: true, status: true, price: true },
    }),
  ]);

  return NextResponse.json({ customers, properties }, { headers });
}
