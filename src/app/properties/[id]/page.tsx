import { getApprovedPublicListing } from "@/lib/public-listings";
import { notFound } from "next/navigation";
import PropertyDetails from "@/components/public/PropertyDetails";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import { getSitePageRender } from "@/lib/public-site";

export async function generateMetadata({ params }: { params:Promise<{id:string}> }) {
  const {id} = await params;
  const site = await getSitePageRender("properties");
  const listing = await getApprovedPublicListing(id);
  if (!listing) return { robots:{index:false,follow:false} };
  const title = listing.title || listing.projectName || (site.locale === "en" ? "Property at DARAK" : "عقار لدى دارك");
  const url = "https://darak-eg.pages.dev/properties/" + encodeURIComponent(id);
  let images: string[] = [];
  if (listing.images) {
    try { const parsed = JSON.parse(listing.images); images = Array.isArray(parsed) ? parsed : [parsed]; }
    catch { images = [listing.images]; }
  }
  const cover = images.find(image=>typeof image === "string" && /^https:\/\//i.test(image));
  return { title, description:listing.description || undefined, manifest:"/property-portal.webmanifest",
    alternates:{canonical:url},openGraph:{title,url,description:listing.description || undefined,images:cover?[cover]:[],siteName:"DARAK"} };
}

export const dynamic = "force-dynamic";

export default async function PublicPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await getSitePageRender("properties");

  const property = await getApprovedPublicListing(id);
  if (!property) notFound();

  let images: string[] = [];
  if (property.images) {
    try {
      const parsed = JSON.parse(property.images);
      if (Array.isArray(parsed)) images = parsed.filter((image): image is string => typeof image === "string" && !!image);
      else if (typeof parsed === "string") images = [parsed];
    } catch {
      images = [property.images];
    }
  }

  return <PublicSiteContent value={site}><PropertyDetails property={property} images={images} /></PublicSiteContent>;
}
