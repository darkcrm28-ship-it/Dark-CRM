import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, SALES_ROLES } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

    const phone = request.nextUrl.searchParams.get("phone");
    if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

    const customer = await prisma.customer.findFirst({
      where: {
        phone: { contains: phone },
        ...(session.role === "SALES_EMPLOYEE" ? { assignedToId: session.id } : {}),
      },
      select: { id: true, name: true, phone: true }
    });

    return NextResponse.json({ exists: !!customer, customer });
  } catch (error) {
    return NextResponse.json({ error: "Failed to check phone" }, { status: 500 });
  }
}
