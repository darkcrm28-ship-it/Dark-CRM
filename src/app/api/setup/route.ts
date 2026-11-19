import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check if any user exists
    const usersCount = await prisma.user.count();
    
    if (usersCount > 0) {
      return NextResponse.json(
        { error: "النظام مهيأ بالفعل ويوجد مستخدمين" },
        { status: 400 }
      );
    }

    // Create the first General Manager
    const hashedPassword = await hashPassword("admin123");
    
    const admin = await prisma.user.create({
      data: {
        name: "المدير العام",
        email: "admin@dark.com",
        password: hashedPassword,
        role: "GENERAL_MANAGER",
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تهيئة النظام وإنشاء حساب المدير العام بنجاح",
      user: {
        email: admin.email,
        password: "admin123", // Only showing once for initial setup
      }
    });

  } catch (error) {
    console.error("Setup Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تهيئة النظام" },
      { status: 500 }
    );
  }
}
