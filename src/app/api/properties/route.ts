import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, SALES_ROLES, SALES_MANAGER_ROLES } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

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
    const session = await requireRole(SALES_MANAGER_ROLES);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const allowedFields = [
      "title", "projectName", "unitNumber", "buildingNumber", "zone", "floor",
      "size", "bedrooms", "bathrooms", "unitType", "finishing", "price",
      "status", "description", "images", "monthlyInstallment", "remainingMonths",
      "installmentType", "installmentPercentage", "customData",
    ];
    const data: any = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key))
    );
    if (data.customData && typeof data.customData === "object" && !Array.isArray(data.customData)) {
      const { publicListing: _ignored, ...safeCustomData } = data.customData;
      data.customData = safeCustomData;
    }

    if (data.price !== undefined) data.price = parseFloat(data.price) || 0;
    if (data.size !== undefined) data.size = parseFloat(data.size) || null;
    if (data.bedrooms !== undefined) data.bedrooms = parseInt(data.bedrooms) || null;
    if (data.bathrooms !== undefined) data.bathrooms = parseInt(data.bathrooms) || null;

    const property = await prisma.property.create({ data });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "CREATE",
        entity: "PROPERTY",
        entityId: property.id,
        details: `إضافة عقار جديد: ${property.title || property.projectName || "بدون عنوان"}`,
      },
    }).catch(() => {});

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
