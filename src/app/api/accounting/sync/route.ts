import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "GENERAL_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Sync PENDING Commissions (to Expenses)
    const pendingCommissions = await prisma.commission.findMany({
      where: { status: "PENDING" },
    });

    for (const comm of pendingCommissions) {
      const existing = await prisma.financialTransaction.findFirst({
        where: { relatedId: comm.id },
      });

      if (!existing) {
        await prisma.financialTransaction.create({
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
      }
    }

    // 2. Sync Completed Deals (to Revenue)
    const completedDeals = await prisma.deal.findMany({
      where: { status: "CLOSED" },
    });

    for (const deal of completedDeals) {
      const existing = await prisma.financialTransaction.findFirst({
        where: { relatedId: deal.id },
      });

      if (!existing) {
        await prisma.financialTransaction.create({
          data: {
            type: "INCOME",
            category: "REVENUE",
            amount: deal.value,
            description: `إيراد صفقة مغلقة - قيمة العقد`,
            status: "COMPLETED",
            relatedId: deal.id,
            date: deal.closedAt || deal.createdAt,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
