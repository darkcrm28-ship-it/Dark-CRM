import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isValidPushSubscription } from "@/lib/push-subscription";

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
