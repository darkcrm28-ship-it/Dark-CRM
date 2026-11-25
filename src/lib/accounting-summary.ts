import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function getAccountingSummary(date?: Prisma.DateTimeFilter) {
  const [transactions, totals] = await prisma.$transaction([
    prisma.financialTransaction.findMany({
      where: date ? { date } : undefined,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true, type: true, category: true, amount: true, amountDecimal: true,
        description: true, status: true, date: true, relatedId: true, createdAt: true,
      },
    }),
    prisma.$queryRaw<{ income: Prisma.Decimal; expense: Prisma.Decimal; pendingExpense: Prisma.Decimal }[]>`
      SELECT
        COALESCE(SUM(COALESCE("amountDecimal", ROUND(amount::numeric, 2)))
          FILTER (WHERE type = 'INCOME' AND status = 'COMPLETED'), 0) AS income,
        COALESCE(SUM(COALESCE("amountDecimal", ROUND(amount::numeric, 2)))
          FILTER (WHERE type = 'EXPENSE' AND status = 'COMPLETED'), 0) AS expense,
        COALESCE(SUM(COALESCE("amountDecimal", ROUND(amount::numeric, 2)))
          FILTER (WHERE type = 'EXPENSE' AND status = 'PENDING'), 0) AS "pendingExpense"
      FROM "FinancialTransaction"
      WHERE ${date?.gte ? Prisma.sql`date >= ${date.gte}` : Prisma.sql`TRUE`}
        AND ${date?.lte ? Prisma.sql`date <= ${date.lte}` : Prisma.sql`TRUE`}
    `,
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  const total = totals[0];
  return {
    transactions: transactions.map(({ amountDecimal, ...row }) => ({
      ...row,
      amount: amountDecimal === null ? row.amount : Number(amountDecimal),
    })),
    stats: {
      income: Number(total.income),
      expense: Number(total.expense),
      pendingExpense: Number(total.pendingExpense),
    },
  };
}
