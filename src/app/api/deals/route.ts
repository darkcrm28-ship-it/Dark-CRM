import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isManager = session.role === "GENERAL_MANAGER" || session.role === "SALES_MANAGER";
  const deals = await prisma.deal.findMany({
    where: isManager ? {} : { salesRepId: session.id },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, phone: true, unitNumber: true, projectName: true } },
      property: { select: { id: true, title: true } },
      salesRep: { select: { name: true } },
    },
  });
  return NextResponse.json(deals);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "GENERAL_MANAGER" && session.role !== "SALES_MANAGER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const body = await request.json();
  const commissionAmt = body.commissionAmt !== undefined ? body.commissionAmt : (body.finalPrice * (body.commission || 0)) / 100;

  const deal = await prisma.deal.create({
    data: { 
      customerId: body.customerId,
      // Temporarily use a dummy property if propertyId is null, or make schema nullable (but since we can't change schema now easily, we require propertyId)
      propertyId: body.propertyId,
      salesRepId: session.id,
      status: "COMPLETED",
      value: body.finalPrice,
      finalPrice: body.finalPrice,
      commission: body.commission,
      commissionAmt: commissionAmt,
    },
    include: {
      customer: { select: { name: true } },
      salesRep: { select: { name: true } },
    },
  });

  // Mark customer as completed
  await prisma.customer.update({ where: { id: body.customerId }, data: { status: "COMPLETED" } });

  // Add Commission record to the sales employee
  if (commissionAmt > 0) {
    await prisma.commission.create({
      data: {
        userId: session.id,
        amount: commissionAmt,
        notes: `عمولة صفقة مع العميل ${deal.customer.name}`,
        status: "PENDING"
      }
    });
  }

  // Create notification
  await prisma.notification.create({
    data: {
      userId: session.id,
      title: "🎉 صفقة جديدة مكتملة",
      body: `تم إتمام صفقة مع ${deal.customer.name} بقيمة ${body.finalPrice.toLocaleString()} جنيه`,
      type: "SUCCESS",
      link: `/dashboard/deals`,
    },
  });

  return NextResponse.json({ success: true, deal });
}
