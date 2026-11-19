import { prisma } from "@/lib/db";
import PublicPortalClient from "@/components/public/PublicPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "دارك للاستثمار والتسويق العقاري | البوابة العقارية الرسمية",
  description: "اكتشف أفضل الفرص الاستثمارية والوحدات العقارية الحصرية في مصر، احجز استشارتك المجانية أو اعرض وحدتك للبيع بأمان وسرية تامة.",
};

export default async function HomePage() {
  // Fetch real available units from CRM database
  const properties = await prisma.property.findMany({
    where: {
      status: "AVAILABLE",
    },
    take: 6,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      projectName: true,
      zone: true,
      unitType: true,
      size: true,
      price: true,
      bedrooms: true,
      bathrooms: true,
      images: true,
      monthlyInstallment: true,
    },
  });

  return <PublicPortalClient featuredProperties={properties} />;
}
