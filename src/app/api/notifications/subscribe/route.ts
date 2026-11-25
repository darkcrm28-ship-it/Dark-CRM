import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function isValidPushSubscription(body: any): body is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  if (!body || typeof body !== "object") return false;
  const { endpoint, keys } = body;
  if (typeof endpoint !== "string" || endpoint.length < 20 || endpoint.length > 2048) return false;

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }

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
  return true;
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
    const existing = await prisma.pushSubscription.findUnique({
      where: { userId_endpoint: { userId: session.id, endpoint } },
      select: { id: true },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { p256dh: keys.p256dh, auth: keys.auth },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId: session.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
