"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  Eye,
  Home,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Award,
  TrendingUp,
  MapPin,
  ArrowLeft,
  ArrowUpRight,
  Maximize2,
  BedDouble,
  Bath,
  Search,
  CheckCircle2,
  Lock,
  ChevronRight,
  Trees,
  Compass,
} from "lucide-react";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";

interface PropertyItem {
  id: string;
  title?: string | null;
  projectName?: string | null;
  zone?: string | null;
  unitType?: string | null;
  size?: number | null;
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
  const router = useRouter();
  const [heroSearch, setHeroSearch] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      router.push(`/properties?q=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      router.push("/properties");
    }
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

  const topDevelopers = [
    { name: "إعمار مصر", sub: "ميفيدا &bull; مراسي &bull; أبتاون" },
    { name: "مجموعة طلعت مصطفى", sub: "مدينتي &bull; سيليا &bull; الرحاب" },
    { name: "بالم هيلز للتعمير", sub: "بادية &bull; بالم هيلز التجمع" },
    { name: "سوديك (SODIC)", sub: "فيليت &bull; إيست تاون &bull; كرمة" },
    { name: "ماونتن فيو", sub: "آي سيتي &bull; هايد بارك &bull; رأس الحكمة" },
    { name: "أورا ديفلوبرز", sub: "زد الشيخ زايد &bull; زد إيست" },
  ];

  return (
    <div dir="rtl" className="public-portal-root">
      <PublicHeader />

      {/* ─── 1. CINEMATIC LUXURY LANDSCAPE HERO SECTION ─── */}
      <section className="cinematic-hero-wrapper">
        <div className="hero-landscape-bg-img" />
        <div className="hero-dark-vignette-overlay" />

        <div className="portal-container hero-content-relative">
          <div className="hero-text-badge-pill">
            <Trees size={15} className="text-gold" />
            <span>مجتمعات سكنية فاخرة &bull; إطلالات لاندسكيب وبحيرات طبيعية</span>
          </div>

          <h1 className="cinematic-hero-headline">
            اختر منزل أحلامك في أرقى <br />
            <span className="gold-shimmer-text">الكمبوندات العقارية</span> بمصر
          </h1>

          <p className="cinematic-hero-subtext">
            نساعدك في اقتناء أرقى الفيلات والوحدات السكنية ذات الإطلالات الخضراء المفتوحة في التجمع الخامس، الشيخ زايد، والساحل الشمالي، مع فحص قانوني دقيق وأسهل خطط سداد.
          </p>

          {/* Embedded Floating Hero Search Box */}
          <form onSubmit={handleSearchSubmit} className="hero-floating-search-box">
            <div className="search-input-col">
              <Search size={18} className="text-gold" />
              <input
                type="text"
                placeholder="ابحث باسم المشروع، الكومباوند، أو المنطقة (مثل: ميفيدا، مدينتي، التجمع...)"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                className="hero-search-inner-input"
              />
            </div>
            <button type="submit" className="hero-search-action-btn">
              <span>بحث في الكتالوج</span>
              <ChevronRight size={16} />
            </button>
          </form>

          {/* Quick Action Navigation Buttons */}
          <div className="hero-actions-row">
            <Link href="/properties" className="btn-consultation-gold px-8 py-3.5 text-base font-extrabold">
              تصفح الكتالوج العقاري المباشر &larr;
            </Link>
            <Link href="/sell" className="btn-secondary-white px-8 py-3.5 text-base">
              اعرض وحدتك للبيع معنا
            </Link>
            <Link href="/portfolio" className="btn-secondary-white px-6 py-3.5 text-sm">
              سابقة أعمالنا وشركاؤنا
            </Link>
          </div>

          {/* Floating Glass Stats Ribbon */}
          <div className="hero-stats-floating-ribbon">
            <div className="ribbon-stat-item">
              <div className="ribbon-stat-num">+1,500</div>
              <div className="ribbon-stat-label">وحدة تم تسويقها بنجاح</div>
            </div>
            <div className="ribbon-stat-divider" />

            <div className="ribbon-stat-item">
              <div className="ribbon-stat-num">+50</div>
              <div className="ribbon-stat-label">مشروع ولاندسكيب معتمد</div>
            </div>
            <div className="ribbon-stat-divider" />

            <div className="ribbon-stat-item">
              <div className="ribbon-stat-num">98%</div>
              <div className="ribbon-stat-label">نسبة رضا المستثمرين</div>
            </div>
            <div className="ribbon-stat-divider" />

            <div className="ribbon-stat-item">
              <div className="ribbon-stat-num">100%</div>
              <div className="ribbon-stat-label">حفظ لسرية بيانات الملاك</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. DEVELOPERS & PARTNERS SHOWCASE STRIP ─── */}
      <section className="portal-container my-16">
        <div className="developers-strip-card">
          <div className="developers-strip-title">
            <ShieldCheck size={18} className="text-gold" />
            <span>شراكات معتمدة مع كبرى شركات التطوير العقاري في مصر</span>
          </div>

          <div className="developers-strip-grid">
            {topDevelopers.map((dev, idx) => (
              <div key={idx} className="dev-strip-item">
                <div className="font-extrabold text-white text-sm mb-1">{dev.name}</div>
                <div className="text-[11px] text-slate-400" dangerouslySetInnerHTML={{ __html: dev.sub }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURED SQUARES CATALOG PREVIEW ─── */}
      <section className="portal-section">
        <div className="portal-container">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <span className="section-tag mb-2">مختارات الكتالوج العقاري</span>
              <h2 className="section-title-large">أحدث الوحدات الحصرية المتاحة للبيع</h2>
              <p className="section-subtitle">
                عروض مميزة تم فحصها فنياً وقانونياً في كبرى الكمبوندات بإطلالات مفتوحة
              </p>
            </div>
            <Link href="/properties" className="btn-consultation-gold">
              عرض الكتالوج بالكامل &larr;
            </Link>
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
                      <img src={cover} alt={p.projectName || "وحدة"} className="square-cover-img" />
                    ) : (
                      <div className="square-no-img-box">
                        <Building2 size={38} className="text-gold opacity-50 mb-2" />
                        <span>معاينة حصرية لدى المستشار</span>
                      </div>
                    )}
                    <div className="square-badges-top-row">
                      <span className="badge-unit-type">{p.unitType || "شقة سكنية"}</span>
                    </div>
                    <div className="square-code-pill">{unitCode}</div>
                  </div>

                  <div className="square-card-body">
                    <h3 className="square-project-title" title={p.projectName || p.title || "مشروع متميز"}>
                      {p.projectName || p.title || "مشروع عقاري متميز"}
                    </h3>
                    <div className="square-location-row">
                      <MapPin size={13} className="text-gold shrink-0" />
                      <span>{p.zone || "القاهرة الكبرى"}</span>
                    </div>

                    <div className="square-specs-strip">
                      {p.size && (
                        <div className="spec-badge">
                          <Maximize2 size={12} className="text-gold" />
                          <span>{p.size} م²</span>
                        </div>
                      )}
                      {p.bedrooms && (
                        <div className="spec-badge">
                          <BedDouble size={12} className="text-gold" />
                          <span>{p.bedrooms} غرف</span>
                        </div>
                      )}
                      {p.bathrooms && (
                        <div className="spec-badge">
                          <Bath size={12} className="text-gold" />
                          <span>{p.bathrooms} حمام</span>
                        </div>
                      )}
                    </div>

                    <div className="square-financials-row">
                      <div>
                        <span className="financial-label">السعر المطلوب</span>
                        <div className="financial-price">
                          {p.price ? `${p.price.toLocaleString()} ج.م` : "عند التواصل"}
                        </div>
                      </div>
                      {p.monthlyInstallment && (
                        <div className="financial-installment-tag">
                          قسط: {p.monthlyInstallment.toLocaleString()} ج.م
                        </div>
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
                        <span>معاينة تفاصيل الوحدة كاملة &larr;</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link href="/properties" className="btn-secondary-white px-10 py-3 text-base inline-flex">
              استكشف جميع الوحدات بالكتالوج المربع &larr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 4. FOUR DEDICATED PORTAL PILLARS ─── */}
      <section className="portal-section border-t border-white/5">
        <div className="portal-container">
          <div className="section-head text-center">
            <span className="section-tag mb-2">خدمات شركة دارك العقارية</span>
            <h2 className="section-title-large">منظومة عقارية متكاملة تلبي كافة احتياجاتك</h2>
            <p className="section-subtitle">
              نوفر لك أقساماً وخدمات متخصصة ومستقلة لتجربة عقارية استثنائية
            </p>
          </div>

          <div className="four-pillars-grid">
            <Link href="/properties" className="pillar-glass-card group">
              <div className="pillar-icon-box gold">
                <Compass size={24} />
              </div>
              <h3 className="pillar-card-title">الكتالوج العقاري المباشر</h3>
              <p className="pillar-card-desc">تصفح الفيلات والشقق المعروضة للبيع مع فلترة دقيقة بالمساحة والميزانية والغرف.</p>
              <div className="pillar-card-link">دخول الكتالوج &larr;</div>
            </Link>

            <Link href="/portfolio" className="pillar-glass-card group">
              <div className="pillar-icon-box blue">
                <Building2 size={24} />
              </div>
              <h3 className="pillar-card-title">سابقة أعمالنا والشركاء</h3>
              <p className="pillar-card-desc">سجل مشاريعنا وإنجازاتنا مع كبرى المطورين العقاريين، وإحصائيات الثقة والإنجاز.</p>
              <div className="pillar-card-link">عرض البورتفوليو &larr;</div>
            </Link>

            <Link href="/sell" className="pillar-glass-card highlight group">
              <div className="pillar-icon-box emerald">
                <Home size={24} />
              </div>
              <h3 className="pillar-card-title">اعرض وحدتك للبيع معنا</h3>
              <p className="pillar-card-desc">خدمة حصرية للملاك لتسويق وحداتهم بالصور مع حجب كامل لرقم الشقة والعناوين الحساسة.</p>
              <div className="pillar-card-link gold">تسجيل وحدتك الآن &larr;</div>
            </Link>

            <Link href="/contact" className="pillar-glass-card group">
              <div className="pillar-icon-box purple">
                <Calendar size={24} />
              </div>
              <h3 className="pillar-card-title">حجز استشارة وتواصل</h3>
              <p className="pillar-card-desc">تحدث مباشرة مع مستشار عقاري متخصص لتحديد أنسب الفرص ومناقشة تفاصيل ميزانيتك.</p>
              <div className="pillar-card-link">حجز جلسة استشارة &larr;</div>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 5. OWNER DISCRETION REASSURANCE BANNER ─── */}
      <section className="portal-container mb-24">
        <div className="sell-unit-glass-banner">
          <div className="sell-text-side">
            <span className="section-tag gold">أمان وخصوصية الملاك</span>
            <h2 className="sell-title">هل تملك وحدة في كمبوند وترغب في بيعها بأعلى عائد؟</h2>
            <p className="sell-desc">
              اعرض وحدتك الآن مع شركة دارك. نقوم بتسويق وحدتك لقاعدة مشترين جادة ومؤهلة مع حماية تامة لخصوصيتك: لا ننشر رقم الشقة أو رقم العمارة أو هاتفك في العلن. نحن نتولى التصفية المالية الكاملة قبل أي معاينة.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/sell" className="sell-submit-action-btn">
                <span>سجل وحدتك وارفع صورها الآن &larr;</span>
              </Link>
              <Link href="/contact" className="btn-secondary-white py-3.5">
                تحدث مع مستشار المبيعات
              </Link>
            </div>
          </div>

          <div className="sell-visual-side">
            <div className="sell-preview-card">
              <div className="preview-top-badge">نموذج العرض الآمن لدى دارك</div>
              <div className="preview-inner-box">
                <div className="text-xs text-gold font-bold mb-1">✓ حماية مطلقة لبيانات المالك</div>
                <div className="text-sm font-extrabold text-white mb-2">تسويق احترافي بالصور دون إفصاح العنوان الدقيق</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  نحن لا نعرض رقم الشقة أو بيانات التواصل الخاصة بك في العلن؛ نحن نتولى الفحص والفلترة الكاملة للمشترين الماليين قبل المعاينة.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
