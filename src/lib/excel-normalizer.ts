/**
 * src/lib/excel-normalizer.ts
 * محرك معيارية وتنظيف بيانات Excel لمشروع Dark CRM
 * محدث بالكامل لدعم:
 * 1. الهواتف المصرية المحمولة والأرضية والدولية (دول الخليج والعالم)
 * 2. مطابقة الهواتف بدون ثغرة endsWith
 * 3. التواريخ المتعددة الصيغ والسيريال وأختام الوقت وتعيين المناطق الزمنية
 * 4. الأرقام ذات الفواصل العشرية والآلاف العربية والإنجليزية
 * 5. التوقيع المعياري للوحدات وتمييز تعدد الوحدات وتعدد الملاك
 * 6. توليد مستقر للهواتف التركيبية (Stable Synthetic Phone)
 */

import { createHash } from "crypto";

// 1. خريطة تحويل الأرقام العربية والهندية والفارسية إلى أرقام إنجليزية (ASCII 0-9)
const DIGIT_MAP: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

/**
 * تحويل أي نص يحتوي على أرقام عربية أو هندية إلى أرقام لاتينية معيارية
 */
export function convertArabicIndicDigits(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[٠-٩۰-۹]/g, (d) => DIGIT_MAP[d] ?? d);
}

/**
 * تنظيف وتوحيد النصوص العربية وإزالة التشكيل والمسافات الزائدة والمحارف غير المرئية
 */
export function normalizeArabicText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return convertArabicIndicDigits(value)
    // إزالة المحارف غير المرئية ورموز التحكم (Zero-width chars & BOM)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    // إزالة التشكيل والتطويل (ـ)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    // توحيد الهمزات والألف والياء والتاء المربوطة
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    // دمج المسافات البيضاء والسطور المتعددة في مسافة واحدة
    .replace(/\s+/g, " ");
}

export type PhoneType = "EGYPTIAN_MOBILE" | "EGYPTIAN_LANDLINE" | "INTERNATIONAL" | "UNKNOWN";

export interface PhoneNormalizationResult {
  isValid: boolean;
  phone: string;
  original: string;
  type: PhoneType;
  countryCode?: string;
  phoneSuffix10: string;
  error?: string;
}

// أكواد محافظات الخطوط الأرضية المصرية (مفاتيح المحافظات)
const EGYPTIAN_LANDLINE_AREA_CODES = [
  "02",  // القاهرة والجيزة والقليوبية
  "03",  // الإسكندرية
  "013", // بنها
  "040", // طنطا
  "045", // دمنهور
  "046", // مطروح
  "047", // كفر الشيخ
  "048", // المنوفية (شبين الكوم)
  "050", // المنصورة والدقهلية
  "055", // الزقازيق والشرقية
  "057", // دمياط
  "062", // السويس
  "064", // الإسماعيلية
  "065", // البحر الأحمر (الغردقة)
  "066", // بورسعيد
  "068", // شمال سيناء (العريش)
  "069", // جنوب سيناء (شرم الشيخ / الطور)
  "082", // بني سويف
  "084", // الفيوم
  "086", // المنيا
  "088", // أسيوط
  "092", // الوادي الجديد
  "093", // سوهاج
  "095", // الأقصر
  "096", // قنا
  "097", // أسوان
];

/**
 * محرك تطبيع وفحص أرقام الهواتف الشامل:
 * - المحمول المصري: 11 رقماً (010, 011, 012, 015)
 * - الأرضي المصري: يبدأ بكود المحافظة (مثل 02 بالقاهرة 10 أرقام، أو 03 بالإسكندرية 9 أرقام)
 * - الدولي: يبدأ بـ (+) أو (00) ومفتاح الدولة (مثل السعودية +966، الإمارات +971، إلخ)
 */
export function normalizePhone(value: unknown): PhoneNormalizationResult {
  const original = String(value ?? "").trim();
  if (!original) {
    return {
      isValid: false,
      phone: "",
      original,
      type: "UNKNOWN",
      phoneSuffix10: "",
      error: "رقم الهاتف فارغ",
    };
  }

  // 1. تحويل الأرقام العربية إلى إنجليزية
  const converted = convertArabicIndicDigits(original).trim();

  // فحص ما إذا كان الرقم يحتوي على علامة دولية صريحة (+) أو (00)
  const hasPlus = converted.startsWith("+");
  const hasDoubleZero = converted.startsWith("00");

  const digits = converted.replace(/\D/g, "");
  if (!digits) {
    return {
      isValid: false,
      phone: original,
      original,
      type: "UNKNOWN",
      phoneSuffix10: "",
      error: "رقم الهاتف لا يحتوي على أرقام صالحة",
    };
  }

  // 2. فحص وتطبيع الأرقام المصرية (المحمول)
  // كود مصر الدولي: +20 أو 0020 أو 20 متبوعاً برقم محمول 10 أرقام (10, 11, 12, 15)
  if (digits.startsWith("0020")) {
    const after20 = digits.slice(4);
    if (/^1[0125]\d{8}$/.test(after20)) {
      const mobile = "0" + after20;
      return {
        isValid: true,
        phone: mobile,
        original,
        type: "EGYPTIAN_MOBILE",
        countryCode: "20",
        phoneSuffix10: mobile.slice(-10),
      };
    }
  } else if (digits.startsWith("20") && digits.length === 12 && /^201[0125]\d{8}$/.test(digits)) {
    const mobile = "0" + digits.slice(2);
    return {
      isValid: true,
      phone: mobile,
      original,
      type: "EGYPTIAN_MOBILE",
      countryCode: "20",
      phoneSuffix10: mobile.slice(-10),
    };
  }

  // معالجة إسقاط الصفر الأولي بواسطة Excel للمحمول المصري (10 أرقام تبدأ بـ 10 أو 11 أو 12 أو 15)
  if (digits.length === 10 && /^(10|11|12|15)/.test(digits)) {
    const mobile = "0" + digits;
    return {
      isValid: true,
      phone: mobile,
      original,
      type: "EGYPTIAN_MOBILE",
      countryCode: "20",
      phoneSuffix10: mobile.slice(-10),
    };
  }

  // المحمول المصري القياسي المكون من 11 رقماً
  if (digits.length === 11 && /^01[0125]\d{8}$/.test(digits)) {
    return {
      isValid: true,
      phone: digits,
      original,
      type: "EGYPTIAN_MOBILE",
      countryCode: "20",
      phoneSuffix10: digits.slice(-10),
    };
  }

  // 3. فحص الخطوط الأرضية المصرية
  let landlineCandidate = digits;
  if (digits.startsWith("0020")) {
    landlineCandidate = "0" + digits.slice(4);
  } else if (digits.startsWith("20") && digits.length >= 10 && !digits.startsWith("201")) {
    landlineCandidate = "0" + digits.slice(2);
  }

  for (const areaCode of EGYPTIAN_LANDLINE_AREA_CODES) {
    if (landlineCandidate.startsWith(areaCode)) {
      if (areaCode === "02" && landlineCandidate.length === 10) {
        return {
          isValid: true,
          phone: landlineCandidate,
          original,
          type: "EGYPTIAN_LANDLINE",
          countryCode: "20",
          phoneSuffix10: landlineCandidate,
        };
      } else if (areaCode !== "02" && (landlineCandidate.length === 9 || landlineCandidate.length === 10)) {
        return {
          isValid: true,
          phone: landlineCandidate,
          original,
          type: "EGYPTIAN_LANDLINE",
          countryCode: "20",
          phoneSuffix10: landlineCandidate,
        };
      }
    }
  }

  // 4. فحص الأرقام الدولية (International Numbers)
  let intlDigits = digits;
  if (hasDoubleZero) {
    intlDigits = digits.slice(2);
  }

  const isDirectGulf = /^(966\d{9}|971\d{9}|965\d{8}|974\d{8}|973\d{8}|968\d{8})$/.test(digits);

  if (hasPlus || hasDoubleZero || isDirectGulf) {
    if (intlDigits.length >= 8 && intlDigits.length <= 15) {
      const fullE164 = `+${intlDigits}`;
      return {
        isValid: true,
        phone: fullE164,
        original,
        type: "INTERNATIONAL",
        countryCode: intlDigits.slice(0, 3),
        phoneSuffix10: fullE164,
      };
    }
  }

  return {
    isValid: false,
    phone: digits || original,
    original,
    type: "UNKNOWN",
    phoneSuffix10: digits.slice(-10),
    error: "تنسيق رقم الهاتف غير صالح. يجب إدخال رقم محمول مصري (01xxxxxxxxx)، أو أرضي، أو دولي كامل (+xxx).",
  };
}

/**
 * دالة متوافقة بالكامل مع الشيفرة السابقة لاستدعاءات normalizeEgyptianPhone
 */
export function normalizeEgyptianPhone(value: unknown): {
  isValid: boolean;
  phone: string;
  original: string;
  type?: PhoneType;
  error?: string;
} {
  const res = normalizePhone(value);
  return {
    isValid: res.isValid,
    phone: res.phone,
    original: res.original,
    type: res.type,
    error: res.isValid ? undefined : res.error,
  };
}

/**
 * المقارنة الدقيقة والمؤمنة بين رقمين هاتف لمنع ثغرة endsWith:
 * 1. المحمول المصري: مقارنة الـ 10 أرقام الأخيرة فقط إذا كان كلاهما محمولاً مصرياً موثقاً.
 * 2. الدولي: مقارنة تامة لكامل الرقم الدولي E.164 الموحد.
 * 3. الأرضي: مقارنة تامة لكامل الرقم القومي بكود المحافظة.
 * 4. يمنع منعاً باتاً دمج الأرقام المختلفة لمجرد تشابه النهايات.
 */
export function isSamePhone(phoneA: string | unknown, phoneB: string | unknown): boolean {
  const normA = normalizePhone(phoneA);
  const normB = normalizePhone(phoneB);

  if (!normA.isValid || !normB.isValid) {
    return false;
  }

  if (normA.type !== normB.type) {
    return false;
  }

  if (normA.type === "EGYPTIAN_MOBILE" && normB.type === "EGYPTIAN_MOBILE") {
    return normA.phoneSuffix10 === normB.phoneSuffix10;
  }

  return normA.phone === normB.phone;
}

/**
 * فحص السنة الكبيسة
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * التحقق الدلالي من قيم اليوم والشهر والسنة
 */
export function validateDateValues(year: number, month: number, day: number): { isValid: boolean; error?: string } {
  if (year < 1920 || year > 2060) {
    return { isValid: false, error: "السنة خارج النطاق المنطقي (1920-2060)" };
  }
  if (month < 1 || month > 12) {
    return { isValid: false, error: `رقم الشهر غير صالح (${month})` };
  }

  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDay = daysInMonth[month - 1];

  if (day < 1 || day > maxDay) {
    return { isValid: false, error: `اليوم (${day}) غير صالح لشهر (${month}) في سنة (${year})` };
  }

  return { isValid: true };
}

export type DateValidationResult = {
  isValid: boolean;
  isoDate: string | null; // YYYY-MM-DD
  raw: string;
  error?: string;
};

/**
 * معالجة التواريخ النصية وتواريخ Excel التسلسلية وأختام الوقت ISO والمناطق الزمنية
 * مع رفض صارم لأي نصوص غير صالحة أو لاحقات غير متوافقة
 */
export function normalizeDate(value: unknown): DateValidationResult {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = value.getUTCMonth() + 1;
    const d = value.getUTCDate();
    return {
      isValid: true,
      isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      raw: value.toISOString(),
    };
  }

  const raw = String(value ?? "").trim();
  if (!raw) return { isValid: false, isoDate: null, raw, error: "تاريخ فارغ" };

  const clean = convertArabicIndicDigits(raw).trim();

  // 1. فحص الرقم التسلسلي الصريح لإكسيل (Excel Date Serial Number)
  if (/^\d{5}(\.\d+)?$/.test(clean)) {
    const serial = parseFloat(clean);
    if (serial >= 32874 && serial <= 60000) {
      const utcDays = Math.floor(serial - 25569);
      const parsed = new Date(utcDays * 86400 * 1000);
      const y = parsed.getUTCFullYear();
      const m = parsed.getUTCMonth() + 1;
      const d = parsed.getUTCDate();
      return {
        isValid: true,
        isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        raw,
      };
    }
  }

  // 2. فحص التاريخ النصي بصيغة DD/MM/YYYY أو DD-MM-YYYY أو DD.MM.YYYY (مطابقة كاملة دقيقة)
  const dmyMatch = clean.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    const check = validateDateValues(year, month, day);
    if (!check.isValid) {
      return { isValid: false, isoDate: null, raw, error: check.error };
    }

    return {
      isValid: true,
      isoDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      raw,
    };
  }

  // 3. فحص صيغة YYYY-MM-DD أو YYYY/MM/DD أو YYYY.MM.DD (مطابقة كاملة دقيقة)
  const ymdMatch = clean.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);

    const check = validateDateValues(year, month, day);
    if (!check.isValid) {
      return { isValid: false, isoDate: null, raw, error: check.error };
    }

    return {
      isValid: true,
      isoDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      raw,
    };
  }

  // 4. فحص أختام الوقت القياسية ISO 8601 والمناطق الزمنية (مثل: 2024-05-15T14:30:00Z أو 2024-05-15T16:30:00+02:00)
  const isoTimeMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i);
  if (isoTimeMatch) {
    const year = parseInt(isoTimeMatch[1], 10);
    const month = parseInt(isoTimeMatch[2], 10);
    const day = parseInt(isoTimeMatch[3], 10);

    const check = validateDateValues(year, month, day);
    if (!check.isValid) {
      return { isValid: false, isoDate: null, raw, error: check.error };
    }

    return {
      isValid: true,
      isoDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      raw,
    };
  }

  return { isValid: false, isoDate: null, raw, error: "صيغة تاريخ غير مدعومة أو يحتوي على نص غير مسموح. الصيغ المدعومة: DD/MM/YYYY أو YYYY-MM-DD" };
}

export type NationalIdResult = {
  isValid: boolean;
  nationalId: string;
  isSuspectPrecisionLoss: boolean;
  error?: string;
};

/**
 * تطبيع الرقم القومي المصري (14 رقماً) وفحص صلاحيته واكتشاف تشويه الدقة
 */
export function normalizeNationalId(value: unknown): NationalIdResult {
  if (value === null || value === undefined) {
    return { isValid: false, nationalId: "", isSuspectPrecisionLoss: false };
  }

  let clean = convertArabicIndicDigits(value).trim();

  // 1. اكتشاف الصيغة العلمية
  if (/e[+-]?\d+/i.test(clean)) {
    return {
      isValid: false,
      nationalId: clean,
      isSuspectPrecisionLoss: true,
      error: "الرقم القومي مشوه بصيغة علمية (E+) في ملف Excel.",
    };
  }

  clean = clean.replace(/\.0+$/, "").replace(/\D/g, "");

  if (clean.length !== 14) {
    return {
      isValid: false,
      nationalId: clean,
      isSuspectPrecisionLoss: false,
      error: clean.length === 0 ? "الرقم القومي فارغ" : `طول الرقم القومي ${clean.length} وليس 14 رقماً`,
    };
  }

  // 2. اكتشاف فقدان الدقة الناتج عن التقريب في إكسيل (إذا انتهى الرقم بأربعة أصفار فأكثر بشكل غير منطقي)
  if (/0000$/.test(clean)) {
    return {
      isValid: false,
      nationalId: clean,
      isSuspectPrecisionLoss: true,
      error: "يُشتبه في فقدان دقة الرقم القومي في إكسيل (ينتهي بأصفار متتالية غير منطقية).",
    };
  }

  // 3. التحقق البنائي من الرقم القومي المصري
  const century = clean[0];
  if (century !== "2" && century !== "3") {
    return { isValid: false, nationalId: clean, isSuspectPrecisionLoss: false, error: "الرقم الأول يجب أن يكون 2 أو 3" };
  }

  // كود المحافظة
  const govCode = clean.slice(7, 9);
  const VALID_GOVERNORATES = new Set([
    "01","02","03","04","11","12","13","14","15","16","17","18","19","21","22","23","24","25","26","27","28","29","31","32","33","34","35","88",
  ]);
  if (!VALID_GOVERNORATES.has(govCode)) {
    return { isValid: false, nationalId: clean, isSuspectPrecisionLoss: false, error: "كود المحافظة في الرقم القومي غير صحيح" };
  }

  // تاريخ الميلاد
  const year = parseInt((century === "2" ? "19" : "20") + clean.slice(1, 3), 10);
  const month = parseInt(clean.slice(3, 5), 10);
  const day = parseInt(clean.slice(5, 7), 10);
  const dateCheck = validateDateValues(year, month, day);
  if (!dateCheck.isValid) {
    return { isValid: false, nationalId: clean, isSuspectPrecisionLoss: false, error: `تاريخ الميلاد في الرقم القومي غير صالح (${dateCheck.error})` };
  }

  return { isValid: true, nationalId: clean, isSuspectPrecisionLoss: false };
}

/**
 * تطبيع الأرقام العشرية والصحيحة مع دعم الفواصل العربية والإنجليزية وصيغ الآلاف والكسور
 * يرفض القيم التي تحتوي على حروف بعد تنقية الوحدات النقدية/المساحية المعروفة —
 * لمنع تحويل "abc123" أو "12xyz34" إلى رقم بصمت.
 */
export function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const rawStr = String(value).trim();
  if (!rawStr) return null;

  // 1) تحويل الأرقام العربية والهندية → ASCII
  let clean = convertArabicIndicDigits(rawStr)
    // الفاصلة العشرية العربية
    .replace(/\u066B/g, ".")
    // إزالة فواصل الآلاف (العربية واللاتينية) والمسافات
    .replace(/[\u066C, ]/g, "")
    .trim();

  // 2) إزالة الوحدات النقدية/المساحية المعروفة (عربي/إنجليزي)
  // نقوم بـ split/join لتجنب مشاكل حدود الكلمات في العربية
  const UNIT_TOKENS = [
    "جنيه مصري",
    "جنيه",
    "جنية",
    "دولار",
    "ريال",
    "درهم",
    "EGP",
    "USD",
    "EUR",
    "SAR",
    "AED",
    "LE",
    "L.E.",
    "متر",
    "مربع",
    "م2",
    "م²",
    "قدم",
  ];
  for (const token of UNIT_TOKENS) {
    clean = clean.split(token).join("");
  }
  clean = clean.trim();

  // 3) إذا بقي أي حرف (عربي/لاتيني) → القيمة ليست رقمية صافية → نرفض
  if (/[^\d.\-]/.test(clean)) return null;

  // 4) التحقق من وجود نقطة عشرية واحدة على الأكثر
  const dotsCount = (clean.match(/\./g) || []).length;
  if (dotsCount > 1) return null;

  // 5) التحقق من أن إشارة السالب في البداية فقط
  if (clean.includes("-") && !clean.startsWith("-")) return null;
  if ((clean.match(/-/g) || []).length > 1) return null;

  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * توقيع معيارية الوحدة (Project + Building + Unit) لتمييز تكرار الوحدة عن تعدد الوحدات للعميل
 */
export function getUnitSignature(
  project: string | null | undefined,
  building: string | null | undefined,
  unit: string | null | undefined
): string {
  const normProject = normalizeArabicText(project || "")
    .replace(/^(مشروع|كمبوند|برج|قريه|منتجع)\s+/i, "")
    .trim();
  const normBuilding = normalizeArabicText(building || "")
    .replace(/^(عماره|مبني|بلوك|برج)\s+/i, "")
    .trim();
  const normUnit = normalizeArabicText(unit || "")
    .replace(/^(شقه|وحده|مكتب|محل|فيلا|دوبلكس)\s+/i, "")
    .trim();

  if (!normProject && !normBuilding && !normUnit) return "NO_UNIT";
  return `${normProject}|${normBuilding}|${normUnit}`;
}

/**
 * التحقق الصارم من الرقم القومي المصري قبل اعتباره هوية مؤكدة.
 * لا يكفي طول 14 رقماً؛ يجب أن يجتاز التحقق البنائي الكامل
 * (القرن، تاريخ الميلاد، كود المحافظة).
 */
export function isValidNationalIdStrict(value?: string | null): boolean {
  if (value === null || value === undefined) return false;
  const result = normalizeNationalId(value);
  return result.isValid && result.nationalId.length === 14;
}

/**
 * فحص ما إذا كان السجلان يمثلان شخصين مختلفين يمتلكان نفس الوحدة (تعدد الملاك - Co-ownership):
 * - إذا توفر رقمان قوميان صحيحان ومطابقان: لا يعتبر اختلاف الاسم دليلاً على اختلاف الشخص (تكرار لنفس الشخص).
 * - إذا اختلف الرقمان القوميان الصحيحان: يعتبران شخصين مختلفين (شريكان في الوحدة).
 * - إذا غابت الهوية: لا نعتمد على اختلاف الاسم الأول وحده، بل نشترط اختلاف الاسم الأول واسم الأب/العائلة معاً
 *   لتجنب الخلط بين الأخطاء الإملائية وتشابه الأسماء.
 */
export function isDistinctCoOwner(
  existingName: string,
  incomingName: string,
  existingNatId?: string | null,
  incomingNatId?: string | null
): boolean {
  // لا نعتبر الرقم القومي هوية مؤكدة إلا إذا اجتاز التحقق البنائي الكامل.
  const existNatIdValid = isValidNationalIdStrict(existingNatId);
  const incomNatIdValid = isValidNationalIdStrict(incomingNatId);

  // 1. إذا توفر رقمان قوميان صحيحان (14 رقماً مجتازان للتحقق):
  if (existNatIdValid && incomNatIdValid) {
    const normExistNatId = String(existingNatId).replace(/\D/g, "");
    const normIncomNatId = String(incomingNatId).replace(/\D/g, "");

    if (normExistNatId === normIncomNatId) {
      // نفس الرقم القومي حتماً -> نفس الشخص حتى لو كتب الاسم بشكل مختلف (مثل: د/ أحمد vs أحمد علي)
      return false;
    } else {
      // رقمان قوميان مختلفان وصالحان -> شخصان مختلفان يمتلكان نفس الوحدة (Co-owners)
      return true;
    }
  }

  // 2. إذا غاب الرقم القومي أو كان غير صالح في أحد الطرفين:
  const normExist = normalizeArabicText(existingName);
  const normIncom = normalizeArabicText(incomingName);

  if (!normExist || !normIncom) return false;
  if (normExist === normIncom) return false; // أسماء متطابقة تماماً

  const wordsExist = normExist.split(" ").filter(Boolean);
  const wordsIncom = normIncom.split(" ").filter(Boolean);

  // إذا كانت الأسماء قصيرة جداً (كلمة واحدة) بدون رقم قومي، لا نجزم بالشراكة تجنباً للخطأ
  if (wordsExist.length < 2 || wordsIncom.length < 2) {
    return false;
  }

  const firstExist = wordsExist[0];
  const firstIncom = wordsIncom[0];
  const secondExist = wordsExist[1];
  const secondIncom = wordsIncom[1];

  // إذا اختلف الاسم الأول واسم الأب معاً (مثال: "أحمد إبراهيم" vs "فاطمة حسن") -> شريكان مختلفان
  if (firstExist !== firstIncom && secondExist !== secondIncom) {
    return true;
  }

  // إذا تطابق أحد المقطعين (مثل نفس اسم الأب: "أحمد محمد" vs "محمود محمد" أو خطأ إملائي)
  // لا يمكن الجزم بالشراكة تلقائياً دون هوية وطنية
  return false;
}

// ─── هوية الشخص (Person Identity) ─────────────────────────────────────────────
// الهوية الموثوقة هي: هاتف صحيح، أو رقم قومي مجتاز للتحقق.
// لا يجوز استخدام (الاسم + الوحدة) كهوية شخص، ولا دمج سجلين بناءً عليهما.

export type PersonIdentityKind = "PHONE" | "NATIONAL_ID" | "UNVERIFIED";

export interface PersonIdentity {
  kind: PersonIdentityKind;
  /** القيمة المعيارية للهاتف أو الرقم القومي، أو null إذا كانت الهوية غير موثوقة. */
  value: string | null;
}

export function resolvePersonIdentity(
  phone: string | null | undefined,
  nationalId: string | null | undefined
): PersonIdentity {
  const phoneNorm = normalizePhone(phone);
  if (phoneNorm.isValid) {
    return { kind: "PHONE", value: phoneNorm.phone };
  }

  if (isValidNationalIdStrict(nationalId)) {
    const nid = normalizeNationalId(nationalId);
    return { kind: "NATIONAL_ID", value: nid.nationalId };
  }

  return { kind: "UNVERIFIED", value: null };
}

// ─── قرار مطابقة السجل (Import Match Decision) ────────────────────────────────
// يطبّق قواعد الهوية بعد جلب السجلات المرشحة، ويراعي:
// - عدم استخدام الوحدة كدليل هوية.
// - عدم اعتبار اختلاف الرقم القومي دليلاً على الشراكة إلا بعد تطابق الوحدة.
// - عدم الدمج التلقائي عند نقص الهوية (يُعلّم للمراجعة بدلاً من الدمج).

export type ImportMatchAction = "DUPLICATE" | "CO_OWNER" | "INSERT_REVIEW" | "INSERT";

export interface ImportMatchDecision {
  action: ImportMatchAction;
  reason: string;
}

export interface ImportMatchInput {
  rowName: string;
  rowNationalId: string | null;
  rowIdentity: PersonIdentity;
  exName: string;
  exNationalId: string | null;
  unitMatches: boolean;
  bothNoUnit: boolean;
  phoneMatches: boolean;
  nationalIdMatches: boolean;
}

export function decideImportMatch(input: ImportMatchInput): ImportMatchDecision {
  const {
    rowIdentity,
    rowName,
    exName,
    rowNationalId,
    exNationalId,
    unitMatches,
    bothNoUnit,
    phoneMatches,
    nationalIdMatches,
  } = input;

  const rowNatValid = isValidNationalIdStrict(rowNationalId);
  const exNatValid = isValidNationalIdStrict(exNationalId);
  const bothNatValid = rowNatValid && exNatValid;
  const rowNatNorm = rowNatValid ? String(rowNationalId).replace(/\D/g, "") : null;
  const exNatNorm = exNatValid ? String(exNationalId).replace(/\D/g, "") : null;
  const sameNationalId =
    bothNatValid && Boolean(rowNatNorm && exNatNorm) && rowNatNorm === exNatNorm;
  const namesSame = normalizeArabicText(rowName) === normalizeArabicText(exName);

  // ── الحالة A: تطابق توقيع الوحدة بالضبط (Project + Building + Unit) ──
  if (unitMatches) {
    // رقم قومي صالح ومتطابق → نفس الشخص، لا ندرج ولا ندمج.
    if (sameNationalId) {
      return { action: "DUPLICATE", reason: "نفس الرقم القومي الصالح لنفس الوحدة" };
    }
    // رقمان قوميان صحيحان ومختلفان على نفس الوحدة → شريكان مختلفان (مشاركة ملكية).
    if (bothNatValid && !sameNationalId) {
      return { action: "CO_OWNER", reason: "رقمان قوميان مختلفان ومؤكدان على نفس الوحدة" };
    }
    // هاتف موثق متطابق + اسم متطابق → نفس الشخص (لا إنشاء مكرر).
    if (rowIdentity.kind === "PHONE" && phoneMatches) {
      if (namesSame) {
        return { action: "DUPLICATE", reason: "نفس الهاتف الموثق بنفس الاسم لنفس الوحدة" };
      }
      // نفس الهاتف لكن الاسم مختلف كلياً → لا ندمج ولا نرفض بصمت؛ يُسجل ويُعلّم للمراجعة.
      return {
        action: "INSERT_REVIEW",
        reason: "هاتف موثق متطابق مع اسم مختلف كلياً على نفس الوحدة؛ يحتاج مراجعة احتمالية الملاك المشتركين",
      };
    }
    // لا توجد هوية موثقة مشتركة كافية → لا نجزم بالتكرار ولا بالشراكة؛ يُسجل للمراجعة.
    return {
      action: "INSERT_REVIEW",
      reason: "تطابق الوحدة دون هوية موثقة مشتركة كافية؛ لا يمكن الجزم بالتكرار أو الشراكة",
    };
  }

  // ── الحالة ب: لا وحدة للطرفين، والتكرار يثبت فقط بهوية موثقة مشتركة ──
  if (bothNoUnit && (phoneMatches || nationalIdMatches)) {
    if (sameNationalId) {
      return { action: "DUPLICATE", reason: "نفس الرقم القومي بدون وحدة" };
    }
    if (rowIdentity.kind === "PHONE" && phoneMatches) {
      if (namesSame) {
        return { action: "DUPLICATE", reason: "نفس الهاتف الموثق بنفس الاسم بدون وحدة" };
      }
      return {
        action: "INSERT_REVIEW",
        reason: "هاتف موثق متطابق مع اسم مختلف بدون وحدة؛ يحتاج مراجعة",
      };
    }
    return { action: "INSERT_REVIEW", reason: "تطابق اتصال/هوية بدون وحدة باسم مختلف؛ يحتاج مراجعة" };
  }

  // الهوية غير موثوقة مطلقاً → لا يمكن مقارنتها بسجل آخر، يُسجل للمراجعة فقط.
  if (rowIdentity.kind === "UNVERIFIED") {
    return {
      action: "INSERT_REVIEW",
      reason: "سجل بلا هاتف أو رقم قومي موثق ولا يمكن تمييزه عن سجل آخر",
    };
  }

  return { action: "INSERT", reason: "سجل مختلف (وحدة أو هوية مختلفة)" };
}

// ─── بدائل الهاتف (Phone Placeholders) ────────────────────────────────────────
// لا تُستخدم للمطابقة أو الدمج مطلقاً؛ فقط لتعبئة العمود الإلزامي phone.

/** بديل ثابت وموثوق مشتق حصراً من رقم قومي مجتاز للتحقق. */
export function generateNationalIdPlaceholder(nationalId: string): string {
  const cleanNatId = String(nationalId).replace(/\D/g, "");
  return `NO_PHONE_NID_${cleanNatId}`;
}

/**
 * بديل فريد لكل سجل لا يملك هاتفاً أو رقماً قومياً موثوقاً.
 * لا يتضمن الاسم أو الوحدة، ولا يُستخدم كدليل هوية، ولا يشارك في أي مطابقة.
 */
export function generateUnverifiedPlaceholder(stableSeed?: string): string {
  if (stableSeed && stableSeed.trim()) {
    const digest = createHash("sha256")
      .update(`UNVERIFIED_NO_PHONE|${stableSeed.trim()}`)
      .digest("hex")
      .slice(0, 16);
    return `UNVERIFIED_NO_PHONE_${digest}`;
  }
  const nonce = createHash("sha256")
    .update(`${Date.now()}|${Math.random()}|${Math.random()}`)
    .digest("hex")
    .slice(0, 16);
  return `UNVERIFIED_NO_PHONE_${nonce}`;
}
