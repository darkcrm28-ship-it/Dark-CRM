import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import MyDayClient from "./MyDayClient";

export default async function MyDayPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where = { 
    assignedToId: session.id,
    status: { notIn: ["NOT_INTERESTED", "DO_NOT_SELL"] }
  };

  const [
    todayReminders,
    overdueReminders,
    myCustomers,
    todayInteractions,
    newCustomers,
  ] = await Promise.all([
    // Today's reminders
    prisma.reminder.findMany({
      where: { userId: session.id, status: "PENDING", dueDate: { gte: today, lt: tomorrow } },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { dueDate: "asc" },
    }),
    // Overdue reminders
    prisma.reminder.findMany({
      where: { userId: session.id, status: "PENDING", dueDate: { lt: today } },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { dueDate: "asc" },
    }),
    // My assigned customers (recent 20)
    prisma.customer.findMany({
      where,
      include: {
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, type: true },
        },
        reminders: {
          where: { status: "PENDING" },
          orderBy: { dueDate: "asc" },
          take: 1,
          select: { dueDate: true, title: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    // My calls/notes today
    prisma.interaction.findMany({
      where: { userId: session.id, createdAt: { gte: today, lt: tomorrow } },
      select: { id: true, type: true },
    }),
    // New customers assigned to me in last 3 days
    prisma.customer.findMany({
      where: { assignedToId: session.id, createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
      select: { id: true, name: true, phone: true, status: true, createdAt: true },
    }),
  ]);

  // Customers with no interaction in last 3 days
  const needsFollowUp = myCustomers.filter((c) => {
    if (["COMPLETED", "DO_NOT_SELL", "NOT_INTERESTED"].includes(c.status)) return false;
    const lastInteraction = c.interactions[0];
    if (!lastInteraction) return true;
    const daysDiff = (Date.now() - new Date(lastInteraction.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 3;
  });

  const totalMyCustomers = await prisma.customer.count({ where });

  return (
    <MyDayClient
      session={session}
      todayReminders={todayReminders}
      overdueReminders={overdueReminders}
      myCustomers={myCustomers}
      needsFollowUp={needsFollowUp}
      todayInteractions={todayInteractions}
      newCustomers={newCustomers}
      totalMyCustomers={totalMyCustomers}
    />
  );
}
