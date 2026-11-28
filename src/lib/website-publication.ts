import { prisma } from "./db";
import { crmPublicProjection } from "./public-listings";
import type { PublicListingDto } from "./public-listings";
import type { WebsiteDatabase } from "./website-db";

export async function applyPublication(db: WebsiteDatabase, id: string, version: number, listing: PublicListingDto | null, publishedAt: string) {
  // Keep a version even after withdrawal. A retried older publication cannot resurrect it.
  const key = "property:"+id;
  const guard = "NOT EXISTS(SELECT 1 FROM sync_events WHERE event_id=? AND source_version>=?)";
  const record = db.prepare(`INSERT INTO sync_events(event_id,entity_type,entity_id,source_version)
    VALUES (?,'property',?,?) ON CONFLICT(event_id) DO UPDATE SET source_version=excluded.source_version,
    applied_at=CURRENT_TIMESTAMP WHERE excluded.source_version>sync_events.source_version`).bind(key,id,version);
  const change = listing ? db.prepare(`INSERT INTO public_listings
    (crm_id,purpose,zone,unit_type,public_price,area,rooms,public_json,published_at,source_version)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE `+guard+` ON CONFLICT(crm_id) DO UPDATE SET
    purpose=excluded.purpose,zone=excluded.zone,unit_type=excluded.unit_type,public_price=excluded.public_price,
    area=excluded.area,rooms=excluded.rooms,public_json=excluded.public_json,published_at=excluded.published_at,
    source_version=excluded.source_version`).bind(id,listing.purpose,listing.zone??null,listing.unitType??null,
      listing.price,listing.size??null,listing.bedrooms??null,JSON.stringify(listing),publishedAt,version,key,version)
    : db.prepare("DELETE FROM public_listings WHERE crm_id=? AND "+guard).bind(id,key,version);
  await db.batch([change,record]);
}

export async function publishWebsiteChanges(db: WebsiteDatabase) {
  const rows = await prisma.$queryRaw<{propertyId:string;version:bigint}[]>`
    SELECT "propertyId",version FROM "WebsitePublicationQueue" ORDER BY version LIMIT 12`;
  for (const {propertyId,version} of rows) {
    const listing = await crmPublicProjection(propertyId);
    const source = listing && await prisma.property.findUnique({where:{id:propertyId},select:{createdAt:true}});
    await applyPublication(db,propertyId,Number(version),source ? listing : null,source?.createdAt.toISOString() ?? "");
    await prisma.$executeRaw`DELETE FROM "WebsitePublicationQueue" WHERE "propertyId"=${propertyId} AND version=${version}`;
  }
}
