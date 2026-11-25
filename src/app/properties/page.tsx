import PublicPropertiesClient from "./PublicPropertiesClient";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import { getSitePageMetadata, getSitePageRender } from "@/lib/public-site";
import { getPublicCatalogPage, getPublicCatalogZones } from "@/lib/public-listings";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getSitePageMetadata("properties");
}

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const site = await getSitePageRender("properties");
  const query = (await searchParams).q;
  const initialQuery = typeof query === "string" ? query.trim().slice(0, 120) : "";
  const params = new URLSearchParams(initialQuery ? { q: initialQuery } : {});
  const [catalog, zones] = await Promise.all([getPublicCatalogPage(params), getPublicCatalogZones()]);
  return <PublicSiteContent value={site}><PublicPropertiesClient initialCatalog={catalog} zones={zones} initialQuery={initialQuery} /></PublicSiteContent>;
}
