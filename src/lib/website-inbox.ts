import type { AcceptedInquiry } from "./crm-website-inquiry";
import type { WebsiteDatabase } from "./website-db";

type Receipt = {customerId?: string;reference?: string;unavailable?:boolean;__rateLimited?:boolean};

export async function acceptWebsiteInquiry(db: WebsiteDatabase, input: AcceptedInquiry): Promise<Receipt> {
  const reference = crypto.randomUUID();
  // A token reused by a different phone must never reveal another visitor's receipt.
  const key = input.phone + ":" + (input.requestKey ?? reference);
  const payload = JSON.stringify({...input,requestKey:input.requestKey ?? reference});
  const viewing = input.inquiryType === "VIEWING" && !!input.propertyIdStr ? 1 : 0;
  const insert = db.prepare(`INSERT INTO website_leads(reference,request_key,kind,payload_json)
    SELECT ?,?,?,? WHERE (?=0 OR EXISTS(SELECT 1 FROM public_listings WHERE source_version>0 AND crm_id=?))
    AND (SELECT COUNT(*) FROM website_leads WHERE json_extract(payload_json,'$.phone')=?
      AND received_at>=datetime('now','-60 seconds'))<3 ON CONFLICT(request_key) DO NOTHING`)
    .bind(reference,key,input.inquiryType,payload,viewing,input.propertyIdStr,input.phone);
  const enqueue = db.prepare(`INSERT INTO sync_outbox(event_id,event_type,entity_id)
    SELECT reference,'website_lead',reference FROM website_leads WHERE reference=? ON CONFLICT DO NOTHING`).bind(reference);
  const lookup = db.prepare("SELECT reference FROM website_leads WHERE request_key=?").bind(key);
  const available = db.prepare("SELECT crm_id FROM public_listings WHERE source_version>0 AND crm_id=?").bind(input.propertyIdStr);
  const batch = await db.batch([insert,enqueue,lookup,available]) as {results:{reference?:string}[]}[];
  const receipt = batch[2].results[0]?.reference;
  if (receipt) return {customerId:receipt,reference:receipt};
  if (viewing && !batch[3].results.length) return {unavailable:true};
  return {__rateLimited:true};
}
