import { getPageSession, ROLE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getPageSession();
  if (!session) {
    redirect("/login");
    return null;
  }

  if (session.role === ROLE.HR_MANAGER) redirect("/dashboard/commissions");
  if (session.role === ROLE.ACCOUNTING_MANAGER) redirect("/dashboard/accounting");

  const isManager = session.role === "GENERAL_MANAGER" || session.role === "SALES_MANAGER";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const [
    [customers], [deals], [activity], recentInteractions, neglectedCount, teamPerformance,
  ] = await Promise.all([
    prisma.$queryRaw<{
      totalCustomers: number; totalBuyers: number; totalSellers: number;
      interestedCount: number; wantsToSellCount: number; newLeadsToday: number;
    }[]>`
      SELECT COUNT(*)::int AS "totalCustomers",
        COUNT(*) FILTER (WHERE type = 'BUYER')::int AS "totalBuyers",
        COUNT(*) FILTER (WHERE type = 'SELLER')::int AS "totalSellers",
        COUNT(*) FILTER (WHERE status = 'INTERESTED')::int AS "interestedCount",
        COUNT(*) FILTER (WHERE status IN ('WANTS_TO_SELL', 'SELLER', 'LANDLORD') AND NOT "isArchived")::int AS "wantsToSellCount",
        COUNT(*) FILTER (WHERE "assignedToId" = ${session.id} AND "createdAt" >= ${startOfToday})::int AS "newLeadsToday"
      FROM "Customer"
      ${isManager ? Prisma.empty : Prisma.sql`WHERE "assignedToId" = ${session.id}`}
    `,
    prisma.$queryRaw<{ totalDeals: number; totalSalesValue: number }[]>`
      SELECT COUNT(*)::int AS "totalDeals",
        COALESCE(SUM(COALESCE(NULLIF("finalPrice", 0), value)), 0)::double precision AS "totalSalesValue"
      FROM "Deal"
      ${isManager ? Prisma.empty : Prisma.sql`WHERE "salesRepId" = ${session.id}`}
    `,
    prisma.$queryRaw<{ callsToday: number; viewingsToday: number; teamCallsToday: number }[]>`
      SELECT COUNT(*) FILTER (WHERE type = 'CALL' AND "userId" = ${session.id})::int AS "callsToday",
        COUNT(*) FILTER (WHERE type = 'VIEWING')::int AS "viewingsToday",
        CASE WHEN ${isManager} THEN COUNT(*) FILTER (WHERE type = 'CALL')::int ELSE 0 END AS "teamCallsToday"
      FROM "Interaction"
      WHERE "createdAt" >= ${startOfToday}
      ${isManager ? Prisma.empty : Prisma.sql`AND "userId" = ${session.id}`}
    `,
    prisma.interaction.findMany({
      where: {
        ...(isManager ? {} : { userId: session.id, customer: { assignedToId: session.id } }),
        createdAt: { gte: startOfYesterday },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, type: true, createdAt: true,
        customer: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.reminder.count({
      where: {
        ...(isManager ? {} : { userId: session.id }),
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
    }),
    isManager ? prisma.$queryRaw<{
      id: string; name: string; assignedCount: number; callsCount: number;
      notContacted: number; interested: number; notInterested: number;
    }[]>`
      WITH team AS (
        SELECT id, name FROM "User" WHERE role IN ('SALES_EMPLOYEE', 'SALES_MANAGER')
      ), customers AS (
        SELECT "assignedToId",
          COUNT(*)::int AS "assignedCount",
          COUNT(*) FILTER (WHERE "lastInteractionAt" IS NULL)::int AS "notContacted",
          COUNT(*) FILTER (WHERE status = 'INTERESTED')::int AS interested,
          COUNT(*) FILTER (WHERE status = 'NOT_INTERESTED')::int AS "notInterested"
        FROM "Customer"
        WHERE "assignedToId" IN (SELECT id FROM team)
        GROUP BY "assignedToId"
      ), calls AS (
        SELECT "userId", COUNT(*)::int AS "callsCount"
        FROM "Interaction"
        WHERE type = 'CALL' AND "userId" IN (SELECT id FROM team)
        GROUP BY "userId"
      )
      SELECT team.id, team.name,
        COALESCE(customers."assignedCount", 0) AS "assignedCount",
        COALESCE(calls."callsCount", 0) AS "callsCount",
        COALESCE(customers."notContacted", 0) AS "notContacted",
        COALESCE(customers.interested, 0) AS interested,
        COALESCE(customers."notInterested", 0) AS "notInterested"
      FROM team
      LEFT JOIN customers ON customers."assignedToId" = team.id
      LEFT JOIN calls ON calls."userId" = team.id
      ORDER BY team.name, team.id
    ` : [],
  ]);

  return (
    <DashboardClient 
      session={session}
      isManager={isManager}
      isGeneralManager={session.role === ROLE.GENERAL_MANAGER}
      stats={{ ...customers, ...deals, ...activity }}
      recentInteractions={recentInteractions}
      neglectedCount={neglectedCount}
      teamPerformance={teamPerformance}
    />
  );
}