import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import TodayReportClient from "@/app/dashboard/reports/today/TodayReportClient";

export default async function TodayReportPage({ searchParams }: { searchParams: Promise<{ type?: string; empId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const session = await getSession();
  const isManager = session?.role === "GENERAL_MANAGER" || session?.role === "SALES_MANAGER";
  
  const type = resolvedSearchParams.type || "calls";
  const empId = resolvedSearchParams.empId;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const interactionTypeMap: Record<string, string> = {
    calls: "CALL",
    viewings: "VIEWING",
    notes: "NOTE",
  };

  const interactionType = interactionTypeMap[type];

  const whereBase = {
    createdAt: { gte: startOfToday },
    ...(empId ? { userId: empId } : isManager ? {} : { userId: session?.id }),
    ...(interactionType ? { type: interactionType } : {}),
  };

  const [interactions, newCustomers, employees] = await Promise.all([
    // Today's interactions
    prisma.interaction.findMany({
      where: interactionType ? whereBase : { ...whereBase, type: { in: ["CALL", "VIEWING", "NOTE"] } },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    // New customers today
    prisma.customer.findMany({
      where: {
        createdAt: { gte: startOfToday },
        ...(empId ? { assignedToId: empId } : isManager ? {} : { assignedToId: session?.id }),
      },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // All employees for filter
    isManager ? prisma.user.findMany({
      where: { role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] } },
      select: { id: true, name: true },
    }) : [],
  ]);

  return (
    <TodayReportClient
      interactions={interactions}
      newCustomers={newCustomers}
      employees={employees}
      session={session}
      isManager={isManager}
      activeType={type}
      activeEmpId={empId || ""}
    />
  );
}
