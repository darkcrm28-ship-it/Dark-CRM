import { prisma } from "@/lib/db";
import { requirePageRole, ROLE, SALES_ROLES } from "@/lib/auth";
import PropertiesClient from "./PropertiesClient";

export default async function PropertiesPage() {
  const session = await requirePageRole(SALES_ROLES);
  const properties = await prisma.property.findMany({ orderBy: { createdAt: "desc" } });
  const isManager = session.role === ROLE.GENERAL_MANAGER || session.role === ROLE.SALES_MANAGER;
  return <PropertiesClient properties={properties} isManager={isManager} />;
}
