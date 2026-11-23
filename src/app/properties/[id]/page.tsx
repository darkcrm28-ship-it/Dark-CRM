import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PropertyShowcaseClient from "@/components/property/PropertyShowcaseClient";

const PUBLISHABLE_FIELDS = [
  "title", "projectName", "zone", "unitType", "finishing", "size",
  "bedrooms", "bathrooms", "images", "description",
] as const;

type PublishableField = (typeof PUBLISHABLE_FIELDS)[number];

export const dynamic = "force-dynamic";

export default async function PublicPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      customData: true,
      title: true,
      projectName: true,
      zone: true,
      unitType: true,
      finishing: true,
      size: true,
      bedrooms: true,
      bathrooms: true,
      images: true,
      description: true,
    },
  });

  if (!property || property.status !== "AVAILABLE") {
    notFound();
  }

  const customData = property.customData && typeof property.customData === "object" && !Array.isArray(property.customData)
    ? property.customData as Record<string, unknown>
    : {};
  const listing = customData.publicListing;
  if (!listing || typeof listing !== "object" || Array.isArray(listing)) {
    notFound();
  }
  const publication = listing as { status?: unknown; fields?: unknown };
  if (publication.status !== "APPROVED" || !Array.isArray(publication.fields)) {
    notFound();
  }
  const fields = new Set(
    publication.fields.filter((field): field is PublishableField =>
      typeof field === "string" && (PUBLISHABLE_FIELDS as readonly string[]).includes(field)
    )
  );

  const approvedValues: Partial<Record<PublishableField, string | number | null>> = {};
  for (const field of fields) {
    approvedValues[field] = property[field] as never;
  }

  let images: string[] = [];
  if (approvedValues.images) {
    try {
      const parsed = JSON.parse(approvedValues.images as string);
      if (Array.isArray(parsed)) images = parsed;
      else if (typeof parsed === "string") images = [parsed];
    } catch {
      images = [approvedValues.images as string];
    }
  }

  const sanitizedUnit = {
    id: property.id,
    refCode: `DK-${property.id.substring(0, 6).toUpperCase()}`,
    title: fields.has("title") ? (property.title ?? "وحدة عقارية") : "وحدة عقارية",
    projectName: fields.has("projectName") ? property.projectName ?? "مشروع عقاري راقي" : "مشروع عقاري راقي",
    zone: fields.has("zone") ? property.zone ?? "منطقة متميزة" : "منطقة متميزة",
    size: fields.has("size") ? property.size : null,
    unitType: fields.has("unitType") ? property.unitType ?? null : null,
    finishing: fields.has("finishing") ? property.finishing ?? null : null,
    bedrooms: fields.has("bedrooms") ? property.bedrooms : null,
    bathrooms: fields.has("bathrooms") ? property.bathrooms : null,
    description: fields.has("description") ? property.description ?? null : null,
    images,
    status: "AVAILABLE",
  };

  return <PropertyShowcaseClient unit={sanitizedUnit} hideFinancials={true} />;
}