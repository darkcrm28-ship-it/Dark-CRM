import { getApprovedPublicListings } from "@/lib/public-listings";
import PublicPropertiesClient from "./PublicPropertiesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "عقارات ووحدات متميزة للبيع | دارك للاستثمار العقاري",
  description: "تصفح أحدث عروض الوحدات السكنية والتجارية للبيع في مصر. شقق، فيلات، دوبلكس بأرقى المناطق مع إمكانية الفلترة والمعاينة الفورية.",
};

export default async function PropertiesPublicCatalogPage() {
  const properties = await getApprovedPublicListings();

  return <PublicPropertiesClient initialProperties={properties} />;
}
