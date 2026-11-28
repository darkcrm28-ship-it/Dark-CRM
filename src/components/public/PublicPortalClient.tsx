"use client";

import { useSiteText, usePublicSite, SiteLink as Link } from "@/components/public/PublicSiteContent";
import React, { useState } from "react";

import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  Eye,
  Home,
  ShieldCheck,
  MapPin,
  Maximize2,
  BedDouble,
  Bath,
  Search,
  ChevronRight,
  Compass,
} from "lucide-react";
import SearchAssistant from "./SearchAssistant";
import HomeCarousel from "./HomeCarousel";
import PaymentEstimate from "./PaymentEstimate";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";

interface PropertyItem {
  id: string;
  title?: string | null;
  projectName?: string | null;
  zone?: string | null;
  unitType?: string | null;
  size?: number | null;
  purpose?: string;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  images?: string | null;
  monthlyInstallment?: number | null;
}

export default function PublicPortalClient({
  featuredProperties = [],
}: {
  featuredProperties: PropertyItem[];
}) {
  const text = useSiteText();
  const { visibility, heroImage, locale } = usePublicSite();
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [heroSearch, setHeroSearch] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (heroSearch.trim()) params.set("q", heroSearch.trim());
    if (purpose) params.set("purpose", purpose);
    router.push(params.size ? "/properties?" + params : "/properties");
  };

  const parseCover = (imagesStr?: string | null): string | null => {
    if (!imagesStr) return null;
    try {
      const arr = JSON.parse(imagesStr);
      if (Array.isArray(arr) && arr.length > 0) return arr[0];
    } catch {
      return imagesStr;
    }
    return null;
  };

  const slides = [
    { image: heroImage || "/images/mediterranean-home.webp", title: text("hero.text8"), href: "/properties" },
    ...featuredProperties.flatMap(property => {
      const image = parseCover(property.images);
      return image ? [{ image, title: property.title || property.projectName || text("listings.text5"), href: `/properties/${property.id}` }] : [];
    }),
    ...(visibility.portfolio ? [{ image: "/images/hero-landscape.jpg", title: text("hero.text10"), href: "/portfolio" }] : []),
  ];

  const topDevelopers = [
    { name: text("partners.topDevelopers1_name"), sub: text("partners.topDevelopers1_sub") },
    { name: text("partners.topDevelopers2_name"), sub: text("partners.topDevelopers2_sub") },
    { name: text("partners.topDevelopers3_name"), sub: text("partners.topDevelopers3_sub") },
    { name: text("partners.topDevelopers4_name"), sub: text("partners.topDevelopers4_sub") },
    { name: text("partners.topDevelopers5_name"), sub: text("partners.topDevelopers5_sub") },
    { name: text("partners.topDevelopers6_name"), sub: text("partners.topDevelopers6_sub") },
  ];

  return (
    <div className="public-portal-root darak-home">
      <PublicHeader />

      <HomeCarousel slides={slides}>
          <div className="darak-hero-copy">
          <h1 className="cinematic-hero-headline">{text("hero.text2")} <br />
            <span className="gold-shimmer-text">{text("hero.text3")}</span> {text("hero.text4")}</h1>

          <p className="cinematic-hero-subtext">{text("hero.text5")}</p>

          {/* Embedded Floating Hero Search Box */}
          {visibility.properties && <form onSubmit={handleSearchSubmit} className="hero-floating-search-box">
            <select className="hero-purpose" aria-label={locale === "en" ? "Listing purpose" : "غرض الإعلان"} value={purpose} onChange={e => setPurpose(e.target.value)}>
              <option value="">{locale === "en" ? "All" : "الكل"}</option><option value="SALE">{locale === "en" ? "Buy" : "شراء"}</option><option value="RENT">{locale === "en" ? "Rent" : "إيجار"}</option>
            </select>
            <div className="search-input-col">
              <Search size={18} className="text-gold" />
              <input
                type="text"
                placeholder={text("hero.text6")}
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                className="hero-search-inner-input"
              />
            </div>
            <button type="submit" className="hero-search-action-btn">
              <span>{text("hero.text7")}</span>
              <ChevronRight size={16} />
            </button>
          </form>}

          {visibility.properties && <SearchAssistant en={locale === "en"} />}

          {/* Quick Action Navigation Buttons */}
          <div className="hero-actions-row">
            <Link href="/properties" className="btn-consultation-gold px-8 py-3.5 text-base font-extrabold">{text("hero.text8")}</Link>
            <Link href="/sell" className="btn-secondary-white px-8 py-3.5 text-base">{text("hero.text9")}</Link>
            <Link href="/portfolio" className="btn-secondary-white px-6 py-3.5 text-sm">{text("hero.text10")}</Link>
          </div>

          </div>
      </HomeCarousel>

      {/* ─── 2. DEVELOPERS & PARTNERS SHOWCASE STRIP ─── */}
      <section className="portal-container my-16">
        <div className="developers-strip-card">
          <div className="developers-strip-title">
            <ShieldCheck size={18} className="text-gold" />
            <span>{text("partners.text1")}</span>
          </div>

          <div className="developers-strip-grid">
            {topDevelopers.map((dev, idx) => (
              <div key={idx} className="dev-strip-item">
                <div className="font-extrabold text-white text-sm mb-1">{dev.name}</div>
                <div className="text-[11px] text-slate-400" >{dev.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURED SQUARES CATALOG PREVIEW ─── */}
      {visibility.properties && <section className="portal-section">
        <div className="portal-container">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <span className="section-tag mb-2">{text("listings.text1")}</span>
              <h2 className="section-title-large">{text("listings.text2")}</h2>
              <p className="section-subtitle">{text("listings.text3")}</p>
            </div>
            <Link href="/properties" className="btn-consultation-gold">{text("listings.text4")}</Link>
          </div>

          {/* Squares Grid */}
          <div className="squares-catalog-grid">
            {featuredProperties.slice(0, 3).map((p) => {
              const cover = parseCover(p.images);
              const unitCode = `DK-${p.id.substring(0, 6).toUpperCase()}`;

              return (
                <div key={p.id} className="square-property-box group">
                  <div className="box-glowing-rim" />
                  <div className="square-cover-container">
                    {cover ? (
                      <img src={cover} alt={p.projectName || text("listings.text5")} className="square-cover-img" />
                    ) : (
                      <div className="square-no-img-box">
                        <Building2 size={38} className="text-gold opacity-50 mb-2" />
                        <span>{text("listings.text6")}</span>
                      </div>
                    )}
                    <div className="square-badges-top-row">
                      <span className="badge-unit-type">{p.unitType || text("listings.text7")}</span>
                    </div>
                    <div className="square-code-pill">{unitCode}</div>
                  </div>

                  <div className="square-card-body">
                    <h3 className="square-project-title" title={p.projectName || p.title || text("listings.text8")}>
                      {p.projectName || p.title || text("listings.text9")}
                    </h3>
                    <div className="square-location-row">
                      <MapPin size={13} className="text-gold shrink-0" />
                      <span>{p.zone || text("listings.text10")}</span>
                    </div>

                    <div className="square-specs-strip">
                      {p.size && (
                        <div className="spec-badge">
                          <Maximize2 size={12} className="text-gold" />
                          <span>{p.size} {text("listings.text11")}</span>
                        </div>
                      )}
                      {p.bedrooms && (
                        <div className="spec-badge">
                          <BedDouble size={12} className="text-gold" />
                          <span>{p.bedrooms} {text("listings.text12")}</span>
                        </div>
                      )}
                      {p.bathrooms && (
                        <div className="spec-badge">
                          <Bath size={12} className="text-gold" />
                          <span>{p.bathrooms} {text("listings.text13")}</span>
                        </div>
                      )}
                    </div>

                    <div className="square-financials-row">
                      <div>
                        <span className="financial-label">{p.purpose === "RENT" ? (locale === "en" ? "Monthly rent" : "الإيجار الشهري") : text("listings.text14")}</span>
                        <div className="financial-price">
                          {p.price ? text("listings.text15", [p.price.toLocaleString()]) : text("listings.text16")}
                        </div>
                      </div>
                      {p.monthlyInstallment && (
                        <div className="financial-installment-tag">{text("listings.text17")} {p.monthlyInstallment.toLocaleString()} {text("listings.text18")}</div>
                      )}
                    </div>

                    <div className="square-actions-row">
                      <a
                        href={`/properties/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-square-details w-full text-center"
                      >
                        <Eye size={14} />
                        <span>{text("listings.text19")}</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link href="/properties" className="btn-secondary-white px-10 py-3 text-base inline-flex">{text("listings.text20")}</Link>
          </div>
        </div>
      </section>}

      {/* ─── 4. FOUR DEDICATED PORTAL PILLARS ─── */}
      <section className="portal-section border-t border-white/5">
        <div className="portal-container">
          <div className="section-head text-center">
            <span className="section-tag mb-2">{text("services.text1")}</span>
            <h2 className="section-title-large">{text("services.text2")}</h2>
            <p className="section-subtitle">{text("services.text3")}</p>
          </div>

          <div className="four-pillars-grid">
            <Link href="/properties" className="pillar-glass-card group">
              <div className="pillar-icon-box gold">
                <Compass size={24} />
              </div>
              <h3 className="pillar-card-title">{text("services.text4")}</h3>
              <p className="pillar-card-desc">{text("services.text5")}</p>
              <div className="pillar-card-link">{text("services.text6")}</div>
            </Link>

            <Link href="/portfolio" className="pillar-glass-card group">
              <div className="pillar-icon-box blue">
                <Building2 size={24} />
              </div>
              <h3 className="pillar-card-title">{text("services.text7")}</h3>
              <p className="pillar-card-desc">{text("services.text8")}</p>
              <div className="pillar-card-link">{text("services.text9")}</div>
            </Link>

            <Link href="/sell" className="pillar-glass-card highlight group">
              <div className="pillar-icon-box emerald">
                <Home size={24} />
              </div>
              <h3 className="pillar-card-title">{text("services.text10")}</h3>
              <p className="pillar-card-desc">{text("services.text11")}</p>
              <div className="pillar-card-link gold">{text("services.text12")}</div>
            </Link>

            <Link href="/contact" className="pillar-glass-card group">
              <div className="pillar-icon-box purple">
                <Calendar size={24} />
              </div>
              <h3 className="pillar-card-title">{text("services.text13")}</h3>
              <p className="pillar-card-desc">{text("services.text14")}</p>
              <div className="pillar-card-link">{text("services.text15")}</div>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 5. OWNER DISCRETION REASSURANCE BANNER ─── */}
      <section className="portal-container mb-24">
        <div className="sell-unit-glass-banner">
          <div className="sell-text-side">
            <span className="section-tag gold">{text("sell.text1")}</span>
            <h2 className="sell-title">{text("sell.text2")}</h2>
            <p className="sell-desc">{text("sell.text3")}</p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/sell" className="sell-submit-action-btn">
                <span>{text("sell.text4")}</span>
              </Link>
              <Link href="/contact" className="btn-secondary-white py-3.5">{text("sell.text5")}</Link>
            </div>
          </div>

          <div className="sell-visual-side">
            <div className="sell-preview-card">
              <div className="preview-top-badge">{text("sell.text6")}</div>
              <div className="preview-inner-box">
                <div className="text-xs text-gold font-bold mb-1">{text("sell.text7")}</div>
                <div className="text-sm font-extrabold text-white mb-2">{text("sell.text8")}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{text("sell.text9")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className="portal-container darak-guides" aria-label={locale === "en" ? "Guides and news" : "الأدلة والأخبار"}>
        <Link href="/guides/finishes">{locale === "en" ? "Finishing" : "التشطيبات"} ↗</Link>
        <Link href="/guides/decor">{locale === "en" ? "Interiors" : "الديكور"} ↗</Link>
        <Link href="/guides/news">{locale === "en" ? "DARAK news" : "أخبار دارك"} ↗</Link>
      </nav>
      <PaymentEstimate />
      <PublicFooter />
    </div>
  );
}
