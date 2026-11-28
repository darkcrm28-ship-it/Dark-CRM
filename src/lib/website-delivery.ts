import { deliverInquiry, type AcceptedInquiry } from "./crm-website-inquiry";
import type { WebsiteDatabase } from "./website-db";

export async function deliverWebsiteLeads(db: WebsiteDatabase) {
  const pending = await db.prepare(`SELECT o.event_id,l.payload_json FROM sync_outbox o
    JOIN website_leads l ON l.reference=o.entity_id WHERE o.event_type='website_lead' AND o.delivered_at IS NULL
    AND o.available_at<=CURRENT_TIMESTAMP AND (o.lease_until IS NULL OR o.lease_until<CURRENT_TIMESTAMP)
    ORDER BY o.available_at,o.event_id LIMIT 5`).all<{event_id:string;payload_json:string}>();
  for (const row of pending.results) {
    const token = crypto.randomUUID();
    const lease = await db.prepare(`UPDATE sync_outbox SET lease_token=?,lease_until=datetime('now','+5 minutes'),
      attempts=attempts+1 WHERE event_id=? AND delivered_at IS NULL AND (lease_until IS NULL OR lease_until<CURRENT_TIMESTAMP)`)
      .bind(token,row.event_id).run();
    if (!lease.meta.changes) continue;
    try {
      const result = await deliverInquiry(JSON.parse(row.payload_json) as AcceptedInquiry,row.event_id);
      if (!result.customerId) throw new Error("CRM did not return a receipt");
      await db.batch([
        db.prepare(`UPDATE website_leads SET synced_at=CURRENT_TIMESTAMP WHERE reference=? AND EXISTS
          (SELECT 1 FROM sync_outbox WHERE event_id=? AND lease_token=?)`).bind(row.event_id,row.event_id,token),
        db.prepare("UPDATE sync_outbox SET delivered_at=CURRENT_TIMESTAMP,lease_token=NULL,lease_until=NULL WHERE event_id=? AND lease_token=?")
          .bind(row.event_id,token),
      ]);
    } catch {
      await db.prepare(`UPDATE sync_outbox SET lease_token=NULL,lease_until=NULL,
        available_at=datetime('now','+' || min(attempts*5,60) || ' minutes') WHERE event_id=? AND lease_token=?`).bind(row.event_id,token).run();
    }
  }
}

export async function deliverWebsiteAudit(db: WebsiteDatabase) {
  const {prisma} = await import("./db");
  const rows = await db.prepare(`SELECT event_id,entity_id,created_at FROM sync_outbox
    WHERE event_type='page_audit' AND delivered_at IS NULL ORDER BY created_at LIMIT 5`)
    .all<{event_id:string;entity_id:string;created_at:string}>();
  for (const row of rows.results) {
    const {userId,page,revision,enabled} = JSON.parse(row.entity_id);
    await prisma.auditLog.upsert({where:{id:row.event_id},update:{},
      create:{id:row.event_id,userId,action:"UPDATE",entity:"PUBLIC_SITE_PAGE",entityId:page,
        details:JSON.stringify({revision,enabled}),createdAt:new Date(row.created_at.replace(" ","T")+"Z")}});
    await db.prepare("UPDATE sync_outbox SET delivered_at=CURRENT_TIMESTAMP WHERE event_id=?").bind(row.event_id).run();
  }
}
