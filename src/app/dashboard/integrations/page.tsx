import IntegrationsClient from "./IntegrationsClient";
import { requirePageRole, ROLE } from "@/lib/auth";

export default async function IntegrationsPage() {
  await requirePageRole([ROLE.GENERAL_MANAGER]);
  return <IntegrationsClient />;
}
