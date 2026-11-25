import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function getPropertyInventoryPage(params = new URLSearchParams()) {
  const page = Math.min(100000, Math.max(1, Number.parseInt(params.get("page") || "", 10) || 1));
  const pageSize = Math.min(25, Math.max(1, Number.parseInt(params.get("limit") || "", 10) || 25));
  const query = params.get("q")?.trim().slice(0, 120);
  const zone = params.get("zone")?.trim().slice(0, 120);
  const status = params.get("status") || undefined;
  const unitType = params.get("unitType") || undefined;
  const finishing = params.get("finishing") || undefined;
  function numberParam(key: string) {
    const value = params.get(key);
    const number = value?.trim() ? Number(value) : NaN;
    return Number.isFinite(number) && number >= 0 ? number : undefined;
  }
  const bedrooms = numberParam("bedrooms");
  const bathrooms = numberParam("bathrooms");
  const gte = numberParam("minPrice");
  const lte = numberParam("maxPrice");
  const where: Prisma.PropertyWhereInput = {
    status, unitType, finishing,
    ...(zone ? { zone: { contains: zone, mode: "insensitive" } } : {}),
    bedrooms: Number.isInteger(bedrooms) ? bedrooms : undefined,
    bathrooms: Number.isInteger(bathrooms) ? bathrooms : undefined,
    ...(gte !== undefined || lte !== undefined ? { price: { gte, lte } } : {}),
    ...(query ? { OR: [
      { projectName: { contains: query, mode: "insensitive" } },
      { unitNumber: { contains: query, mode: "insensitive" } },
      { zone: { contains: query, mode: "insensitive" } },
    ] } : {}),
  };
  const isMatch = params.get("summary") === "1";
  const summary = {
    id: true, projectName: true, unitNumber: true, zone: true, size: true,
    bedrooms: true, unitType: true, price: true,
  } satisfies Prisma.PropertySelect;
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        ...summary,
        title: !isMatch, buildingNumber: !isMatch, floor: !isMatch, bathrooms: !isMatch, finishing: !isMatch,
        status: !isMatch, description: !isMatch, images: !isMatch, monthlyInstallment: !isMatch,
        remainingMonths: !isMatch, installmentType: !isMatch, installmentPercentage: !isMatch, customData: !isMatch,
      },
    }),
    prisma.property.count({ where }),
  ]);
  return { properties, total, page, pageSize };
}
