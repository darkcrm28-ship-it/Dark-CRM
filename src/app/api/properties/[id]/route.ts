import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MANAGER_ROLES = ["GENERAL_MANAGER", "SALES_MANAGER"];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!MANAGER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const allowedFields = [
      "title", "projectName", "unitNumber", "buildingNumber", "zone", "floor",
      "size", "bedrooms", "bathrooms", "unitType", "finishing", "price",
      "status", "description", "images", "monthlyInstallment", "remainingMonths",
      "installmentType", "installmentPercentage", "customData",
    ];
    const data = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key))
    );
    const property = await prisma.property.update({ where: { id }, data });
    return NextResponse.json({ success: true, property });
  } catch (error) {
    console.error("Update Property Error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!MANAGER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Property Error:", error);
    return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
  }
}
