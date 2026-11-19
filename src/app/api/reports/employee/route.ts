import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "GENERAL_MANAGER" && session.role !== "SALES_MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("id");
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");

  if (!employeeId || !startStr || !endStr) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const startDate = new Date(startStr);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(endStr);
  endDate.setHours(23, 59, 59, 999);

  const [calls, viewings, additions, updates] = await Promise.all([
    // Calls
    prisma.interaction.findMany({
      where: { userId: employeeId, type: "CALL", createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: "desc" }
    }),
    // Viewings
    prisma.interaction.findMany({
      where: { userId: employeeId, type: "VIEWING", createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: "desc" }
    }),
    // Additions (New Customers)
    prisma.customer.findMany({
      where: { assignedToId: employeeId, createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: "desc" }
    }),
    // Updates (Audit Logs)
    prisma.auditLog.findMany({
      where: { userId: employeeId, createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  // Combine logs for the detailed table
  const logs = [
    ...calls.map(c => ({ ...c, type: "مكالمة" })),
    ...viewings.map(v => ({ ...v, type: "معاينة" })),
    ...additions.map(a => ({ ...a, type: "إضافة عميل", details: `إضافة العميل: ${a.name}` })),
    ...updates.map(u => ({ ...u, type: "تحديث بيانات", details: `${u.action} في ${u.entity}` }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    callsCount: calls.length,
    viewingsCount: viewings.length,
    additionsCount: additions.length,
    updatesCount: updates.length,
    logs
  });
}
