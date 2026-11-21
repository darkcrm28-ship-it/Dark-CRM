import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import {
  normalizePhone,
  normalizeArabicText,
  normalizeDate,
  normalizeNationalId,
  normalizeNumber,
  getUnitSignature,
  isSamePhone,
  resolvePersonIdentity,
  decideImportMatch,
  generateNationalIdPlaceholder,
  generateUnverifiedPlaceholder,
  type PersonIdentity,
  type ImportMatchAction,
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
  "_sheetName",
  "_errors",
  "_warnings",
  "_suspectPrecision",
]);

export async function POST(request: NextRequest) {
  try {
    const session = await requireManager();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const customers = body?.customers;
    const batchId =
      typeof body?.batchId === "string" && body.batchId.trim()
        ? body.batchId.trim()
        : (typeof body?.idempotencyKey === "string" && body.idempotencyKey.trim()
            ? body.idempotencyKey.trim()
            : null);

    // لا نقبل معرّف دفعة إلا بصيغة آمنة ومحصورة، لمنع أي تطابق جزئي أو التباس
    // بين معرّفين مختلفين أو حقن أحرف في استعلام AuditLog.
    if (batchId && !/^[A-Za-z0-9_-]{1,64}$/.test(batchId)) {
      return NextResponse.json(
        { error: "معرّف الدفعة (batchId) غير صالح. يُسمح بأحرف إنجليزية وأرقام و _ - فقط وبطول أقصى 64." },
        { status: 400 }
      );
    }

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

    // حساب بصمة المحتوى للدفعة للتحقق من عدم استخدام نفس batchId مع بيانات مختلفة
    const batchFingerprint = createHash("sha256")
      .update(JSON.stringify(customers))
      .digest("hex");

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

    // 1. تنظيف وتطبيع البيانات وفحص الهواتف وتوليد بدائل مستقرة للسجلات الخالية من الهاتف
    interface ValidatedCustomerRow {
      rowNumber: number;
      raw: Record<string, unknown>;
      name: string;
      phone: string;
      hasSyntheticPhone: boolean;
      phoneType: string;
      phoneSuffix10: string;
      identity: PersonIdentity;
      needsReview: boolean;
      reviewReason: string | null;
      nationalId: string | null;
      projectName: string | null;
      buildingNumber: string | null;
      unitNumber: string | null;
      unitSignature: string;
      sheetName: string | null;
      deliveryDate: string | null;
      customData: Record<string, unknown>;
    }

    const validRows: ValidatedCustomerRow[] = [];
    const invalidReport: Array<{ row: number; name: string; phone: string; reason: string }> = [];

    let rowIndex = 0;
    for (const item of customers) {
      rowIndex++;
      const rowNum = Number(item?._rowNumber) || rowIndex;
      const rawName = asText(item?.name);
      const rawPhone = asText(item?.phone);
      const phoneNorm = normalizePhone(rawPhone);

      const nationalIdNorm = normalizeNationalId(item?.nationalId);
      const dateNorm = normalizeDate(item?.deliveryDate);

      const targetProjectName = verifiedProjectName || asText(item?.projectName) || null;
      const targetBuildingNumber = asText(item?.buildingNumber) || null;
      const targetUnitNumber = asText(item?.unitNumber) || null;
      const targetSheetName = asText(item?._sheetName) || null;

      const unitSig = getUnitSignature(targetProjectName, targetBuildingNumber, targetUnitNumber);

      if (!rawName) {
        invalidReport.push({
          row: rowNum,
          name: rawName,
          phone: rawPhone,
          reason: "اسم العميل مفقود وهو حقل إلزامي",
        });
        continue;
      }

      // ── هوية الشخص: هاتف موثوق، أو رقم قومي مجتاز للتحقق، أو غير موثوق ──
      // لا نستخدم (الاسم + الوحدة) مطلقاً كدليل هوية.
      const identity = resolvePersonIdentity(
        rawPhone,
        item?.nationalId as string | null | undefined
      );

      let finalPhone = "";
      let hasSyntheticPhone = false;
      let needsReview = false;
      let reviewReason: string | null = null;

      if (identity.kind === "PHONE") {
        finalPhone = identity.value!;
      } else if (identity.kind === "NATIONAL_ID") {
        // بديل ثابت مشتق حصراً من الرقم القومي الموثوق (لا يتضمن الاسم أو الوحدة).
        hasSyntheticPhone = true;
        finalPhone = generateNationalIdPlaceholder(identity.value!);
      } else {
        // UNVERIFIED: لا هاتف ولا رقم قومي موثوق.
        // يُسمح بالاستيراد فقط إذا وُجدت وحدة أو بريد يمكن تأريخ السجل به،
        // مع تعليمه للمراجعة وعدم دمجه مع أي سجل آخر.
        const hasAlternativeIdentifier =
          unitSig !== "NO_UNIT" || Boolean(asText(item?.email));

        if (!hasAlternativeIdentifier) {
          invalidReport.push({
            row: rowNum,
            name: rawName,
            phone: rawPhone,
            reason:
              phoneNorm.error ||
              "لا يوجد هاتف أو رقم قومي موثوق أو وحدة/بريد لربط السجل",
          });
          continue;
        }

        hasSyntheticPhone = true;
        needsReview = true;
        reviewReason =
          "لا يوجد هاتف أو رقم قومي موثوق؛ تعذّر تمييز السجل تلقائياً ويحتاج مراجعة";
        // Seed مستقر من بيانات الصف (الاسم، الوحدة، الورقة، رقم الصف) حتى تظل البديلة متطابقة عبر إعادة المحاولة لنفس الملف، مع تواضع كل صف بمعرّفه الرقمي للصف لتجنب الخلط بين السجلات المختلفة.
        const stableSeed = `${rawName}|${unitSig}|${targetSheetName || ""}|${rowNum}`;
        finalPhone = generateUnverifiedPlaceholder(stableSeed);
      }

      const customData: Record<string, unknown> = {};
      if (nationalIdNorm.isValid) {
        customData["الرقم القومي"] = nationalIdNorm.nationalId;
      }
      if (targetSheetName) {
        customData["ورقة العمل"] = targetSheetName;
      }
      if (hasSyntheticPhone) {
        customData["_missingPhone"] = true;
        customData["_originalPhone"] = rawPhone;
        customData["_syntheticPhone"] = true;
        customData["_identityKind"] = identity.kind;
      }
      if (needsReview) {
        customData["_needsReview"] = true;
        customData["_reviewReason"] = reviewReason;
      }

      for (const [key, value] of Object.entries(item)) {
        if (!KNOWN_CUSTOMER_FIELDS.has(key) && value !== null && value !== undefined && value !== "") {
          customData[key] = value;
        }
      }

      validRows.push({
        rowNumber: rowNum,
        raw: item,
        name: rawName, // يُحفظ الاسم الأصلي؛ decideImportMatch يقوم بتطبيع الاسم للاعتقاد فقط
        phone: finalPhone,
        hasSyntheticPhone,
        phoneType: identity.kind === "PHONE" ? phoneNorm.type : "SYNTHETIC",
        phoneSuffix10: identity.kind === "PHONE" ? phoneNorm.phoneSuffix10 : "",
        identity,
        needsReview,
        reviewReason,
        nationalId: nationalIdNorm.isValid ? nationalIdNorm.nationalId : null,
        projectName: targetProjectName,
        buildingNumber: targetBuildingNumber,
        unitNumber: targetUnitNumber,
        unitSignature: unitSig,
        sheetName: targetSheetName,
        deliveryDate: dateNorm.isValid ? dateNorm.isoDate : (asText(item?.deliveryDate) || null),
        customData,
      });
    }

    if (!validRows.length) {
      return NextResponse.json(
        {
          error: "كل الصفوف المرسلة تفتقد الاسم أو تفتقد بيانات الاتصال والوحدة الصالحة",
          failed: customers.length,
          report: { invalidRows: invalidReport },
        },
        { status: 400 }
      );
    }

    // 2. المعاملة الآمنة مع قفل المعاملة والتحقق الذري من Idempotency
    let transactionResult: {
      insertedCount: number;
      duplicatesCount: number;
      failedCount: number;
      coOwnersCount: number;
      reviewCount: number;
      isIdempotentReplay?: boolean;
      report: {
        invalidRows: typeof invalidReport;
        duplicateRows: Array<{ row: number; name: string; phone: string; unit: string; reason: string }>;
        coOwnerRows: Array<{ row: number; name: string; unit: string }>;
        missingPhoneRows: Array<{ row: number; name: string; unit: string }>;
        reviewRows: Array<{ row: number; name: string; unit: string; reason: string }>;
      };
    } = {
      insertedCount: 0,
      duplicatesCount: 0,
      failedCount: invalidReport.length,
      coOwnersCount: 0,
      reviewCount: 0,
      report: {
        invalidRows: invalidReport,
        duplicateRows: [],
        coOwnerRows: [],
        missingPhoneRows: [],
        reviewRows: [],
      },
    };

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        transactionResult = await prisma.$transaction(
          async (tx) => {
            // أ. حجز قفل المعاملة لمنع تشغيل استيرادين متزامنين
            const lockRes = await tx.$queryRaw<Array<{ acquired: boolean }>>`
              SELECT pg_try_advisory_xact_lock(${IMPORT_LOCK_ID}) AS acquired;
            `;
            if (!lockRes[0]?.acquired) {
              throw new Error("CONCURRENT_IMPORT_LOCKED");
            }

            // ب. التحقق الذري من batchId داخل المعاملة بعد نيل القفل لمنع سباق الطلبات المتزامنة.
            // نستخدم entityId = "BATCH:<batchId>" لمطابقة تامة لا تحتمل تطابقاً جزئياً
            // أو التباساً بين معرّفين مختلفين.
            if (batchId) {
              const batchEntityId = `BATCH:${batchId}`;
              let existingAudit = await tx.auditLog.findFirst({
                where: {
                  userId: session.id,
                  action: "IMPORT",
                  entity: "Customer",
                  entityId: batchEntityId,
                },
                orderBy: { createdAt: "desc" },
              });

              if (existingAudit && existingAudit.details) {
                try {
                  const parsed = JSON.parse(existingAudit.details);

                  // فحص تطابق المحتوى: إذا استخدم نفس المعرف مع محتوى مختلف يُعاد خطأ صريح
                  if (parsed.fingerprint && parsed.fingerprint !== batchFingerprint) {
                    throw new Error("BATCH_ID_CONTENT_MISMATCH");
                  }

                  // إرجاع النتيجة المسجلة سابقاً بأمان
                  return {
                    insertedCount: parsed.inserted || 0,
                    duplicatesCount: parsed.duplicates || 0,
                    failedCount: parsed.failed || 0,
                    coOwnersCount: parsed.coOwners || 0,
                    reviewCount: parsed.review || 0,
                    isIdempotentReplay: true,
                    report: parsed.report || {
                      invalidRows: invalidReport,
                      duplicateRows: [],
                      coOwnerRows: [],
                      missingPhoneRows: [],
                      reviewRows: [],
                    },
                  };
                } catch (parseErr: any) {
                  if (parseErr.message === "BATCH_ID_CONTENT_MISMATCH") {
                    throw parseErr;
                  }
                  // إذا تعذّر قراءة تفاصيل الدفعة السابقة، نعاملها كـ "دفعة جديدة" لتجنب احتمال تكرار السجلات
                  existingAudit = null as unknown as typeof existingAudit;
                }
              }
            }

            // ج. حجز قفل تسلسل الأكواد المشترك لمنع التزامن مع الإضافة الفردية
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(${CUSTOMER_SEQUENCE_LOCK});`;

            // استخراج المقاطع العشرية للهواتف المحمولة المصرية
            const mobileSuffixes = [
              ...new Set(
                validRows
                  .filter((r) => r.phoneType === "EGYPTIAN_MOBILE")
                  .map((r) => r.phoneSuffix10)
              ),
            ];

            // استخراج الأرقام الدولية والأرضية الكاملة
            const exactPhones = [
              ...new Set(
                validRows
                  .filter((r) => r.phoneType === "INTERNATIONAL" || r.phoneType === "EGYPTIAN_LANDLINE")
                  .map((r) => r.phone)
              ),
            ];

            // استخراج الأرقام القومية للبحث
            const nationalIds = [
              ...new Set(validRows.filter((r) => Boolean(r.nationalId)).map((r) => r.nationalId!)),
            ];

            // مكوّنات الوحدات للبحث عن عملاء مسجلين على نفس الوحدة (حتى لو اختلف الهاتف/القومي)
            // لكشف الشراكة المحتملة. تُرشّح هنا ثم تُطبّق قواعد الهوية في decideImportMatch.
            const unitProjects = [
              ...new Set(validRows.map((r) => r.projectName).filter((v): v is string => Boolean(v))),
            ];
            const unitBuildings = [
              ...new Set(validRows.map((r) => r.buildingNumber).filter((v): v is string => Boolean(v))),
            ];
            const unitUnits = [
              ...new Set(validRows.map((r) => r.unitNumber).filter((v): v is string => Boolean(v))),
            ];

            // البحث في قاعدة البيانات عن العملاء المحتمل تطابقهم
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
              WHERE 
                (${mobileSuffixes.length} > 0 AND RIGHT(REGEXP_REPLACE(phone, '\D', '', 'g'), 10) = ANY(${mobileSuffixes}::text[]))
                OR (${exactPhones.length} > 0 AND phone = ANY(${exactPhones}::text[]))
                OR (${nationalIds.length} > 0 AND ("customData"->>'الرقم القومي' = ANY(${nationalIds}::text[]) OR "customData"->>'nationalId' = ANY(${nationalIds}::text[])))
                OR (${unitProjects.length} > 0 AND "projectName" = ANY(${unitProjects}::text[]))
                OR (${unitBuildings.length} > 0 AND "buildingNumber" = ANY(${unitBuildings}::text[]))
                OR (${unitUnits.length} > 0 AND "unitNumber" = ANY(${unitUnits}::text[]));
            `;

            const processedBatchKeys = new Set<string>();
            const dataToInsert: any[] = [];
            const duplicateRows: Array<{ row: number; name: string; phone: string; unit: string; reason: string }> = [];
            const coOwnerRows: Array<{ row: number; name: string; unit: string }> = [];
            const missingPhoneRows: Array<{ row: number; name: string; unit: string }> = [];
            const reviewRows: Array<{ row: number; name: string; unit: string; reason: string }> = [];
            let duplicatesCount = 0;
            let coOwnersCount = 0;
            let reviewCount = 0;

            for (const row of validRows) {
              if (row.hasSyntheticPhone) {
                missingPhoneRows.push({
                  row: row.rowNumber,
                  name: row.name,
                  unit: row.unitSignature,
                });
              }

              // فحص التطابق مع قاعدة البيانات (مُرشَّح بالهاتف/القومي/الوحدة، ثم تُطبّق قواعد الهوية).
              // نُطبّق decideImportMatch بعد الجلب، ولا نستخدم الوحدة كدليل هوية.
              const matchedInDb = existingCustomers.filter((ex) => {
                const exUnitSig = getUnitSignature(
                  ex.projectName || "",
                  ex.buildingNumber || "",
                  ex.unitNumber || ""
                );
                const exCustomData =
                  ex.customData && typeof ex.customData === "object" && !Array.isArray(ex.customData)
                    ? (ex.customData as Record<string, unknown>)
                    : {};
                const exNationalId = exCustomData["الرقم القومي"] ?? exCustomData.nationalId;

                const phoneMatches = !row.hasSyntheticPhone && isSamePhone(ex.phone, row.phone);
                const nationalIdMatches =
                  Boolean(row.nationalId) &&
                  Boolean(exNationalId) &&
                  row.nationalId === String(exNationalId);
                const unitMatches =
                  row.unitSignature !== "NO_UNIT" && exUnitSig === row.unitSignature;

                return phoneMatches || nationalIdMatches || unitMatches;
              });

              // تجميع أقوى قرار متاح: DUPLICATE > CO_OWNER > INSERT_REVIEW > INSERT.
              let hasDuplicate = false;
              let hasCoOwner = false;
              let hasReview = false;
              let duplicateReason = "";
              let coOwnerReason = "";
              let coOwnerWithName = "";
              let reviewReason = "";

              for (const ex of matchedInDb) {
                const exUnitSig = getUnitSignature(
                  ex.projectName || "",
                  ex.buildingNumber || "",
                  ex.unitNumber || ""
                );
                const exCustomData =
                  ex.customData && typeof ex.customData === "object" && !Array.isArray(ex.customData)
                    ? (ex.customData as Record<string, unknown>)
                    : {};
                const exNationalId = exCustomData["الرقم القومي"] ?? exCustomData.nationalId;

                const decision = decideImportMatch({
                  rowName: row.name,
                  rowNationalId: row.nationalId,
                  rowIdentity: row.identity,
                  exName: ex.name,
                  exNationalId: exNationalId ? String(exNationalId) : null,
                  unitMatches: row.unitSignature !== "NO_UNIT" && exUnitSig === row.unitSignature,
                  bothNoUnit: row.unitSignature === "NO_UNIT" && exUnitSig === "NO_UNIT",
                  phoneMatches: !row.hasSyntheticPhone && isSamePhone(ex.phone, row.phone),
                  nationalIdMatches:
                    Boolean(row.nationalId) &&
                    Boolean(exNationalId) &&
                    row.nationalId === String(exNationalId),
                });

                if (decision.action === "DUPLICATE") {
                  hasDuplicate = true;
                  duplicateReason = `مسجل مسبقاً (${decision.reason})`;
                  break;
                }
                if (decision.action === "CO_OWNER") {
                  hasCoOwner = true;
                  coOwnerReason = decision.reason;
                  coOwnerWithName = ex.name;
                }
                if (decision.action === "INSERT_REVIEW") {
                  hasReview = true;
                  reviewReason = decision.reason;
                }
              }

              const finalAction: ImportMatchAction = hasDuplicate
                ? "DUPLICATE"
                : hasCoOwner
                  ? "CO_OWNER"
                  : hasReview
                    ? "INSERT_REVIEW"
                    : "INSERT";

              // فحص التكرار داخل نفس ملف الاستيراد وأوراقه المختلفة.
              // لا نطبّق هذا الدمج على السجلات غير الموثوقة (UNVERIFIED) إطلاقاً.
              const canBatchDedup = row.identity.kind !== "UNVERIFIED";
              const batchKey = `${row.identity.kind}:${row.identity.value ?? ""}|${row.unitSignature}`;

              if (finalAction === "DUPLICATE") {
                duplicatesCount++;
                duplicateRows.push({
                  row: row.rowNumber,
                  name: row.name,
                  phone: row.phone,
                  unit: row.unitSignature,
                  reason: duplicateReason,
                });
                continue;
              }

              if (finalAction !== "CO_OWNER" && canBatchDedup && processedBatchKeys.has(batchKey)) {
                duplicatesCount++;
                duplicateRows.push({
                  row: row.rowNumber,
                  name: row.name,
                  phone: row.phone,
                  unit: row.unitSignature,
                  reason: "مكرر داخل نفس ملف الاستيراد أو بين أوراق العمل",
                });
                continue;
              }

              if (finalAction === "CO_OWNER") {
                coOwnersCount++;
                coOwnerRows.push({
                  row: row.rowNumber,
                  name: row.name,
                  unit: row.unitSignature,
                });
                row.customData["_coOwnerOfUnit"] = row.unitSignature;
                row.customData["_coOwnerWithName"] = coOwnerWithName || null;
                row.customData["_coOwnerReason"] = coOwnerReason;
              }

              if (finalAction === "INSERT_REVIEW") {
                reviewCount++;
                reviewRows.push({
                  row: row.rowNumber,
                  name: row.name,
                  unit: row.unitSignature,
                  reason: reviewReason || "هوية غير كافية للتمييز؛ يحتاج مراجعة",
                });
                row.customData["_needsReview"] = true;
                row.customData["_reviewReason"] =
                  reviewReason || "هوية غير كافية للتمييز؛ يحتاج مراجعة";
              }

              if (canBatchDedup) {
                processedBatchKeys.add(batchKey);
              }

              dataToInsert.push({
                name: row.name,
                phone: row.phone,
                email: asText(row.raw.email) || null,
                type: asText(row.raw.type) || defaultType,
                status: asText(row.raw.status) || defaultStatus,
                projectId: asText(row.raw.projectId) || projectId,
                projectName: row.projectName,
                unitNumber: row.unitNumber,
                buildingNumber: row.buildingNumber,
                zoneNumber: asText(row.raw.zoneNumber) || null,
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
                remainingInstallments: normalizeNumber(row.raw.remainingInstallments) ?? 0,
                installmentDuration:
                  normalizeNumber(row.raw.installmentDuration) !== null
                    ? Math.floor(normalizeNumber(row.raw.installmentDuration)!)
                    : null,
                budgetMin: normalizeNumber(row.raw.budgetMin) ?? 0,
                budgetMax: normalizeNumber(row.raw.budgetMax) ?? 0,
                preferredZone: asText(row.raw.preferredZone) || null,
                preferredSize: normalizeNumber(row.raw.preferredSize) ?? 0,
                customerType: asText(row.raw.customerType) || null,
                pipelineStage: asText(row.raw.pipelineStage) || null,
                unitStatus: asText(row.raw.unitStatus) || null,
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
                source: asText(row.raw.source) || (row.sheetName ? `استيراد Excel (${row.sheetName})` : "استيراد Excel"),
                leadScore: Math.floor(normalizeNumber(row.raw.leadScore) ?? 3),
              });
            }

            // حتى وإن كانت كافة الصفوف مكررة أو غير صالحة، نسجل نتيجة الدفعة لمنع إعادة المعالجة
            if (!dataToInsert.length) {
              if (batchId) {
                await tx.auditLog.create({
                  data: {
                    userId: session.id,
                    action: "IMPORT",
                    entity: "Customer",
                    entityId: batchId ? `BATCH:${batchId}` : (projectId || "BULK"),
                    details: JSON.stringify({
                      batchId,
                      fingerprint: batchFingerprint,
                      defaultType,
                      totalBatchRows: customers.length,
                      inserted: 0,
                      duplicates: duplicatesCount,
                      failed: invalidReport.length,
                      coOwners: coOwnersCount,
                      review: reviewCount,
                      report: {
                        invalidRows: invalidReport,
                        duplicateRows,
                        coOwnerRows,
                        missingPhoneRows,
                        reviewRows,
                      },
                      timestamp: new Date().toISOString(),
                    }),
                  },
                });
              }

              return {
                insertedCount: 0,
                duplicatesCount,
                failedCount: invalidReport.length,
                coOwnersCount,
                reviewCount,
                report: {
                  invalidRows: invalidReport,
                  duplicateRows,
                  coOwnerRows,
                  missingPhoneRows,
                  reviewRows,
                },
              };
            }

            // توليد كود العميل المتسلسل الآمن
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

            // تسجيل العملية في AuditLog داخل نفس المعاملة ذرياً
            await tx.auditLog.create({
              data: {
                userId: session.id,
                action: "IMPORT",
                entity: "Customer",
                entityId: batchId ? `BATCH:${batchId}` : (projectId || "BULK"),
                details: JSON.stringify({
                  batchId,
                  fingerprint: batchFingerprint,
                  defaultType,
                  totalBatchRows: customers.length,
                  inserted: created.count,
                  duplicates: duplicatesCount,
                  failed: invalidReport.length,
                  coOwners: coOwnersCount,
                  review: reviewCount,
                  report: {
                    invalidRows: invalidReport,
                    duplicateRows,
                    coOwnerRows,
                    missingPhoneRows,
                    reviewRows,
                  },
                  timestamp: new Date().toISOString(),
                }),
              },
            });

            return {
              insertedCount: created.count,
              duplicatesCount,
              failedCount: invalidReport.length,
              coOwnersCount,
              reviewCount,
              report: {
                invalidRows: invalidReport,
                duplicateRows,
                coOwnerRows,
                missingPhoneRows,
                reviewRows,
              },
            };
          },
          {
            maxWait: 5000,
            timeout: 30000,
          }
        );

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
      coOwners: transactionResult.coOwnersCount,
      review: transactionResult.reviewCount,
      idempotent: Boolean(transactionResult.isIdempotentReplay),
      report: transactionResult.report,
    });
  } catch (error: any) {
    if (error?.message === "CONCURRENT_IMPORT_LOCKED") {
      return NextResponse.json(
        { error: "هناك عملية استيراد أخرى قيد التنفيذ حالياً. يرجى الانتظار ثوانٍ لمنع تكرار السجلات." },
        { status: 409 }
      );
    }
    if (error?.message === "BATCH_ID_CONTENT_MISMATCH") {
      return NextResponse.json(
        {
          error: "تعارض في معرف الدفعة: تم استخدام نفس batchId مسبقاً مع بيانات أو محتوى مختلف.",
          code: "BATCH_ID_CONTENT_MISMATCH",
        },
        { status: 409 }
      );
    }
    console.error("Import Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء استيراد البيانات" }, { status: 500 });
  }
}
