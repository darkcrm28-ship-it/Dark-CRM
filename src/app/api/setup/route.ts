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

    // Verify incoming secret token from header ONLY (no query string, no body).
    // Query strings can leak through logs, referrer headers, and browser history.
    const token = request.headers.get("x-setup-secret");

    if (!token || token !== setupSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing setup secret token." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Check if any user already exists. Do this inside a transaction with an
    // advisory lock so concurrent setup requests can't both create an admin.
    const SETUP_LOCK = 74839301;
    const outcome = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SETUP_LOCK});`;

      const usersCount = await tx.user.count();
      if (usersCount > 0) {
        return { __alreadyInitialized: true as const };
      }

      const { name, email, password } = body;

      const adminEmail = (email && typeof email === "string" && email.includes("@"))
        ? email.trim().toLowerCase()
        : null;
      const adminName = (name && typeof name === "string") ? name.trim() : "المدير العام";
      const adminPassword = (password && typeof password === "string" && password.length >= 8)
        ? password
        : null;

      if (!adminEmail) {
        return { __validationError: "البريد الإلكتروني مطلوب وصحيح." as const };
      }
      if (!adminPassword) {
        return { __validationError: "كلمة المرور مطلوبة ويجب ألا تقل عن 8 أحرف." as const };
      }

      const hashedPassword = await hashPassword(adminPassword);

      const admin = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: "GENERAL_MANAGER",
        },
      });

      return { admin, alreadyInitialized: false as const };
    });

    if ("__alreadyInitialized" in outcome && outcome.__alreadyInitialized) {
      return NextResponse.json(
        { error: "النظام مهيأ بالفعل ويوجد مستخدمين مسجلين مسبقاً." },
        { status: 403 }
      );
    }
    if ("__validationError" in outcome && outcome.__validationError) {
      return NextResponse.json({ error: outcome.__validationError }, { status: 400 });
    }
    if ("admin" in outcome && outcome.admin) {
      return NextResponse.json({
        success: true,
        message: "تم تهيئة النظام وإنشاء حساب المدير العام بنجاح وبأمان.",
        user: {
          id: outcome.admin.id,
          email: outcome.admin.email,
          name: outcome.admin.name,
          role: outcome.admin.role,
        },
      });
    }

    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء التهيئة." },
      { status: 500 }
    );
  } catch (error) {
    console.error("Secure Setup Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تهيئة النظام." },
      { status: 500 }
    );
  }
}
