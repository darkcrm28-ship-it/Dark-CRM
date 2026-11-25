import { requirePageRole, SALES_ROLES } from "@/lib/auth";
import MatchClient from "./MatchClient";

export default async function MatchPage() {
  await requirePageRole(SALES_ROLES);
  return <MatchClient />;
}
