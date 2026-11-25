import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ALLOWED_ROLES, encrypt, type AppRole } from "@/lib/auth";
import { verifyPassword } from "@/lib/auth-server";

const NO_USER_PASSWORD_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json().catch(() => null)) ?? {};

    if (typeof email !== "string" || !email.trim() || email.length > 254 ||
        typeof password !== "string" || !password || password.length > 1024) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    const login = email.trim().toLowerCase();
    const alias = /^([^@]+)@(?:dark|darak)\.com$/.exec(login)?.[1];
    const username = alias ?? (!login.includes("@") ? login : null);
    const attemptsKey = username ?? login;
    const matches = username
      ? [...new Set([login, `${username}@darak.com`, `${username}@dark.com`])]
      : [login];
    const historicalKeys = [...new Set([attemptsKey, ...matches])];
    const header = request.headers.get("cf-connecting-ip")?.trim();
    const ip = header && /^[a-f\d:.]{3,45}$/i.test(header) ? header : "unknown";
    const ua = request.headers.get("user-agent")?.slice(0, 512) ?? "";

    const auth = await prisma.$transaction(async (tx) => {
      // Always acquire IP before email to keep the lock order consistent.
      if (ip !== "unknown") {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(829003::int, hashtext(${ip}))`;
      }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(829004::int, hashtext(${attemptsKey}))`;

      const since = new Date(Date.now() - 5 * 60 * 1000);
      const emailFailures = await tx.loginAttempt.count({
        where: { email: { in: historicalKeys }, success: false, createdAt: { gte: since } },
      });
      const ipAttempts = ip === "unknown" ? 0 : await tx.loginAttempt.count({
        where: { ip, createdAt: { gte: since } },
      });
      if (emailFailures >= 15 || ipAttempts >= 25) return { kind: "limited" } as const;

      const users = await tx.user.findMany({
        where: { email: { in: matches, mode: "insensitive" } },
        orderBy: { id: "asc" },
        select: { id: true, email: true, password: true, role: true, isActive: true },
      });
      const user = matches.map((emailAddress) =>
        users.find((candidate) => candidate.email.toLowerCase() === emailAddress)
      ).find(Boolean);
      // A missing user still incurs a bcrypt comparison of similar cost.
      const validPassword = await verifyPassword(password, user?.password ?? NO_USER_PASSWORD_HASH);
      const valid = Boolean(user?.isActive && validPassword);
      const allowed = Boolean(user && ALLOWED_ROLES.has(user.role as AppRole));
      await tx.loginAttempt.create({ data: { email: attemptsKey, ip, userAgent: ua, success: valid && allowed } });
      if (!user || !valid) return { kind: "invalid" } as const;
      if (!allowed) return { kind: "denied" } as const;
      return { kind: "valid", id: user.id } as const;
    }, { maxWait: 5000, timeout: 12000 });

    if (auth.kind === "limited") {
      return NextResponse.json({ error: "محاولة تسجيل دخول مكثفة، يرجى المحاولة لاحقاً." }, {
        status: 429, headers: { "Retry-After": "300" },
      });
    }
    if (auth.kind === "invalid") {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }
    if (auth.kind === "denied") {
      return NextResponse.json({ error: "هذا الدور غير مفعّل لتسجيل الدخول" }, { status: 403 });
    }

    const sessionData = { id: auth.id };
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
