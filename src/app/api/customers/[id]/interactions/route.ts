import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCustomerAccess } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireCustomerAccess(id);
    if (access instanceof NextResponse) return access;
    const { session } = access;

    const body = await request.json();
    const { type, notes, reminderDate, reminderTitle } = body;
    if (typeof notes !== "string" || !notes.trim()) {
      return NextResponse.json({ error: "Notes are required" }, { status: 400 });
    }
    if (typeof type !== "string" || !type.trim()) {
      return NextResponse.json({ error: "Interaction type is required" }, { status: 400 });
    }
    const dueDate = reminderDate ? new Date(reminderDate) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "Invalid reminder date" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: access.where,
        select: { id: true },
      });
      if (!customer) return null;

      const interaction = await tx.interaction.create({
        data: { customerId: id, userId: session.id, type, notes: notes.trim() },
      });
      await tx.customer.update({ where: { id }, data: { lastInteractionAt: new Date() } });
      await tx.reminder.updateMany({
        where: { customerId: id, userId: session.id, status: "PENDING" },
        data: { status: "COMPLETED" },
      });
      const reminder = dueDate
        ? await tx.reminder.create({
            data: {
              customerId: id,
              userId: session.id,
              title: typeof reminderTitle === "string" && reminderTitle.trim()
                ? reminderTitle.trim()
                : type === "VIEWING" ? "موعد معاينة" : "متابعة مع العميل",
              dueDate,
              status: "PENDING",
            },
          })
        : null;
      return { interaction, reminder };
    });

    if (!result) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Add Interaction Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
