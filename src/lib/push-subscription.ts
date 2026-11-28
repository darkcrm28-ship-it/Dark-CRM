import { isSupportedPushEndpoint } from "./push-endpoint";
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export function isValidPushSubscription(body: any): body is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  if (!body || typeof body !== "object") return false;
  const { endpoint, keys } = body;
  if (typeof endpoint !== "string" || endpoint.length < 20 || endpoint.length > 2048) return false;

  if (!isSupportedPushEndpoint(endpoint)) return false;

  if (!keys || typeof keys !== "object") return false;
  const { p256dh, auth } = keys;
  if (
    typeof p256dh !== "string" ||
    p256dh.length < 40 ||
    p256dh.length > 200 ||
    !BASE64URL.test(p256dh)
  ) {
    return false;
  }
  if (typeof auth !== "string" || auth.length < 16 || auth.length > 100 || !BASE64URL.test(auth)) {
    return false;
  }
  return Buffer.from(p256dh, "base64url").length === 65 &&
    Buffer.from(p256dh, "base64url")[0] === 4 &&
    Buffer.from(auth, "base64url").length === 16;
}
