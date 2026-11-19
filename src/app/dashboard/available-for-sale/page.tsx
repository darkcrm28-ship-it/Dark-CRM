import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import CustomersClient from "../customers/CustomersClient";

export default async function AvailableForSalePage() {
  const session = await getSession();
  const isManager = session?.role === "GENERAL_MANAGER" || session?.role === "SALES_MANAGER";

  const where = {
    status: { in: ["WANTS_TO_SELL", "SELLER", "LANDLORD"] },
    isArchived: false,
    ...(isManager ? {} : { assignedToId: session?.id }),
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 25,
      include: { 
        assignedTo: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        interactions: {
          select: { createdAt: true, notes: true },
          take: 1,
          orderBy: { createdAt: "desc" }
        }
      },
    })
  ]);

  const users = isManager
    ? await prisma.user.findMany({
        where: { role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] } },
        select: { id: true, name: true, role: true },
      })
    : [];

  const projects = await prisma.project.findMany({
    select: { id: true, name: true }
  });

  return (
    <CustomersClient 
      initialCustomers={customers} 
      initialTotal={total}
      users={users} 
      projects={projects}
      isManager={isManager} 
      view="AVAILABLE_FOR_SALE"
    />
  );
}
