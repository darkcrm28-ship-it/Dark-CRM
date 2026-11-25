import { SignJWT, jwtVerify, type JWTPayload } from "jose";

let developmentKey: Uint8Array | undefined;

function getSessionKey(): Uint8Array {
  let rawSecret = process.env.JWT_SECRET?.trim();
  if (
    rawSecret &&
    ((rawSecret.startsWith('"') && rawSecret.endsWith('"')) ||
      (rawSecret.startsWith("'") && rawSecret.endsWith("'")))
  ) {
    rawSecret = rawSecret.slice(1, -1).trim();
  }

  if (rawSecret && rawSecret.length >= 32) {
    return new TextEncoder().encode(rawSecret);
  }

  if (process.env.NODE_ENV === "development") {
    developmentKey ??= globalThis.crypto.getRandomValues(new Uint8Array(32));
    return developmentKey;
  }

  throw new Error(
    "JWT_SECRET is missing or too short. Set a random secret of at least 32 characters " +
      "(Cloudflare Workers secret) before serving requests."
  );
}

export async function encrypt(payload: JWTPayload) {
  const key = getSessionKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string): Promise<JWTPayload> {
  const key = getSessionKey();
  const { payload } = await jwtVerify(input, key, { algorithms: ["HS256"] });
  return payload;
}
