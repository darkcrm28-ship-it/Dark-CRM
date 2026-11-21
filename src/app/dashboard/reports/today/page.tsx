import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import TodayReportClient from "@/app/dashboard/reports/today/TodayReportClient";
import { redirect } from "next/navigation";
import { cairoDayRange, reportEmployeeScope } from "@/lib/report-time";

export default async function TodayReportPage({ searchParams }: { searchParams: Promise<{ type?: string; empId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  const { isManager, employeeId } = reportEmployeeScope(session.role, session.id, resolvedSearchParams.empId);
  const allowed = ["GENERAL_MANAGER", "SALES_MANAGER", "SALES_EMPLOYEE"];
  if (!allowed.includes(session.role)) redirect("/dashboard");
  
  const type = resolvedSearchParams.type || "calls";
  const { start: startOfToday, endExclusive } = cairoDayRange();

  const interactionTypeMap: Record<string, string> = {
    calls: "CALL",
    viewings: "VIEWING",
    notes: "NOTE",
  };

  const interactionType = interactionTypeMap[type];
  const selectedEmployee = isManager && employeeId
    ? await prisma.user.findFirst({
        where: { id: employeeId, role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] } },
        select: { id: true },
      })
    : null;
  const scopedEmployeeId = isManager && employeeId && !selectedEmployee ? "__invalid_employee__" : employeeId;

  const whereBase = {
    createdAt: { gte: startOfToday, lt: endExclusive },
    ...(scopedEmployeeId ? { userId: scopedEmployeeId } : {}),
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
        createdAt: { gte: startOfToday, lt: endExclusive },
        ...(scopedEmployeeId ? { assignedToId: scopedEmployeeId } : {}),
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
      isManager={isManager}
      activeType={type}
      activeEmpId={scopedEmployeeId || ""}
    />
  );
}
