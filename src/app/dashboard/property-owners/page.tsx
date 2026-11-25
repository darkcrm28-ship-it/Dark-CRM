import { redirect } from "next/navigation";
import { getPageSession, ROLE, SALES_MANAGER_ROLES } from "@/lib/auth";
import PropertyOwnersClient from "./PropertyOwnersClient";

export const dynamic = "force-dynamic";

export default async function PropertyOwnersPage() {
  const session = await getPageSession();
  if (!session) redirect("/login");
  const canRead = SALES_MANAGER_ROLES.includes(session.role) || session.role === ROLE.ACCOUNTING_MANAGER;
  if (!canRead) redirect("/dashboard");

  const canWrite = SALES_MANAGER_ROLES.includes(session.role);

  return <PropertyOwnersClient canWrite={canWrite} />;
}
