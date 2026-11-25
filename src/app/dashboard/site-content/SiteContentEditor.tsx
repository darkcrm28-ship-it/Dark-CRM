"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Globe, Image as ImageIcon, Search } from "lucide-react";
import type { CopyGroup } from "@/lib/public-site";
import { SITE_CONTENT_KEYS, SITE_PAGES, type SiteContent, type SiteContentKey } from "@/lib/public-site-types";
import styles from "./editor.module.css";

type PageContent = Record<SiteContentKey, SiteContent>;
type Notice = { error: boolean; text: string };

export default function SiteContentEditor({ initialContent, groups }: {
  initialContent: PageContent;
  groups: Record<SiteContentKey, CopyGroup[]>;
}) {
  const [active, setActive] = useState<SiteContentKey>("home");
  const [published, setPublished] = useState(initialContent);
  const [drafts, setDrafts] = useState(initialContent);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [conflict, setConflict] = useState(false);
  const draft = drafts[active];
  const isShared = active === "shared";
  const page = isShared ? null : SITE_PAGES[active];
  const dirty = JSON.stringify(draft) !== JSON.stringify(published[active]);
  const search = query.trim().toLocaleLowerCase("ar");
  const fields = groups[active].map(group => ({
    ...group,
    fields: group.fields.filter(field => !search ||
      [group.label, field.label, field.value, draft.overrides[field.key]].some(value => value?.toLocaleLowerCase("ar").includes(search))),
  })).filter(group => group.fields.length > 0);

  function update(change: Partial<SiteContent>) {
    setDrafts(current => ({ ...current, [active]: { ...current[active], ...change } }));
    setNotice(null);
  }

  function setText(key: string, value: string, defaultValue: string) {
    const overrides = { ...draft.overrides };
    if (value === defaultValue) delete overrides[key];
    else overrides[key] = value;
    update({ overrides });
  }

  function selectPage(key: SiteContentKey) {
    setActive(key);
    setQuery("");
    setNotice(null);
    setConflict(false);
  }

  function acceptPublished(value: SiteContent) {
    setPublished(current => ({ ...current, [active]: value }));
    setDrafts(current => ({ ...current, [active]: value }));
    setConflict(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploading || !dirty) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/settings/public-site/${active}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) {
        setConflict(response.status === 409);
        throw new Error(result.error || "تعذّر نشر التعديلات.");
      }
      acceptPublished(result);
      setNotice({ error: false, text: "تم نشر التعديلات. قد يستغرق ظهورها على الموقع حتى 30 ثانية." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "تعذّر الاتصال. حاول مرة أخرى." });
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    setBusy(true);
    try {
      const response = await fetch(`/api/settings/public-site/${active}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to reload");
      acceptPublished(await response.json());
      setNotice({ error: false, text: "تم تحميل النسخة المنشورة." });
    } catch {
      setNotice({ error: true, text: "تعذّر تحميل النسخة المنشورة." });
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file || uploading || busy) return;
    setNotice(null);
    if (file.size > 500 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice({ error: true, text: "اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 500 كيلوبايت." });
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload?purpose=site-content", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") throw new Error(result.error || "تعذّر رفع الصورة.");
      update({ heroImage: result.url });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "تعذّر رفع الصورة." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.editor}>
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة صفحات الموقع</h1>
          <p className="page-subtitle">عدّل النصوص والصور وحدد الصفحات المتاحة للزوار.</p>
        </div>
      </div>
      <div className={styles.layout}>
        <nav className={styles.pages} aria-label="صفحات الموقع">
          {SITE_CONTENT_KEYS.map(key => (
            <button type="button" key={key} onClick={() => selectPage(key)} disabled={busy || uploading}
              className={styles.pageButton} aria-current={active === key ? "page" : undefined}>
              <span>{key === "shared" ? "القائمة والفوتر" : SITE_PAGES[key].title}</span>
              <small>{key === "shared" ? "مشترك" : published[key].enabled ? "معروضة" : "متوقفة"}</small>
            </button>
          ))}
        </nav>

        <form className={styles.form} onSubmit={save}>
          <section className={styles.summary} aria-labelledby="site-page-title">
            <div>
              <h2 id="site-page-title">{page?.title ?? "القائمة والفوتر"}</h2>
              {page && <a className={styles.pageLink} href={page.path} target="_blank" rel="noreferrer">
                عرض الصفحة المنشورة <ArrowUpRight size={14} />
              </a>}
            </div>
            {page && <label className={styles.toggle}>
              <input type="checkbox" checked={draft.enabled} onChange={event => update({ enabled: event.target.checked })} disabled={busy} />
              إتاحة الصفحة للزوار
            </label>}
          </section>
          {active === "properties" && <p className="page-subtitle">
            لتعديل الوحدات المعروضة، افتح <a href="/dashboard/properties" className={styles.pageLink}>إدارة الوحدات</a>.
          </p>}
          {page && <section className={styles.media} aria-label="صورة الغلاف">
            <div className={styles.thumbnail}>
              {draft.heroImage ? <img src={draft.heroImage} alt="صورة الغلاف" /> : <ImageIcon aria-hidden size={26} />}
            </div>
            <div className={styles.mediaBody}>
              <strong>صورة الغلاف</strong>
              <label className="btn btn-secondary btn-sm">
                {uploading ? "جاري رفع الصورة…" : "اختر صورة"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className={styles.file} disabled={busy || uploading}
                  onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
              </label>
              {draft.heroImage && <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => update({ heroImage: "" })} disabled={busy || uploading}>استعادة الغلاف الأصلي</button>}
            </div>
          </section>}

          <label className={styles.search}>
            <Search size={16} aria-hidden />
            <input className="input" type="search" value={query} placeholder="ابحث عن نص داخل الصفحة"
              aria-label="ابحث عن نص داخل الصفحة" onChange={event => setQuery(event.target.value)} />
          </label>
          {fields.length === 0 && <p className="page-subtitle">مفيش نصوص مطابقة للبحث.</p>}
          {fields.map((group, index) => (
            <details key={active + group.label} className={styles.group} open={!!search || index === 0}>
              <summary>{group.label}<span>{group.fields.length} نص</span></summary>
              <div className={styles.fields}>
                {group.fields.map(field => {
                  const value = draft.overrides[field.key] ?? field.value;
                  const id = `site-${field.key}`;
                  return <div className={styles.field} key={field.key}>
                    <label htmlFor={id}>{field.label}</label>
                    {field.value.length > 90 ? (
                      <textarea className="input" id={id} value={value} rows={3} maxLength={2000} disabled={busy}
                        onChange={event => setText(field.key, event.target.value, field.value)} />
                    ) : (
                      <input className="input" id={id} value={value} maxLength={2000} disabled={busy}
                        onChange={event => setText(field.key, event.target.value, field.value)} />
                    )}
                    {/\{\d+\}/.test(field.value) && <small className={styles.tip}>الأرقام بين الأقواس بتتحول لقيم زي عدد النتائج.</small>}
                    {value !== field.value && <button type="button" className={styles.reset} disabled={busy}
                      onClick={() => setText(field.key, field.value, field.value)}>استعادة النص الأصلي</button>}
                  </div>;
                })}
              </div>
            </details>
          ))}

          <div className={styles.actions}>
            <div>
              {notice ? <p role={notice.error ? "alert" : "status"} className={notice.error ? styles.error : styles.success}>{notice.text}</p> :
                <p className="page-subtitle">{dirty ? "فيه تعديلات جاهزة للنشر." : "كل التعديلات منشورة."}</p>}
              {conflict && <button type="button" className="btn btn-secondary btn-sm" onClick={() => void reload()} disabled={busy}>
                تحميل النسخة المنشورة
              </button>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={!dirty || busy || uploading}>
              <Globe size={17} aria-hidden /> {busy ? "جاري الحفظ…" : "حفظ ونشر"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
