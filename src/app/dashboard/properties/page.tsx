import { getPropertyInventoryPage } from "@/lib/property-inventory";
import { requirePageRole, ROLE, SALES_ROLES } from "@/lib/auth";
import PropertiesClient from "./PropertiesClient";

export default async function PropertiesPage() {
  const session = await requirePageRole(SALES_ROLES);
  const inventory = await getPropertyInventoryPage();
  const isManager = session.role === ROLE.GENERAL_MANAGER || session.role === ROLE.SALES_MANAGER;
  return <PropertiesClient inventory={inventory} isManager={isManager} session={session} />;
}
