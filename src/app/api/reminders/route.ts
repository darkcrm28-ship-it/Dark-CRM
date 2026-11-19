import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = session.role === "SALES_EMPLOYEE" ? { userId: session.id } : {};
  const reminders = await prisma.reminder.findMany({
    where,
    orderBy: { dueDate: "asc" },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      user: { select: { name: true } },
    },
  });
  return NextResponse.json(reminders);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const reminder = await prisma.reminder.create({
    data: { ...body, userId: session.id },
    include: { customer: { select: { id: true, name: true } } },
  });

  // Create notification for the assigned user if different
  await prisma.notification.create({
    data: {
      userId: session.id,
      title: `تذكير: ${body.title}`,
      body: `موعد المتابعة: ${new Date(body.dueDate).toLocaleDateString("ar-EG")}`,
      type: "INFO",
      link: `/dashboard/customers/${body.customerId}`,
    },
  });

  return NextResponse.json({ success: true, reminder });
}

export async function PATCH(request: NextRequest) {
  const { id, isDone } = await request.json();
  const reminder = await prisma.reminder.update({ 
    where: { id }, 
    data: { status: isDone ? "COMPLETED" : "PENDING" } 
  });
  return NextResponse.json({ success: true, reminder });
}
