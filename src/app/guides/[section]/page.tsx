import { notFound } from "next/navigation";
import { getSitePageRender, getSitePageMetadata } from "@/lib/public-site";
import { PublicSiteContent, SiteLink } from "@/components/public/PublicSiteContent";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ section: string }> };
async function getSection({ params }: Props) {
  const { section } = await params;
  if (section !== "finishes" && section !== "decor" && section !== "news") notFound();
  return section;
}

export async function generateMetadata(props: Props) {
  return getSitePageMetadata(await getSection(props));
}

export default async function Guide(props: Props) {
  const site = await getSitePageRender(await getSection(props));
  const copy: Record<string, string> = site.copy;
  return <PublicSiteContent value={site}><div className="public-portal-root darak-home">
    <PublicHeader /><article className="portal-container darak-property">
      <h1>{copy["article.title"]}</h1><p>{copy["article.intro"]}</p>
      {site.heroImage && <img className="darak-property-photo" src={site.heroImage} alt={copy["article.title"]} />}
      <div className="darak-article-body">{copy["article.body"]}</div>
      <SiteLink href="/contact">{site.locale === "en" ? "Contact DARAK" : "تواصل مع دارك"}</SiteLink>
    </article><PublicFooter /></div></PublicSiteContent>;
}
