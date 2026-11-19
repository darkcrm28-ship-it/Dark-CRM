import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomerDetailsClient from "./CustomerDetailsClient";

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
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

  // Ensure employee only sees their own assigned customers, unless they are managers
  if (session.role === "SALES_EMPLOYEE" && customer.assignedToId !== session.id) {
    return <div className="text-center p-8 text-[var(--color-danger)]">غير مصرح لك بمشاهدة هذا العميل</div>;
  }

  return <CustomerDetailsClient initialCustomer={customer} currentUser={session} />;
}
