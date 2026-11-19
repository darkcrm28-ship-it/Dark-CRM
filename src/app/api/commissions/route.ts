import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (session?.role !== "GENERAL_MANAGER" && session?.role !== "HR_MANAGER") {
      return NextResponse.json({ error: "غير مصرح لك بإضافة عمولات" }, { status: 403 });
    }

    const { userId, amount, description } = await request.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: "الرجاء إدخال المبلغ والموظف" }, { status: 400 });
    }

    const commission = await prisma.commission.create({
      data: {
        userId,
        amount,
        notes: description,
      }
    });

    return NextResponse.json({ success: true, commission });
  } catch (error) {
    console.error("Add Commission Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة العمولة" }, { status: 500 });
  }
}
