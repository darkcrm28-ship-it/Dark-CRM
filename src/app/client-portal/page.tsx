import { getPortalListings } from "@/lib/public-listings";
import { prisma } from "@/lib/db";
import { getSitePageRender } from "@/lib/public-site";
import { portalMemberId } from "@/lib/portal-member";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import PublicHeader from "@/components/public/PublicHeader";
import Account from "./Account";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{search?:string}> }) {
  const site = await getSitePageRender("properties");
  const id = await portalMemberId();
  const member = id ? await prisma.portalMember.findUnique({ where:{id}, select:{email:true,savedSearches:true,favorites:true,alertsSince:true} }) : null;
  const requests = member && id ? await prisma.customer.findMany({
    where:{customData:{path:["portalMemberId"],equals:id}},
    select:{code:true,createdAt:true}, orderBy:{createdAt:"desc"}, take:30,
  }) : [];
  const [favorites, alerts] = member ? await getPortalListings(member.favorites, member.savedSearches, member.alertsSince) : [[], []];
  const summarize = (items: typeof favorites) => items.map(p => ({id:p.id,title:p.title || p.projectName || "DK-" + p.id.slice(0,6)}));
  const search = (await searchParams).search;
  return <PublicSiteContent value={site}><div className="public-portal-root darak-home"><PublicHeader />
    <Account favorites={summarize(favorites)} alerts={summarize(alerts)} alertsEnabled={!!member?.alertsSince} member={member} search={typeof search === "string" ? search.slice(0,800) : ""} requests={requests.map(row=>({code:row.code,date:row.createdAt.toISOString().slice(0,10)}))} />
  </div></PublicSiteContent>;
}
