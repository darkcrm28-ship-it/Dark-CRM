import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const property = await prisma.property.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ success: true, property });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.property.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
