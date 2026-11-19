import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CommissionsClient from "./CommissionsClient";

export default async function CommissionsPage() {
  const session = await getSession();

  // Only General Manager and HR Manager can access this page
  if (session?.role !== "GENERAL_MANAGER" && session?.role !== "HR_MANAGER") {
    redirect("/dashboard");
  }

  // Get all users who are sales employees or sales managers, along with their commissions
  const employees = await prisma.user.findMany({
    where: { role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] } },
    include: {
      commissions: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">العمولات والمكافآت</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">إدارة عمولات موظفي المبيعات</p>
        </div>
      </div>

      <CommissionsClient employees={employees} />
    </div>
  );
}
