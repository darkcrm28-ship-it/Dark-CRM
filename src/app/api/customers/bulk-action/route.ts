import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "GENERAL_MANAGER" && session.role !== "SALES_MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customerIds, action, value } = await req.json();

    if (!customerIds || !Array.isArray(customerIds)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    if (action === "UNASSIGN") {
      await prisma.customer.updateMany({
        where: { id: { in: customerIds } },
        data: { assignedToId: null }
      });

      // Log activity
      await prisma.interaction.createMany({
        data: customerIds.map(id => ({
          customerId: id,
          userId: session.id,
          type: "SYSTEM",
          notes: `تم سحب العميل وإعادته لقاعدة البيانات بواسطة ${session.name}`
        }))
      });
    } 
    else if (action === "STATUS") {
      await prisma.customer.updateMany({
        where: { id: { in: customerIds } },
        data: { status: value }
      });

      await prisma.interaction.createMany({
        data: customerIds.map(id => ({
          customerId: id,
          userId: session.id,
          type: "SYSTEM",
          notes: `تم تغيير حالة العميل إلى ${value} بواسطة ${session.name}`
        }))
      });
    }
    else if (action === "RESET") {
      await prisma.customer.updateMany({
        where: { id: { in: customerIds } },
        data: {
          notes: null,
          leadScore: 3,
          preferencesSummary: null,
          // Resetting other non-core fields if necessary
        }
      });

      await prisma.interaction.createMany({
        data: customerIds.map(id => ({
          customerId: id,
          userId: session.id,
          type: "SYSTEM",
          notes: `تم تصفير بيانات العميل بواسطة ${session.name}`
        }))
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk Action Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
