import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Ensure there is a secret for signing JWTs
const secretKey = process.env.JWT_SECRET || "default_super_secret_key_for_development";
const key = new TextEncoder().encode(secretKey);

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
  // We keep the payload expiration but remove the cookie expiration to make it a session cookie
  const res = NextResponse.next();
  res.headers.append(
    "Set-Cookie",
    `session=${await encrypt(parsed)}; Path=/; HttpOnly; SameSite=Lax`
  );
  return res;
}
