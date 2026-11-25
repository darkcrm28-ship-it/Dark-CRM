"use client";

import { useState } from "react";

const platforms = [
  { id: "whatsapp", name: "WhatsApp Business", icon: "💬", color: "#25D366" },
  { id: "telegram", name: "Telegram Bot", icon: "✈️", color: "#0088cc" },
  { id: "twitter", name: "X", icon: "𝕏", color: "#888" },
  { id: "linkedin", name: "LinkedIn Leads", icon: "🔗", color: "#0077b5" },
] as const;

type Platform = typeof platforms[number]["id"];
type Template = { id: string; name: string; language: string; status: string; category: string };
type XPost = { id: string; text: string; createdAt: string };
type Lead = { id: string; name: string; phoneLastDigits: string; submittedAt: string; processed: boolean };
type LeadPage = { leads: Lead[]; more: boolean; pageSize: number; start: number };

async function readResponse<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || "تعذّر إكمال طلب التكامل.");
  return data as T;
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeZone: "Africa/Cairo" }).format(date);
}

export default function IntegrationsClient({ configured }: { configured: Record<Platform, boolean> }) {
  const [activeTab, setActiveTab] = useState<Platform>("whatsapp");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState<{ templates: Template[]; more: boolean } | null>(null);
  const [posts, setPosts] = useState<XPost[] | null>(null);
  const [leadPage, setLeadPage] = useState<LeadPage | null>(null);
  const currentPlatform = platforms.find(({ id }) => id === activeTab);

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذّر الاتصال بمزود الخدمة.");
    } finally {
      setBusy(false);
    }
  }

  function loadLeads(start = 0) {
    return perform(async () => {
      setLeadPage(await readResponse<LeadPage>(`/api/integrations/linkedin?start=${start}`));
    });
  }

  function importLead(id: string) {
    return perform(async () => {
      const response = await readResponse<{ outcome: "IMPORTED" | "PHONE_EXISTS" | "PROCESSED" }>(
        `/api/integrations/linkedin?id=${encodeURIComponent(id)}`, { method: "POST" }
      );
      const messages = {
        IMPORTED: "تم إضافة العميل المحتمل إلى CRM.",
        PHONE_EXISTS: "الرقم موجود بالفعل. لم تُعدّل بيانات العميل.",
        PROCESSED: "سبق التعامل مع هذه الاستجابة.",
      };
      setMessage(messages[response.outcome]);
      setLeadPage((page) => page && ({
        ...page,
        leads: page.leads.map((lead) => lead.id === id ? { ...lead, processed: true } : lead),
      }));
    });
  }

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">تكامل المنصات الاجتماعية</h1>
          <p className="page-subtitle">قوالب واتساب، بحث X، عملاء LinkedIn وتنبيهات تليجرام</p>
        </div>
      </div>

      <div className="grid-4 animate-in-1" style={{ marginBottom: 24 }}>
        {platforms.map((platform) => (
          <button type="button" aria-pressed={activeTab === platform.id}
            key={platform.id}
            disabled={busy}
            onClick={() => { setActiveTab(platform.id); setMessage(""); setError(""); }}
            className={`card ${activeTab === platform.id ? "card-gold" : ""}`}
            style={{ borderTop: `3px solid ${platform.color}`, display: "flex", alignItems: "center", gap: 12, padding: "16px 20px" }}
          >
            <span style={{ fontSize: 24 }}>{platform.icon}</span>
            <span style={{ fontWeight: 700 }}>{platform.name}</span>
          </button>
        ))}
      </div>

      <section className="card animate-in-2" aria-busy={busy}>
        <h2 style={{ marginBottom: 16 }}>{currentPlatform?.name}</h2>
        {!configured[activeTab] && <p>اضبط بيانات هذا التكامل في أسرار الخادم لتفعيله.</p>}
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}

        {activeTab === "telegram" && (
          <button type="button" className="btn btn-secondary" disabled={busy || !configured.telegram} onClick={() =>
            void perform(async () => {
              const data = await readResponse<{ success: boolean }>("/api/integrations/telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "رسالة اختبار من Dark CRM" }),
              });
              if (!data.success) throw new Error("تعذّر إرسال الرسالة.");
              setMessage("تم إرسال الرسالة.");
            })
          }>
            {busy ? "جاري الإرسال…" : "إرسال رسالة تجريبية"}
          </button>
        )}

        {activeTab === "whatsapp" && (
          <>
            <button type="button" className="btn btn-secondary" disabled={busy || !configured.whatsapp} onClick={() =>
              void perform(async () => setTemplates(await readResponse("/api/integrations/whatsapp")))
            }>{busy ? "جاري التحميل…" : "تحميل القوالب من Meta"}</button>
            {templates?.templates.length === 0 && <p>لا توجد قوالب.</p>}
            {!!templates?.templates.length && (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>القالب</th><th>اللغة</th><th>الحالة</th><th>التصنيف</th></tr></thead>
                  <tbody>{templates.templates.map((row) => (
                    <tr key={row.id}><td dir="ltr">{row.name}</td><td>{row.language}</td><td>{row.status}</td><td>{row.category}</td></tr>
                  ))}</tbody>
                </table>
                {templates.more && <p>يعرض الجدول أول 50 قالبًا. يمكنك إدارة القائمة الكاملة من حساب Meta.</p>}
              </div>
            )}
          </>
        )}

        {activeTab === "twitter" && (
          <>
            <form onSubmit={(event) => {
              event.preventDefault();
              if (!query.trim()) return;
              void perform(async () => {
                setPosts(null);
                const options = new URLSearchParams({ q: query.trim() });
                const result = await readResponse<{ posts: XPost[] }>(`/api/integrations/twitter?${options}`);
                setPosts(result.posts);
              });
            }}>
              <label className="form-label" htmlFor="integrations-x-query">كلمات البحث</label>
              <input id="integrations-x-query" className="input" maxLength={200} value={query}
                onChange={(event) => setQuery(event.target.value)} placeholder="اسم الشركة أو كلمات السوق العقاري" />
              <button type="submit" className="btn btn-secondary" disabled={busy || !query.trim() || !configured.twitter}>
                {busy ? "جاري البحث…" : "بحث في منشورات آخر 7 أيام"}
              </button>
            </form>
            {posts?.length === 0 && <p>لا توجد نتائج مطابقة.</p>}
            {!!posts?.length && <ul>{posts.map((post) => (
              <li key={post.id}>
                <p>{post.text}</p>
                <a href={`https://x.com/i/web/status/${post.id}`} target="_blank" rel="noopener noreferrer">
                  عرض المنشور {dateLabel(post.createdAt)}
                </a>
              </li>
            ))}</ul>}
          </>
        )}

        {activeTab === "linkedin" && (
          <>
            <button type="button" className="btn btn-secondary" disabled={busy || !configured.linkedin} onClick={() => void loadLeads()}>
              {busy ? "جاري التنفيذ…" : "تحميل الاستجابات المؤهلة"}
            </button>
            {leadPage && (
              <>
                {leadPage.leads.length === 0 && <p>لا توجد استجابات مؤهلة في هذه الصفحة.</p>}
                {!!leadPage.leads.length && (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead><tr><th>الاسم</th><th>آخر 4 أرقام</th><th>تاريخ الاستجابة</th><th>الإجراء</th></tr></thead>
                      <tbody>{leadPage.leads.map((lead) => (
                        <tr key={lead.id}>
                          <td>{lead.name}</td><td dir="ltr">{lead.phoneLastDigits}</td><td>{dateLabel(lead.submittedAt)}</td>
                          <td><button type="button" className="btn btn-secondary btn-sm" disabled={busy || lead.processed} onClick={() => void importLead(lead.id)}>
                            {lead.processed ? "تمت المراجعة" : "استيراد إلى CRM"}
                          </button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                <nav aria-label="صفحات LinkedIn" style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn btn-ghost" disabled={busy || leadPage.start === 0} onClick={() => void loadLeads(leadPage.start - leadPage.pageSize)}>السابق</button>
                  <button type="button" className="btn btn-ghost" disabled={busy || !leadPage.more} onClick={() => void loadLeads(leadPage.start + leadPage.pageSize)}>التالي</button>
                </nav>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
