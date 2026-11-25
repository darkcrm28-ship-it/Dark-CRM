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

function databaseTarget(rawUrl) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim().replace(/^(["'])(.*)\1$/, "$2"));
    if (!/^postgres(?:ql)?:$/.test(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase().replace(/\.$/, "").replace(/-pooler(?=\.)/i, "");
    const database = decodeURIComponent(parsed.pathname.slice(1)).toLowerCase();
    if (!host || !database) return null;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(host);
    const key = local ? `loopback:${parsed.port || "5432"}/${database}` : host;
    return { key, database, local };
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
const testTarget = databaseTarget(testValues.DATABASE_URL);
const directTarget = databaseTarget(testValues.DIRECT_URL);
if (!testTarget || !directTarget || testTarget.key !== directTarget.key || testTarget.database !== directTarget.database) {
  fail("يجب ضبط DATABASE_URL وDIRECT_URL صالحين للفرع نفسه في .env.test؛ لم يتم فتح أي اتصال.");
}
if (typeof testValues.JWT_SECRET !== "string" || testValues.JWT_SECRET.length < 32) {
  fail("يجب ضبط JWT_SECRET تجريبي بطول 32 محرفًا على الأقل في .env.test؛ لم يتم فتح أي اتصال.");
}

const envFiles = [".env", ".env.local", ".env.production", ".env.production.local", ".env.development", ".env.development.local"];
const configuredTargets = [process.env, ...envFiles.map((file) => parseEnvFile(path.join(root, file)))]
  .flatMap((values) => [values.DATABASE_URL, values.DIRECT_URL, values.DARK_CRM_BACKUP_URL])
  .map(databaseTarget).filter(Boolean);

if (configuredTargets.some(({ key }) => key === testTarget.key)) {
  fail("وجهة .env.test تطابق وجهة بيئة أخرى. استخدم فرع Neon منفصلًا؛ لم يتم فتح أي اتصال.");
}

if (/(^|[._-])(prod|production)([._-]|$)/i.test(`${testTarget.key}.${testTarget.database}`) ||
    (testTarget.local && !/^dark_crm_(test|restore)_[a-z0-9_]+$/.test(testTarget.database))) {
  fail("اسم وجهة الاختبار يبدو كبيئة إنتاج. غيّر الوجهة إلى فرع اختبار؛ لم يتم فتح أي اتصال.");
}

Object.assign(process.env, {
  DATABASE_URL: testValues.DATABASE_URL,
  DIRECT_URL: testValues.DIRECT_URL,
  JWT_SECRET: testValues.JWT_SECRET,
});
console.log("✅ تم تحميل .env.test بعد التحقق من اختلاف وجهتها عن إعدادات .env و .env.production.\n");
