import { prisma } from "@/lib/db";

const PUBLISHABLE_FIELDS = [
  "title", "projectName", "zone", "unitType", "finishing", "size",
  "bedrooms", "bathrooms", "images", "description",
] as const;

type PublishableField = (typeof PUBLISHABLE_FIELDS)[number];

export type PublicListingDto = {
  id: string;
  status: "AVAILABLE";
  title?: string | null;
  projectName?: string | null;
  zone?: string | null;
  unitType?: string | null;
  finishing?: string | null;
  size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  images?: string | null;
  description?: string | null;
};

/** Public output is an allowlisted DTO. CRM fields are never spread into it. */
export async function getApprovedPublicListings(limit?: number) {
  const properties = await prisma.property.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
    ...(limit ? { take: limit * 4 } : {}),
    select: {
      id: true, status: true, customData: true, title: true, projectName: true,
      zone: true, unitType: true, finishing: true, size: true, bedrooms: true,
      bathrooms: true, images: true, description: true, price: true,
      monthlyInstallment: true, remainingMonths: true,
    },
  });

  const approved = properties.flatMap((property) => {
    const customData = property.customData && typeof property.customData === "object" && !Array.isArray(property.customData)
      ? property.customData as Record<string, unknown>
      : {};
    const listing = customData.publicListing;
    if (!listing || typeof listing !== "object" || Array.isArray(listing)) return [];
    const publication = listing as { status?: unknown; fields?: unknown };
    if (publication.status !== "APPROVED" || !Array.isArray(publication.fields)) return [];
    const fields = new Set(publication.fields.filter((field): field is PublishableField =>
      typeof field === "string" && (PUBLISHABLE_FIELDS as readonly string[]).includes(field)
    ));
    const dto: PublicListingDto = { id: property.id, status: "AVAILABLE" };
    const approvedValues: Partial<Record<PublishableField, string | number | null>> = {};
    for (const field of fields) approvedValues[field] = property[field] as never;
    Object.assign(dto, approvedValues);
    return [dto];
  });

  return limit ? approved.slice(0, limit) : approved;
}

export const PUBLIC_LISTING_FIELDS = PUBLISHABLE_FIELDS;
