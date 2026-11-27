import { getApprovedPublicListing } from "@/lib/public-listings";
import { getSitePageRender } from "@/lib/public-site";
import { PublicSiteContent } from "@/components/public/PublicSiteContent";
import PublicHeader from "@/components/public/PublicHeader";
import Link from "next/link";

export const metadata = { manifest: "/property-portal.webmanifest" };

export const dynamic = "force-dynamic";

export default async function Compare({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const site = await getSitePageRender("properties");
  const en = site.locale === "en";
  const raw = (await searchParams).ids;
  const ids = Array.from(new Set(typeof raw === "string" ? raw.split(",") : [])).filter(id => /^[a-zA-Z0-9-]{1,64}$/.test(id)).slice(0,3);
  const listings = (await Promise.all(ids.map(getApprovedPublicListing))).filter(item => item !== null);
  const rows = [
    [en ? "Area" : "المنطقة", ...listings.map(p => p.zone)],
    [en ? "Purpose" : "غرض الإعلان", ...listings.map(p => p.purpose === "RENT" ? (en ? "Rent" : "إيجار") : (en ? "Sale" : "بيع"))],
    [en ? "Price (EGP)" : "السعر بالجنيه", ...listings.map(p => p.price ? p.price.toLocaleString(site.locale) + (p.purpose === "RENT" ? (en ? " / month" : " / شهر") : "") : (en ? "On request" : "عند الطلب"))],
    [en ? "Size (m²)" : "المساحة (م²)", ...listings.map(p => p.size)],
    [en ? "Bedrooms" : "غرف النوم", ...listings.map(p => p.bedrooms)],
    [en ? "Finishing" : "التشطيب", ...listings.map(p => p.finishing)],
  ];
  return <PublicSiteContent value={site}><div className="public-portal-root darak-home"><PublicHeader />
    <main className="portal-container darak-property"><h1>{en ? "Compare properties" : "قارن العقارات"}</h1>
      {listings.length > 0 ? <div className="compare-scroll"><table><thead><tr><th>{en ? "Property" : "الوحدة"}</th>
        {listings.map(p => <th key={p.id}><Link href={`/properties/${p.id}`}>{p.title || p.projectName || p.id.slice(0,6)}</Link></th>)}</tr></thead>
        <tbody>{rows.map(([label,...cells]) => <tr key={label}><th>{label}</th>{cells.map((cell,i) => <td key={listings[i].id}>{cell ?? "—"}</td>)}</tr>)}</tbody></table></div>
        : <p>{en ? "Select available listings in the catalog." : "اختر وحدات متاحة من الكتالوج."}</p>}
      <Link href="/properties">{en ? "Back to catalog" : "العودة للكتالوج"}</Link>
    </main></div></PublicSiteContent>;
}
