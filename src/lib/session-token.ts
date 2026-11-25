import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Resolves the HMAC key used to sign session cookies.
 *
 * Security rule: a missing/weak JWT_SECRET must never fall back to a known
 * constant in production — that would let anyone forge a GENERAL_MANAGER
 * session. During Next.js builds (where secrets are intentionally absent) and
 * in local development we use a random per-process key instead, which is
 * fail-closed: a token signed with it cannot be forged or reused elsewhere.
 */
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

  const isBuildPhase =
    typeof process.env.NEXT_PHASE === "string" && process.env.NEXT_PHASE.startsWith("phase-");
  const isLocalDev = process.env.NODE_ENV === "development";
  const explicitBuildOptIn = process.env.ALLOW_EPHEMERAL_SESSION_KEY === "1";

  if (isBuildPhase || isLocalDev || explicitBuildOptIn) {
    if (rawSecret) {
      console.warn("JWT_SECRET is shorter than 32 characters; using an ephemeral session key.");
    }
    const ephemeral = new Uint8Array(32);
    globalThis.crypto.getRandomValues(ephemeral);
    return ephemeral;
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
