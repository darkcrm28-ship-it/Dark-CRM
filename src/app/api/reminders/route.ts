import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, SALES_ROLES, SALES_MANAGER_ROLES } from "@/lib/auth";
import { handleReminderStatusChange } from "@/lib/notification-dispatcher";
import { enqueueJob } from "@/lib/background-jobs";

const MANAGER_ROLES = SALES_MANAGER_ROLES;

export async function GET() {
  try {
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

    // Managers can see team reminders; all other roles see only their own.
    const where = MANAGER_ROLES.includes(session.role)
      ? {}
      : { userId: session.id, customer: { assignedToId: session.id } };
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
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

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

    // Reminder delivery goes through the durable queue so the cron worker owns
    // notification + push dispatch and retries it safely. The dispatch key is
    // derived from the immutable due date, so replays cannot create duplicates.
    const dispatchKey = `REMINDER_SEND:${reminder.id}:${reminder.dueDate.getTime()}`;
    await enqueueJob(
      "REMINDER_SEND",
      { reminderId: reminder.id, dispatchKey },
      new Date(Math.min(Date.now(), reminder.dueDate.getTime()))
    );

    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error("Create Reminder Error:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id || typeof body.isDone !== "boolean") {
      return NextResponse.json({ error: "Reminder id and completion state are required" }, { status: 400 });
    }

    const existing = await prisma.reminder.findUnique({
      where: { id },
      select: { id: true, userId: true, customer: { select: { assignedToId: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Reminder not found" }, { status: 404 });

    const canManageAll = MANAGER_ROLES.includes(session.role);
    if (!canManageAll && (existing.userId !== session.id || existing.customer.assignedToId !== session.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reminder = await handleReminderStatusChange({
      reminderId: id,
      isDone: body.isDone,
      operatorUserId: session.id,
    });
    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error("Update Reminder Error:", error);
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
  }
}
