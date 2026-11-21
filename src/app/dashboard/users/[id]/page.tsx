import { prisma } from "@/lib/db";
import { requirePageRole, ROLE } from "@/lib/auth";
import UserProfileClient from "./UserProfileClient";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageRole([ROLE.GENERAL_MANAGER]);

  // Fetch the user
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      dateJoined: true,
      isActive: true,
      nationalId: true,
      birthDate: true,
      address: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      qualification: true,
      experience: true,
      salaryBase: true,
      bankAccountDetails: true,
    },
  });

  if (!user) {
    return <div className="p-8">المستخدم غير موجود.</div>;
  }

  // Fetch stats and related data
  const customers = await prisma.customer.findMany({
    where: { assignedToId: user.id },
    orderBy: { createdAt: "desc" },
    include: { project: true }
  });

  const deals = await prisma.deal.findMany({
    where: { salesRepId: user.id },
    orderBy: { createdAt: "desc" },
    include: { customer: true }
  });

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { dueDate: "desc" },
    include: { customer: true }
  });

  const commissions = await prisma.commission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  const interactions = await prisma.interaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { customer: true }
  });

  // Calculate KPIs
  const totalDeals = deals.length;
  const totalSalesValue = deals.reduce((sum, d) => sum + (d.finalPrice || d.value || 0), 0);
  const totalCommissions = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
  const conversionRate = customers.length > 0 ? ((totalDeals / customers.length) * 100).toFixed(1) : 0;

  const completedReminders = reminders.filter(r => r.status === "COMPLETED").length;
  const pendingReminders = reminders.filter(r => r.status === "PENDING").length;

  return (
    <UserProfileClient
      user={user}
      customers={customers}
      deals={deals}
      reminders={reminders}
      interactions={interactions}
      kpis={{
        totalDeals,
        totalSalesValue,
        totalCommissions,
        conversionRate,
        completedReminders,
        pendingReminders
      }}
    />
  );
}
