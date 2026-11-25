import { redirect } from "next/navigation";
import { getSession, ROLE, SALES_MANAGER_ROLES, SALES_ROLES } from "@/lib/auth";
import { scopedCustomerWhere, scopedDealWhere } from "@/lib/access-scope";
import { prisma } from "@/lib/db";
import DocumentsClient from "./DocumentsClient";

export const dynamic = "force-dynamic";

type Option = { id: string; label: string };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; entityId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const canRead = SALES_ROLES.includes(session.role) || session.role === ROLE.ACCOUNTING_MANAGER;
  if (!canRead) redirect("/dashboard");

  const isManager = SALES_MANAGER_ROLES.includes(session.role) || session.role === ROLE.GENERAL_MANAGER;
  const query = await searchParams;

  const [properties, customers, deals, owners] = await Promise.all([
    prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, title: true, unitNumber: true, projectName: true },
    }),
    isManager
      ? prisma.customer.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, name: true, phone: true },
        })
      : prisma.customer.findMany({
          where: scopedCustomerWhere(session),
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, name: true, phone: true },
        }),
    isManager
      ? prisma.deal.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, dealNumber: true, status: true },
        })
      : prisma.deal.findMany({
          where: scopedDealWhere(session),
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, dealNumber: true, status: true },
        }),
    isManager
      ? prisma.owner.findMany({
          orderBy: { name: "asc" },
          take: 200,
          select: { id: true, name: true, phone: true },
        })
      : Promise.resolve([] as { id: string; name: string; phone: string | null }[]),
  ]);

  const toOptions = (
    rows: { id: string; name: string; phone?: string | null }[]
  ): Option[] => rows.map((row) => ({
    id: row.id,
    label: `${row.name}${row.phone ? ` — ${row.phone}` : ""}`,
  }));

  const entities: Record<string, Option[]> = {
    PROPERTY: properties.map((p) => ({
      id: p.id,
      label: `${p.title || p.projectName || "وحدة"} ${p.unitNumber ? `- ${p.unitNumber}` : ""}`.trim(),
    })),
    CUSTOMER: toOptions(customers),
    DEAL: deals.map((d) => ({ id: d.id, label: d.dealNumber || d.id })),
    OWNER: toOptions(owners),
  };

  return (
    <DocumentsClient
      entities={entities}
      initialEntityType={query.entityType || ""}
      initialEntityId={query.entityId || ""}
      canManage={isManager}
    />
  );
}
