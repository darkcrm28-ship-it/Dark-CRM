import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import DealsClient from "./DealsClient";

export default async function DealsPage() {
  const session = await getSession();
  const isManager = session?.role === "GENERAL_MANAGER" || session?.role === "SALES_MANAGER";

  const deals = await prisma.deal.findMany({
    where: isManager ? {} : { salesRepId: session?.id },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, phone: true, unitNumber: true, projectName: true } },
      property: { select: { id: true, title: true } },
      salesRep: { select: { name: true } },
    },
  });

  const customers = await prisma.customer.findMany({
    where: { 
      status: { in: ["INTERESTED", "WANTS_TO_SELL", "MEETING_SCHEDULED"] },
      ...(isManager ? {} : { assignedToId: session?.id })
    },
    select: { id: true, name: true, phone: true, askingPrice: true },
  });
  const properties = await prisma.property.findMany({
    where: { status: "AVAILABLE" },
    select: { id: true, title: true, zone: true, projectName: true, price: true },
  });

  return <DealsClient deals={deals} customers={customers} properties={properties} isManager={isManager} />;
}
