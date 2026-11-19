import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import PropertiesClient from "./PropertiesClient";

export default async function PropertiesPage() {
  const session = await getSession();
  const properties = await prisma.property.findMany({ orderBy: { createdAt: "desc" } });
  const isManager = session?.role === "GENERAL_MANAGER" || session?.role === "SALES_MANAGER";
  return <PropertiesClient properties={properties} isManager={isManager} />;
}
