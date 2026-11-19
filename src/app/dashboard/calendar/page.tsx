import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const session = await getSession();
  const isManager = session?.role === "GENERAL_MANAGER" || session?.role === "SALES_MANAGER";

  const reminders = await prisma.reminder.findMany({
    where: isManager ? {} : { userId: session?.id },
    orderBy: { dueDate: "asc" },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      user: { select: { name: true } },
    },
  });

  const customers = isManager
    ? await prisma.customer.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } })
    : await prisma.customer.findMany({ where: { assignedToId: session?.id }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } });

  return <CalendarClient reminders={reminders} customers={customers} isManager={isManager} />;
}
