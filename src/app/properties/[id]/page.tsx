import { getApprovedPublicListing } from "@/lib/public-listings";
import { notFound } from "next/navigation";
import PropertyShowcaseClient from "@/components/property/PropertyShowcaseClient";

export const dynamic = "force-dynamic";

export default async function PublicPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await getApprovedPublicListing(id);
  if (!property) notFound();

  let images: string[] = [];
  if (property.images) {
    try {
      const parsed = JSON.parse(property.images);
      if (Array.isArray(parsed)) images = parsed;
      else if (typeof parsed === "string") images = [parsed];
    } catch {
      images = [property.images];
    }
  }

  const sanitizedUnit = {
    id: property.id,
    refCode: `DK-${property.id.substring(0, 6).toUpperCase()}`,
    title: property.title ?? "وحدة عقارية",
    projectName: property.projectName ?? "مشروع عقاري راقي",
    zone: property.zone ?? "منطقة متميزة",
    size: property.size ?? null,
    unitType: property.unitType ?? null,
    finishing: property.finishing ?? null,
    bedrooms: property.bedrooms ?? null,
    bathrooms: property.bathrooms ?? null,
    description: property.description ?? null,
    images,
    status: "AVAILABLE",
  };

  return <PropertyShowcaseClient unit={sanitizedUnit} hideFinancials={true} />;
}