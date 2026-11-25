import PublicPortalClient from "@/components/public/PublicPortalClient";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import { getPublicSiteContent, getSitePageMetadata, getSitePageRender } from "@/lib/public-site";
import { getApprovedPublicListings } from "@/lib/public-listings";
import SiteUnavailable from "./not-found";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getSitePageMetadata("home");
}

export default async function Page() {
  const settings = await getPublicSiteContent();
  if (!settings.home.enabled) return <SiteUnavailable />;
  const site = await getSitePageRender("home", settings);
  const featuredProperties = site.visibility.properties ? await getApprovedPublicListings(3) : [];
  return <PublicSiteContent value={site}><PublicPortalClient featuredProperties={featuredProperties} /></PublicSiteContent>;
}
