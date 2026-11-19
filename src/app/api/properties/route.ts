import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const properties = await prisma.property.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(properties);
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "GENERAL_MANAGER" && session.role !== "SALES_MANAGER")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await request.json();
    const property = await prisma.property.create({ data: body });

    // --- AUTO-MATCHING ENGINE ---
    // Find buyers who might be interested in this new property
    const matchingBuyers = await prisma.customer.findMany({
      where: {
        type: "BUYER",
        status: { in: ["NEW", "INTERESTED", "MEETING_SCHEDULED"] },
        OR: [
          { budgetMax: { gte: property.price || 0 } },
          { preferredZone: { contains: property.zone || "" } }
        ]
      },
      select: { id: true, name: true, assignedToId: true }
    });

    // Notify assigned users
    for (const buyer of matchingBuyers) {
      if (buyer.assignedToId) {
        await prisma.notification.create({
          data: {
            userId: buyer.assignedToId,
            title: "🎯 تطابق عقاري جديد!",
            body: `العقار في ${property.projectName} قد يناسب عميلك ${buyer.name}`,
            type: "SUCCESS",
            link: `/dashboard/match`
          }
        });
      }
    }

    return NextResponse.json({ success: true, property });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
