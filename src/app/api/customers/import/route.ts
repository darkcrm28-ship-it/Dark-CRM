import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (session?.role !== "GENERAL_MANAGER" && session?.role !== "SALES_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { customers, projectId } = body;

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Map customers to the new schema
    const dataToInsert = customers.map(c => {
      // Build customData object — store nationalId here since it's not a top-level column
      const customData: Record<string, string> = {};
      if (c.nationalId) customData["الرقم القومي"] = c.nationalId.toString();

      return {
        name: c.name,
        phone: c.phone?.toString(),
        email: c.email || null,
        type: "SELLER",
        status: "POTENTIAL_SELLER",
        projectId: projectId || null,
        area: c.area || c.zoneNumber || null,
        propertyType: c.propertyType || null,
        projectName: c.projectName || null,
        unitNumber: c.unitNumber?.toString() || null,
        buildingNumber: c.buildingNumber?.toString() || null,
        zoneNumber: c.zoneNumber?.toString() || null,
        governorate: c.governorate || null,
        city: c.city || null,
        executingCompany: c.executingCompany || null,
        deliveryDate: c.deliveryDate?.toString() || null,
        floor: c.floor?.toString() || null,
        customData: Object.keys(customData).length > 0 ? customData : {},
      };
    });

    const created = await prisma.customer.createMany({
      data: dataToInsert,
    });

    return NextResponse.json({ success: true, count: created.count });
  } catch (error) {
    console.error("Import Error:", error);
    return NextResponse.json({ error: "Failed to import data" }, { status: 500 });
  }
}
