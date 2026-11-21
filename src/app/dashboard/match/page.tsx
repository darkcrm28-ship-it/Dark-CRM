import { prisma } from "@/lib/db";
import { requirePageRole, ROLE, SALES_ROLES } from "@/lib/auth";
import MatchClient from "./MatchClient";

export const dynamic = "force-dynamic";

export default async function MatchPage() {
  const session = await requirePageRole(SALES_ROLES);
  const buyers = await prisma.customer.findMany({
    where: {
      type: "BUYER",
      status: { in: ["INTERESTED", "MEETING_SCHEDULED", "NEW"] },
      ...(session.role === ROLE.SALES_EMPLOYEE ? { assignedToId: session.id } : {}),
    },
    select: { id: true, name: true, phone: true, budgetMin: true, budgetMax: true, preferredZone: true, preferredSize: true, status: true },
  });
  const properties = await prisma.property.findMany({
    where: { status: "AVAILABLE" },
    select: { id: true, title: true, zone: true, projectName: true, price: true, size: true, bedrooms: true, unitType: true },
  });

  return <MatchClient buyers={buyers} properties={properties} />;
}
