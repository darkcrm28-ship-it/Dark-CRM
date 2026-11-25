import "server-only";
import { normalizeEgyptianPhone } from "@/lib/excel-normalizer";

type JsonObject = Record<string, unknown>;
export const object = (value: unknown): JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, limit: number) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

export class IntegrationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function providerGet(url: URL, token: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...headers },
  });
  if (response.status === 429) {
    throw new IntegrationError("وصل مزود الخدمة إلى حد الطلبات. جرّب لاحقًا.", 429);
  }
  if (response.status === 401 || response.status === 403) {
    throw new IntegrationError("رفض مزود الخدمة الاتصال. راجع المفتاح وصلاحيات الحساب.", 502);
  }
  if (!response.ok) throw new IntegrationError("تعذّر تحميل البيانات من مزود الخدمة.", 502);
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new IntegrationError("تنسيق رد مزود الخدمة غير متوقع.", 502);
  }
  return object(data);
}

function whatsappConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const account = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || "";
  const version = process.env.META_GRAPH_VERSION?.trim() || "";
  return token && /^\d{1,24}$/.test(account) && /^v\d{1,3}\.\d{1,2}$/.test(version)
    ? { token, account, version } : null;
}

function linkedinConfig() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN?.trim();
  const account = process.env.LINKEDIN_AD_ACCOUNT_ID?.trim() || "";
  const version = process.env.LINKEDIN_API_VERSION?.trim() || "";
  const formId = process.env.LINKEDIN_LEAD_FORM_ID?.trim() || "";
  const revision = process.env.LINKEDIN_LEAD_FORM_REVISION?.trim() || "";
  const firstNameId = process.env.LINKEDIN_FIRST_NAME_QUESTION_ID?.trim() || "";
  const lastNameId = process.env.LINKEDIN_LAST_NAME_QUESTION_ID?.trim() || "";
  const phoneId = process.env.LINKEDIN_PHONE_QUESTION_ID?.trim() || "";
  const emailId = process.env.LINKEDIN_EMAIL_QUESTION_ID?.trim() || "";
  const consentId = process.env.LINKEDIN_CONTACT_CONSENT_ID?.trim() || "";
  const requiredIds = [account, formId, revision, firstNameId, phoneId, consentId];
  if (!token || !/^20\d{2}(0[1-9]|1[0-2])$/.test(version) ||
      requiredIds.some((id) => !/^\d{1,24}$/.test(id)) ||
      [lastNameId, emailId].some((id) => id && !/^\d{1,24}$/.test(id))) return null;
  return {
    token, account, version, firstNameId, lastNameId, phoneId, emailId, consentId,
    owner: `urn:li:sponsoredAccount:${account}`,
    form: `urn:li:versionedLeadGenForm:(urn:li:leadGenForm:${formId},${revision})`,
  };
}

export function getIntegrationAvailability() {
  return {
    whatsapp: Boolean(whatsappConfig()),
    twitter: Boolean(process.env.X_BEARER_TOKEN?.trim()),
    linkedin: Boolean(linkedinConfig()),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim()),
  };
}

export async function getWhatsAppTemplates() {
  const config = whatsappConfig();
  if (!config) throw new IntegrationError("اضبط أسرار WhatsApp Business على الخادم.", 503);
  const url = new URL(`https://graph.facebook.com/${config.version}/${config.account}/message_templates`);
  url.search = new URLSearchParams({ limit: "50", fields: "id,name,language,status,category" }).toString();
  const data = await providerGet(url, config.token);
  const templates = array(data.data).slice(0, 50).map((value) => {
    const row = object(value);
    return {
      id: text(row.id, 40), name: text(row.name, 512), language: text(row.language, 30),
      status: text(row.status, 40), category: text(row.category, 40),
    };
  }).filter(({ id, name }) => id && name);
  return { templates, more: Boolean(object(data.paging).next) };
}

export async function searchRecentXPosts(query: string) {
  const token = process.env.X_BEARER_TOKEN?.trim();
  if (!token) throw new IntegrationError("اضبط مفتاح X API على الخادم.", 503);
  const q = query.trim();
  if (!q || q.length > 200) throw new IntegrationError("أدخل استعلامًا من 1 إلى 200 حرف.", 400);
  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.search = new URLSearchParams({
    query: q, max_results: "20", "tweet.fields": "created_at,author_id",
  }).toString();
  const data = await providerGet(url, token);
  if (!Array.isArray(data.data) && Array.isArray(data.errors) && data.errors.length > 0) {
    throw new IntegrationError("تعذّر تنفيذ البحث على X. راجع الاستعلام وصلاحيات الحساب.", 502);
  }
  return array(data.data).slice(0, 20).map((value) => {
    const row = object(value);
    return { id: text(row.id, 25), text: text(row.text, 4000), createdAt: text(row.created_at, 32) };
  }).filter(({ id, text: post }) => /^\d{1,25}$/.test(id) && post);
}

type LinkedInConfig = NonNullable<ReturnType<typeof linkedinConfig>>;
export type LinkedInLead = { id: string; name: string; phone: string; email: string | null; submittedAt: string };
const leadIdPattern = /^[A-Za-z0-9_-]{1,120}$/;
export function isLinkedInLeadId(value: unknown): value is string {
  return typeof value === "string" && leadIdPattern.test(value);
}

function linkedInLead(value: unknown, config: LinkedInConfig, requireForm: boolean): LinkedInLead | null {
  const row = object(value);
  const response = object(row.formResponse);
  const form = row.versionedLeadGenFormUrn;
  if (!isLinkedInLeadId(row.id) || row.testLead !== false || row.leadType !== "SPONSORED" ||
      object(row.owner).sponsoredAccount !== config.owner ||
      ((requireForm || form != null) && form !== config.form) ||
      !array(response.consentResponses).some((entry) => {
        const consent = object(entry);
        return String(consent.consentId) === config.consentId && consent.accepted === true;
      })) return null;

  const answers = new Map<string, string>();
  for (const entry of array(response.answers)) {
    const answer = object(entry);
    answers.set(String(answer.questionId),
      text(object(object(answer.answerDetails).textQuestionAnswer).answer, 254));
  }
  const name = [answers.get(config.firstNameId), answers.get(config.lastNameId)].filter(Boolean).join(" ").slice(0, 120);
  const phone = normalizeEgyptianPhone(answers.get(config.phoneId));
  const email = answers.get(config.emailId)?.toLowerCase();
  const date = new Date(typeof row.submittedAt === "number" ? row.submittedAt : NaN);
  if (!name || !phone.isValid || !Number.isFinite(date.getTime())) return null;
  return { id: row.id, name, phone: phone.phone, email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    submittedAt: date.toISOString() };
}

function linkedInHeaders(config: LinkedInConfig) {
  return { "Linkedin-Version": config.version, "X-Restli-Protocol-Version": "2.0.0" };
}

export async function listLinkedInLeads(start: number) {
  const config = linkedinConfig();
  if (!config) throw new IntegrationError("اضبط صلاحيات LinkedIn Lead Sync وربط حقول النموذج على الخادم.", 503);
  const pageSize = 20;
  const url = new URL("https://api.linkedin.com/rest/leadFormResponses");
  const options = new URLSearchParams({
    versionedLeadGenFormUrn: config.form, limitedToTestLeads: "false", start: String(start), count: String(pageSize),
  });
  url.search = `q=owner&owner=(sponsoredAccount:${encodeURIComponent(config.owner)})&leadType=(leadType:SPONSORED)&${options}`;
  const data = await providerGet(url, config.token, linkedInHeaders(config));
  if (!Array.isArray(data.elements)) throw new IntegrationError("تنسيق بيانات LinkedIn غير متوقع.", 502);
  const rows = data.elements.slice(0, pageSize);
  const paging = object(data.paging);
  const more = array(paging.links).some((entry) => object(entry).rel === "next") ||
    (typeof paging.total === "number" && start + rows.length < paging.total);
  return { account: config.account, leads: rows.map((row) => linkedInLead(row, config, false))
    .filter((lead): lead is LinkedInLead => lead !== null), more, start, pageSize };
}

export async function getLinkedInLead(id: string) {
  const config = linkedinConfig();
  if (!config) throw new IntegrationError("اضبط صلاحيات LinkedIn Lead Sync وربط حقول النموذج على الخادم.", 503);
  const url = new URL(`https://api.linkedin.com/rest/leadFormResponses/${encodeURIComponent(id)}`);
  const data = await providerGet(url, config.token, linkedInHeaders(config));
  const lead = linkedInLead(data, config, true);
  if (!lead || lead.id !== id) throw new IntegrationError("استجابة النموذج غير مؤهلة للاستيراد.", 422);
  return { account: config.account, lead };
}
