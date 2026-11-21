import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, ROLE, SALES_ROLES } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const notifications = await prisma.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Fetch pending reminders due today or earlier
  const now = new Date();
  const reminders = SALES_ROLES.includes(session.role)
    ? await prisma.reminder.findMany({
        where: {
          userId: session.id,
          status: "PENDING",
          dueDate: { lte: now },
          ...(session.role === ROLE.SALES_EMPLOYEE ? { customer: { assignedToId: session.id } } : {}),
        },
        include: { customer: { select: { name: true } } },
      })
    : [];

  // Convert reminders to a notification-like format
  const reminderNotifs = reminders.map(r => ({
    id: `reminder-${r.id}`,
    userId: session.id,
    title: `تذكير متأخر: ${r.title}`,
    body: `يجب التواصل مع ${r.customer?.name || "العميل"}`,
    type: "WARNING",
    read: false,
    createdAt: r.dueDate,
  }));

  const allNotifications = [...reminderNotifs, ...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(allNotifications.slice(0, 30));
}

export async function PATCH(_request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  // Mark all as read
  await prisma.notification.updateMany({ where: { userId: session.id }, data: { read: true } });
  return NextResponse.json({ success: true });
}
