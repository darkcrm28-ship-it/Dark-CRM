import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, COMMISSION_ROLES, FINANCE_ROLES } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireRole(COMMISSION_ROLES);
    if (session instanceof NextResponse) return session;

    const commissions = await prisma.commission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json(commissions);
  } catch (error) {
    console.error("Fetch Commissions Error:", error);
    return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(FINANCE_ROLES);
    if (session instanceof NextResponse) return session;

    const { userId, amount, description } = await request.json();
    const parsedAmount = typeof amount === "number" ? amount : parseFloat(amount);

    if (!userId || !parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "الرجاء إدخال موظف ومبلغ صحيح أكبر من الصفر" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "الموظف المحدد غير موجود" }, { status: 404 });
    }

    const commission = await prisma.$transaction(async (tx) => {
      const comm = await tx.commission.create({
        data: {
          userId,
          amount: parsedAmount,
          notes: description ? String(description).trim() : null,
          status: "PENDING",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE",
          entity: "COMMISSION",
          entityId: comm.id,
          details: `تسجيل عمولة للموظف ${targetUser.name} بمبلغ ${parsedAmount.toLocaleString()} ج.م (${description || "بدون بيان"})`,
        },
      });

      return comm;
    });

    return NextResponse.json({ success: true, commission });
  } catch (error) {
    console.error("Add Commission Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة العمولة" }, { status: 500 });
  }
}
