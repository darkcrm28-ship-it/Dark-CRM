import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { requirePageRole, SALES_ROLES } from "@/lib/auth";
import PropertyShowcaseClient from "./PropertyShowcaseClient";

export default async function PublicPropertyShowcasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // This is an internal sales share view, not a public listing.
  await requirePageRole(SALES_ROLES);

  const property = await prisma.property.findUnique({
    where: { id },
  });

  if (!property) notFound();

  // Parse images if stored as JSON string
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

  // SANITIZATION: Strict privacy filter - NEVER send buildingNumber, unitNumber or owner info
  const sanitizedUnit = {
    id: property.id,
    refCode: `DK-${property.id.substring(0, 6).toUpperCase()}`,
    title: property.title || `وحدة فاخرة في ${property.projectName || "مشروع مميز"}`,
    projectName: property.projectName || "مشروع عقاري راقي",
    zone: property.zone || "منطقة متميزة",
    size: property.size,
    unitType: property.unitType || "شقة سكنية",
    finishing: property.finishing || "تشطيب سوبر لوكس",
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    floor: property.floor,
    price: property.price,
    monthlyInstallment: property.monthlyInstallment,
    remainingMonths: property.remainingMonths,
    installmentType: property.installmentType,
    description: property.description,
    images: images,
    status: property.status,
  };

  return <PropertyShowcaseClient unit={sanitizedUnit} />;
}
