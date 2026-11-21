import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ALLOWED_ROLES, requireRole, ROLE, HR_ROLES } from "@/lib/auth";
import { hashPassword } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await requireRole(HR_ROLES);
    if (session instanceof NextResponse) return session;
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        phone: true, nationalId: true, address: true, dateJoined: true, salaryBase: true
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([ROLE.GENERAL_MANAGER]);
    if (session instanceof NextResponse) return session;

    const { name, email, password, role, phone, nationalId, address, dateJoined, salaryBase } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "الحقول الأساسية مطلوبة" }, { status: 400 });
    }
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "الدور المحدد غير صالح" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        nationalId,
        address,
        dateJoined: dateJoined ? new Date(dateJoined) : null,
        salaryBase: salaryBase ? parseFloat(salaryBase) : 0,
      },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        phone: true, nationalId: true, address: true, dateJoined: true, salaryBase: true
      }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة المستخدم" }, { status: 500 });
  }
}
