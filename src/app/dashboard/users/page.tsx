import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();

  if (session?.role !== "GENERAL_MANAGER") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      nationalId: true,
      address: true,
      salaryBase: true,
      createdAt: true,
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">إدارة المستخدمين</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">إضافة وتعديل حسابات الموظفين وصلاحياتهم</p>
        </div>
      </div>

      <UsersClient initialUsers={users} />
    </div>
  );
}
