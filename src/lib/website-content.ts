import type { WebsiteDatabase } from "./website-db";
import type { SiteContent, SiteContentKey } from "./public-site-types";

// The current editor saves one set of overrides for both languages.
export async function saveWebsitePage(db: WebsiteDatabase, key: SiteContentKey, update: SiteContent, userId: string) {
  const eventId = crypto.randomUUID();
  const content = JSON.stringify({...update,revision:update.revision+1,editId:eventId});
  const save = db.prepare(`INSERT INTO site_pages(slug,locale,enabled,content_json)
    SELECT ?,'ar',?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM site_pages WHERE slug=? AND locale='ar')
    ON CONFLICT(slug,locale) DO UPDATE SET enabled=excluded.enabled,content_json=excluded.content_json
    WHERE json_extract(site_pages.content_json,'$.revision')=?`)
    .bind(key,+update.enabled,content,update.revision,key,update.revision);
  const mirror = db.prepare(`INSERT INTO site_pages(slug,locale,enabled,content_json)
    SELECT slug,'en',enabled,content_json FROM site_pages
    WHERE slug=? AND locale='ar' AND json_extract(content_json,'$.editId')=?
    ON CONFLICT(slug,locale) DO UPDATE SET enabled=excluded.enabled,content_json=excluded.content_json`).bind(key,eventId);
  const audit = db.prepare(`INSERT INTO sync_outbox(event_id,event_type,entity_id)
    SELECT ?,'page_audit',? FROM site_pages WHERE slug=? AND locale='ar' AND json_extract(content_json,'$.editId')=?`)
    .bind(eventId,JSON.stringify({userId,page:key,revision:update.revision+1,enabled:update.enabled}),key,eventId);
  const [result] = await db.batch([save,mirror,audit]) as [{meta:{changes:number}}];
  return !!result.meta.changes;
}

export async function initializeWebsiteContent(db: WebsiteDatabase) {
  const key = "content_import_complete";
  if (await db.prepare("SELECT key FROM site_settings WHERE key=?").bind(key).first()) return;
  const {readCrmSiteContent} = await import("./public-site");
  const existing = await readCrmSiteContent();
  const statements = Object.entries(existing).flatMap(([slug,page]) => ["ar","en"].map(locale =>
    db.prepare("INSERT INTO site_pages(slug,locale,enabled,content_json) VALUES(?,?,?,?) ON CONFLICT DO NOTHING")
      .bind(slug,locale,+page.enabled,JSON.stringify(page))));
  statements.push(db.prepare("INSERT INTO site_settings(key,value_json) VALUES(?,'true') ON CONFLICT DO NOTHING").bind(key));
  await db.batch(statements);
}
