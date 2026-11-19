import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      inquiryType = "CONSULTATION",
      name,
      phone,
      email,
      preferredZone,
      budget,
      notes,
      unitType,
      area,
      price,
      floor,
      bedrooms,
      bathrooms,
      images = [],
      propertyId,
    } = body;

    // 1. Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "يرجى كتابة الاسم بشكل صحيح." }, { status: 400 });
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
      return NextResponse.json({ error: "يرجى إدخال رقم هاتف صحيح للتواصل." }, { status: 400 });
    }

    const titlesMap: Record<string, string> = {
      CONSULTATION: "حجز استشارة عقارية",
      VIEWING: "طلب معاينة وحدة",
      SELL_UNIT: "طلب عرض وبيع وحدة",
      CONTACT: "استفسار وتواصل",
    };

    const typeTitle = titlesMap[inquiryType] || "طلب من الموقع";
    const isSeller = inquiryType === "SELL_UNIT";

    // 2. Generate customer code
    const count = await prisma.customer.count();
    const code = "WEB-" + (count + 1).toString().padStart(4, "0");

    // 3. Create Customer Record
    const customer = await prisma.customer.create({
      data: {
        code,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        type: isSeller ? "SELLER" : "BUYER",
        status: "NEW",
        source: `الموقع الإلكتروني (${typeTitle})`,
        preferredZone: preferredZone ? preferredZone.trim() : null,
        propertyType: unitType || null,
        area: area ? parseFloat(area.toString()) : null,
        budgetMax: price ? parseFloat(price.toString()) : (budget ? parseFloat(budget.toString()) : null),
        floor: floor ? floor.toString() : null,
        bedrooms: bedrooms ? parseInt(bedrooms.toString()) : null,
        bathrooms: bathrooms ? parseInt(bathrooms.toString()) : null,
        notes: notes ? notes.trim() : null,
        customData: {
          inquiryType,
          propertyId: propertyId || null,
          uploadedImages: images,
          submittedAt: new Date().toISOString(),
          requestedAction: typeTitle,
        },
      },
    });

    // 4. Notify Managers in CRM
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ["GENERAL_MANAGER", "SALES_MANAGER"] },
      },
      select: { id: true },
    });

    const notifBody = `${typeTitle} من العميل: ${name} (${phone}) ${preferredZone ? `• المنطقة: ${preferredZone}` : ""}`;

    for (const manager of managers) {
      await prisma.notification.create({
        data: {
          userId: manager.id,
          title: `🎯 ${typeTitle} جديد من الموقع!`,
          body: notifBody,
          type: "INFO",
          link: `/dashboard/leads`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "تم استلام طلبكم بنجاح! سيتواصل معكم أحد مستشارينا المعتمدين خلال دقائق.",
      customerId: customer.id,
    });
  } catch (error: any) {
    console.error("Public Inquiry Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة أو التواصل المباشر عبر واتساب." },
      { status: 500 }
    );
  }
}
