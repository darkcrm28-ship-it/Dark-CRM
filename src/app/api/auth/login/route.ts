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

    const cleanEmail = String(email).trim().toLowerCase();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ua = request.headers.get("user-agent") ?? "";

    const maxEmailFailures = 15;    // failed attempts per email per window
    const maxIpAttempts = 25;       // total attempts per IP per window

    // --- Rate limiting (DB-backed, shared across Cloudflare Workers) ---
    // Email-based: count FAILED attempts only, to avoid locking a legit user
    // merely because an attacker targets their email address.
    const emailFailureCount = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      `SELECT COUNT(*)::int AS cnt FROM "LoginAttempt"
       WHERE "email" = $1 AND "success" = false AND "createdAt" >= now() - interval '5 minutes'`,
      cleanEmail
    );
    const emailFailures = emailFailureCount?.[0]?.cnt ?? 0;

    // IP-based: count ALL attempts from the same IP to block brute-force /
    // credential-stuffing irrespective of which email is targeted.
    const ipAttemptCount = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      `SELECT COUNT(*)::int AS cnt FROM "LoginAttempt"
       WHERE "ip" = $1 AND "createdAt" >= now() - interval '5 minutes'`,
      ip
    );
    const ipAttempts = ipAttemptCount?.[0]?.cnt ?? 0;

    if (emailFailures >= maxEmailFailures || ipAttempts >= maxIpAttempts) {
      return NextResponse.json(
        { error: "محاولة تسجيل دخول مكثفة، يرجى المحاولة لاحقاً." },
        {
          status: 429,
          headers: { "Retry-After": "300" },
        }
      );
    }

    // --- Normal login ---
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail, mode: "insensitive" } },
          { email: { equals: `${cleanEmail}@darak.com`, mode: "insensitive" } },
          { email: { equals: `${cleanEmail}@dark.com`, mode: "insensitive" } },
          { email: { equals: cleanEmail.replace("@dark.com", "@darak.com"), mode: "insensitive" } },
        ],
      },
    });

    let isValid = false;
    if (user) {
      isValid = await verifyPassword(password, user.password);
    }

    // Record the attempt with its REAL result: success or failure.
    // Never record a successful login as a failure.
    try {
      await prisma.$executeRaw`
        INSERT INTO "LoginAttempt" ("email", "ip", "userAgent", "success")
        VALUES (${cleanEmail}, ${ip}, ${ua}, ${isValid})
      `.catch(() => {});
    } catch {
      // Login attempt table best-effort; do not block login if it fails.
    }

    // Generic error regardless of why login failed — no account enumeration.
    if (!user || !user.isActive || !isValid) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.has(user.role as AppRole)) {
      return NextResponse.json({ error: "هذا الدور غير مفعّل لتسجيل الدخول" }, { status: 403 });
    }

    // --- Success ---
    const sessionData = { id: user.id };
    const sessionToken = await encrypt(sessionData);

    const response = NextResponse.json({ success: true, user: sessionData });
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