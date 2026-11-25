import SellClient from "./SellClient";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import { getSitePageMetadata, getSitePageRender } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getSitePageMetadata("sell");
}

export default async function Page() {
  const site = await getSitePageRender("sell");
  return <PublicSiteContent value={site}><SellClient /></PublicSiteContent>;
}
