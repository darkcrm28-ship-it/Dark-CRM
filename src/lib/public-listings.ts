import { matchPublicArea } from "./public-areas";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { readPublicCache } from "@/lib/public-read-cache";

const PUBLISHABLE_FIELDS = [
  "title", "projectName", "zone", "unitType", "finishing", "size",
  "bedrooms", "bathrooms", "images", "description",
] as const;

type PublishableField = (typeof PUBLISHABLE_FIELDS)[number];

export type PublicListingDto = {
  id: string;
  status: "AVAILABLE";
  purpose: "SALE" | "RENT";
  price: number | null;
  deliveryMonth?: string;
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

const approvedListing: Prisma.PropertyWhereInput = {
  status: "AVAILABLE",
  customData: { path: ["publicListing", "status"], equals: "APPROVED" },
};

function fieldIsPublished(field: PublishableField): Prisma.PropertyWhereInput {
  return { customData: { path: ["publicListing", "fields"], array_contains: [field] } };
}

/** Public output is an allowlisted DTO. CRM fields are never spread into it. */
async function readApprovedListings(where: Prisma.PropertyWhereInput, limit: number, skip = 0, priceOrder?: "asc" | "desc") {
  const properties = await prisma.property.findMany({
    where,
    orderBy: [...(priceOrder ? [{ publicAskingPrice: { sort: priceOrder, nulls: "last" as const } }] : []), { createdAt: "desc" }, { id: "desc" }],
    take: limit,
    skip,
    select: {
      id: true, status: true, customData: true, title: true, projectName: true,
      zone: true, unitType: true, finishing: true, size: true, bedrooms: true,
      bathrooms: true, images: true, description: true,
    },
  });

  const approved = properties.flatMap((property) => {
    const customData = property.customData && typeof property.customData === "object" && !Array.isArray(property.customData)
      ? property.customData as Record<string, unknown>
      : {};
    const listing = customData.publicListing;
    if (!listing || typeof listing !== "object" || Array.isArray(listing)) return [];
    const publication = listing as { status?: unknown; fields?: unknown; purpose?: unknown; askingPrice?: unknown; deliveryMonth?: unknown };
    if (publication.status !== "APPROVED" || !Array.isArray(publication.fields)) return [];
    const fields = new Set(publication.fields.filter((field): field is PublishableField =>
      typeof field === "string" && (PUBLISHABLE_FIELDS as readonly string[]).includes(field)
    ));
    const dto: PublicListingDto = { id: property.id, status: "AVAILABLE",
      purpose: publication.purpose === "RENT" ? "RENT" : "SALE",
      price: typeof publication.askingPrice === "number" && publication.askingPrice > 0 ? publication.askingPrice : null };
    if (typeof publication.deliveryMonth === "string") dto.deliveryMonth = publication.deliveryMonth;
    const approvedValues: Partial<Record<PublishableField, string | number | null>> = {};
    for (const field of fields) approvedValues[field] = property[field] as never;
    Object.assign(dto, approvedValues);
    return [dto];
  });

  return approved;
}

export function getApprovedPublicListings(limit = 24) {
  return readPublicCache(`listings-${limit}`, () => readApprovedListings(approvedListing, limit));
}

export function getApprovedPublicListing(id: string) {
  return readPublicCache(`property-${encodeURIComponent(id)}`, async () => {
    const [listing] = await readApprovedListings({ AND: [approvedListing, { id }] }, 1);
    return listing ?? null;
  });
}

function catalogFilters(params: URLSearchParams) {
  const q = params.get("q")?.trim().slice(0, 120);
  const type = params.get("type")?.slice(0, 60);
  const zone = params.get("zone")?.slice(0, 120);
  const rooms = params.get("rooms");
  const filters: Prisma.PropertyWhereInput[] = [approvedListing];

  const purpose = params.get("purpose");
  if (purpose === "RENT") filters.push({ customData: { path: ["publicListing", "purpose"], equals: "RENT" } });
  if (purpose === "SALE") {
    // Listings published before rental support belonged to the sales catalog.
    filters.push({ OR: [
      { customData: { path: ["publicListing", "purpose"], equals: "SALE" } },
      { customData: { path: ["publicListing", "purpose"], equals: Prisma.AnyNull } },
    ] });
  }
  const budget = Number(params.get("budget"));
  if (Number.isFinite(budget) && budget > 0 && (purpose === "SALE" || purpose === "RENT")) {
    filters.push({ customData: { path: ["publicListing", "askingPrice"], gt: 0, lte: budget } });
  }
  if (q) {
    const area = matchPublicArea(q);
    const terms = area ? Array.from(new Set([q, area.ar, area.en, ...area.aliases])) : [q];
    filters.push({ OR: (["title", "projectName", "zone"] as const).map((field) => ({
      AND: [fieldIsPublished(field), { OR: terms.map(term => ({ [field]: { contains: term, mode: "insensitive" as const } })) }],
    })) });
  }
  if (type) filters.push(fieldIsPublished("unitType"), { unitType: { contains: type, mode: "insensitive" } });
  if (zone) filters.push(fieldIsPublished("zone"), { zone });
  if (rooms && /^[1-5]$/.test(rooms)) filters.push(fieldIsPublished("bedrooms"), { bedrooms: Number(rooms) });
  if (rooms === "5+") filters.push(fieldIsPublished("bedrooms"), { bedrooms: { gte: 5 } });

  const minSize = Number(params.get("minSize"));
  if (Number.isFinite(minSize) && minSize > 0) filters.push(fieldIsPublished("size"), { size: { gte: minSize } });
  const finishing = params.get("finishing")?.trim().slice(0, 60);
  if (finishing) filters.push(fieldIsPublished("finishing"), { finishing: { equals: finishing, mode: "insensitive" } });
  const deliveryMonth = params.get("deliveryMonth");
  if (deliveryMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(deliveryMonth)) {
    filters.push({ customData: { path: ["publicListing", "deliveryMonth"], equals: deliveryMonth } });
  }
  return filters;
}

export async function getPortalListings(favorites: string[], searches: string[], since: Date | null) {
  const saved = favorites.length ? readApprovedListings({ AND: [approvedListing, { id: { in: favorites } }] }, 50) : [];
  const alerts = since && searches.length ? readApprovedListings({ AND: [
    { updatedAt: { gt: since } },
    { OR: searches.map(query => ({ AND: catalogFilters(new URLSearchParams(query)) })) },
  ] }, 20) : [];
  return Promise.all([saved, alerts]);
}

export async function getPublicCatalogPage(params = new URLSearchParams()) {
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.get("page") || "", 10) || 1));
  const pageSize = 8;
  const filters = catalogFilters(params);
  const sort = params.get("sort");
  const purpose = params.get("purpose");
  const priceOrder = (purpose === "SALE" || purpose === "RENT") && (sort === "asc" || sort === "desc") ? sort : undefined;
  const where = { AND: filters };
  const load = async () => {
    const [properties, total] = await Promise.all([
      readApprovedListings(where, pageSize, (page - 1) * pageSize, priceOrder),
      prisma.property.count({ where }),
    ]);
    return { properties, total, page, pageSize };
  };
  if (filters.length === 1 && page <= 20) return readPublicCache(`catalog-${page}`, load);
  return load();
}

export function getPublicCatalogZones() {
  return readPublicCache("catalog-zones", async () => {
    const rows = await prisma.$queryRaw<{ zone: string }[]>`
      SELECT DISTINCT zone FROM "Property"
      WHERE status = 'AVAILABLE' AND zone IS NOT NULL AND BTRIM(zone) <> ''
        AND "customData" #>> '{publicListing,status}' = 'APPROVED'
        AND "customData" #> '{publicListing,fields}' @> '["zone"]'::jsonb
      ORDER BY zone
    `;
    return rows.map(({ zone }) => zone);
  });
}

export const PUBLIC_LISTING_FIELDS = PUBLISHABLE_FIELDS;
