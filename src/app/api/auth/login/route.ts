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
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const ua = request.headers.get("user-agent") ?? "";
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const maxAttempts = 5;

    // --- DB-backed rate limiting ---
    let limited = false;
    let retryAfterMs = 0;

    try {
      const result = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
        `SELECT COUNT(*)::int AS cnt FROM "LoginAttempt"
         WHERE "email" = $1 AND "createdAt" >= now() - interval '5 minutes'`,
        cleanEmail
      );
      const cnt = result?.[0]?.cnt ?? 0;
      if (cnt >= maxAttempts) {
        limited = true;
        retryAfterMs = Math.min(30_000, 1000 * Math.pow(2, cnt - maxAttempts + 1));
        await prisma.$executeRaw`
          INSERT INTO "AuditLog" ("userId", "action", "entity", "entityId", "details")
          VALUES (NULL, 'LOGIN_RATE_LIMIT', 'AUTH', NULL, ${JSON.stringify({
            email: cleanEmail,
            attemptCount: cnt,
            retryAfterMs,
          })})
        `.catch(() => {});
      }
    } catch (e) {
      console.warn("Rate limiter DB error, falling back to cookie", e);
    }

    // --- Cookie-based fallback / supplement ---
    let attemptCount = 1;
    const existingCookie = request.cookies.get("login_rate_limit");
    if (existingCookie?.value) {
      try {
        const payload = JSON.parse(existingCookie.value) as { email: string; count: number; windowStart: number };
        if (payload.email === cleanEmail && now - payload.windowStart <= windowMs) {
          attemptCount = payload.count + 1;
        }
      } catch {}
    }

    if (!limited && attemptCount > maxAttempts) {
      limited = true;
      retryAfterMs = Math.min(30_000, 1000 * Math.pow(2, attemptCount - maxAttempts));
    }

    if (limited) {
      return NextResponse.json(
        { error: "محاولة تسجيل دخول مكثفة، يرجى المحاولة لاحقاً." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
        }
      );
    }

    // --- Record attempt in DB (best-effort) ---
    await prisma.$executeRaw`
      INSERT INTO "LoginAttempt" ("email", "ip", "userAgent", "success")
      VALUES (${cleanEmail}, ${ip}, ${ua}, false)
    `.catch(() => {});

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

    if (!user || !user.isActive) {
      // Update cookie with failure count
      const response = NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
      response.cookies.set("login_rate_limit", JSON.stringify({ email: cleanEmail, count: attemptCount, windowStart: now }), {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 5,
      });
      return response;
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      const response = NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
      response.cookies.set("login_rate_limit", JSON.stringify({ email: cleanEmail, count: attemptCount, windowStart: now }), {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 5,
      });
      return response;
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
    response.cookies.set("login_rate_limit", "", { httpOnly: true, path: "/", maxAge: 0 });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}