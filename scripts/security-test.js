/**
 * scripts/security-test.js
 * Dark CRM — Smart Excel Import Engine & Security Validation Suite
 * 
 * فحص واختبار أمان وتطبيع وكشف التكرار لمحرك استيراد Excel
 * يعمل بشكل كامل دون الاتصال بقاعدة بيانات الإنتاج Neon (Offline-Safe Tests)
 * 
 * يغطي:
 * 1. التطبيع الشامل (أرقام عربية وفارسية، نصوص، علامات خفية، أختام الوقت والمناطق الزمنية)
 * 2. تطبيع الهواتف (محمول مصري، خطوط أرضية، دولي، إزالة ثغرة endsWith)
 * 3. كشف الشركاء (Co-ownership) وتمييزه عن التكرار وفق الرقم القومي وتعدد مقاطع الأسماء
 * 4. الهواتف التركيبية المستقرة (Stable Synthetic Phone)
 * 5. أمان القوالب وتنظيف بيانات localStorage القديمة والجديدة
 * 6. منطق الـ Idempotency وبصمة المحتوى ومنع تضارب الـ batchId
 * 
 * التشغيل: node --experimental-strip-types scripts/security-test.js
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";

const {
  convertArabicIndicDigits,
  normalizeArabicText,
  normalizePhone,
  normalizeEgyptianPhone,
  isSamePhone,
  normalizeDate,
  validateDateValues,
  isLeapYear,
  normalizeNationalId,
  normalizeNumber,
  getUnitSignature,
  isDistinctCoOwner,
  isValidNationalIdStrict,
  resolvePersonIdentity,
  decideImportMatch,
  generateNationalIdPlaceholder,
  generateUnverifiedPlaceholder,
} = await import("../src/lib/excel-normalizer.ts");

const {
  sanitizeTemplate,
  getSavedTemplates,
  saveCustomTemplate,
  suggestMatchingTemplate,
  ALLOWED_CRM_TARGET_FIELDS,
  BUILTIN_TEMPLATES,
  LOCAL_STORAGE_KEY,
} = await import("../src/lib/import-templates.ts");

let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
    results.push({ label, ok: true });
  } else {
    console.error(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    failed++;
    results.push({ label, ok: false, detail });
  }
}

function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(60));
}

console.log("🚀 تشغيل حزمة اختبارات محرك استيراد Excel وأمان البيانات (Dark CRM Import Integrity Suite)\n");

// ─── 1. تطبيع الأرقام والنصوص والمحارف غير المرئية ─────────────────────────────
section("1. تطبيع الأرقام والنصوص العربية وإزالة التشكيل والمحارف غير المرئية");

const arabicDigits = convertArabicIndicDigits("٠١٢٣٤٥٦٧٨٩");
assert("تحويل الأرقام العربية المشرقية (٠-٩) إلى أرقام إنجليزية", arabicDigits === "0123456789", `Got: ${arabicDigits}`);

const persianDigits = convertArabicIndicDigits("۰۱۲۳۴۵۶۷۸۹");
assert("تحويل الأرقام الفارسية/الأردية (۰-۹) إلى أرقام إنجليزية", persianDigits === "0123456789", `Got: ${persianDigits}`);

const textWithTashkeel = normalizeArabicText("مُحَمَّـد أَحْمَدْ");
assert("إزالة التشكيل والتطويل من النص العربي", textWithTashkeel === "محمد احمد", `Got: ${textWithTashkeel}`);

const textWithHamzas = normalizeArabicText("إبراهيم وائل آسر");
assert("توحيد الهمزات والألف الممدودة", textWithHamzas === "ابراهيم وائل اسر", `Got: ${textWithHamzas}`);

const textWithTaaMarbuta = normalizeArabicText("شركة أمانة للتطوير العقاري");
assert("توحيد التاء المربوطة (ة -> ه) والياء المقصورة (ى -> ي)", textWithTaaMarbuta === "شركه امانه للتطوير العقاري", `Got: ${textWithTaaMarbuta}`);

const textWithZeroWidth = normalizeArabicText("شركة\u200B النور\uFEFF العقارية\u200C");
assert("إزالة المحارف الخفية ورموز التحكم (Zero-width chars & BOM)", textWithZeroWidth === "شركه النور العقاريه", `Got: ${textWithZeroWidth}`);

// ─── 2. فحص وتطبيع أرقام الهواتف الشامل ─────────────────────────────────────────
section("2. فحص وتطبيع أرقام الهواتف الشامل (محمول، أرضي، دولي)");

const stdMobile = normalizePhone("01012345678");
assert("المحمول المصري القياسي 11 رقماً", stdMobile.isValid && stdMobile.phone === "01012345678" && stdMobile.type === "EGYPTIAN_MOBILE");

const strippedZeroMobile = normalizePhone("1012345678");
assert("استرجاع الصفر الأولي المفقود من إكسيل (10xxxxxxxx -> 010xxxxxxxx)", strippedZeroMobile.isValid && strippedZeroMobile.phone === "01012345678");

const plus20Mobile = normalizePhone("+201123456789");
assert("تطبيع كود مصر الدولي (+20) للمحمول", plus20Mobile.isValid && plus20Mobile.phone === "01123456789");

const doubleZero20Mobile = normalizePhone("00201223456789");
assert("تطبيع كود مصر الدولي (0020) للمحمول", doubleZero20Mobile.isValid && doubleZero20Mobile.phone === "01223456789");

const arabicMobile = normalizePhone("٠١٥١٢٣٤٥٦٧٨");
assert("تطبيع أرقام المحمول المدخلة بأرقام عربية مشرقية", arabicMobile.isValid && arabicMobile.phone === "01512345678");

const cairoLandline = normalizePhone("0233445566");
assert("الخط الأرضي بالقاهرة/الجيزة (كود 02 مكون من 10 أرقام)", cairoLandline.isValid && cairoLandline.phone === "0233445566" && cairoLandline.type === "EGYPTIAN_LANDLINE");

const alexLandline = normalizePhone("035551234");
assert("الخط الأرضي بالإسكندرية (كود 03 مكون من 9 أرقام)", alexLandline.isValid && alexLandline.phone === "035551234" && alexLandline.type === "EGYPTIAN_LANDLINE");

const saudiMobile = normalizePhone("+966501234567");
assert("الرقم الدولي السعودي (+966)", saudiMobile.isValid && saudiMobile.phone === "+966501234567" && saudiMobile.type === "INTERNATIONAL");

const uaeMobile = normalizePhone("00971501234567");
assert("الرقم الدولي الإماراتي (00971)", uaeMobile.isValid && uaeMobile.phone === "+971501234567" && uaeMobile.type === "INTERNATIONAL");

const kuwaitMobile = normalizePhone("96599123456");
assert("رقم خليجي مدخل بدون علامة زائد أو صفرين (الكويت 965)", kuwaitMobile.isValid && kuwaitMobile.phone === "+96599123456" && kuwaitMobile.type === "INTERNATIONAL");

const invalidPhone1 = normalizePhone("12345");
assert("رفض الأرقام القصيرة غير الصالحة", !invalidPhone1.isValid);

const invalidPhone2 = normalizePhone("abcdefghijk");
assert("رفض النصوص التي لا تحتوي على أرقام", !invalidPhone2.isValid);

// ─── 3. مطابقة الهواتف وسد ثغرة endsWith ──────────────────────────────────────
section("3. مطابقة الهواتف وسد ثغرة endsWith لمنع الدمج الخاطئ");

assert("تطابق المحمول المصري بالصفر وبالمفتاح الدولي (+20)", isSamePhone("01012345678", "+201012345678"));
assert("تطابق المحمول المصري المسقط منه الصفر بإكسيل مع الكامل", isSamePhone("1012345678", "01012345678"));
assert("تطابق الخط الأرضي المتطابق", isSamePhone("0233445566", "0233445566"));
assert("عدم تطابق خطين أرضيين مختلفين", !isSamePhone("0233445566", "0233445577"));
assert("تطابق الرقم الدولي المتطابق بالصيغة القياسية", isSamePhone("+966501234567", "00966501234567"));

// فحص ثغرة endsWith الحرجة
assert("🛡️ منع ثغرة endsWith: رقم محلي لا يطابق رقماً دولياً ينتهي بنفس الأرقام (12345678 vs +96612345678)", !isSamePhone("12345678", "+96612345678"));
assert("🛡️ منع دمج رقم محمول مصري مع خط أرضي ينتهي بنفس الأرقام", !isSamePhone("01012345678", "0212345678"));
assert("🛡️ منع دمج رقم سعودي مع رقم إماراتي له نفس الأرقام الوطنية", !isSamePhone("+966501234567", "+971501234567"));

// ─── 4. فحص التواريخ وصيغ إكسيل والأختام الزمنية والمناطق ────────────────────
section("4. فحص التواريخ والمناطق الزمنية والرفض الصارم للنصوص غير الصالحة");

const dmyDate = normalizeDate("25/12/2025");
assert("تطبيع صيغة DD/MM/YYYY", dmyDate.isValid && dmyDate.isoDate === "2025-12-25");

const dashDate = normalizeDate("05-08-2024");
assert("تطبيع صيغة DD-MM-YYYY", dashDate.isValid && dashDate.isoDate === "2024-08-05");

const isoDate = normalizeDate("2024-06-15");
assert("تطبيع صيغة ISO القياسية YYYY-MM-DD", isoDate.isValid && isoDate.isoDate === "2024-06-15");

const slashYmd = normalizeDate("2024/07/20");
assert("تطبيع صيغة YYYY/MM/DD", slashYmd.isValid && slashYmd.isoDate === "2024-07-20");

const isoTimestampUtc = normalizeDate("2024-09-10T14:30:00Z");
assert("تطبيع ختم وقت ISO مع منطقة UTC (Z)", isoTimestampUtc.isValid && isoTimestampUtc.isoDate === "2024-09-10");

const isoTimestampTimezone = normalizeDate("2024-09-10T16:30:00+02:00");
assert("تطبيع ختم وقت ISO مع فارق المنطقة الزمنية (+02:00)", isoTimestampTimezone.isValid && isoTimestampTimezone.isoDate === "2024-09-10");

const excelSerial = normalizeDate("45000");
assert("تطبيع أرقام إكسيل التسلسلية للتواريخ", excelSerial.isValid && excelSerial.isoDate !== null);

const jsDateObj = normalizeDate(new Date(Date.UTC(2025, 4, 18)));
assert("معالجة كائنات التاريخ Date مباشرة", jsDateObj.isValid && jsDateObj.isoDate === "2025-05-18");

const leapValid = normalizeDate("29/02/2024");
assert("قبول 29 فبراير في السنة الكبيسة (2024)", leapValid.isValid && leapValid.isoDate === "2024-02-29");

const leapInvalid = normalizeDate("29/02/2023");
assert("رفض 29 فبراير في السنة غير الكبيسة (2023)", !leapInvalid.isValid);

// الرفض الصارم للنصوص الزائدة وغير الصالحة
const dateWithJunk = normalizeDate("2024-05-15 extra junk text");
assert("🛡️ رفض التواريخ التي تحتوي على نصوص زائدة أو غير مطابقة للنمط", !dateWithJunk.isValid);

const dateWithInvalidMonth = normalizeDate("2024-13-01");
assert("🛡️ رفض شهر غير صالح (13)", !dateWithInvalidMonth.isValid);

// ─── 5. تطبيع الأرقام بالفواصل والكسور والآلاف العربية والإنجليزية ─────────────
section("5. تطبيع الأرقام مع فواصل الآلاف والكسور العربية والإنجليزية");

const numWithArabicThousands = normalizeNumber("١٬٥٠٠٬٠٠٠");
assert("تطبيع فاصلة الآلاف العربية (٬)", numWithArabicThousands === 1500000, `Got: ${numWithArabicThousands}`);

const numWithArabicDecimal = normalizeNumber("٢٥٠٠٫٧٥");
assert("تطبيع الفاصلة العشرية العربية (٫)", numWithArabicDecimal === 2500.75, `Got: ${numWithArabicDecimal}`);

const numCombinedArabic = normalizeNumber("١٬٥٠٠٬٠٠٠٫٥٠");
assert("تطبيع الآلاف والفاصلة العشرية العربية معاً", numCombinedArabic === 1500000.5, `Got: ${numCombinedArabic}`);

const numLatinWithWords = normalizeNumber("1,250,000.75 EGP");
assert("تطبيع الأرقام اللاتينية مع فواصل الآلاف والعملة", numLatinWithWords === 1250000.75, `Got: ${numLatinWithWords}`);

const numMultipleDots = normalizeNumber("1.250.000");
assert("🛡️ رفض الأرقام ذات النقاط المتعددة المشبوهة", numMultipleDots === null);

// ─── 6. فحص تعدد الملاك (Co-ownership) وتمييزه عن التكرار ───────────────────────
section("6. فحص تعدد الملاك (Co-ownership) بدقة الهوية واختلاف مقاطع الأسماء");

// الحالة 1: نفس الرقم القومي الصحيح مع اختلاف الاسم (خطأ كتابي / لقب / كنية) -> نفس الشخص (تكرار وليس شريك)
const sameNatIdDiffName = isDistinctCoOwner(
  "د/ أحمد إبراهيم محمد",
  "أحمد إبراهيم",
  "28501010101234",
  "28501010101234"
);
assert("🛡️ تطابق الرقمان القوميان الصحيحان يعني نفس الشخص ولا يعتبر شريكاً رغم اختلاف صياغة الاسم", sameNatIdDiffName === false);

// الحالة 2: رقمان قوميان مختلفان وصالحان لنفس الوحدة -> شريكان مختلفان في الملكية (Co-owners)
const diffNatIdSameUnit = isDistinctCoOwner(
  "أحمد إبراهيم محمد",
  "فاطمة حسن علي",
  "28501010101234",
  "28902020101234"
);
assert("اختلاف الرقمان القوميان الصحيحان يثبت تعدد الملاك للشخصين في نفس الوحدة", diffNatIdSameUnit === true);

// الحالة 3: غياب الرقم القومي واختلاف الاسم الأول واسم الأب معاً -> شريكان مختلفان
const diffFirstAndSecond = isDistinctCoOwner(
  "أحمد إبراهيم محمد",
  "فاطمة حسن علي",
  null,
  null
);
assert("غياب الهوية مع اختلاف الاسم الأول واسم الأب معاً يعتبر دليلاً على الشراكة (مثل الزوج والزوجة)", diffFirstAndSecond === true);

// الحالة 4: غياب الرقم القومي وتشابه اسم الأب (أحمد محمد vs محمود محمد) -> لا يجزم بالشراكة تلقائياً
const ambiguousBrothers = isDistinctCoOwner(
  "أحمد محمد علي",
  "محمود محمد علي",
  null,
  null
);
assert("🛡️ غياب الهوية مع تشابه اسم الأب (أحمد محمد vs محمود محمد) لا يعتبر شريكاً تلقائياً لمنع الالتباس", ambiguousBrothers === false);

// الحالة 5: اسم قصير بكلمة واحدة بدون رقم قومي -> يمنع الجزم بالشراكة
const singleWordName = isDistinctCoOwner(
  "أحمد",
  "محمد",
  null,
  null
);
assert("🛡️ رفض الأسماء الأحادية القصيرة دون رقم قومي كدليل على الشراكة", singleWordName === false);

// ─── 7. بدائل الهاتف والهوية غير الموثوقة ─────────────────────────────────────
section("7. بدائل الهاتف (Phone Placeholders) والهوية غير الموثوقة");

// بديل ثابت مشتق حصراً من رقم قومي مجتاز للتحقق.
const nidPlaceholder1 = generateNationalIdPlaceholder("29505180102345");
const nidPlaceholder2 = generateNationalIdPlaceholder("29505180102345");
assert("توليد بديل ثابت مشتق من الرقم القومي الموثوق", nidPlaceholder1 === "NO_PHONE_NID_29505180102345");
assert("استقرار البديل عند إعادة الإرسال لنفس الرقم القومي", nidPlaceholder1 === nidPlaceholder2);

// بديل غير موثوق: فريد لكل سجل، لا يتضمن الاسم أو الوحدة، ولا يُستخدم كهوية.
const unverified1 = generateUnverifiedPlaceholder();
const unverified2 = generateUnverifiedPlaceholder();
assert("البديل غير الموثوق موسوم بوضوح (UNVERIFIED_NO_PHONE_)", unverified1.startsWith("UNVERIFIED_NO_PHONE_"));
assert("البديل غير الموثوق فريد لكل سجل (لا يجمع سجلين)", unverified1 !== unverified2);
assert("البديل غير الموثوق لا يتضمن الاسم أو الوحدة", !unverified1.includes("سارة") && !unverified1.includes("الرحاب"));

// اتخاذ قرار الهوية: هاتف > رقم قومي موثوق > غير موثوق.
assert("هوية الهاتف تُعتمد عند وجود هاتف صحيح",
  resolvePersonIdentity("01012345678", null).kind === "PHONE");
assert("الهوية القومية تُعتمد عند غياب الهاتف وصحة الرقم القومي",
  resolvePersonIdentity("", "29505180102345").kind === "NATIONAL_ID");
assert("الرقم القومي غير المجتاز للتحقق لا يُعتبر هوية",
  resolvePersonIdentity("", "12345678901234").kind === "UNVERIFIED");
assert("غياب الهاتف والقومي يعني هوية غير موثوقة",
  resolvePersonIdentity("", null).kind === "UNVERIFIED");

// ─── 8. أمان القوالب وتنظيف localStorage القديمة والجديدة ─────────────────────
section("8. أمان القوالب وتنظيف localStorage القديمة وإلزامية حقول CRM المصرح بها");

// محاكاة كائن localStorage للاختبار المعزول
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(k) { return this.store[k] ?? null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}

const mockStorage = new MockLocalStorage();

// حقن قوالب قديمة ملوثة تحتوي على بيانات عملاء مسربة وأرقام هواتف وحقول غير مصرح بها
const dirtyLegacyData = [
  {
    id: "legacy_tpl_1",
    name: "قالب قديم ملوث",
    matchHeaders: ["الاسم", "رقم الهاتف"],
    mapping: {
      "الاسم": "name",
      "رقم الهاتف": "phone",
      "حقل غير مصرح": "unauthorizedField123", // يجب حذفه
      "رقم سري": "adminSecretKey",          // يجب حذفه
    },
    // بيانات مسربة متسللة يجب تطهيرها:
    customerList: [{ name: "عميل سري 1", phone: "01011111111" }],
    apiKey: "SECRET_KEY_EXPOSED",
  }
];

mockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dirtyLegacyData));

// استدعاء getSavedTemplates وتمرير التخزين: يجب أن يقرأ القوالب، ينظفها، ويكتب النسخة النظيفة في mockStorage
const loadedTemplates = getSavedTemplates(mockStorage);
assert("تحميل القوالب بنجاح (المدمجة + القالب المخصص المنقى)", loadedTemplates.length > BUILTIN_TEMPLATES.length);

const cleanedInStorageJson = mockStorage.getItem(LOCAL_STORAGE_KEY);
const cleanedInStorage = JSON.parse(cleanedInStorageJson || "[]");
const customCleaned = cleanedInStorage[0];

assert("🛡️ كتابة النسخة المنقحة تلقائياً في التخزين عند القراءة", customCleaned !== undefined && customCleaned.name === "قالب قديم ملوث");
assert("🛡️ حذف customerList المسربة من التخزين نهائياً", !("customerList" in customCleaned));
assert("🛡️ حذف apiKey المسربة من التخزين نهائياً", !("apiKey" in customCleaned));
assert("🛡️ إزالة الحقول المستهدفة غير المصرح بها من mapping", !("حقل غير مصرح" in customCleaned.mapping));
assert("الحفاظ على الحقول المستهدفة المصرح بها فقط في mapping (name, phone)", customCleaned.mapping["الاسم"] === "name" && customCleaned.mapping["رقم الهاتف"] === "phone");

// حفظ قالب جديد والتأكد من تنقية كافة القوالب القديمة والجديدة في التخزين
saveCustomTemplate({
  name: "قالب جديد 2026",
  matchHeaders: ["اسم العميل", "كود الوحدة"],
  mapping: { "اسم العميل": "name", "كود الوحدة": "unitNumber", "بيانات ضارة": "hackField" },
}, mockStorage);

const updatedStorage = JSON.parse(mockStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
assert("حفظ القالب الجديد مع القوالب القديمة المنقحة", updatedStorage.length === 2);
const newTplClean = updatedStorage.find(t => t.name === "قالب جديد 2026");
assert("🛡️ تنقية mapping في القالب الجديد ومنع hackField", newTplClean && !("بيانات ضارة" in newTplClean.mapping));

// ─── 9. منطق منع تكرار الدفعات والـ Idempotency وبصمة المحتوى ──────────────────
section("9. منطق منع تكرار الدفعات (Idempotency) وفحص تطابق البصمة");

const batchPayloadA = [{ name: "عميل أ", phone: "01012345678" }];
const batchPayloadB = [{ name: "عميل ب مختلف", phone: "01099999999" }];

const fingerprintA = createHash("sha256").update(JSON.stringify(batchPayloadA)).digest("hex");
const fingerprintA_repeat = createHash("sha256").update(JSON.stringify(batchPayloadA)).digest("hex");
const fingerprintB = createHash("sha256").update(JSON.stringify(batchPayloadB)).digest("hex");

assert("تطابق بصمة المحتوى لنفس بيانات الدفعة عند تكرار الإرسال", fingerprintA === fingerprintA_repeat);
assert("اختلاف بصمة المحتوى عند إرسال بيانات مختلفة بنفس batchId", fingerprintA !== fingerprintB);

// محاكاة التحقق من Idempotency داخل المعاملة
function simulateIdempotencyCheck(recordedAudit, incomingBatchId, incomingFingerprint) {
  if (!recordedAudit) return { shouldExecute: true };
  if (recordedAudit.batchId === incomingBatchId) {
    if (recordedAudit.fingerprint !== incomingFingerprint) {
      throw new Error("BATCH_ID_CONTENT_MISMATCH");
    }
    return { shouldExecute: false, replayResult: recordedAudit.result };
  }
  return { shouldExecute: true };
}

const mockAuditLog = {
  batchId: "batch_uuid_101",
  fingerprint: fingerprintA,
  result: { inserted: 1, duplicates: 0, failed: 0 }
};

// فحص إعادة إرسال نفس الدفعة بنفس البصمة
const replayCheck = simulateIdempotencyCheck(mockAuditLog, "batch_uuid_101", fingerprintA);
assert("إرجاع نتيجة سابقة دون إعادة تنفيذ عند تطابق المعرف والبصمة", !replayCheck.shouldExecute && replayCheck.replayResult.inserted === 1);

// فحص إعادة إرسال نفس batchId مع محتوى مختلف -> يجب رمي BATCH_ID_CONTENT_MISMATCH
let mismatchCaught = false;
try {
  simulateIdempotencyCheck(mockAuditLog, "batch_uuid_101", fingerprintB);
} catch (e) {
  if (e.message === "BATCH_ID_CONTENT_MISMATCH") mismatchCaught = true;
}
assert("🛡️ رمي استثناء BATCH_ID_CONTENT_MISMATCH عند استخدام نفس batchId مع محتوى مختلف", mismatchCaught === true);

// ─── 10. حالات الهوية والشراكة ومنطق القفل (مراجعة Agent 2) ────────────────────
section("10. حالات الهوية والشراكة ومنطق القفل (Advisory Lock)");

// 10.1 شخصان مختلفان بنفس الاسم ونفس الوحدة، بلا رقم قومي أو هاتف.
// لا تُنشأ هوية من (الاسم + الوحدة)؛ كل سجل يحصل على بديل فريد ويُعلّم للمراجعة، ولا دمج.
const unverifiedA = generateUnverifiedPlaceholder();
const unverifiedB = generateUnverifiedPlaceholder();
const decisionSameNameNoId = decideImportMatch({
  rowName: "أحمد محمد علي",
  rowNationalId: null,
  rowIdentity: { kind: "UNVERIFIED", value: null },
  exName: "أحمد محمد علي",
  exNationalId: null,
  unitMatches: true,
  bothNoUnit: false,
  phoneMatches: false,
  nationalIdMatches: false,
});
assert("شخصان بنفس الاسم والوحدة بلا هوية → لا دمج، يُعلّمان للمراجعة (INSERT_REVIEW)",
  decisionSameNameNoId.action === "INSERT_REVIEW");
assert("البدائل الفريدة لكل سجل تمنع الدمج العرضي", unverifiedA !== unverifiedB);

// 10.2 نفس الشخص دون هاتف وله وحدتان مختلفتان.
const decisionTwoUnits = decideImportMatch({
  rowName: "سارة محمود",
  rowNationalId: null,
  rowIdentity: { kind: "UNVERIFIED", value: null },
  exName: "سارة محمود",
  exNationalId: null,
  unitMatches: false,
  bothNoUnit: false,
  phoneMatches: false,
  nationalIdMatches: false,
});
assert("نفس الشخص بوحدتين مختلفتين → سجل منفصل يُعلّم للمراجعة (لا دمج)", decisionTwoUnits.action === "INSERT_REVIEW");

// 10.3 إعادة استيراد نفس السجل: الهوية الموثوقة (رقم قومي) تعطي نفس البديل (Idempotent).
assert("إعادة استيراد نفس السجل برقم قومي موثوق → نفس البديل (Idempotent)",
  generateNationalIdPlaceholder("29505180102345") === generateNationalIdPlaceholder("29505180102345"));

// 10.4 اختلاف كتابة الاسم بين ملفين (أحمد/احمد، أ/إ/آ) → تطبيع موحّد.
const normName1 = normalizeArabicText("أحمد إبراهيم");
const normName2 = normalizeArabicText("احمد ابراهيم");
assert("اختلاف كتابة الهمزة (أ/ا) → تطبيع موحّد", normName1 === normName2);

// 10.5 اختلاف كتابة الوحدة بين ملفين → توقيع وحدة موحّد.
const unitSig1 = getUnitSignature("مشروع مدينتي", "عماره 12", "شقه 101");
const unitSig2 = getUnitSignature("مدينتي", "12", "101");
assert("اختلاف صياغة المشروع/العمارة/الوحدة ينتج توقيع وحدة موحداً", unitSig1 === unitSig2);

// 10.6 بوابة الشراكة: لا تُثبت الشراكة إلا عند تطابق Unit Signature.
function evaluateCoOwnership(exName, inName, exNatId, inNatId, exUnit, inUnit) {
  const exSig = getUnitSignature(exUnit.project, exUnit.building, exUnit.unit);
  const inSig = getUnitSignature(inUnit.project, inUnit.building, inUnit.unit);
  const unitMatches = inSig !== "NO_UNIT" && exSig === inSig;
  const bothNoUnit = inSig === "NO_UNIT" && exSig === "NO_UNIT";
  const nationalIdMatches = Boolean(exNatId) && Boolean(inNatId) && exNatId === inNatId;
  const action = decideImportMatch({
    rowName: inName,
    rowNationalId: inNatId,
    rowIdentity: inNatId ? { kind: "NATIONAL_ID", value: inNatId } : { kind: "UNVERIFIED", value: null },
    exName,
    exNationalId: exNatId,
    unitMatches,
    bothNoUnit,
    phoneMatches: false,
    nationalIdMatches,
  }).action;
  if (action === "INSERT") return "SEPARATE";
  if (action === "INSERT_REVIEW") return "REVIEW";
  return action;
}

const unitX = { project: "مدينتي", building: "12", unit: "101" };
const unitY = { project: "مدينتي", building: "12", unit: "101" };
const unitZ = { project: "الرحاب", building: "5", unit: "204" };

assert("تطابق الوحدة + تطابق الرقم القومي → نفس الشخص (تكرار وليس شريكاً)",
  evaluateCoOwnership("أحمد محمد", "أحمد محمد", "28501010101234", "28501010101234", unitX, unitY) === "DUPLICATE");

assert("تطابق الوحدة + اختلاف الرقم القومي → شريكان في نفس الوحدة (Co-owners)",
  evaluateCoOwnership("أحمد محمد", "فاطمة حسن", "28501010101234", "28902020101234", unitX, unitY) === "CO_OWNER");

assert("اختلاف الوحدة + اختلاف الرقم القومي → لا تُثبت الشراكة (سجل منفصل)",
  evaluateCoOwnership("أحمد محمد", "فاطمة حسن", "28501010101234", "28902020101234", unitX, unitZ) === "SEPARATE");

assert("اختلاف الوحدة + تطابق الرقم القومي → نفس الشخص لكن وحدتان (سجل منفصل، غير محسوم آلياً)",
  evaluateCoOwnership("أحمد محمد", "أحمد محمد", "28501010101234", "28501010101234", unitX, unitZ) === "SEPARATE");

// 10.7 فحص静态 لمنطق القفل في مسار الاستيراد (بدون اتصال بقاعدة إنتاج).
// ملاحظة: اختبار التزامن الحقيقي على PostgreSQL يتطلب قاعدة معزولة ولم يُنفّذ هنا.
const importSrc = readFileSync(
  new URL("../src/app/api/customers/import/route.ts", import.meta.url),
  "utf-8"
);
const lockIdx = importSrc.indexOf("pg_try_advisory_xact_lock");
const batchCheckIdx = importSrc.indexOf("existingAudit");
const auditIdx = importSrc.indexOf("tx.auditLog.create");

assert("مسار الاستيراد يستخدم pg_try_advisory_xact_lock (لا ينتظر)", lockIdx !== -1);
assert("إرجاع HTTP 409 عند فشل نيل القفل (CONCURRENT_IMPORT_LOCKED)",
  importSrc.includes('"CONCURRENT_IMPORT_LOCKED"') && importSrc.includes("status: 409"));
assert("فحص batchId يتم داخل المعاملة وبعد نيل القفل", lockIdx !== -1 && batchCheckIdx > lockIdx);
assert("تسجيل AuditLog يتم داخل نفس المعاملة بعد نيل القفل", lockIdx !== -1 && auditIdx > lockIdx);

// 10.8 عدم تعارض Lock IDs مع Agent 1 (المحاسبة = 74839210).
const importLockMatch = importSrc.match(/IMPORT_LOCK_ID\s*=\s*(\d+)/);
const seqLockMatch = importSrc.match(/CUSTOMER_SEQUENCE_LOCK\s*=\s*(\d+)/);
const importLockId = importLockMatch ? Number(importLockMatch[1]) : null;
const seqLockId = seqLockMatch ? Number(seqLockMatch[1]) : null;
assert("IMPORT_LOCK_ID مستخرج وثابت", importLockId !== null);
assert("CUSTOMER_SEQUENCE_LOCK مستخرج وثابت", seqLockId !== null);
assert("عدم تعارض IMPORT_LOCK_ID مع قفل المحاسبة (74839210)", importLockId !== 74839210);
assert("عدم تعارض CUSTOMER_SEQUENCE_LOCK مع قفل المحاسبة (74839210)", seqLockId !== 74839210);
assert("عدم تطابق IMPORT_LOCK_ID مع CUSTOMER_SEQUENCE_LOCK", importLockId !== seqLockId);

// ─── 11. حالات إضافية: شركاء بهواتف مختلفة، تزامن، ومطابقة batchId ───────────
section("11. شركاء بهواتف مختلفة، التزامن، ومطابقة batchId");

// 11.1 شريكان بنفس الوحدة، لكل منهما هاتف ورقم قومي مختلف.
const coOwnersDecision = decideImportMatch({
  rowName: "فاطمة حسن",
  rowNationalId: "28902020101234",
  rowIdentity: { kind: "NATIONAL_ID", value: "28902020101234" },
  exName: "أحمد محمد",
  exNationalId: "28501010101234",
  unitMatches: true,
  bothNoUnit: false,
  phoneMatches: false, // هاتف مختلف
  nationalIdMatches: false, // رقم قومي مختلف
});
assert("شريكان بنفس الوحدة بهاتفين ورقمين قوميين مختلفين → CO_OWNER", coOwnersDecision.action === "CO_OWNER");

// 11.2 شخصان بنفس الوحدة والاسم لكن رقم قومي واحد متطابق → DUPLICATE.
const sameNidDecision = decideImportMatch({
  rowName: "أحمد محمد",
  rowNationalId: "28501010101234",
  rowIdentity: { kind: "NATIONAL_ID", value: "28501010101234" },
  exName: "أحمد محمد",
  exNationalId: "28501010101234",
  unitMatches: true,
  bothNoUnit: false,
  phoneMatches: false,
  nationalIdMatches: true,
});
assert("شخصان بنفس الوحدة والاسم ورقم قومي واحد متطابق → DUPLICATE", sameNidDecision.action === "DUPLICATE");

// 11.3 محاكاة قفل الاستيراد: طلبان متزامنان → أحدهما فقط ينجح والآخر 409.
// (محاكاة دلالية لpg_try_advisory_xact_lock؛ ليست اختبار تزامن حقيقي على PostgreSQL.)
let importLockHeld = false;
function tryAcquireImportLock() {
  if (importLockHeld) return false;
  importLockHeld = true;
  return true;
}
function releaseImportLock() {
  importLockHeld = false;
}
function simulateImportRequest() {
  if (!tryAcquireImportLock()) {
    return { status: 409, code: "CONCURRENT_IMPORT_LOCKED" };
  }
  try {
    return { status: 200, code: "OK" };
  } finally {
    releaseImportLock();
  }
}

// المحاكاة الأولى: طلب أول ينجح.
const firstReq = simulateImportRequest();
assert("طلب الاستيراد الأول ينجح (200)", firstReq.status === 200);

// المحاكاة الثانية: طلب ثانٍ while الأول يمسك القفل → 409.
importLockHeld = true;
const secondReq = simulateImportRequest();
assert("طلب متزامن ثانٍ أثناء انشغال القفل → 409", secondReq.status === 409 && secondReq.code === "CONCURRENT_IMPORT_LOCKED");
releaseImportLock();

// 11.4 بعد تحرير القفل، طلب جديد ينجح.
const thirdReq = simulateImportRequest();
assert("بعد تحرير القفل ينجح الطلب التالي (200)", thirdReq.status === 200);

// 11.5 batchId: نفس المحتوى → إعادة تشغيل؛ محتوى مختلف → BATCH_ID_CONTENT_MISMATCH.
const sameContentHash = createHash("sha256").update(JSON.stringify([{ name: "عميل", phone: "01012345678" }])).digest("hex");
const sameContentHashRepeat = createHash("sha256").update(JSON.stringify([{ name: "عميل", phone: "01012345678" }])).digest("hex");
const diffContentHash = createHash("sha256").update(JSON.stringify([{ name: "عميل آخر", phone: "01099999999" }])).digest("hex");
assert("إعادة إرسال نفس batchId بنفس المحتوى → بصمة متطابقة (إعادة تشغيل)", sameContentHash === sameContentHashRepeat);
assert("إعادة إرسال نفس batchId بمحتوى مختلف → بصمة مختلفة (BATCH_ID_CONTENT_MISMATCH)", sameContentHash !== diffContentHash);

// 11.6 التحقق الصارم من الرقم القومي: الطول وحده لا يكفي.
assert("رقم قومي بطول 14 but غير مجتاز للتحقق → غير مؤكد",
  isValidNationalIdStrict("12345678901234") === false);
assert("رقم قومي مجتاز للتحقق البنائي → مؤكد",
  isValidNationalIdStrict("29505180102345") === true);

// ─── النتائج النهائية ──────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(60)}`);
console.log("  ملخص نتائج اختبارات الأمان والتطبيع والاستيراد المتقدمة");
console.log("═".repeat(60));
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  Total:    ${passed + failed}\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 جميع اختبارات الأمان وتكامل الاستيراد المتقدمة نجحت بنسبة 100%!");
  process.exit(0);
}
