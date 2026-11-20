import { SignJWT, jwtVerify, type JWTPayload } from "jose";

let rawSecret = process.env.JWT_SECRET?.trim();
if (
  rawSecret &&
  ((rawSecret.startsWith('"') && rawSecret.endsWith('"')) ||
    (rawSecret.startsWith("'") && rawSecret.endsWith("'")))
) {
  rawSecret = rawSecret.slice(1, -1).trim();
}

if (!rawSecret && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set!");
}

const key = new TextEncoder().encode(
  rawSecret || "development_only_secret_key_change_in_production_32chars"
);

export async function encrypt(payload: JWTPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(input, key, { algorithms: ["HS256"] });
  return payload;
}
