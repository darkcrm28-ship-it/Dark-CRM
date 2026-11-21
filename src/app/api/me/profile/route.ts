import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        nationalId: true,
        address: true,
        birthDate: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        bankAccountDetails: true,
        qualification: true,
        experience: true,
        dateJoined: true,
        salaryBase: true,
        profileCompleted: true,
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Fetch Profile Error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    const data = await request.json();
    const { 
      currentPassword, 
      newPassword,
      phone,
      nationalId,
      address,
      birthDate,
      emergencyContactName,
      emergencyContactPhone,
      bankAccountDetails,
      qualification,
      experience
    } = data;

    const user = await prisma.user.findUnique({
      where: { id: session.id }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {
      phone,
      nationalId,
      address,
      birthDate: birthDate ? new Date(birthDate) : null,
      emergencyContactName,
      emergencyContactPhone,
      bankAccountDetails,
      qualification,
      experience,
      profileCompleted: true // Mark as completed when user updates
    };

    // If password change is requested
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "كلمة المرور الحالية مطلوبة لتغيير كلمة المرور" }, { status: 400 });
      }

      const isPasswordValid = await verifyPassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
      }

      updateData.password = await hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: updateData
    });

    return NextResponse.json({ success: true, message: "تم تحديث الملف الشخصي بنجاح" });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث الملف الشخصي" }, { status: 500 });
  }
}
