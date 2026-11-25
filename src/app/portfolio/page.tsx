import PortfolioClient from "./PortfolioClient";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import { getSitePageMetadata, getSitePageRender } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getSitePageMetadata("portfolio");
}

export default async function Page() {
  const site = await getSitePageRender("portfolio");
  return <PublicSiteContent value={site}><PortfolioClient /></PublicSiteContent>;
}
