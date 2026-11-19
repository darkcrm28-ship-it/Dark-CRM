import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Direct GET access is disabled. Use authenticated POST setup." },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const setupSecret = process.env.SETUP_SECRET;
    
    // Security Guard: If SETUP_SECRET is not configured or disabled, reject all requests
    if (!setupSecret || setupSecret.trim().length < 8) {
      return NextResponse.json(
        { error: "Initial setup is disabled. Configure SETUP_SECRET in environment variables to enable." },
        { status: 403 }
      );
    }

    // Verify incoming secret token from headers or request body
    const providedSecret =
      request.headers.get("x-setup-secret") ||
      request.nextUrl.searchParams.get("secret");

    const body = await request.json().catch(() => ({}));
    const token = providedSecret || body?.secret;

    if (!token || token !== setupSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing setup secret token." },
        { status: 403 }
      );
    }

    // Check if any user already exists
    const usersCount = await prisma.user.count();
    if (usersCount > 0) {
      return NextResponse.json(
        { error: "النظام مهيأ بالفعل ويوجد مستخدمين مسجلين مسبقاً." },
        { status: 403 }
      );
    }

    const { name, email, password } = body;

    const adminEmail = (email && typeof email === "string" && email.includes("@")) ? email.trim().toLowerCase() : null;
    const adminName = (name && typeof name === "string") ? name.trim() : "المدير العام";
    const adminPassword = (password && typeof password === "string" && password.length >= 8)
      ? password
      : null;

    if (!adminEmail) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مطلوب وصحيح." },
        { status: 400 }
      );
    }

    if (!adminPassword) {
      return NextResponse.json(
        { error: "كلمة المرور مطلوبة ويجب ألا تقل عن 8 أحرف." },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(adminPassword);

    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: "GENERAL_MANAGER",
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تهيئة النظام وإنشاء حساب المدير العام بنجاح وبأمان.",
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Secure Setup Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تهيئة النظام." },
      { status: 500 }
    );
  }
}
