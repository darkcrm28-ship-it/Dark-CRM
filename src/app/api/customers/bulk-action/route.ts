import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await requireManager();
    if (session instanceof NextResponse) return session;

    const { customerIds, action, value } = await req.json();

    if (!customerIds || !Array.isArray(customerIds)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (action === "UNASSIGN") {
        await tx.customer.updateMany({
          where: { id: { in: customerIds } },
          data: { assignedToId: null }
        });

        await tx.interaction.createMany({
          data: customerIds.map(id => ({
            customerId: id,
            userId: session.id,
            type: "SYSTEM",
            notes: `تم سحب العميل وإعادته لقاعدة البيانات بواسطة ${session.name}`
          }))
        });

        await tx.auditLog.create({
          data: {
            userId: session.id,
            action: "UNASSIGN",
            entity: "CUSTOMER",
            entityId: customerIds.slice(0, 5).join(", "),
            details: `سحب ${customerIds.length} عميل وإعادتهم للقاعدة`,
          },
        });
      } 
      else if (action === "STATUS") {
        await tx.customer.updateMany({
          where: { id: { in: customerIds } },
          data: { status: value }
        });

        await tx.interaction.createMany({
          data: customerIds.map(id => ({
            customerId: id,
            userId: session.id,
            type: "SYSTEM",
            notes: `تم تغيير حالة العميل إلى ${value} بواسطة ${session.name}`
          }))
        });

        await tx.auditLog.create({
          data: {
            userId: session.id,
            action: "STATUS_CHANGE",
            entity: "CUSTOMER",
            entityId: customerIds.slice(0, 5).join(", "),
            details: `تغيير حالة ${customerIds.length} عميل إلى ${value}`,
          },
        });
      }
      else if (action === "RESET") {
        await tx.customer.updateMany({
          where: { id: { in: customerIds } },
          data: {
            leadScore: 3,
            preferencesSummary: null,
            askingPrice: null,
            installmentAmount: 0,
            installmentRemaining: 0,
            installmentDetails: null,
          }
        });

        await tx.interaction.createMany({
          data: customerIds.map(id => ({
            customerId: id,
            userId: session.id,
            type: "SYSTEM",
            notes: `تم تصفير بيانات العميل الإضافية بواسطة ${session.name}`
          }))
        });

        await tx.auditLog.create({
          data: {
            userId: session.id,
            action: "RESET",
            entity: "CUSTOMER",
            entityId: customerIds.slice(0, 5).join(", "),
            details: `تصفير البيانات الإضافية لـ ${customerIds.length} عميل`,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk Action Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
