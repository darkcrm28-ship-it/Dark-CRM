import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ROLE, SALES_ROLES } from "@/lib/auth";

export async function GET() {
  const session = await requireRole(SALES_ROLES);
  if (session instanceof NextResponse) return session;
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
  return NextResponse.json(deals);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(SALES_ROLES);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const { customerId, propertyId, salesRepId: requestedSalesRepId } = body;

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json({ error: "العميل مطلوب لإتمام الصفقة" }, { status: 400 });
    }

    const finalPrice = typeof body.finalPrice === "number" ? body.finalPrice : parseFloat(body.finalPrice);
    if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
      return NextResponse.json({ error: "قيمة الصفقة يجب أن تكون رقماً موجباً" }, { status: 400 });
    }

    const commissionPercent = body.commission !== undefined ? Math.max(0, parseFloat(body.commission) || 0) : 0;
    const commissionAmt = body.commissionAmt !== undefined 
      ? Math.max(0, parseFloat(body.commissionAmt) || 0) 
      : (finalPrice * commissionPercent) / 100;

    // Verify Customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, assignedToId: true, status: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }
    if (session.role === ROLE.SALES_EMPLOYEE && customer.assignedToId !== session.id) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    // Verify Property exists if provided
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true, title: true },
      });
      if (!property) {
        return NextResponse.json({ error: "العقار المحدد غير موجود" }, { status: 404 });
      }
    }

    // Determine the true Sales Representative:
    // 1. Explicit valid salesRepId from body
    // 2. Customer's assigned sales agent
    // 3. Fallback to creator's session id
    let targetSalesRepId = session.role === ROLE.SALES_EMPLOYEE ? session.id : (customer.assignedToId || session.id);
    if (requestedSalesRepId && session.role !== ROLE.SALES_EMPLOYEE) {
      const repExists = await prisma.user.findFirst({
        where: { id: requestedSalesRepId, role: { in: [ROLE.SALES_EMPLOYEE, ROLE.SALES_MANAGER] }, isActive: true },
        select: { id: true },
      });
      if (!repExists) return NextResponse.json({ error: "مندوب المبيعات المحدد غير صالح" }, { status: 400 });
      targetSalesRepId = repExists.id;
    }

    // Atomic Transaction: Duplicate check + Deal creation + Customer update + Commission + AuditLog
    const result = await prisma.$transaction(async (tx) => {
      const currentCustomer = await tx.customer.findFirst({
        where: session.role === ROLE.SALES_EMPLOYEE
          ? { id: customerId, assignedToId: session.id }
          : { id: customerId },
        select: { id: true, name: true },
      });
      if (!currentCustomer) throw new Error("DEAL_CUSTOMER_ACCESS_DENIED");

      // 1. Check for duplicate deal submission within the last 30 seconds for the same customer
      const recentDuplicate = await tx.deal.findFirst({
        where: {
          customerId,
          propertyId: propertyId || null,
          value: finalPrice,
          createdAt: { gte: new Date(Date.now() - 30 * 1000) },
        },
      });

      if (recentDuplicate) {
        throw new Error("DUPLICATE_DEAL_DETECTED");
      }

      // 2. Create the Deal
      const deal = await tx.deal.create({
        data: {
          customerId,
          propertyId: propertyId || null,
          salesRepId: targetSalesRepId,
          status: "COMPLETED",
          value: finalPrice,
          finalPrice,
          commission: commissionPercent,
          commissionAmt,
        },
        include: {
          customer: { select: { id: true, name: true } },
          salesRep: { select: { id: true, name: true } },
          property: { select: { id: true, title: true } },
        },
      });

      // 3. Update Customer Status to COMPLETED
      await tx.customer.update({
        where: { id: customerId },
        data: { status: "COMPLETED" },
      });

      // 4. Create Commission for the designated Sales Representative (NOT necessarily the manager who clicked)
      if (commissionAmt > 0) {
        await tx.commission.create({
          data: {
            userId: targetSalesRepId,
            amount: commissionAmt,
            notes: `عمولة صفقة العميل ${currentCustomer.name} (قيمة الصفقة: ${finalPrice.toLocaleString()} ج.م)`,
            status: "PENDING",
          },
        });
      }

      // 5. Create AuditLog
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE",
          entity: "DEAL",
          entityId: deal.id,
          details: `إتمام صفقة بقيمة ${finalPrice.toLocaleString()} ج.م للعميل ${currentCustomer.name} - عمولة المندوب: ${commissionAmt.toLocaleString()} ج.م (المندوب: ${deal.salesRep?.name || targetSalesRepId})`,
        },
      });

      return deal;
    });

    // Notify the Sales Representative (if different from manager who created the deal)
    if (targetSalesRepId !== session.id) {
      await prisma.notification.create({
        data: {
          userId: targetSalesRepId,
          title: "🎉 تم تسجيل صفقة وعمولة جديدة لك!",
          body: `تم إتمام صفقة لعميلك ${customer.name} بقيمة ${finalPrice.toLocaleString()} ج.م. عمولتك المسجلة: ${commissionAmt.toLocaleString()} ج.م`,
          type: "SUCCESS",
          link: `/dashboard/deals`,
        },
      }).catch(() => {});
    }

    // Notify the creator
    await prisma.notification.create({
      data: {
        userId: session.id,
        title: "🎉 صفقة جديدة مكتملة",
        body: `تم إتمام صفقة مع ${customer.name} بقيمة ${finalPrice.toLocaleString()} جنيه`,
        type: "SUCCESS",
        link: `/dashboard/deals`,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, deal: result });
  } catch (error: any) {
    if (error?.message === "DEAL_CUSTOMER_ACCESS_DENIED") {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }
    if (error?.message === "DUPLICATE_DEAL_DETECTED") {
      return NextResponse.json({ error: "تم إرسال هذه الصفقة مسبقاً، منعاً للتكرار يرجى عدم إعادة الإرسال سريعاً." }, { status: 409 });
    }
    console.error("Create Deal Error:", error);
    return NextResponse.json({ error: "فشل إنشاء الصفقة. تحقق من صحة البيانات المدخلة." }, { status: 500 });
  }
}
