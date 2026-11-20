import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  normalizeEgyptianPhone,
  normalizeArabicText,
  normalizeDate,
  normalizeNationalId,
  normalizeNumber,
  getUnitSignature,
} from "@/lib/excel-normalizer";

const IMPORT_LOCK_ID = 74839201;
const CUSTOMER_SEQUENCE_LOCK = 74839205;

const asText = (value: unknown) =>
  value === null || value === undefined ? "" : String(value).trim();

// الأعمدة الأساسية المعرفة صراحة في جدول Customer بـ Prisma
const KNOWN_CUSTOMER_FIELDS = new Set([
  "name",
  "phone",
  "email",
  "type",
  "status",
  "source",
  "area",
  "propertyType",
  "governorate",
  "city",
  "executingCompany",
  "deliveryDate",
  "floor",
  "bedrooms",
  "bathrooms",
  "finishing",
  "unitSize",
  "preferencesSummary",
  "unitStatus",
  "isNegotiable",
  "viewingTimes",
  "paperworkStatus",
  "projectName",
  "unitNumber",
  "zoneNumber",
  "buildingNumber",
  "pipelineStage",
  "customerType",
  "askingPrice",
  "remainingInstallments",
  "installmentDuration",
  "budgetMin",
  "budgetMax",
  "preferredZone",
  "preferredSize",
  "installmentAmount",
  "installmentRemaining",
  "installmentDetails",
  "leadScore",
  "projectId",
  "nationalId",
  "_rowNumber",
  "_errors",
  "_suspectPrecision",
]);

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "GENERAL_MANAGER" && session?.role !== "SALES_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const customers = body?.customers;
    const projectId =
      typeof body?.projectId === "string" && body.projectId.trim()
        ? body.projectId.trim()
        : null;
    const defaultType =
      typeof body?.defaultType === "string" && ["SELLER", "BUYER", "LEAD"].includes(body.defaultType)
        ? body.defaultType
        : "SELLER";
    const defaultStatus =
      typeof body?.defaultStatus === "string" && body.defaultStatus.trim()
        ? body.defaultStatus.trim()
        : "POTENTIAL_SELLER";

    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: "لم يتم إرسال سجلات للاستيراد" }, { status: 400 });
    }
    if (customers.length > 200) {
      return NextResponse.json({ error: "الحد الأقصى للدفعة 200 سجل" }, { status: 413 });
    }

    let verifiedProjectName: string | null = null;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true },
      });
      if (!project) {
        return NextResponse.json({ error: "المشروع المحدد غير موجود" }, { status: 400 });
      }
      verifiedProjectName = project.name;
    }

    // 1. تنظيف وتطبيع البيانات والتحقق من الأسماء والهواتف
    interface ValidatedCustomerRow {
      raw: Record<string, unknown>;
      name: string;
      phone: string;
      phoneSuffix10: string;
      nationalId: string | null;
      projectName: string | null;
      buildingNumber: string | null;
      unitNumber: string | null;
      unitSignature: string;
      deliveryDate: string | null;
      customData: Record<string, unknown>;
    }

    const validRows: ValidatedCustomerRow[] = [];
    let initialInvalidCount = 0;

    for (const item of customers) {
      const rawName = asText(item?.name);
      const phoneNorm = normalizeEgyptianPhone(item?.phone);

      if (!rawName || !phoneNorm.isValid) {
        initialInvalidCount++;
        continue;
      }

      const nationalIdNorm = normalizeNationalId(item?.nationalId);
      const dateNorm = normalizeDate(item?.deliveryDate);

      const targetProjectName = verifiedProjectName || asText(item?.projectName) || null;
      const targetBuildingNumber = asText(item?.buildingNumber) || null;
      const targetUnitNumber = asText(item?.unitNumber) || null;

      const unitSig = getUnitSignature(targetProjectName, targetBuildingNumber, targetUnitNumber);

      // تجميع أي أعمدة إضافية أو مجهولة في كائن customData
      const customData: Record<string, unknown> = {};
      if (nationalIdNorm.isValid) {
        customData["الرقم القومي"] = nationalIdNorm.nationalId;
      }

      for (const [key, value] of Object.entries(item)) {
        if (!KNOWN_CUSTOMER_FIELDS.has(key) && value !== null && value !== undefined && value !== "") {
          customData[key] = value;
        }
      }

      validRows.push({
        raw: item,
        name: normalizeArabicText(rawName),
        phone: phoneNorm.phone,
        phoneSuffix10: phoneNorm.phone.slice(-10),
        nationalId: nationalIdNorm.isValid ? nationalIdNorm.nationalId : null,
        projectName: targetProjectName,
        buildingNumber: targetBuildingNumber,
        unitNumber: targetUnitNumber,
        unitSignature: unitSig,
        deliveryDate: dateNorm.isValid ? dateNorm.isoDate : (asText(item?.deliveryDate) || null),
        customData,
      });
    }

    if (!validRows.length) {
      return NextResponse.json({
        error: "كل الصفوف المرسلة تفتقد الاسم أو تحتوي على رقم هاتف غير صالح",
        failed: customers.length,
      }, { status: 400 });
    }

    // 2. تنفيذ المعاملة الآمنة مع قفل PostgreSQL على مستوى المعاملة وإعادة محاولة خارجية
    let transactionResult: {
      insertedCount: number;
      duplicatesCount: number;
      failedCount: number;
    } = { insertedCount: 0, duplicatesCount: 0, failedCount: initialInvalidCount };

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        transactionResult = await prisma.$transaction(
          async (tx) => {
            // حجز قفل المعاملة لمنع التزامن والسباق بين دفعتي استيراد (pg_try_advisory_xact_lock)
            const lockRes = await tx.$queryRaw<Array<{ acquired: boolean }>>`
              SELECT pg_try_advisory_xact_lock(${IMPORT_LOCK_ID}) AS acquired;
            `;
            if (!lockRes[0]?.acquired) {
              throw new Error("CONCURRENT_IMPORT_LOCKED");
            }

            // حجز قفل تسلسل الأكواد المشترك لمنع التزامن مع عمليات الإضافة الفردية
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CUSTOMER_SEQUENCE_LOCK});`;

            // استخراج السوابق العشرية الفريدة للهواتف في الدفعة
            const phoneSuffixes = [...new Set(validRows.map((r) => r.phoneSuffix10))];

            // البحث عن العملاء الحاليين في قاعدة البيانات باستخدام مقارنة الـ 10 أرقام الأخيرة
            const existingCustomers = await tx.$queryRaw<
              Array<{
                id: string;
                name: string;
                phone: string;
                unitNumber: string | null;
                buildingNumber: string | null;
                projectName: string | null;
                projectId: string | null;
                customData: any;
              }>
            >`
              SELECT 
                id, name, phone, "unitNumber", "buildingNumber", "projectName", "projectId", "customData"
              FROM "Customer"
              WHERE RIGHT(REGEXP_REPLACE(phone, '\D', '', 'g'), 10) = ANY(${phoneSuffixes}::text[]);
            `;

            // خريطة لتتبع التكرار داخل نفس الدفعة وفي قاعدة البيانات
            const processedKeys = new Set<string>();
            const dataToInsert: any[] = [];
            let duplicatesCount = 0;

            for (const row of validRows) {
              // فحص التكرار مع قاعدة البيانات
              const matchedInDb = existingCustomers.filter((ex) => {
                const exPhoneNorm = normalizeEgyptianPhone(ex.phone);
                const exCustomData =
                  ex.customData && typeof ex.customData === "object" && !Array.isArray(ex.customData)
                    ? (ex.customData as Record<string, unknown>)
                    : {};
                const exNationalId = exCustomData["الرقم القومي"] ?? exCustomData.nationalId;

                // مطابقة الهواتف بدقة صارمة:
                // إذا كان الرقم القديم محمول مصري سليم، نقارن المقطع العشري الأخير (لأن كلاهما محمول مصري معتمد)
                // إذا كان أرضي أو دولي، نقارن كامل الأرقام تطابقاً تاماً فقط (cleanEx === cleanRow) لمنع أي دمج خاطئ
                let phoneMatches = false;
                if (exPhoneNorm.isValid) {
                  phoneMatches = exPhoneNorm.phone.slice(-10) === row.phoneSuffix10;
                } else {
                  const cleanEx = String(ex.phone || "").replace(/\D/g, "");
                  const cleanRow = String(row.phone || "").replace(/\D/g, "");
                  phoneMatches = Boolean(cleanEx) && cleanEx === cleanRow;
                }

                const nationalIdMatches =
                  Boolean(row.nationalId) &&
                  Boolean(exNationalId) &&
                  row.nationalId === String(exNationalId);

                return phoneMatches || nationalIdMatches;
              });

              // هل توجد وحدة مطابقة تماماً؟
              let isDuplicate = false;
              for (const ex of matchedInDb) {
                const exUnitSig = getUnitSignature(
                  ex.projectName || "",
                  ex.buildingNumber || "",
                  ex.unitNumber || ""
                );
                if (row.unitSignature === "NO_UNIT" && exUnitSig === "NO_UNIT") {
                  isDuplicate = true;
                  break;
                }
                if (row.unitSignature !== "NO_UNIT" && exUnitSig === row.unitSignature) {
                  isDuplicate = true;
                  break;
                }
              }

              // فحص التكرار داخل نفس ملف الدفعة المرفوع
              const batchKey = `${row.phoneSuffix10}|${row.nationalId || ""}|${row.unitSignature}`;
              if (isDuplicate || processedKeys.has(batchKey)) {
                duplicatesCount++;
                continue;
              }

              processedKeys.add(batchKey);

              dataToInsert.push({
                name: row.name,
                phone: row.phone,
                email: asText(row.raw.email) || null,
                type: asText(row.raw.type) || defaultType,
                status: asText(row.raw.status) || defaultStatus,
                projectId,
                projectName: row.projectName,
                unitNumber: row.unitNumber,
                buildingNumber: row.buildingNumber,
                floor: asText(row.raw.floor) || null,
                area: asText(row.raw.area) || null,
                propertyType: asText(row.raw.propertyType) || null,
                governorate: asText(row.raw.governorate) || null,
                city: asText(row.raw.city) || null,
                executingCompany: asText(row.raw.executingCompany) || null,
                deliveryDate: row.deliveryDate,
                unitSize: normalizeNumber(row.raw.unitSize),
                askingPrice: normalizeNumber(row.raw.askingPrice),
                installmentAmount: normalizeNumber(row.raw.installmentAmount) ?? 0,
                installmentRemaining:
                  normalizeNumber(row.raw.installmentRemaining) !== null
                    ? Math.floor(normalizeNumber(row.raw.installmentRemaining)!)
                    : 0,
                installmentDetails: asText(row.raw.installmentDetails) || null,
                finishing: asText(row.raw.finishing) || null,
                bedrooms:
                  normalizeNumber(row.raw.bedrooms) !== null
                    ? Math.floor(normalizeNumber(row.raw.bedrooms)!)
                    : null,
                bathrooms:
                  normalizeNumber(row.raw.bathrooms) !== null
                    ? Math.floor(normalizeNumber(row.raw.bathrooms)!)
                    : null,
                paperworkStatus: asText(row.raw.paperworkStatus) || null,
                customData: row.customData,
                source: asText(row.raw.source) || "استيراد Excel",
                leadScore: normalizeNumber(row.raw.leadScore) ? Math.floor(normalizeNumber(row.raw.leadScore)!) : 3,
              });
            }

            if (!dataToInsert.length) {
              return {
                insertedCount: 0,
                duplicatesCount,
                failedCount: initialInvalidCount,
              };
            }

            // توليد كود العميل المتسلسل الآمن (Customer.code)
            const maxCodeRes = await tx.$queryRaw<Array<{ max_seq: number | null }>>`
              SELECT MAX(
                NULLIF(REGEXP_REPLACE(code, '^CUST-0*', ''), '')::integer
              ) AS max_seq
              FROM "Customer"
              WHERE code ~ '^CUST-[0-9]+$';
            `;

            const startSeq = (maxCodeRes[0]?.max_seq || 0) + 1;
            for (let i = 0; i < dataToInsert.length; i++) {
              dataToInsert[i].code = `CUST-${String(startSeq + i).padStart(4, "0")}`;
            }

            const created = await tx.customer.createMany({ data: dataToInsert });

            // تسجيل العملية في AuditLog داخل نفس المعاملة
            await tx.auditLog.create({
              data: {
                userId: session.id,
                action: "IMPORT",
                entity: "Customer",
                entityId: projectId || "BULK",
                details: JSON.stringify({
                  totalBatchRows: customers.length,
                  inserted: created.count,
                  duplicates: duplicatesCount,
                  failed: initialInvalidCount,
                  timestamp: new Date().toISOString(),
                }),
              },
            });

            return {
              insertedCount: created.count,
              duplicatesCount,
              failedCount: initialInvalidCount,
            };
          },
          {
            maxWait: 5000,
            timeout: 30000,
          }
        );

        // تم اكتمال المعاملة بنجاح
        break;
      } catch (insertErr: any) {
        if (insertErr?.code === "P2002" && attempt < maxRetries - 1) {
          console.warn(`Customer.code conflict on import (P2002). Retrying in fresh transaction attempt ${attempt + 1}...`);
          await new Promise((res) => setTimeout(res, 100 * (attempt + 1)));
          continue;
        }
        throw insertErr;
      }
    }

    return NextResponse.json({
      success: true,
      count: transactionResult.insertedCount,
      duplicates: transactionResult.duplicatesCount,
      failed: transactionResult.failedCount,
    });
  } catch (error: any) {
    if (error?.message === "CONCURRENT_IMPORT_LOCKED") {
      return NextResponse.json(
        { error: "هناك عملية استيراد أخرى قيد التنفيذ حالياً. يرجى الانتظار ثوانٍ لمنع تكرار السجلات." },
        { status: 409 }
      );
    }
    console.error("Import Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء استيراد البيانات" }, { status: 500 });
  }
}
