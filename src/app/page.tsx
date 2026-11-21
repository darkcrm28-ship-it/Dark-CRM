import { getApprovedPublicListings } from "@/lib/public-listings";
import PublicPortalClient from "@/components/public/PublicPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "دارك للاستثمار والتسويق العقاري | البوابة العقارية الرسمية",
  description: "اكتشف أفضل الفرص الاستثمارية والوحدات العقارية الحصرية في مصر، احجز استشارتك المجانية أو اعرض وحدتك للبيع بأمان وسرية تامة.",
};

export default async function HomePage() {
  const properties = await getApprovedPublicListings(6);

  return <PublicPortalClient featuredProperties={properties} />;
}
