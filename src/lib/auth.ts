import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

let rawSecret = process.env.JWT_SECRET?.trim();
if (rawSecret && ((rawSecret.startsWith('"') && rawSecret.endsWith('"')) || (rawSecret.startsWith("'") && rawSecret.endsWith("'")))) {
  rawSecret = rawSecret.slice(1, -1).trim();
}

if (!rawSecret && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set!");
}

const key = new TextEncoder().encode(
  rawSecret || "development_only_secret_key_change_in_production_32chars"
);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}

export async function getSession() {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function updateSession(request: any) {
  const session = request.cookies.get("session")?.value;
  if (!session) return;

  const parsed = await decrypt(session);
  const res = NextResponse.next();
  res.headers.append(
    "Set-Cookie",
    `session=${await encrypt(parsed)}; Path=/; HttpOnly; SameSite=Lax`
  );
  return res;
}
