import { prisma } from "@/lib/db";
import { requirePageRole, SALES_MANAGER_ROLES, SALES_ROLES } from "@/lib/auth";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const session = await requirePageRole(SALES_ROLES);
  const isManager = SALES_MANAGER_ROLES.includes(session.role);

  const reminders = await prisma.reminder.findMany({
    where: isManager ? {} : { userId: session.id, customer: { assignedToId: session.id } },
    orderBy: { dueDate: "asc" },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      user: { select: { name: true } },
    },
  });

  const customers = isManager
    ? await prisma.customer.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } })
    : await prisma.customer.findMany({ where: { assignedToId: session.id }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } });

  return <CalendarClient reminders={reminders} customers={customers} isManager={isManager} />;
}
