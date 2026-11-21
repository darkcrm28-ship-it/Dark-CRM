import { prisma } from "@/lib/db";
import { requirePageRole, ROLE, SALES_ROLES } from "@/lib/auth";
import CustomerDetailsClient from "./CustomerDetailsClient";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePageRole(SALES_ROLES);

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      ...(session.role === ROLE.SALES_EMPLOYEE ? { assignedToId: session.id } : {}),
    },
    include: {
      interactions: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } }
        }
      },
      assignedTo: { select: { id: true, name: true } }
    }
  });

  if (!customer) {
    return <div className="text-center p-8">العميل غير موجود</div>;
  }

  return <CustomerDetailsClient initialCustomer={customer} currentUser={session} />;
}
