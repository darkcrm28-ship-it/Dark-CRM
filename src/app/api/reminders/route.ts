import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MANAGER_ROLES = ["GENERAL_MANAGER", "SALES_MANAGER"];

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Managers can see team reminders; all other roles see only their own.
    const where = MANAGER_ROLES.includes(session.role) ? {} : { userId: session.id };
    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { name: true } },
      },
    });
    return NextResponse.json(reminders, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Fetch Reminders Error:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const customerId = typeof body.customerId === "string" ? body.customerId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const dueDate = new Date(body.dueDate);
    if (!customerId || !title || Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "Customer, title and valid due date are required" }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: MANAGER_ROLES.includes(session.role)
        ? { id: customerId }
        : session.role === "SALES_EMPLOYEE"
          ? { id: customerId, assignedToId: session.id }
          : { id: "__forbidden__" },
      select: { id: true },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const reminder = await prisma.reminder.create({
      data: { customerId, title, dueDate, status: "PENDING", userId: session.id },
      include: { customer: { select: { id: true, name: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: session.id,
        title: `تذكير: ${title}`,
        body: `موعد المتابعة: ${dueDate.toLocaleDateString("ar-EG")}`,
        type: "INFO",
        link: `/dashboard/customers/${customerId}`,
      },
    });

    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error("Create Reminder Error:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id || typeof body.isDone !== "boolean") {
      return NextResponse.json({ error: "Reminder id and completion state are required" }, { status: 400 });
    }

    const existing = await prisma.reminder.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!existing) return NextResponse.json({ error: "Reminder not found" }, { status: 404 });

    const canManageAll = MANAGER_ROLES.includes(session.role);
    if (!canManageAll && existing.userId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: { status: body.isDone ? "COMPLETED" : "PENDING" },
    });
    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error("Update Reminder Error:", error);
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
  }
}
