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
      prisma.customer.findMany({ 
        take: 50000,
        orderBy: { createdAt: "desc" },
        include: { assignedTo: { select: { id: true, name: true } } } 
      }),
      prisma.property.findMany({ take: 10000, orderBy: { createdAt: "desc" } }),
      prisma.deal.findMany({ 
        take: 10000,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { id: true, name: true, phone: true } } } 
      }),
      prisma.interaction.findMany({
        take: 25000,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.findMany({
        take: 10000,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "DATA_EXPORT",
        entity: "DATABASE",
        entityId: "JSON_EXPORT",
        details: "تصدير بيانات مجمعة للمدير العام",
      },
    }).catch(() => {});

    return NextResponse.json(
      { customers, properties, deals, interactions, logs },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
