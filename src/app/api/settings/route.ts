import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: "GLOBAL" } });
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "GENERAL_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const settings = await prisma.systemSettings.upsert({
      where: { id: "GLOBAL" },
      update: data,
      create: { id: "GLOBAL", ...data },
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
