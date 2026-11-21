import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import ReportsClient from "./ReportsClient";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session || !["GENERAL_MANAGER", "SALES_MANAGER"].includes(session.role)) redirect("/dashboard");
  const employees = await prisma.user.findMany({
    where: { role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] } },
    select: {
      id: true, name: true, email: true,
      _count: { select: { customers: true, interactions: true } },
    },
  });
  const employeeIds = employees.map((employee) => employee.id);
  const [interactionGroups, commissionGroups, customerGroups] = employeeIds.length
    ? await Promise.all([
        prisma.interaction.groupBy({ by: ["userId", "type"], where: { userId: { in: employeeIds } }, _count: { _all: true } }),
        prisma.commission.groupBy({ by: ["userId"], where: { userId: { in: employeeIds } }, _sum: { amount: true } }),
        prisma.customer.groupBy({ by: ["assignedToId", "status"], where: { assignedToId: { in: employeeIds } }, _count: { _all: true } }),
      ])
    : [[], [], []];
  const employeesWithStats = employees.map((employee) => ({
    ...employee,
    customerCount: employee._count.customers,
    completedCount: customerGroups.find((group) => group.assignedToId === employee.id && group.status === "COMPLETED")?._count._all ?? 0,
    callsCount: interactionGroups.find((group) => group.userId === employee.id && group.type === "CALL")?._count._all ?? 0,
    viewingsCount: interactionGroups.find((group) => group.userId === employee.id && group.type === "VIEWING")?._count._all ?? 0,
    commissionTotal: commissionGroups.find((group) => group.userId === employee.id)?._sum.amount ?? 0,
  }));

  // Customer status distribution
  const statusGroups = await prisma.customer.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  // Customers added per day (last 14 days)
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 13);
  const recentCustomers = await prisma.customer.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Customer source distribution
  const sourceGroups = await prisma.customer.groupBy({
    by: ["source"],
    _count: { _all: true },
  });

  return <ReportsClient employees={employeesWithStats} statusGroups={statusGroups} recentCustomers={recentCustomers} sourceGroups={sourceGroups} session={session} />;
}
