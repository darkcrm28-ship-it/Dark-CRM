import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const fields = await (prisma as any).customFieldDefinition.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json(fields);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch custom fields" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "GENERAL_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { entityType, label, name, fieldType, options } = await request.json();

    if (!entityType || !label || !name || !fieldType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const field = await (prisma as any).customFieldDefinition.create({
      data: { entityType, label, name, fieldType, options }
    });

    return NextResponse.json(field);
  } catch (error) {
    console.error("Create Custom Field Error:", error);
    return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "GENERAL_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await request.json();
    await (prisma as any).customFieldDefinition.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete field" }, { status: 500 });
  }
}
