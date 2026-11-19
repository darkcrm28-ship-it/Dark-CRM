import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const session = await getSession();
  // Employee performance
  const employees = await prisma.user.findMany({
    where: { role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] } },
    include: {
      customers: { select: { id: true, status: true } },
      interactions: { select: { id: true, type: true } },
      commissions: { select: { amount: true } },
    },
  });

  // Customer status distribution
  const statusGroups = await prisma.customer.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  // Customers added per day (last 14 days)
  const recentCustomers = await prisma.customer.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Customer source distribution
  const sourceGroups = await prisma.customer.groupBy({
    by: ["source"],
    _count: { _all: true },
  });

  return <ReportsClient employees={employees} statusGroups={statusGroups} recentCustomers={recentCustomers} sourceGroups={sourceGroups} session={session} />;
}
