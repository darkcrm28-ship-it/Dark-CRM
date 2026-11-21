import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLE, SALES_MANAGER_ROLES } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(SALES_MANAGER_ROLES);
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const { name, description } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "اسم المشروع مطلوب" }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: { name: name.trim(), description: description ? String(description).trim() : null },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "UPDATE",
        entity: "PROJECT",
        entityId: id,
        details: `تحديث بيانات المشروع: ${project.name}`,
      },
    }).catch(() => {});

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([ROLE.GENERAL_MANAGER]);
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const project = await prisma.project.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "DELETE",
        entity: "PROJECT",
        entityId: id,
        details: `حذف المشروع: ${project.name}`,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
