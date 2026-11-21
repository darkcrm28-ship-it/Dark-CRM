/**
 * src/lib/import-templates.ts
 * محرك إدارة وقوالب ربط الأعمدة لنظام استيراد Excel الذكي
 * مؤمن بالكامل ضد تسريب وتخزين بيانات العملاء الحساسة في localStorage
 * مع تنظيف وتحديث التخزين المحلي التلقائي عند القراءة أو الحفظ
 */

export interface MappingTemplate {
  id: string;
  name: string;
  description?: string;
  scope: "GLOBAL" | "LOCAL";
  defaultType?: "SELLER" | "BUYER" | "LEAD";
  defaultStatus?: string;
  matchHeaders: string[];
  mapping: Record<string, string>;
  createdAt: string;
}

// قائمة الحقول المستهدفة المعتمدة والمسموح بها حصرياً في CRM
export const ALLOWED_CRM_TARGET_FIELDS = new Set([
  "name",
  "phone",
  "email",
  "nationalId",
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
  "customData",
  "__CUSTOM__",
]);

// القوالب الافتراضية المضمنة للشركات العقارية الكبرى
export const BUILTIN_TEMPLATES: MappingTemplate[] = [
  {
    id: "builtin_dark_crm_std",
    name: "نموذج Dark CRM القياسي",
    description: "النموذج الافتراضي المعتمد لتنزيل وملء بيانات العملاء",
    scope: "GLOBAL",
    defaultType: "SELLER",
    defaultStatus: "POTENTIAL_SELLER",
    matchHeaders: ["الاسم", "رقم الهاتف", "الرقم القومي", "رقم الوحدة", "رقم العمارة", "المشروع", "المنطقة", "الدور", "تاريخ استلام الوحدة"],
    mapping: {
      "الاسم": "name",
      "رقم الهاتف": "phone",
      "الرقم القومي": "nationalId",
      "رقم الوحدة": "unitNumber",
      "رقم العمارة": "buildingNumber",
      "المشروع": "projectName",
      "المنطقة": "area",
      "الدور": "floor",
      "تاريخ استلام الوحدة": "deliveryDate"
    },
    createdAt: "2026-01-01"
  },
  {
    id: "builtin_talaat_moustafa",
    name: "قالب مجموعة طلعت مصطفى (مدينتي / نور / سيليا)",
    description: "مطابقة أعمدة كشوفات حجز ومبيعات مشاريع طلعت مصطفى",
    scope: "GLOBAL",
    defaultType: "SELLER",
    defaultStatus: "POTENTIAL_SELLER",
    matchHeaders: ["اسم العميل بالكامل", "الموبايل", "الرقم القومي", "كود الوحده", "العمارة", "المجموعة", "المشروع"],
    mapping: {
      "اسم العميل بالكامل": "name",
      "اسم العميل": "name",
      "الموبايل": "phone",
      "تليفون العميل": "phone",
      "الرقم القومي": "nationalId",
      "كود الوحده": "unitNumber",
      "رقم الشقة": "unitNumber",
      "العمارة": "buildingNumber",
      "المجموعة": "zoneNumber",
      "المشروع": "projectName",
      "تاريخ التعاقد": "deliveryDate"
    },
    createdAt: "2026-01-01"
  },
  {
    id: "builtin_emaar_misr",
    name: "قالب إعمار مصر (Emaar Misr)",
    description: "مطابقة ملفات عملاء مراسي، ميفيدا، وأبتاون كايرو",
    scope: "GLOBAL",
    defaultType: "SELLER",
    defaultStatus: "POTENTIAL_SELLER",
    matchHeaders: ["Customer Name", "Mobile Number", "National ID", "Unit No", "Building", "Project", "Phase"],
    mapping: {
      "Customer Name": "name",
      "Mobile Number": "phone",
      "Phone": "phone",
      "National ID": "nationalId",
      "Unit No": "unitNumber",
      "Unit": "unitNumber",
      "Building": "buildingNumber",
      "Project": "projectName",
      "Compound": "projectName",
      "Handover Date": "deliveryDate",
      "Price": "askingPrice"
    },
    createdAt: "2026-01-01"
  },
  {
    id: "builtin_palm_hills",
    name: "قالب بالم هيلز (Palm Hills)",
    description: "مطابقة كشوفات ملاك ومشتري مشاريع بالم هيلز وبادية",
    scope: "GLOBAL",
    defaultType: "SELLER",
    defaultStatus: "POTENTIAL_SELLER",
    matchHeaders: ["اسم المالك", "رقم التليفون", "كود الوحدة", "المبنى", "الكمبوند", "المساحة", "السعر الإجمالي"],
    mapping: {
      "اسم المالك": "name",
      "رقم التليفون": "phone",
      "كود الوحدة": "unitNumber",
      "المبنى": "buildingNumber",
      "الكمبوند": "projectName",
      "المساحة": "unitSize",
      "السعر الإجمالي": "askingPrice",
      "النوع": "propertyType"
    },
    createdAt: "2026-01-01"
  }
];

export const LOCAL_STORAGE_KEY = "dark_crm_import_templates_v2";

/**
 * تنقية وتطهير كائن القالب لضمان عدم حفظ أي بيانات عملاء حساسة أو صفوف أو أرقام هواتف
 * مع قصر الخريطة mapping على الحقول المستهدفة المصرح بها فقط في CRM
 */
export function sanitizeTemplate(template: unknown): MappingTemplate | null {
  if (!template || typeof template !== "object") return null;
  const raw = template as Record<string, any>;

  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `custom_tpl_${Date.now()}`;
  const name = typeof raw.name === "string" ? raw.name.slice(0, 100).trim() : "قالب مخصص";
  const description = typeof raw.description === "string" ? raw.description.slice(0, 250).trim() : undefined;
  const defaultType = ["SELLER", "BUYER", "LEAD"].includes(raw.defaultType) ? raw.defaultType : "SELLER";
  const defaultStatus = typeof raw.defaultStatus === "string" ? raw.defaultStatus.slice(0, 50).trim() : "POTENTIAL_SELLER";

  // تصفية العناوين (matchHeaders): نصوص فقط وبحد أقصى 50 عنواناً
  const matchHeaders: string[] = Array.isArray(raw.matchHeaders)
    ? raw.matchHeaders
        .filter((h: unknown) => typeof h === "string" && h.trim())
        .map((h: string) => h.slice(0, 100).trim())
        .slice(0, 50)
    : [];

  // تصفية الخريطة (mapping): نصوص فقط مقيدة بحقول CRM المسموح بها حصرياً
  const mapping: Record<string, string> = {};
  if (raw.mapping && typeof raw.mapping === "object" && !Array.isArray(raw.mapping)) {
    let count = 0;
    for (const [k, v] of Object.entries(raw.mapping)) {
      if (count >= 60) break;
      if (typeof k === "string" && typeof v === "string") {
        const cleanTarget = v.trim();
        // قصر الربط فقط على حقول CRM المصرح بها
        if (ALLOWED_CRM_TARGET_FIELDS.has(cleanTarget)) {
          mapping[k.slice(0, 100).trim()] = cleanTarget;
          count++;
        }
      }
    }
  }

  return {
    id,
    name,
    description,
    scope: "LOCAL",
    defaultType,
    defaultStatus,
    matchHeaders,
    mapping,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString().split("T")[0]
  };
}

/**
 * تنقية مجموعة قوالب وتحديث التخزين المحلي إذا كانت هناك بيانات قديمة غير منقحة
 */
export function sanitizeAndPersistTemplates(
  rawList: unknown[],
  storage: Storage | { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }
): MappingTemplate[] {
  const sanitizedList: MappingTemplate[] = [];
  for (const item of rawList) {
    const sanitized = sanitizeTemplate(item);
    if (sanitized) sanitizedList.push(sanitized);
  }

  try {
    const newJson = JSON.stringify(sanitizedList);
    storage.setItem(LOCAL_STORAGE_KEY, newJson);
  } catch (err) {
    console.error("Failed to persist sanitized templates:", err);
  }

  return sanitizedList;
}

/**
 * استرجاع كافة القوالب (المدمجة + المحفوظة محلياً)
 * مع فحص القوالب القديمة المخزنة وتنظيفها فوراً وإعادة كتابة النسخة المنقحة في localStorage
 */
export function getSavedTemplates(customStorage?: Storage): MappingTemplate[] {
  const activeStorage = customStorage || (typeof window !== "undefined" ? window.localStorage : null);
  if (!activeStorage) return BUILTIN_TEMPLATES;

  try {
    const raw = activeStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return BUILTIN_TEMPLATES;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return BUILTIN_TEMPLATES;

    // تنقية القوالب القديمة
    const sanitizedCustom = sanitizeAndPersistTemplates(parsed, activeStorage);
    return [...BUILTIN_TEMPLATES, ...sanitizedCustom];
  } catch (err) {
    console.error("Failed to load and sanitize templates from localStorage:", err);
    return BUILTIN_TEMPLATES;
  }
}

/**
 * حفظ قالب جديد في localStorage مع تنقية جميع القوالب القديمة والجديدة معاً قبل الحفظ
 */
export function saveCustomTemplate(
  template: Omit<MappingTemplate, "id" | "createdAt" | "scope">,
  customStorage?: Storage
): MappingTemplate {
  const activeStorage = customStorage || (typeof window !== "undefined" ? window.localStorage : null);
  const sanitized = sanitizeTemplate(template);
  if (!sanitized) {
    throw new Error("قالب غير صالح للحفظ");
  }

  if (activeStorage) {
    try {
      const raw = activeStorage.getItem(LOCAL_STORAGE_KEY);
      const existingRaw = raw ? JSON.parse(raw) : [];
      const safeExisting: MappingTemplate[] = Array.isArray(existingRaw)
        ? existingRaw.map(sanitizeTemplate).filter((t): t is MappingTemplate => t !== null)
        : [];

      // منع التكرار بناءً على الاسم أو المعرف
      const filtered = safeExisting.filter(t => t.id !== sanitized.id && t.name !== sanitized.name);
      filtered.push(sanitized);

      activeStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error("Failed to save template to localStorage:", err);
    }
  }

  return sanitized;
}

/**
 * حذف قالب مخصص مع ضمان تنقية وتحديث ما تبقى في التخزين
 */
export function deleteCustomTemplate(id: string, customStorage?: Storage): void {
  const activeStorage = customStorage || (typeof window !== "undefined" ? window.localStorage : null);
  if (!activeStorage) return;

  try {
    const raw = activeStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const safeExisting = parsed.map(sanitizeTemplate).filter((t): t is MappingTemplate => t !== null);
    const filtered = safeExisting.filter(t => t.id !== id);
    activeStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to delete template:", err);
  }
}

/**
 * اقتراح القالب الأكثر مطابقة لأعمدة الملف المرفوع
 */
export function suggestMatchingTemplate(
  sourceHeaders: string[],
  customStorage?: Storage
): { template: MappingTemplate; confidence: number } | null {
  if (!sourceHeaders || sourceHeaders.length === 0) return null;

  const normalize = (h: string) => String(h || "").toLowerCase().replace(/[\s_\-()]+/g, "").trim();
  const normalizedSource = new Set(sourceHeaders.map(normalize));

  const allTemplates = getSavedTemplates(customStorage);
  let bestMatch: { template: MappingTemplate; confidence: number } | null = null;

  for (const tpl of allTemplates) {
    if (!tpl.matchHeaders || tpl.matchHeaders.length === 0) continue;
    let matchCount = 0;
    for (const h of tpl.matchHeaders) {
      if (normalizedSource.has(normalize(h))) {
        matchCount++;
      }
    }
    const confidence = Math.round((matchCount / tpl.matchHeaders.length) * 100);
    if (confidence >= 60) {
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { template: tpl, confidence };
      }
    }
  }

  return bestMatch;
}

// ─── القاموس الذكي للتعرف على الأعمدة بالعربية والإنجليزية ───────────────────────
const COLUMN_ALIAS_PATTERNS: Array<{ target: string; patterns: RegExp[] }> = [
  {
    target: "name",
    patterns: [
      /^(الاسم|اسم\s*العميل|اسم\s*المالك|العميل|المالك|اسم\s*المشتري|المشتري|الاسم\s*بالكامل|الاسم\s*رباعي|اسم\s*صاحب\s*الشأن)$/i,
      /^(name|full\s*name|client\s*name|customer\s*name|owner\s*name|buyer\s*name|customer)$/i,
    ],
  },
  {
    target: "phone",
    patterns: [
      /^(رقم\s*الهاتف|الهاتف|رقم\s*الموبايل|الموبايل|المحمول|تليفون|رقم\s*التليفون|الجوال|رقم\s*الجوال|هاتف\s*العميل|موبايل\s*العميل|اتصال)$/i,
      /^(phone|mobile|cell|cellphone|telephone|phone\s*number|mobile\s*number|contact\s*no|contact)$/i,
    ],
  },
  {
    target: "nationalId",
    patterns: [
      /^(الرقم\s*القومي|القومي|رقم\s*البطاقة|بطاقة\s*الرقم\s*القومي|رقم\s*الهوية|الهوية\s*الوطنية|الهوية)$/i,
      /^(national\s*id|nid|id\s*number|ssn|national\s*number|civil\s*id)$/i,
    ],
  },
  {
    target: "email",
    patterns: [
      /^(البريد|البريد\s*الإلكتروني|البريد\s*الالكتروني|الإيميل|الايميل)$/i,
      /^(email|e-mail|mail)$/i,
    ],
  },
  {
    target: "type",
    patterns: [
      /^(نوع\s*العميل|تصنيف\s*العميل|صفة\s*العميل|بائع\s*\/\s*مشتري)$/i,
      /^(customer\s*type|client\s*type|lead\s*type|category)$/i,
    ],
  },
  {
    target: "status",
    patterns: [
      /^(حالة\s*العميل|الحالة|مرحلة\s*العميل)$/i,
      /^(status|customer\s*status|lead\s*status)$/i,
    ],
  },
  {
    target: "projectName",
    patterns: [
      /^(المشروع|اسم\s*المشروع|الكمبوند|اسم\s*الكمبوند|القرية|اسم\s*القرية|المنتجع)$/i,
      /^(project|compound|project\s*name|development)$/i,
    ],
  },
  {
    target: "unitNumber",
    patterns: [
      /^(رقم\s*الوحدة|الوحدة|كود\s*الوحدة|رقم\s*الشقة|الشقة|رقم\s*الفيلا|كود\s*الشقة)$/i,
      /^(unit\s*no|unit\s*number|unit|flat\s*no|apartment\s*no|apt\s*no|flat)$/i,
    ],
  },
  {
    target: "buildingNumber",
    patterns: [
      /^(رقم\s*العمارة|العمارة|رقم\s*المبنى|المبنى|البلوك|رقم\s*البلوك|المجموعة|العمارة\s*رقم)$/i,
      /^(building\s*no|building\s*number|building|bldg\s*no|bldg|block|block\s*no)$/i,
    ],
  },
  {
    target: "zoneNumber",
    patterns: [
      /^(الزون|المرحلة|القطاع|المجموعة\s*السكنية|الحي\s*السكني)$/i,
      /^(zone|phase|sector|cluster)$/i,
    ],
  },
  {
    target: "floor",
    patterns: [
      /^(الدور|الطابق|رقم\s*الدور)$/i,
      /^(floor|level|floor\s*no)$/i,
    ],
  },
  {
    target: "area",
    patterns: [
      /^(المنطقة|الحي|الموقع|المدينة|المحافظة)$/i,
      /^(area|district|location|neighborhood|city)$/i,
    ],
  },
  {
    target: "propertyType",
    patterns: [
      /^(نوع\s*العقار|نوع\s*الوحدة|تصنيف\s*الوحدة|نوع\s*العقار\s*المطلوب)$/i,
      /^(property\s*type|unit\s*type|type\s*of\s*property)$/i,
    ],
  },
  {
    target: "unitSize",
    patterns: [
      /^(المساحة|مساحة\s*الوحدة|المساحة\s*بالمتر|المتر|المساحة\s*م٢|المساحة\s*م2)$/i,
      /^(unit\s*size|size|area\s*sqm|bua|area\s*m2)$/i,
    ],
  },
  {
    target: "bedrooms",
    patterns: [
      /^(عدد\s*الغرف|الغرف|غرف\s*النوم|عدد\s*غرف\s*النوم)$/i,
      /^(bedrooms|beds|rooms|bedroom\s*count)$/i,
    ],
  },
  {
    target: "bathrooms",
    patterns: [
      /^(عدد\s*الحمامات|الحمامات|حمامات)$/i,
      /^(bathrooms|baths|bathroom\s*count)$/i,
    ],
  },
  {
    target: "finishing",
    patterns: [
      /^(التشطيب|حالة\s*التشطيب|نوع\s*التشطيب)$/i,
      /^(finishing|finishing\s*status|fit\s*out)$/i,
    ],
  },
  {
    target: "askingPrice",
    patterns: [
      /^(السعر|السعر\s*المطلوب|السعر\s*الإجمالي|السعر\s*الجمالي|المبلغ|إجمالي\s*السعر|سعر\s*الوحدة|القيمة)$/i,
      /^(price|asking\s*price|total\s*price|cost|amount)$/i,
    ],
  },
  {
    target: "installmentAmount",
    patterns: [
      /^(قيمة\s*القسط|مبلغ\s*القسط|القسط|القسط\s*الشهري|القسط\s*الربع\s*سنوي)$/i,
      /^(installment\s*amount|installment|monthly\s*installment)$/i,
    ],
  },
  {
    target: "installmentRemaining",
    patterns: [
      /^(الأقساط\s*المتبقية|الاقساط\s*المتبقية|عدد\s*الأقساط\s*المتبقية|المتبقي\s*أقساط)$/i,
      /^(remaining\s*installments|installments\s*left)$/i,
    ],
  },
  {
    target: "installmentDetails",
    patterns: [
      /^(نظام\s*السداد|تفاصيل\s*الأقساط|تفاصيل\s*السداد|طريقة\s*الدفع|تسهيلات)$/i,
      /^(payment\s*plan|installment\s*details|payment\s*terms)$/i,
    ],
  },
  {
    target: "deliveryDate",
    patterns: [
      /^(تاريخ\s*الاستلام|ميعاد\s*التسليم|تاريخ\s*التسليم|الاستلام|تاريخ\s*التعاقد)$/i,
      /^(delivery\s*date|handover\s*date|delivery|handover)$/i,
    ],
  },
  {
    target: "executingCompany",
    patterns: [
      /^(الشركة\s*المنفذة|الشركة\s*المطورة|المطور|اسم\s*الشركة|الشركة)$/i,
      /^(developer|company|executing\s*company)$/i,
    ],
  },
  {
    target: "paperworkStatus",
    patterns: [
      /^(حالة\s*الأوراق|موقف\s*الأوراق|حالة\s*العقد|المستندات|التسجيل\s*العقاري)$/i,
      /^(paperwork\s*status|legal\s*status|documents)$/i,
    ],
  },
  {
    target: "source",
    patterns: [
      /^(المصدر|مصدر\s*العميل|قناة\s*الوصول|حملة\s*إعلانية)$/i,
      /^(source|lead\s*source|channel)$/i,
    ],
  },
];

/**
 * الكشف التلقائي الذكي عن مطابقة الأعمدة بناءً على العناوين
 */
export function autoDetectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedTargets = new Set<string>();

  for (const rawHeader of headers) {
    const cleanHeader = String(rawHeader || "").trim();
    if (!cleanHeader) continue;

    let matchedTarget: string | null = null;
    for (const { target, patterns } of COLUMN_ALIAS_PATTERNS) {
      if (usedTargets.has(target)) continue; // لا نربط عمودين بنفس الحقل تلقائياً
      const isMatch = patterns.some((p) => p.test(cleanHeader));
      if (isMatch) {
        matchedTarget = target;
        break;
      }
    }

    if (matchedTarget) {
      mapping[rawHeader] = matchedTarget;
      usedTargets.add(matchedTarget);
    } else {
      mapping[rawHeader] = "__CUSTOM__";
    }
  }

  return mapping;
}

/**
 * تصدير القوالب المخصصة بصيغة JSON آمنة ومطهرة
 */
export function exportTemplatesAsJson(customStorage?: Storage): string {
  const templates = getSavedTemplates(customStorage).filter((t) => t.scope === "LOCAL");
  return JSON.stringify(
    {
      version: "1.0",
      system: "Dark CRM",
      exportedAt: new Date().toISOString(),
      templates,
    },
    null,
    2
  );
}

/**
 * استيراد قوالب مخصصة من ملف JSON مع التطهير والتحقق
 */
export function importTemplatesFromJson(
  jsonString: string,
  customStorage?: Storage
): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const rawTemplates = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.templates)
        ? parsed.templates
        : null;

    if (!rawTemplates || !rawTemplates.length) {
      return { success: false, count: 0, error: "الملف لا يحتوي على قوالب صالحة" };
    }

    let importedCount = 0;
    for (const raw of rawTemplates) {
      try {
        const sanitized = sanitizeTemplate(raw);
        if (sanitized && sanitized.name) {
          saveCustomTemplate(
            {
              name: sanitized.name,
              description: sanitized.description,
              defaultType: sanitized.defaultType,
              defaultStatus: sanitized.defaultStatus,
              matchHeaders: sanitized.matchHeaders,
              mapping: sanitized.mapping,
            },
            customStorage
          );
          importedCount++;
        }
      } catch {
        // Continue with next template
      }
    }

    return { success: true, count: importedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || "تعذر قراءة ملف JSON" };
  }
}
