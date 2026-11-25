import { NextResponse } from "next/server";
import { requireRole, SALES_MANAGER_ROLES, SALES_ROLES, ROLE } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await requireRole(SALES_ROLES);
  if (session instanceof NextResponse) return session;

  const [projects, users] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    SALES_MANAGER_ROLES.includes(session.role)
      ? prisma.user.findMany({
        where: { role: { in: [ROLE.SALES_EMPLOYEE, ROLE.SALES_MANAGER] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
      : [],
  ]);

  return NextResponse.json({ projects, users }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
