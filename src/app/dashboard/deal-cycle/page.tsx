import { redirect } from "next/navigation";
import { getSession, ROLE, SALES_MANAGER_ROLES, SALES_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scopedCustomerWhere } from "@/lib/access-scope";
import {
  contractScopeWhere,
  reservationScopeWhere,
  serializeContract,
  serializeReservation,
} from "@/lib/deal-cycle";
import DealCycleClient from "./DealCycleClient";

export const dynamic = "force-dynamic";

type Option = { id: string; label: string };

export default async function DealCyclePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const canRead = SALES_ROLES.includes(session.role) || session.role === ROLE.ACCOUNTING_MANAGER;
  if (!canRead) redirect("/dashboard");

  const isManager = SALES_MANAGER_ROLES.includes(session.role);
  const canWrite = SALES_ROLES.includes(session.role) && session.role !== ROLE.ACCOUNTING_MANAGER;

  const reservationWhere = reservationScopeWhere(session);
  const contractWhere = contractScopeWhere(session);

  const [properties, customers, reservations, contracts, approvedReservations] = await Promise.all([
    prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, title: true, projectName: true, unitNumber: true, status: true },
    }),
    isManager
      ? prisma.customer.findMany({
          orderBy: { createdAt: "desc" },
          take: 300,
          select: { id: true, name: true, phone: true },
        })
      : prisma.customer.findMany({
          where: scopedCustomerWhere(session),
          orderBy: { createdAt: "desc" },
          take: 300,
          select: { id: true, name: true, phone: true },
        }),
    prisma.reservation.findMany({
      where: reservationWhere,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        property: { select: { id: true, title: true, projectName: true, unitNumber: true, status: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.contract.findMany({
      where: contractWhere,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        property: { select: { id: true, title: true, projectName: true, unitNumber: true, status: true } },
        customer: { select: { id: true, name: true, phone: true } },
        reservation: { select: { id: true, status: true, amount: true } },
        deal: { select: { id: true, status: true, finalPrice: true, commissionAmt: true } },
      },
    }),
    prisma.reservation.findMany({
      where: {
        ...reservationWhere,
        status: { in: ["APPROVED", "CONVERTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        propertyId: true,
        customerId: true,
        startAt: true,
        endAt: true,
      },
    }),
  ]);

  const propertyOptions: Option[] = properties.map((property) => ({
    id: property.id,
    label: `${property.title || property.projectName || "وحدة"}${property.unitNumber ? ` - ${property.unitNumber}` : ""} (${property.status})`,
  }));
  const customerOptions: Option[] = customers.map((customer) => ({
    id: customer.id,
    label: `${customer.name}${customer.phone ? ` — ${customer.phone}` : ""}`,
  }));
  const reservationOptions = approvedReservations.map((reservation) => ({
    id: reservation.id,
    propertyId: reservation.propertyId,
    customerId: reservation.customerId,
    label: `${reservation.propertyId.slice(0, 8)} — ${reservation.startAt.toLocaleDateString("ar-EG")}`,
  }));

  return (
    <DealCycleClient
      propertyOptions={propertyOptions}
      customerOptions={customerOptions}
      reservationOptions={reservationOptions}
      initialReservations={reservations.map(serializeReservation)}
      initialContracts={contracts.map(serializeContract)}
      canWrite={canWrite}
      canApprove={isManager}
    />
  );
}
