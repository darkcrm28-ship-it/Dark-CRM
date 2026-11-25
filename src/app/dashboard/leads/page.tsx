import { prisma } from "@/lib/db";
import { requirePageRole, SALES_MANAGER_ROLES, SALES_ROLES } from "@/lib/auth";
import CustomersClient from "../customers/CustomersClient";

export default async function LeadsPage() {
  const session = await requirePageRole(SALES_ROLES);
  const isManager = SALES_MANAGER_ROLES.includes(session.role);

  const settings = await prisma.systemSettings.findUnique({ where: { id: "GLOBAL" }, select: { kanbanEnabled: true } });

  return (
    <CustomersClient
      isManager={isManager}
      view="LEADS"
      settings={settings}
      session={session}
    />
  );
}
