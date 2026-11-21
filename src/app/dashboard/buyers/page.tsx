import { prisma } from "@/lib/db";
import { requirePageRole, SALES_MANAGER_ROLES, SALES_ROLES } from "@/lib/auth";
import CustomersClient from "../customers/CustomersClient";

export default async function BuyersPage() {
  const session = await requirePageRole(SALES_ROLES);
  const isManager = SALES_MANAGER_ROLES.includes(session.role);

  const where = {
    type: "BUYER",
    status: { notIn: ["NOT_INTERESTED", "DO_NOT_SELL"] },
    ...(isManager ? {} : { assignedToId: session.id }),
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
          orderBy: { createdAt: "desc" },
          take: 1
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
      view="BUYERS"
      session={session}
    />
  );
}
