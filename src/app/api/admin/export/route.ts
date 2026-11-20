import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (session?.role !== "GENERAL_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [customers, properties, deals, interactions, logs] = await Promise.all([
      prisma.customer.findMany({ include: { assignedTo: { select: { name: true } } } }),
      prisma.property.findMany(),
      prisma.deal.findMany({ include: { customer: true } }),
      prisma.interaction.findMany({
        include: {
          customer: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.findMany({
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
    ]);

    return NextResponse.json(
      { customers, properties, deals, interactions, logs },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
