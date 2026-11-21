import { prisma } from "@/lib/db";
import { requirePageRole, SALES_MANAGER_ROLES, SALES_ROLES } from "@/lib/auth";
import OverdueRemindersClient from "./OverdueRemindersClient";

export default async function OverdueRemindersPage() {
  const session = await requirePageRole(SALES_ROLES);
  const isManager = SALES_MANAGER_ROLES.includes(session.role);

  // Fetch overdue reminders with PENDING status
  const reminders = await prisma.reminder.findMany({
    where: {
      ...(isManager ? {} : { userId: session.id }),
      ...(isManager ? {} : { customer: { assignedToId: session.id } }),
      status: "PENDING",
      dueDate: { lt: new Date() } // Overdue
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          assignedTo: { select: { name: true } }
        }
      },
      user: {
        select: { name: true }
      }
    },
    orderBy: { dueDate: "asc" }
  });

  return <OverdueRemindersClient reminders={reminders} isManager={isManager} />;
}
