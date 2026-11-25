import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isSupportedPushEndpoint } from "@/lib/push-endpoint";

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function isValidPushSubscription(body: any): body is {
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

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isValidPushSubscription(body)) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const { endpoint, keys } = body;

    // The subscription is keyed by (owner, endpoint). userId is never taken from
    // the request body, so a caller cannot rebind another user's subscription.
    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: session.id, endpoint } },
      update: { p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: session.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
