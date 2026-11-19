import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "GENERAL_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "GENERAL_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const transaction = await prisma.financialTransaction.create({
      data: {
        type: data.type,
        category: data.category,
        amount: parseFloat(data.amount),
        description: data.description,
        status: data.status || "COMPLETED",
        date: data.date ? new Date(data.date) : new Date(),
        relatedId: data.relatedId,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "GENERAL_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const transaction = await prisma.financialTransaction.update({
      where: { id: data.id },
      data: {
        status: data.status,
        amount: data.amount ? parseFloat(data.amount) : undefined,
        description: data.description,
      },
    });

    // If it's a commission being confirmed, update the commission status too
    if (transaction.category === "COMMISSION" && transaction.relatedId && data.status === "COMPLETED") {
      await prisma.commission.update({
        where: { id: transaction.relatedId },
        data: { status: "PAID" },
      });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
