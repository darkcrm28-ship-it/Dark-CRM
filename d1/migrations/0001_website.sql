-- Website-owned content and approved CRM projections only.
CREATE TABLE IF NOT EXISTS site_pages (
  slug TEXT NOT NULL, locale TEXT NOT NULL CHECK(locale IN ('ar','en')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  content_json TEXT NOT NULL CHECK(json_valid(content_json)),
  PRIMARY KEY(slug, locale)
);
CREATE TABLE IF NOT EXISTS public_projects (
  crm_id TEXT PRIMARY KEY NOT NULL, slug TEXT NOT NULL UNIQUE,
  public_json TEXT NOT NULL CHECK(json_valid(public_json)), source_version INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS public_listings (
  crm_id TEXT PRIMARY KEY NOT NULL, project_id TEXT,
  purpose TEXT, zone TEXT, unit_type TEXT, public_price REAL, area REAL, rooms INTEGER,
  public_json TEXT NOT NULL CHECK(json_valid(public_json)),
  published_at TEXT NOT NULL, source_version INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS listings_catalog ON public_listings(purpose,zone,public_price);
CREATE TABLE IF NOT EXISTS website_leads (
  reference TEXT PRIMARY KEY NOT NULL, request_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL, payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, synced_at TEXT
);
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY NOT NULL, value_json TEXT NOT NULL CHECK(json_valid(value_json))
);
CREATE TABLE IF NOT EXISTS site_banners (
  id TEXT PRIMARY KEY NOT NULL, position INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  public_json TEXT NOT NULL CHECK(json_valid(public_json))
);
CREATE TABLE IF NOT EXISTS site_articles (
  slug TEXT NOT NULL, locale TEXT NOT NULL CHECK(locale IN ('ar','en')),
  published_at TEXT, content_json TEXT NOT NULL CHECK(json_valid(content_json)),
  PRIMARY KEY(slug,locale)
);
CREATE TABLE IF NOT EXISTS sync_outbox (
  event_id TEXT PRIMARY KEY NOT NULL, event_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, available_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_token TEXT, lease_until TEXT, attempts INTEGER NOT NULL DEFAULT 0, delivered_at TEXT
);
CREATE INDEX IF NOT EXISTS outbox_ready ON sync_outbox(available_at) WHERE delivered_at IS NULL;
CREATE TABLE IF NOT EXISTS sync_events (
  event_id TEXT PRIMARY KEY NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  source_version INTEGER NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS sync_entity_version ON sync_events(entity_type,entity_id,source_version);
CREATE TABLE IF NOT EXISTS daily_analytics (
  day TEXT NOT NULL, metric TEXT NOT NULL, page TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0 CHECK(total >= 0), PRIMARY KEY(day,metric,page)
);
