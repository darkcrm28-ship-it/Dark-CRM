import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ALLOWED_ROLES, requireRole, ROLE } from "@/lib/auth";
import { hashPassword } from "@/lib/auth-server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([ROLE.GENERAL_MANAGER]);
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const data = await request.json();
    
    const { name, email, password: newPassword, role, phone, nationalId, address, dateJoined, salaryBase, isActive, expertAreas } = data;

    if (role !== undefined && !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "الدور المحدد غير صالح" }, { status: 400 });
    }

    const updateData: any = {
      name,
      email,
      role,
      phone,
      nationalId,
      address,
      dateJoined: dateJoined ? new Date(dateJoined) : null,
      salaryBase: salaryBase ? parseFloat(salaryBase) : 0,
      isActive: isActive !== undefined ? isActive : true,
      expertAreas: expertAreas || null,
    };

    if (newPassword && newPassword.length >= 6) {
      updateData.password = await hashPassword(newPassword);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Don't return password
    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Update User Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
