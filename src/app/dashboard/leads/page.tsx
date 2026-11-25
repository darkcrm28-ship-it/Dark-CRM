import { prisma } from "@/lib/db";
import { requirePageRole, SALES_MANAGER_ROLES, SALES_ROLES } from "@/lib/auth";
import CustomersClient from "../customers/CustomersClient";

export default async function LeadsPage() {
  const session = await requirePageRole(SALES_ROLES);
  const isManager = SALES_MANAGER_ROLES.includes(session.role);

  const users = isManager
    ? await prisma.user.findMany({
        where: { role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] } },
        select: { id: true, name: true, role: true },
      })
    : [];

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });

  const settings = await prisma.systemSettings.findUnique({ where: { id: "GLOBAL" } });

  return (
    <CustomersClient
      initialCustomers={[]}
      initialTotal={0}
      users={users}
      projects={projects}
      isManager={isManager}
      view="LEADS"
      settings={settings}
      session={session}
    />
  );
}
