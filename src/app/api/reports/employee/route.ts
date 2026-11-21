import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cairoDateRange } from "@/lib/report-time";

export async function GET(req: Request) {
  const session = await requireManager();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  const allowedParams = new Set(["id", "start", "end"]);
  if ([...searchParams.keys()].some((key) => !allowedParams.has(key)) ||
      [...allowedParams].some((key) => searchParams.getAll(key).length !== 1)) {
    return NextResponse.json({ error: "Unexpected or duplicate query parameters" }, { status: 400 });
  }
  const employeeId = searchParams.get("id");
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");

  if (!employeeId || !startStr || !endStr) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const range = cairoDateRange(startStr, endStr);
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] } },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: "Sales employee not found" }, { status: 404 });
  const createdAt = { gte: range.start, lt: range.endExclusive };

  const [calls, viewings, additions, updates] = await Promise.all([
    // Calls
    prisma.interaction.findMany({
      where: { userId: employeeId, type: "CALL", createdAt },
      orderBy: { createdAt: "desc" }
    }),
    // Viewings
    prisma.interaction.findMany({
      where: { userId: employeeId, type: "VIEWING", createdAt },
      orderBy: { createdAt: "desc" }
    }),
    // Additions (New Customers)
    prisma.customer.findMany({
      where: { assignedToId: employeeId, createdAt },
      orderBy: { createdAt: "desc" }
    }),
    // Updates (Audit Logs)
    prisma.auditLog.findMany({
      where: { userId: employeeId, createdAt },
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
