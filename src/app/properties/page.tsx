import { prisma } from "@/lib/db";
import PublicPropertiesClient from "./PublicPropertiesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "عقارات ووحدات متميزة للبيع | دارك للاستثمار العقاري",
  description: "تصفح أحدث عروض الوحدات السكنية والتجارية للبيع في مصر. شقق، فيلات، دوبلكس بأرقى المناطق مع إمكانية الفلترة والمعاينة الفورية.",
};

export default async function PropertiesPublicCatalogPage() {
  const properties = await prisma.property.findMany({
    where: {
      status: "AVAILABLE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      projectName: true,
      zone: true,
      unitType: true,
      finishing: true,
      size: true,
      price: true,
      bedrooms: true,
      bathrooms: true,
      floor: true,
      images: true,
      monthlyInstallment: true,
      remainingMonths: true,
      status: true,
      description: true,
    },
  });

  return <PublicPropertiesClient initialProperties={properties} />;
}
