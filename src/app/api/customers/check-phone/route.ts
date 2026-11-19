import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const phone = request.nextUrl.searchParams.get("phone");
    if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

    const customer = await prisma.customer.findFirst({
      where: { phone: { contains: phone } },
      select: { id: true, name: true, phone: true }
    });

    return NextResponse.json({ exists: !!customer, customer });
  } catch (error) {
    return NextResponse.json({ error: "Failed to check phone" }, { status: 500 });
  }
}
