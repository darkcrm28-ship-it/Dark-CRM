import { getSession, ROLE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
    return null;
  }

  if (session.role === ROLE.HR_MANAGER) redirect("/dashboard/commissions");
  if (session.role === ROLE.ACCOUNTING_MANAGER) redirect("/dashboard/accounting");

  const isManager = session.role === "GENERAL_MANAGER" || session.role === "SALES_MANAGER";
  const where = isManager ? {} : { assignedToId: session.id };
  const interactionWhere = isManager ? {} : { userId: session.id };

  const startOfYesterday = new Date();
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  startOfYesterday.setHours(0,0,0,0);

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);

  const [
    totalCustomers, totalBuyers, totalSellers, totalUsers, interestedCount, wantsToSellCount, recentInteractions, neglectedCount, deals,
    callsToday, viewingsToday, newLeadsToday, teamCallsToday
  ] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.count({ where: { ...where, type: "BUYER" } }),
    prisma.customer.count({ where: { ...where, type: "SELLER" } }),
    prisma.user.count(),
    prisma.customer.count({ where: { ...where, status: "INTERESTED" } }),
    prisma.customer.count({ where: { ...where, status: { in: ["WANTS_TO_SELL", "SELLER", "LANDLORD"] }, isArchived: false } }),
    prisma.interaction.findMany({
      where: {
        ...interactionWhere,
        ...(session.role === ROLE.SALES_EMPLOYEE ? { customer: { assignedToId: session.id } } : {}),
        createdAt: { gte: startOfYesterday } // Today and Yesterday only
      },
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.reminder.count({
      where: {
        ...(isManager ? {} : { userId: session.id }),
        status: "PENDING",
        dueDate: { lt: new Date() }
      }
    }),
    prisma.deal.findMany({ 
      where: isManager ? {} : { salesRepId: session.id }, 
      select: { value: true, finalPrice: true, createdAt: true } 
    }),
    prisma.interaction.count({ where: { userId: session.id, type: "CALL", createdAt: { gte: startOfToday } } }),
    prisma.interaction.count({ where: { userId: isManager ? undefined : session.id, type: "VIEWING", createdAt: { gte: startOfToday } } }),
    prisma.customer.count({ where: { assignedToId: session.id, createdAt: { gte: startOfToday } } }),
    isManager ? prisma.interaction.count({ where: { type: "CALL", createdAt: { gte: startOfToday } } }) : 0
  ]);

  const totalDeals = deals.length;
  const totalSalesValue = deals.reduce((sum, d) => sum + (d.finalPrice || d.value || 0), 0);

  // Group deals by month for the chart
  const salesByMonth: Record<string, number> = {};
  deals.forEach((d) => {
    const month = new Date(d.createdAt).toLocaleString('ar-EG', { month: 'short' });
    salesByMonth[month] = (salesByMonth[month] || 0) + (d.finalPrice || d.value || 0);
  });
  
  const salesOverTime = Object.keys(salesByMonth).map(month => ({
    month,
    value: salesByMonth[month]
  }));

  // Team Performance Table for Managers
  const teamPerformance = isManager ? await prisma.user.findMany({
    where: { role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] } },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          customers: true,
          interactions: { where: { type: "CALL" } }
        }
      },
      customers: {
        select: {
          status: true,
          lastInteractionAt: true
        }
      }
    }
  }).then(users => users.map(u => ({
    id: u.id,
    name: u.name,
    assignedCount: u._count.customers,
    callsCount: u._count.interactions,
    notContacted: u.customers.filter(c => !c.lastInteractionAt).length,
    interested: u.customers.filter(c => c.status === "INTERESTED").length,
    notInterested: u.customers.filter(c => c.status === "NOT_INTERESTED").length
  }))) : [];

  return (
    <DashboardClient 
      session={session}
      isManager={isManager}
      stats={{ 
        totalCustomers, totalBuyers, totalSellers, totalUsers, interestedCount, wantsToSellCount, totalDeals, totalSalesValue,
        callsToday, viewingsToday, newLeadsToday, teamCallsToday
      }}
      recentInteractions={recentInteractions}
      neglectedCount={neglectedCount}
      chartData={salesOverTime}
      teamPerformance={teamPerformance}
    />
  );
}
