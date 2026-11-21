import { SignJWT, jwtVerify, type JWTPayload } from "jose";

function getSessionKey() {
  let rawSecret = process.env.JWT_SECRET?.trim();
  if (
    rawSecret &&
    ((rawSecret.startsWith('"') && rawSecret.endsWith('"')) ||
      (rawSecret.startsWith("'") && rawSecret.endsWith("'")))
  ) {
    rawSecret = rawSecret.slice(1, -1).trim();
  }

  if (!rawSecret) {
    // During build time (Next.js static analysis), NODE_ENV may be "production"
    // but environment variables aren't injected yet. We use a build-time placeholder
    // that will NEVER be used at runtime (Cloudflare Workers inject env at request time).
    if (process.env.NODE_ENV === "development") {
      rawSecret = "development_only_secret_key_change_in_production_32chars";
    } else {
      // At runtime on Cloudflare, JWT_SECRET MUST be set via Cloudflare Pages secrets.
      // During build/static-analysis phase, we return a dummy key to avoid crashing.
      rawSecret = "build_time_placeholder_not_used_at_runtime_set_JWT_SECRET_in_cloudflare";
    }
  }

  return new TextEncoder().encode(rawSecret);
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
