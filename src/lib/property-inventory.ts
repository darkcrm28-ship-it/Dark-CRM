import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function getPropertyInventoryPage(params = new URLSearchParams()) {
  const page = Math.min(100000, Math.max(1, Number.parseInt(params.get("page") || "", 10) || 1));
  const pageSize = 25;
  const query = params.get("q")?.trim().slice(0, 120);
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
    bedrooms: Number.isInteger(bedrooms) ? bedrooms : undefined,
    bathrooms: Number.isInteger(bathrooms) ? bathrooms : undefined,
    ...(gte !== undefined || lte !== undefined ? { price: { gte, lte } } : {}),
    ...(query ? { OR: [
      { projectName: { contains: query, mode: "insensitive" } },
      { unitNumber: { contains: query, mode: "insensitive" } },
      { zone: { contains: query, mode: "insensitive" } },
    ] } : {}),
  };
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, title: true, projectName: true, unitNumber: true, buildingNumber: true, zone: true,
        floor: true, size: true, bedrooms: true, bathrooms: true, unitType: true, finishing: true,
        price: true, status: true, description: true, images: true, monthlyInstallment: true,
        remainingMonths: true, installmentType: true, installmentPercentage: true, customData: true,
      },
    }),
    prisma.property.count({ where }),
  ]);
  return { properties, total, page, pageSize };
}
