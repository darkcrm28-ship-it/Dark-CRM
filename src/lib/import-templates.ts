/**
 * src/lib/import-templates.ts
 * محرك إدارة وقوالب ربط الأعمدة لنظام استيراد Excel الذكي
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

const LOCAL_STORAGE_KEY = "dark_crm_import_templates_v2";

/**
 * استرجاع كافة القوالب (المدمجة + المحفوظة محلياً)
 */
export function getSavedTemplates(): MappingTemplate[] {
  if (typeof window === "undefined") return BUILTIN_TEMPLATES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const custom: MappingTemplate[] = raw ? JSON.parse(raw) : [];
    return [...BUILTIN_TEMPLATES, ...custom];
  } catch (err) {
    console.error("Failed to load custom templates from localStorage:", err);
    return BUILTIN_TEMPLATES;
  }
}

/**
 * حفظ قالب جديد في localStorage
 */
export function saveCustomTemplate(template: Omit<MappingTemplate, "id" | "createdAt" | "scope">): MappingTemplate {
  const newTemplate: MappingTemplate = {
    ...template,
    id: `custom_tpl_${Date.now()}`,
    scope: "LOCAL",
    createdAt: new Date().toISOString().split("T")[0]
  };

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const custom: MappingTemplate[] = raw ? JSON.parse(raw) : [];
      custom.push(newTemplate);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(custom));
    } catch (err) {
      console.error("Failed to save template to localStorage:", err);
    }
  }

  return newTemplate;
}

/**
 * حذف قالب مخصص
 */
export function deleteCustomTemplate(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    const custom: MappingTemplate[] = JSON.parse(raw);
    const filtered = custom.filter(t => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to delete template:", err);
  }
}

/**
 * اقتراح القالب الأكثر مطابقة لأعمدة الملف المرفوع
 */
export function suggestMatchingTemplate(sourceHeaders: string[]): { template: MappingTemplate; confidence: number } | null {
  if (!sourceHeaders || sourceHeaders.length === 0) return null;

  const normalize = (h: string) => String(h || "").toLowerCase().replace(/[\s_\-()]+/g, "").trim();
  const normalizedSource = new Set(sourceHeaders.map(normalize));

  const allTemplates = getSavedTemplates();
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
