import { getAccountingSummary } from "@/lib/accounting-summary";
import { getSession, ROLE } from "@/lib/auth";
import { redirect } from "next/navigation";
import AccountingClient from "@/app/dashboard/accounting/AccountingClient";

export default async function AccountingPage() {
  const session = await getSession();
  if (!session || (session.role !== ROLE.GENERAL_MANAGER && session.role !== ROLE.ACCOUNTING_MANAGER)) {
    redirect("/dashboard");
  }

  const { transactions, stats } = await getAccountingSummary();

  return <AccountingClient initialTransactions={transactions} initialStats={stats} />;
}
