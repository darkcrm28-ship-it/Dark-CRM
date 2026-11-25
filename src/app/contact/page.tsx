import ContactClient from "./ContactClient";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import { getSitePageMetadata, getSitePageRender } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getSitePageMetadata("contact");
}

export default async function Page() {
  const site = await getSitePageRender("contact");
  return <PublicSiteContent value={site}><ContactClient /></PublicSiteContent>;
}
