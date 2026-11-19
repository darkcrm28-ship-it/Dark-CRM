import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { type, notes, reminderDate, reminderTitle } = body;

    if (!notes) {
      return NextResponse.json({ error: "Notes are required" }, { status: 400 });
    }

    // Add Interaction
    const interaction = await prisma.interaction.create({
      data: {
        customerId: params.id,
        userId: session.id,
        type,
        notes,
      }
    });

    // Update lastInteractionAt on the customer
    await prisma.customer.update({
      where: { id: params.id },
      data: { lastInteractionAt: new Date() },
    });

    // Auto-complete any pending reminders for this user & customer
    await prisma.reminder.updateMany({
      where: { 
        customerId: params.id,
        userId: session.id,
        status: "PENDING"
      },
      data: { status: "COMPLETED" }
    });

    let reminder = null;
    if (reminderDate) {
      reminder = await prisma.reminder.create({
        data: {
          customerId: params.id,
          userId: session.id,
          title: reminderTitle || (type === "VIEWING" ? "موعد معاينة" : "متابعة مع العميل"),
          dueDate: new Date(reminderDate),
          status: "PENDING",
        }
      });
    }

    return NextResponse.json({ success: true, interaction, reminder });
  } catch (error) {
    console.error("Add Interaction Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
