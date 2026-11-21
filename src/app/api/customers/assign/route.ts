import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireManager();
    
    // Only General Manager or Sales Manager can assign
    if (session instanceof NextResponse) return session;

    const { customerIds, employeeId } = await request.json();

    if (!customerIds || !Array.isArray(customerIds) || !employeeId) {
      return NextResponse.json({ error: "بيانات التعيين غير مكتملة" }, { status: 400 });
    }

    // Update assignment inside atomic transaction
    const targetEmployee = await prisma.user.findUnique({
      where: { id: employeeId, role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER"] }, isActive: true },
      select: { id: true, name: true },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: "الموظف المطلوب غير موجود" }, { status: 404 });
    }

    const updatedCount = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.updateMany({
        where: { id: { in: customerIds } },
        data: { assignedToId: employeeId },
      });

      // Create Notification
      await tx.notification.create({
        data: {
          userId: employeeId,
          title: "📥 تعيين عملاء جدد",
          body: `تم تعيين ${updated.count} عميل جديد لك للمتابعة.`,
          type: "INFO",
        },
      });

      // Create Interaction logs for each customer
      await tx.interaction.createMany({
        data: customerIds.map(id => ({
          customerId: id,
          userId: session.id,
          type: "SYSTEM",
          notes: `تم تعيين العميل للموظف ${targetEmployee.name} بواسطة ${session.name}`,
        })),
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "ASSIGN",
          entity: "CUSTOMER",
          entityId: employeeId,
          details: `تم تعيين ${updated.count} عميل للموظف ${targetEmployee.name}`,
        },
      });

      return updated.count;
    });

    return NextResponse.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error("Assign Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تعيين العملاء" }, { status: 500 });
  }
}
