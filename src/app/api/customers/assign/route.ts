import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Only General Manager or Sales Manager can assign
    if (session?.role !== "GENERAL_MANAGER" && session?.role !== "SALES_MANAGER") {
      return NextResponse.json({ error: "غير مصرح لك بتعيين العملاء" }, { status: 403 });
    }

    const { customerIds, employeeId } = await request.json();

    if (!customerIds || !Array.isArray(customerIds) || !employeeId) {
      return NextResponse.json({ error: "بيانات التعيين غير مكتملة" }, { status: 400 });
    }

    // Update assignment
    const updated = await prisma.customer.updateMany({
      where: { id: { in: customerIds } },
      data: { assignedToId: employeeId },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId: employeeId,
        title: "📥 تعيين عملاء جدد",
        body: `تم تعيين ${updated.count} عميل جديد لك للمتابعة.`,
        type: "INFO"
      }
    });

    // Create Interaction logs for each customer
    await prisma.interaction.createMany({
      data: customerIds.map(id => ({
        customerId: id,
        userId: session.id,
        type: "SYSTEM",
        notes: `تم تعيين العميل للموظف بواسطة ${session.name}`
      }))
    });

    // LOG
    await logAction({
      userId: session.id,
      action: "ASSIGN",
      entity: "Customer",
      details: `تم تعيين ${updated.count} عميل للموظف ${employeeId || "غير محدد"}`
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error("Assign Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تعيين العملاء" }, { status: 500 });
  }
}
