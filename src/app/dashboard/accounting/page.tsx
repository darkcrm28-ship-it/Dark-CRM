import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AccountingClient from "@/app/dashboard/accounting/AccountingClient";

export default async function AccountingPage() {
  const session = await getSession();
  if (!session || session.role !== "GENERAL_MANAGER") {
    redirect("/dashboard");
  }

  const transactions = await prisma.financialTransaction.findMany({
    orderBy: { date: "desc" },
    take: 100,
  });

  const stats = {
    income: transactions.filter((t: any) => t.type === "INCOME" && t.status === "COMPLETED").reduce((sum: number, t: any) => sum + t.amount, 0),
    expense: transactions.filter((t: any) => t.type === "EXPENSE" && t.status === "COMPLETED").reduce((sum: number, t: any) => sum + t.amount, 0),
    pendingExpense: transactions.filter((t: any) => t.type === "EXPENSE" && t.status === "PENDING").reduce((sum: number, t: any) => sum + t.amount, 0),
  };

  return <AccountingClient initialTransactions={transactions} initialStats={stats} />;
}
