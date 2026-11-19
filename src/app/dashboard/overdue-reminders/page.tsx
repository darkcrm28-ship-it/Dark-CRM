import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import OverdueRemindersClient from "./OverdueRemindersClient";

export default async function OverdueRemindersPage() {
  const session = await getSession();
  const isManager = session?.role === "GENERAL_MANAGER" || session?.role === "SALES_MANAGER";

  // Fetch overdue reminders with PENDING status
  const reminders = await prisma.reminder.findMany({
    where: {
      ...(isManager ? {} : { userId: session?.id }),
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
