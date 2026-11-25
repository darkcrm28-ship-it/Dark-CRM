import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { CUSTOMER_STATUS_TRANSITIONS } from "@/lib/state-machines";

const legacyStatuses = [
  "POTENTIAL_SELLER", "SELLER", "BUYER", "NO_ANSWER", "CALL_LATER", "INTERESTED",
  "NOT_INTERESTED", "WANTS_TO_SELL", "DO_NOT_SELL", "MEETING_SCHEDULED", "RENTER", "LANDLORD",
];
const allowedStatuses = new Set([
  ...legacyStatuses,
  ...CUSTOMER_STATUS_TRANSITIONS.flatMap(({ from, to }) => [from, to]),
]);

export async function POST(req: Request) {
  try {
    const session = await requireManager();
    if (session instanceof NextResponse) return session;

    const { customerIds: rawIds, action, value } = await req.json().catch(() => ({}));

    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 100 ||
        rawIds.some((id) => typeof id !== "string" || !id.trim() || id.length > 100) ||
        !["UNASSIGN", "STATUS", "RESET"].includes(action)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    if (action === "STATUS" && (!allowedStatuses.has(value) || value === "COMPLETED")) {
      return NextResponse.json({ error: "الحالة غير متاحة للتغيير الجماعي" }, { status: 400 });
    }
    const customerIds = [...new Set<string>(rawIds)];

    const changed = await prisma.$transaction(async (tx) => {
      if (action === "STATUS") {
        const updated = await tx.customer.updateMany({
          where: { id: { in: customerIds }, status: { not: "COMPLETED" } },
          data: { status: value },
        });
        if (updated.count !== customerIds.length) throw new Error("CUSTOMER_STATUS_CONFLICT");
      } else if (await tx.customer.count({ where: { id: { in: customerIds } } }) !== customerIds.length) {
        return false;
      }
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
      return true;
    });

    if (!changed) return NextResponse.json({ error: "بعض العملاء لم تعد موجودة" }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_STATUS_CONFLICT") {
      return NextResponse.json({ error: "توجد سجلات مكتملة أو لم تعد موجودة" }, { status: 409 });
    }
    console.error("Bulk Action Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
