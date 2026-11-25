import { requirePageRole, SALES_MANAGER_ROLES, SALES_ROLES } from "@/lib/auth";
import CustomersClient from "../customers/CustomersClient";

export default async function NotInterestedPage() {
  const session = await requirePageRole(SALES_ROLES);
  const isManager = SALES_MANAGER_ROLES.includes(session.role);

  return (
    <CustomersClient
      isManager={isManager}
      view="NOT_INTERESTED"
      session={session}
    />
  );
}
