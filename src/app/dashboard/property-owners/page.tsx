import { redirect } from "next/navigation";
import { getSession, ROLE, SALES_MANAGER_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PropertyOwnersClient from "./PropertyOwnersClient";

export const dynamic = "force-dynamic";

export default async function PropertyOwnersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const canRead = SALES_MANAGER_ROLES.includes(session.role) || session.role === ROLE.ACCOUNTING_MANAGER;
  if (!canRead) redirect("/dashboard");

  const canWrite = SALES_MANAGER_ROLES.includes(session.role);

  const [owners, properties, links] = await Promise.all([
    prisma.owner.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        nationalId: true,
        type: true,
        address: true,
        notes: true,
        createdAt: true,
        properties: {
          where: { isCurrent: true },
          select: {
            id: true,
            percentage: true,
            property: { select: { id: true, title: true, unitNumber: true, projectName: true } },
          },
        },
      },
    }),
    prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, title: true, projectName: true, unitNumber: true, status: true },
    }),
    prisma.propertyOwner.findMany({
      where: { isCurrent: true },
      orderBy: { effectiveFrom: "desc" },
      take: 500,
      select: {
        id: true,
        propertyId: true,
        ownerId: true,
        percentage: true,
        effectiveFrom: true,
        effectiveTo: true,
        isCurrent: true,
        notes: true,
        owner: { select: { id: true, name: true, phone: true } },
      },
    }),
  ]);

  return (
    <PropertyOwnersClient
      initialOwners={owners.map((owner) => ({
        ...owner,
        createdAt: owner.createdAt.toISOString(),
        properties: owner.properties.map((link) => ({
          ...link,
          percentage: link.percentage.toString(),
        })),
      }))}
      propertyOptions={properties.map((property) => ({
        id: property.id,
        label: `${property.title || property.projectName || "وحدة"}${property.unitNumber ? ` - ${property.unitNumber}` : ""} (${property.status})`,
      }))}
      initialLinks={links.map((link) => ({
        ...link,
        percentage: link.percentage.toString(),
        effectiveFrom: link.effectiveFrom.toISOString(),
        effectiveTo: link.effectiveTo?.toISOString() ?? null,
      }))}
      canWrite={canWrite}
    />
  );
}
