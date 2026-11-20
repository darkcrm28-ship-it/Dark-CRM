import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = ["GENERAL_MANAGER", "ACCOUNTING_MANAGER"];

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const endDate = searchParams.get("end") || new Date().toISOString();

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      orderBy: { date: "desc" },
    });

    const stats = {
      income: transactions.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0),
      expense: transactions.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0),
    };

    return NextResponse.json({ transactions, stats });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json();
    const amount = typeof data.amount === "number" ? data.amount : parseFloat(data.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "المبلغ يجب أن يكون رقماً موجباً" }, { status: 400 });
    }

    const type = data.type === "EXPENSE" ? "EXPENSE" : "INCOME";
    const category = typeof data.category === "string" && data.category.trim() ? data.category.trim() : "GENERAL";

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.financialTransaction.create({
        data: {
          type,
          category,
          amount,
          description: data.description ? String(data.description).trim() : null,
          status: data.status || "COMPLETED",
          date: data.date ? new Date(data.date) : new Date(),
          relatedId: data.relatedId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE",
          entity: "FINANCIAL_TRANSACTION",
          entityId: created.id,
          details: `تسجيل معاملة مالية (${type}): ${amount.toLocaleString()} ج.م - تصنيف: ${category}`,
        },
      });

      return created;
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Accounting POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json();
    if (!data.id || typeof data.id !== "string") {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const amount = data.amount !== undefined ? (typeof data.amount === "number" ? data.amount : parseFloat(data.amount)) : undefined;
    if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
      return NextResponse.json({ error: "المبلغ يجب أن يكون رقماً موجباً" }, { status: 400 });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.financialTransaction.update({
        where: { id: data.id },
        data: {
          status: data.status,
          amount,
          description: data.description !== undefined ? String(data.description).trim() : undefined,
        },
      });

      // If it's a commission being confirmed, update the commission status too
      if (updated.category === "COMMISSION" && updated.relatedId && data.status === "COMPLETED") {
        await tx.commission.update({
          where: { id: updated.relatedId },
          data: { status: "PAID" },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "UPDATE",
          entity: "FINANCIAL_TRANSACTION",
          entityId: updated.id,
          details: `تحديث معاملة مالية: حالة ${updated.status}، مبلغ ${updated.amount}`,
        },
      });

      return updated;
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Accounting PATCH Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
