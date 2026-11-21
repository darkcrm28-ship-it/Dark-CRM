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
