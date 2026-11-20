import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

type ImportCustomer = {
  name?: unknown;
  phone?: unknown;
  nationalId?: unknown;
  unitNumber?: unknown;
  buildingNumber?: unknown;
  projectName?: unknown;
  area?: unknown;
  floor?: unknown;
  deliveryDate?: unknown;
  propertyType?: unknown;
  governorate?: unknown;
  city?: unknown;
  executingCompany?: unknown;
};

const asText = (value: unknown) => value === null || value === undefined ? "" : String(value).trim();
const normalizePhone = (value: unknown) => asText(value).replace(/\D/g, "");
const normalizePart = (value: unknown) => asText(value).toLocaleLowerCase().replace(/\s+/g, " ");

function identityKey(customer: {
  phone: unknown; nationalId: unknown; unitNumber: unknown;
  buildingNumber: unknown; projectName: unknown; name: unknown;
}) {
  const phone = normalizePhone(customer.phone);
  const nationalId = asText(customer.nationalId);
  const unit = normalizePart(customer.unitNumber);
  const building = normalizePart(customer.buildingNumber);
  const project = normalizePart(customer.projectName);
  // Phone alone is deliberately not a duplicate key: one person can own multiple units.
  return [phone, nationalId, project, building, unit].join("|");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "GENERAL_MANAGER" && session?.role !== "SALES_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const customers = body?.customers;
    const projectId = typeof body?.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : null;

    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: "لم يتم إرسال سجلات للاستيراد" }, { status: 400 });
    }
    if (customers.length > 200) {
      return NextResponse.json({ error: "الحد الأقصى للدفعة 200 سجل" }, { status: 413 });
    }

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!project) return NextResponse.json({ error: "المشروع المحدد غير موجود" }, { status: 400 });
    }

    const cleaned: ImportCustomer[] = [];
    for (const item of customers as ImportCustomer[]) {
      const name = asText(item?.name);
      const phone = asText(item?.phone);
      if (!name || !normalizePhone(phone)) continue;
      cleaned.push({ ...item, name, phone });
    }
    if (!cleaned.length) {
      return NextResponse.json({ error: "كل الصفوف المرسلة تفتقد الاسم أو رقم الهاتف" }, { status: 400 });
    }

    const phones = [...new Set(cleaned.map(row => asText(row.phone)))];
    const existing = await prisma.customer.findMany({
      where: { phone: { in: phones } },
      select: {
        phone: true, name: true, unitNumber: true, buildingNumber: true,
        projectName: true, customData: true
      }
    });

    const knownKeys = new Set<string>();
    for (const row of existing) {
      const customData = row.customData && typeof row.customData === "object" && !Array.isArray(row.customData)
        ? row.customData as Record<string, unknown> : {};
      knownKeys.add(identityKey({
        phone: row.phone,
        nationalId: customData["الرقم القومي"] ?? customData.nationalId,
        unitNumber: row.unitNumber,
        buildingNumber: row.buildingNumber,
        projectName: row.projectName,
        name: row.name
      }));
    }

    const dataToInsert = [];
    let duplicates = 0;
    for (const row of cleaned) {
      const key = identityKey(row);
      if (knownKeys.has(key)) {
        duplicates++;
        continue;
      }
      knownKeys.add(key);
      const nationalId = asText(row.nationalId);
      const customData: Record<string, string> = {};
      if (nationalId) customData["الرقم القومي"] = nationalId;

      dataToInsert.push({
        name: asText(row.name),
        phone: asText(row.phone),
        type: "SELLER" as const,
        status: "POTENTIAL_SELLER" as const,
        projectId,
        area: asText(row.area) || null,
        propertyType: asText(row.propertyType) || null,
        projectName: asText(row.projectName) || null,
        unitNumber: asText(row.unitNumber) || null,
        buildingNumber: asText(row.buildingNumber) || null,
        governorate: asText(row.governorate) || null,
        city: asText(row.city) || null,
        executingCompany: asText(row.executingCompany) || null,
        deliveryDate: asText(row.deliveryDate) || null,
        floor: asText(row.floor) || null,
        customData
      });
    }

    if (!dataToInsert.length) {
      return NextResponse.json({ success: true, count: 0, duplicates, failed: customers.length - cleaned.length });
    }

    const created = await prisma.customer.createMany({ data: dataToInsert });
    return NextResponse.json({
      success: true,
      count: created.count,
      duplicates,
      failed: customers.length - cleaned.length
    });
  } catch (error) {
    console.error("Import Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء استيراد البيانات" }, { status: 500 });
  }
}
