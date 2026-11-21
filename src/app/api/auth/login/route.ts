import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ALLOWED_ROLES, encrypt, type AppRole } from "@/lib/auth";
import { verifyPassword } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    const cleanInput = String(email).trim().toLowerCase();

    // Support entering email or shorthand username (e.g., 'admin' -> 'admin@darak.com')
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanInput, mode: "insensitive" } },
          { email: { equals: `${cleanInput}@darak.com`, mode: "insensitive" } },
          { email: { equals: `${cleanInput}@dark.com`, mode: "insensitive" } },
          { email: { equals: cleanInput.replace("@dark.com", "@darak.com"), mode: "insensitive" } },
        ],
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.has(user.role as AppRole)) {
      return NextResponse.json({ error: "هذا الدور غير مفعّل لتسجيل الدخول" }, { status: 403 });
    }

    // Create session. Only the identity (id) is embedded in the token. Every
    // authority decision is re-verified against the database by getSession(),
    // so a role change or deactivation takes effect on the very next request.
    const sessionData = {
      id: user.id,
    };

    const sessionToken = await encrypt(sessionData);

    const response = NextResponse.json({ success: true, user: sessionData });
    
    // Set cookie
    response.cookies.set({
      name: "session",
      value: sessionToken,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}
