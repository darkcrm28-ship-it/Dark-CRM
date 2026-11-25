import IntegrationsClient from "./IntegrationsClient";
import { requirePageRole, ROLE } from "@/lib/auth";
import { getIntegrationAvailability } from "@/lib/provider-integrations";

export default async function IntegrationsPage() {
  await requirePageRole([ROLE.GENERAL_MANAGER]);
  return <IntegrationsClient configured={getIntegrationAvailability()} />;
}
