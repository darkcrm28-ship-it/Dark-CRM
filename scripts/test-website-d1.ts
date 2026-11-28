import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Miniflare,convertV4MiniflareOptions} from "miniflare";
import {websiteCatalog} from "../src/lib/website-catalog";
import {acceptWebsiteInquiry} from "../src/lib/website-inbox";
import {initializeWebsiteContent,saveWebsitePage} from "../src/lib/website-content";
import {publishWebsiteChanges,applyPublication} from "../src/lib/website-publication";
import type {WebsiteDatabase} from "../src/lib/website-db";
import type {AcceptedInquiry} from "../src/lib/crm-website-inquiry";

async function main() {
  const mf = new Miniflare(convertV4MiniflareOptions({workers:[{name:"test",modules:true,script:"export default {fetch(){return new Response()}}",d1Databases:["WEBSITE_DB"]}]}));
  try {
    const db = await mf.getD1Database("WEBSITE_DB","test") as unknown as WebsiteDatabase;
    for (const name of ["0001_website","0002_lead_rate"]) {
      const sql=readFileSync("d1/migrations/"+name+".sql","utf8");
      await db.batch(sql.split(";").map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
    }
    const id="fixture",listing={id,status:"AVAILABLE" as const,purpose:"RENT" as const,price:8500,zone:"التجمع الخامس",bedrooms:3};
    const params=new URLSearchParams("purpose=RENT&q=New+Cairo&budget=9000&rooms=3");
    await applyPublication(db,id,1,listing,"2026-01-01");
    assert.equal((await websiteCatalog(db,params,1,8)).total,1);
    await applyPublication(db,id,2,{...listing,price:10000},"2026-01-01");
    assert.equal((await websiteCatalog(db,params,1,8)).total,0);
    const data={nameStr:"Test visitor", phoneStr:"01000000000",emailStr:"", preferredZoneStr:"",notesStr:"",unitTypeStr:"",floorStr:null,areaNum:null,budgetNum:null,priceNum:null,bedroomsNum:null,bathroomsNum:null,deliveryDate:null,sanitizedImages:[],memberId:null,typeTitle:"QA",isSeller:false,inquiryType:"VIEWING",propertyIdStr:id,phone:"01000000000",requestKey:crypto.randomUUID()} as AcceptedInquiry;
    const receipts=await Promise.all([acceptWebsiteInquiry(db,data),acceptWebsiteInquiry(db,data)]);
    assert.ok(receipts[0].reference);
    assert.equal(receipts[0].reference,receipts[1].reference);
    assert.equal((await db.prepare("SELECT count(*) n FROM sync_outbox").first<{n:number}>())?.n,1);
    for (let i=0;i<2;i++) assert.ok((await acceptWebsiteInquiry(db,{...data,requestKey:crypto.randomUUID()})).reference);
    assert.ok((await acceptWebsiteInquiry(db,{...data,requestKey:crypto.randomUUID()})).__rateLimited);
    await applyPublication(db,id,3,null,"");
    await applyPublication(db,id,2,listing,"2026-01-01");
    assert.equal((await websiteCatalog(db,new URLSearchParams(),1,8)).total,0);
    assert.ok((await acceptWebsiteInquiry(db,{...data,requestKey:crypto.randomUUID()})).unavailable);
    const page={enabled:true,revision:0,overrides:{},heroImage:""};
    assert.ok(await saveWebsitePage(db,"home",page,"manager"));
    assert.equal(await saveWebsitePage(db,"home",page,"manager"),false);
    assert.ok(await saveWebsitePage(db,"home",{...page,revision:1,enabled:false},"manager"));
    assert.equal((await db.prepare("SELECT count(*) n FROM site_pages WHERE enabled=0").first<{n:number}>())?.n,2);
    if (process.env.DARAK_LOOPBACK_INTEGRATION === "1") {
      const url = new URL(process.env.DATABASE_URL || "");
      assert.equal(url.hostname,"127.0.0.1");
      assert.equal(url.pathname,"/dark_crm_test_portal");
      const {prisma} = await import("../src/lib/db");
      const {deliverWebsiteLeads} = await import("../src/lib/website-delivery");
      await prisma.publicSitePage.create({data:{key:"contact",enabled:false,content:{}}});
      await initializeWebsiteContent(db);
      const contact = await db.prepare("SELECT enabled FROM site_pages WHERE slug='contact' AND locale='ar'").first<{enabled:number}>();
      assert.equal(contact?.enabled,0);
      await initializeWebsiteContent(db);
      assert.equal((await db.prepare("SELECT enabled FROM site_pages WHERE slug='home' AND locale='ar'").first<{enabled:number}>())?.enabled,0);
      const property = await prisma.property.create({data:{title:"Test home",price:888888,
        customData:{publicListing:{status:"APPROVED",fields:["title"]}}}});
      await publishWebsiteChanges(db);
      const rows=await websiteCatalog(db,new URLSearchParams(),1,8);
      assert.equal(rows.properties[0].id,property.id);assert.equal(rows.properties[0].price,null);
      await prisma.property.delete({where:{id:property.id}});
      await publishWebsiteChanges(db);
      assert.equal((await websiteCatalog(db,new URLSearchParams(),1,8)).total,0);
      await deliverWebsiteLeads(db);
      assert.equal(await prisma.customer.count(),3);
      await db.prepare("UPDATE sync_outbox SET delivered_at=NULL WHERE event_type='website_lead'").run();
      await deliverWebsiteLeads(db);
      assert.equal(await prisma.customer.count(),3);
      console.log("PASS CRM publishing trigger, approval allowlist, removal, queued lead delivery and replay without duplicates");
      await prisma.$disconnect();
    }
    console.log("PASS D1 publication, filters, withdrawal, stale replay, offline lead intake, rate limit, atomic outbox and CMS revision conflicts");
  } finally {await mf.dispose();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
