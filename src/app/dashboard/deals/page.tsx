import { prisma } from "@/lib/db";
import { requirePageRole, ROLE, SALES_ROLES } from "@/lib/auth";
import DealsClient from "./DealsClient";
import { readMoney } from "@/lib/financial";

export default async function DealsPage() {
  const session = await requirePageRole(SALES_ROLES);
  const isManager = session.role === ROLE.GENERAL_MANAGER || session.role === ROLE.SALES_MANAGER;

  const deals = await prisma.deal.findMany({
    where: isManager ? {} : { salesRepId: session.id },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, phone: true, unitNumber: true, projectName: true } },
      property: { select: { id: true, title: true } },
      salesRep: { select: { name: true } },
    },
  });

  return <DealsClient deals={deals.map(({ valueDecimal, finalPriceDecimal, commissionAmtDecimal, commissionRateDecimal, discountAmount, ...deal }) => ({
    ...deal,
    finalPrice: deal.finalPrice == null && finalPriceDecimal == null
      ? readMoney(valueDecimal, deal.value) : readMoney(finalPriceDecimal, deal.finalPrice),
    commissionAmt: readMoney(commissionAmtDecimal, deal.commissionAmt),
    commission: readMoney(commissionRateDecimal, deal.commission),
    discountAmount: discountAmount?.toString() ?? null,
  }))} isManager={isManager} />;
}
