import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ACCOUNTING_LOCK_ID = 74839210;
const ALLOWED_ROLES = ["GENERAL_MANAGER", "ACCOUNTING_MANAGER"];

export async function POST() {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized. Financial managers only." }, { status: 403 });
    }

    const syncResult = await prisma.$transaction(
      async (tx) => {
        // حجز قفل متزامن لمنع تشغيل عمليتين متزامنتين من إنشاء معاملات مالية مكررة
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${ACCOUNTING_LOCK_ID});`;

        let syncedCommissionsCount = 0;
        let syncedDealsCount = 0;

        // 1. Sync PENDING Commissions (to Expenses)
        const pendingCommissions = await tx.commission.findMany({
          where: { status: "PENDING" },
        });

        for (const comm of pendingCommissions) {
          const existing = await tx.financialTransaction.findFirst({
            where: { relatedId: comm.id },
            select: { id: true },
          });

          if (!existing) {
            await tx.financialTransaction.create({
              data: {
                type: "EXPENSE",
                category: "COMMISSION",
                amount: comm.amount,
                description: `عمولة موظف - ${comm.notes || ""}`,
                status: "PENDING",
                relatedId: comm.id,
                date: comm.createdAt,
              },
            });
            syncedCommissionsCount++;
          }
        }

        // 2. Sync Completed Deals (to Revenue)
        const completedDeals = await tx.deal.findMany({
          where: { status: { in: ["CLOSED", "COMPLETED"] } },
        });

        for (const deal of completedDeals) {
          const existing = await tx.financialTransaction.findFirst({
            where: { relatedId: deal.id },
            select: { id: true },
          });

          if (!existing) {
            await tx.financialTransaction.create({
              data: {
                type: "INCOME",
                category: "REVENUE",
                amount: deal.value,
                description: `إيراد صفقة مكتملة - قيمة العقد`,
                status: "COMPLETED",
                relatedId: deal.id,
                date: deal.closedAt || deal.createdAt,
              },
            });
            syncedDealsCount++;
          }
        }

        if (syncedCommissionsCount > 0 || syncedDealsCount > 0) {
          await tx.auditLog.create({
            data: {
              userId: session.id,
              action: "SYNC",
              entity: "FINANCIAL_TRANSACTION",
              entityId: "ACCOUNTING_SYNC",
              details: `مزامنة الحسابات: ${syncedDealsCount} صفقة إيراد، ${syncedCommissionsCount} عمولة مصروف`,
            },
          });
        }

        return { syncedCommissionsCount, syncedDealsCount };
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    return NextResponse.json({ success: true, ...syncResult });
  } catch (error) {
    console.error("Accounting Sync Error:", error);
    return NextResponse.json({ error: "Internal server error during accounting sync" }, { status: 500 });
  }
}
