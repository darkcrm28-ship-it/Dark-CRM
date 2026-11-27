import { getApprovedPublicListing } from "@/lib/public-listings";
import { notFound } from "next/navigation";
import PropertyDetails from "@/components/public/PropertyDetails";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import { getSitePageRender } from "@/lib/public-site";

export const metadata = { manifest: "/property-portal.webmanifest" };

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
