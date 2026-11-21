const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const testEnvPath = path.join(root, ".env.test");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim();
    }
    values[key] = value;
  }
  return values;
}

function targetFingerprint(rawUrl) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (!/^postgres(?:ql)?:$/.test(parsed.protocol)) return null;
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, "").toLowerCase()}`;
  } catch {
    return null;
  }
}

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(testEnvPath)) {
  fail("قاعدة الاختبار غير مضبوطة. أنشئ .env.test من .env.test.example وضع بيانات فرع اختبار منفصل؛ لم يتم فتح أي اتصال.");
}

const testValues = parseEnvFile(testEnvPath);
const testTarget = targetFingerprint(testValues.DATABASE_URL);
const directTarget = targetFingerprint(testValues.DIRECT_URL);
const normalizeNeonTarget = (target) => target?.replace(/-pooler(?=\.)/i, "") || null;
if (!testTarget || !directTarget || normalizeNeonTarget(testTarget) !== normalizeNeonTarget(directTarget)) {
  fail("يجب ضبط DATABASE_URL وDIRECT_URL صالحين للفرع نفسه في .env.test؛ لم يتم فتح أي اتصال.");
}
if (typeof testValues.JWT_SECRET !== "string" || testValues.JWT_SECRET.length < 32) {
  fail("يجب ضبط JWT_SECRET تجريبي بطول 32 محرفًا على الأقل في .env.test؛ لم يتم فتح أي اتصال.");
}

const configuredTargets = [
  process.env.DATABASE_URL,
  parseEnvFile(path.join(root, ".env")).DATABASE_URL,
  parseEnvFile(path.join(root, ".env.production")).DATABASE_URL,
].map(targetFingerprint).filter(Boolean);

if (configuredTargets.includes(testTarget)) {
  fail("وجهة .env.test تطابق وجهة بيئة أخرى. استخدم فرع Neon منفصلًا؛ لم يتم فتح أي اتصال.");
}

if (/([._-])(prod|production)([._-]|$)/i.test(testTarget)) {
  fail("اسم وجهة الاختبار يبدو كبيئة إنتاج. غيّر الوجهة إلى فرع اختبار؛ لم يتم فتح أي اتصال.");
}

Object.assign(process.env, testValues);
console.log("✅ تم تحميل .env.test بعد التحقق من اختلاف وجهتها عن إعدادات .env و .env.production.\n");
