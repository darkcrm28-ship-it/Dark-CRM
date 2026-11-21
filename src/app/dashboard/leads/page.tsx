import { prisma } from "@/lib/db";
import { requirePageRole, SALES_MANAGER_ROLES, SALES_ROLES } from "@/lib/auth";
import CustomersClient from "../customers/CustomersClient";

export default async function LeadsPage() {
  const session = await requirePageRole(SALES_ROLES);
  const isManager = SALES_MANAGER_ROLES.includes(session.role);

  const where = {
    ...(isManager ? {} : { assignedToId: session.id }),
    isArchived: false,
    status: { notIn: ["NOT_INTERESTED", "DO_NOT_SELL"] },
    type: { in: ["SELLER", "LEAD"] },
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

  const settings = await prisma.systemSettings.findUnique({ where: { id: "GLOBAL" } });

  return (
    <CustomersClient 
      initialCustomers={customers} 
      initialTotal={total}
      users={users} 
      projects={projects}
      isManager={isManager} 
      view="LEADS"
      settings={settings}
      session={session}
    />
  );
}
