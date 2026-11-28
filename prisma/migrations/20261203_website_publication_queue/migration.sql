-- Only identifiers leave the CRM queue. The publisher builds an approved public DTO.
CREATE TABLE "WebsitePublicationQueue" (
  "propertyId" TEXT PRIMARY KEY,
  "version" BIGSERIAL NOT NULL
);
CREATE INDEX "WebsitePublicationQueue_version_idx" ON "WebsitePublicationQueue" ("version");
CREATE FUNCTION enqueue_website_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN target_id := OLD.id; ELSE target_id := NEW.id; END IF;
  INSERT INTO "WebsitePublicationQueue" ("propertyId") VALUES (target_id)
  ON CONFLICT ("propertyId") DO UPDATE SET "version" = EXCLUDED."version";
  RETURN NULL;
END;
$$;
CREATE TRIGGER property_website_publication AFTER INSERT OR UPDATE OR DELETE ON "Property"
FOR EACH ROW EXECUTE FUNCTION enqueue_website_publication();
INSERT INTO "WebsitePublicationQueue" ("propertyId")
SELECT id FROM "Property" WHERE status='AVAILABLE' AND "customData" #>> '{publicListing,status}'='APPROVED'
ON CONFLICT ("propertyId") DO NOTHING;
