import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, FINANCE_ROLES } from "@/lib/auth";
import { getAccountingSummary } from "@/lib/accounting-summary";
import { parseCurrency } from "@/lib/financial";

export async function GET(req: Request) {
  try {
    const session = await requireRole(FINANCE_ROLES);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const gte = start ? new Date(start) : undefined;
    const lte = end ? new Date(end) : undefined;
    if ((gte && !Number.isFinite(gte.getTime())) || (lte && !Number.isFinite(lte.getTime())) ||
        (gte && lte && gte > lte)) {
      return NextResponse.json({ error: "الفترة المحددة غير صالحة" }, { status: 400 });
    }
    return NextResponse.json(await getAccountingSummary({ gte, lte }));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(FINANCE_ROLES);
    if (session instanceof NextResponse) return session;

    const data = await req.json().catch(() => null);
    if (!data || !["EXPENSE", "INCOME"].includes(data.type) ||
        (data.status !== undefined && !["PENDING", "COMPLETED"].includes(data.status))) {
      return NextResponse.json({ error: "نوع المعاملة أو حالتها غير صالح" }, { status: 400 });
    }
    const date = data.date ? new Date(data.date) : new Date();
    if (!Number.isFinite(date.getTime())) {
      return NextResponse.json({ error: "تاريخ المعاملة غير صالح" }, { status: 400 });
    }
    const amount = parseCurrency(data.amount);
    if (!amount || amount <= 0 || amount >= 1e13) {
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
          amountDecimal: amount,
          description: data.description ? String(data.description).trim() : null,
          status: data.status || "COMPLETED",
          date,
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
    const session = await requireRole(FINANCE_ROLES);
    if (session instanceof NextResponse) return session;

    const data = await req.json().catch(() => null);
    if (!data || typeof data.id !== "string" || !data.id || data.status !== "COMPLETED") {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const amount = data.amount !== undefined ? parseCurrency(data.amount) : undefined;
    if (amount !== undefined && (amount === null || amount <= 0 || amount >= 1e13)) {
      return NextResponse.json({ error: "المبلغ يجب أن يكون رقماً موجباً" }, { status: 400 });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const claimed = await tx.financialTransaction.updateMany({
        where: { id: data.id, status: "PENDING" },
        data: {
          status: "COMPLETED",
          amount: amount ?? undefined,
          amountDecimal: amount ?? undefined,
          description: data.description !== undefined ? String(data.description).trim() : undefined,
        },
      });
      if (claimed.count !== 1) return null;
      const updated = await tx.financialTransaction.findUniqueOrThrow({ where: { id: data.id } });

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

    if (!transaction) {
      return NextResponse.json({ error: "المعاملة غير موجودة أو لم تعد معلّقة" }, { status: 409 });
    }
    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Accounting PATCH Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
