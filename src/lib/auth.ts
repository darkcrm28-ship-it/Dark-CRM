
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// قراءة مفتاح التشفير
let rawSecret = process.env.JWT_SECRET?.trim();

if (
  rawSecret &&
  (
    (rawSecret.startsWith('"') && rawSecret.endsWith('"')) ||
    (rawSecret.startsWith("'") && rawSecret.endsWith("'"))
  )
) {
  rawSecret = rawSecret.slice(1, -1).trim();
}

// منع تشغيل الإنتاج بدون مفتاح آمن
if (!rawSecret && process.env.NODE_ENV === "production") {
  throw new Error(
    "CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set!"
  );
}

const key = new TextEncoder().encode(
  rawSecret || "development_only_secret_key_change_in_production_32chars"
);

// إنشاء الجلسة
export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

// فك تشفير الجلسة
export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });

  return payload;
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) return null;

    return await decrypt(session);
  } catch (error) {
    console.error("Get Session Error:", error);
    return null;
  }
}

// تحديث الجلسة
export async function updateSession(request: any) {
  const session = request.cookies.get("session")?.value;

  if (!session) {
    return;
  }

  try {
    const parsed = await decrypt(session);
    const res = NextResponse.next();

    res.headers.append(
      "Set-Cookie",
      `session=${await encrypt(parsed)}; Path=/; HttpOnly; SameSite=Lax`
    );

    return res;
  } catch (error) {
    console.error("Session Update Error:", error);
    return;
  }
}
