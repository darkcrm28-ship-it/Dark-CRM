/**
 * src/lib/excel-normalizer.ts
 * محرك معيارية وتنظيف بيانات Excel لمشروع Dark CRM
 */

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
 * تنظيف وتوحيد النصوص العربية وإزالة التشكيل والمسافات الزائدة
 */
export function normalizeArabicText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return convertArabicIndicDigits(value)
    .trim()
    // إزالة التشكيل والتطويل (ـ)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    // توحيد الهمزات والألف والياء
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    // دمج المسافات البيضاء والسطور المتعددة في مسافة واحدة
    .replace(/\s+/g, " ");
}

/**
 * تطبيع أرقام الهواتف المصرية والتحقق من صحتها
 * يعالج:
 * 1. الأرقام بدون الصفر الأولي بسبب Excel (مثل: 1012345678 -> 01012345678)
 * 2. الأرقام الدولية (مثل: +2010... أو 002010... أو 2010... -> 010...)
 * 3. الفواصل والمسافات والأقواس
 */
export function normalizeEgyptianPhone(value: unknown): {
  isValid: boolean;
  phone: string;
  original: string;
  error?: string;
} {
  const original = String(value ?? "").trim();
  if (!original) {
    return { isValid: false, phone: "", original, error: "رقم الهاتف فارغ" };
  }

  // تحويل الأرقام العربية أولاً ثم استخراج الأرقام فقط
  const converted = convertArabicIndicDigits(original);
  let digits = converted.replace(/\D/g, "");

  // معالجة المفتاح الدولي لمصر (+20 أو 0020 أو 20)
  if (digits.startsWith("0020")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("20") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // معالجة إسقاط الصفر الأولي بواسطة إكسيل (10 أو 11 أو 12 أو 15 مكون من 10 أرقام)
  if (digits.length === 10 && /^(10|11|12|15)/.test(digits)) {
    digits = "0" + digits;
  }

  // التحقق من صحة الرقم المصري القياسي: 11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015
  const isValid = /^01[0125]\d{8}$/.test(digits);

  return {
    isValid,
    phone: isValid ? digits : (digits || original),
    original,
    error: isValid ? undefined : "تنسيق رقم هاتف محمول مصري غير صالح"
  };
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
 * معالجة التواريخ النصية وتواريخ Excel التسلسلية (Excel Date Serials)
 */
export function normalizeDate(value: unknown): DateValidationResult {
  const raw = String(value ?? "").trim();
  if (!raw) return { isValid: false, isoDate: null, raw, error: "تاريخ فارغ" };

  const clean = convertArabicIndicDigits(raw);

  // 1. فحص الرقم التسلسلي لإكسيل (Excel Date Serial Number)
  if (/^\d{5}(\.\d+)?$/.test(clean)) {
    const serial = parseFloat(clean);
    // تواريخ إكسيل بين عامي 1990 (32874) و 2060 (58439)
    if (serial >= 32874 && serial <= 60000) {
      const utcDays = Math.floor(serial - 25569);
      const parsed = new Date(utcDays * 86400 * 1000);
      const y = parsed.getUTCFullYear();
      const m = parsed.getUTCMonth() + 1;
      const d = parsed.getUTCDate();
      return {
        isValid: true,
        isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        raw
      };
    }
  }

  // 2. فحص التاريخ النصي بصيغة DD/MM/YYYY أو DD-MM-YYYY أو DD.MM.YYYY
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
      raw
    };
  }

  // 3. فحص صيغة ISO القياسية YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    const check = validateDateValues(year, month, day);
    if (!check.isValid) {
      return { isValid: false, isoDate: null, raw, error: check.error };
    }

    return { isValid: true, isoDate: clean, raw };
  }

  return { isValid: false, isoDate: null, raw, error: "صيغة تاريخ غير معروفة. الصيغ المدعومة: DD/MM/YYYY أو YYYY-MM-DD" };
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
      error: "الرقم القومي مشوه بصيغة علمية (E+) في ملف Excel."
    };
  }

  clean = clean.replace(/\.0+$/, "").replace(/\D/g, "");

  if (clean.length !== 14) {
    return {
      isValid: false,
      nationalId: clean,
      isSuspectPrecisionLoss: false,
      error: clean.length === 0 ? "الرقم القومي فارغ" : `طول الرقم القومي ${clean.length} وليس 14 رقماً`
    };
  }

  // 2. اكتشاف فقدان الدقة الناتج عن التقريب (إذا انتهى الرقم بأربعة أصفار فأكثر بشكل غير طبيعي)
  if (/0000$/.test(clean)) {
    return {
      isValid: false,
      nationalId: clean,
      isSuspectPrecisionLoss: true,
      error: "يُشتبه في فقدان دقة الرقم القومي في إكسيل (ينتهي بأصفار متتالية غير منطقية)."
    };
  }

  // 3. التحقق البنائي من الرقم القومي المصري:
  const century = clean[0];
  if (century !== "2" && century !== "3") {
    return { isValid: false, nationalId: clean, isSuspectPrecisionLoss: false, error: "الرقم الأول يجب أن يكون 2 أو 3" };
  }

  // كود المحافظة
  const govCode = clean.slice(7, 9);
  const VALID_GOVERNORATES = new Set([
    "01","02","03","04","11","12","13","14","15","16","17","18","19","21","22","23","24","25","26","27","28","29","31","32","33","34","35","88"
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
 * تطبيع الأرقام العشرية والصحيحة (المساحات والأسعار والأدوار)
 */
export function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const clean = convertArabicIndicDigits(value).replace(/[,]/g, "").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * توقيع معيارية الوحدة (Project + Building + Unit) لتمييز تكرار الوحدة عن تعدد الوحدات للعميل
 */
export function getUnitSignature(project: string | null | undefined, building: string | null | undefined, unit: string | null | undefined): string {
  const normProject = normalizeArabicText(project || "").replace(/^(مشروع|كمبوند|برج)\s+/i, "");
  const normBuilding = normalizeArabicText(building || "").replace(/^(عماره|مبني|بلوك)\s+/i, "");
  const normUnit = normalizeArabicText(unit || "").replace(/^(شقه|وحده|مكتب|محل)\s+/i, "");

  if (!normProject && !normBuilding && !normUnit) return "NO_UNIT";
  return `${normProject}|${normBuilding}|${normUnit}`;
}
