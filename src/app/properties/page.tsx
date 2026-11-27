import PublicPropertiesClient from "./PublicPropertiesClient";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import { getSitePageMetadata, getSitePageRender } from "@/lib/public-site";
import { getPublicCatalogPage, getPublicCatalogZones } from "@/lib/public-listings";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getSitePageMetadata("properties");
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const site = await getSitePageRender("properties");
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["q", "zone", "type", "rooms", "page", "purpose", "budget", "minSize", "finishing", "deliveryMonth", "sort"]) {
    const value = query[key];
    if (typeof value === "string" && value.trim()) params.set(key, value.trim().slice(0, 120));
  }
  const [catalog, zones] = await Promise.all([getPublicCatalogPage(params), getPublicCatalogZones()]);
  return <PublicSiteContent value={site}><PublicPropertiesClient initialCatalog={catalog} zones={zones} key={params.toString()} initialFilters={params.toString()} /></PublicSiteContent>;
}
