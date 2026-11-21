"use client";

import React from "react";
import Link from "next/link";
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

  return (
    <div dir="rtl" className="public-portal-root">
      <PublicHeader />

      {/* ─── 1. HERO SECTION ─── */}
      <section className="portal-hero-section">
        <div className="portal-container hero-layout">
          <div className="hero-text-content">
            <div className="hero-pill-badge">
              <ShieldCheck size={14} className="text-gold" />
              <span>منظومة الاستثمار والتسويق العقاري الحصرية في مصر</span>
            </div>

            <h1 className="hero-main-title">
              بوابتك نحو أرقى <span className="gold-shimmer-text">الفرص العقارية</span> والمشروعات المعتمدة
            </h1>

            <p className="hero-description">
              نضع بين يديك خبرة متكاملة في السوق العقاري المصري، لمساعدتك في شراء، استثمار، أو تسويق وحدتك بأعلى عائد استثماري وبسرية وأمان تام.
            </p>

            <div className="flex items-center gap-4 flex-wrap mb-10">
              <Link href="/properties" className="btn-consultation-gold px-8 py-3.5 text-base">
                تصفح الكتالوج العقاري &larr;
              </Link>
              <Link href="/sell" className="btn-secondary-white px-8 py-3.5 text-base">
                اعرض وحدتك للبيع معنا
              </Link>
            </div>

            {/* Stats Counters */}
            <div className="hero-stats-row">
              <div className="stat-box">
                <div className="stat-num">+1,500</div>
                <div className="stat-text">وحدة مسوقة بنجاح</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">+50</div>
                <div className="stat-text">مشروع وكومباوند معتمد</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">100%</div>
                <div className="stat-text">حفظ لسرية بيانات الملاك</div>
              </div>
            </div>
          </div>

          {/* Quick Gateway Cards (Distinctive Portals) */}
          <div className="hero-action-cards-grid">
            <Link href="/properties" className="action-glass-card group">
              <div className="action-icon-circle gold">
                <Eye size={22} />
              </div>
              <h3 className="action-card-title">الكتالوج العقاري المباشر</h3>
              <p className="action-card-desc">استكشف وحدات سكنية وتجارية حصرية بمختلف المساحات وأنظمة السداد.</p>
              <span className="action-card-btn gold">عرض الوحدات &larr;</span>
            </Link>

            <Link href="/portfolio" className="action-glass-card group">
              <div className="action-icon-circle blue">
                <Building2 size={22} />
              </div>
              <h3 className="action-card-title">بورتفوليو وإنجازات الشركة</h3>
              <p className="action-card-desc">تعرف على سابقة أعمالنا، شراكاتنا مع كبرى المطورين، وسجل نجاحاتنا.</p>
              <span className="action-card-btn">استعراض البورتفوليو &larr;</span>
            </Link>

            <Link href="/sell" className="action-glass-card highlight group">
              <div className="action-icon-circle emerald">
                <Home size={22} />
              </div>
              <h3 className="action-card-title">خدمة ملاك العقارات</h3>
              <p className="action-card-desc">سجل وحدتك وارفع صورها لنصلك بالمشترين الجادين مع حجب العنوان الدقيق.</p>
              <span className="action-card-btn gold">تسجيل وحدتك للبيع &larr;</span>
            </Link>

            <Link href="/contact" className="action-glass-card group">
              <div className="action-icon-circle purple">
                <Calendar size={22} />
              </div>
              <h3 className="action-card-title">حجز استشارة وتواصل</h3>
              <p className="action-card-desc">تحدث مع خبير عقاري متخصص لمناقشة خطتك وميزانيتك الاستثمارية.</p>
              <span className="action-card-btn">حجز جلسة استشارة &larr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 2. FEATURED SQUARES TEASER ─── */}
      <section className="portal-section">
        <div className="portal-container">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <span className="section-tag">مختارات الكتالوج العقاري</span>
              <h2 className="section-title-large">أحدث الوحدات الحصرية المتاحة</h2>
              <p className="section-subtitle">عروض مميزة تم فحصها قانونياً وفنياً بأرقى التجمعات والكمبوندات</p>
            </div>
            <Link href="/properties" className="btn-consultation-gold">
              عرض الكتالوج بالكامل &larr;
            </Link>
          </div>

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
                    <h3 className="square-project-title">{p.projectName || p.title || "مشروع متميز"}</h3>
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
                      <a href={`/share/property/${p.id}`} target="_blank" rel="noopener noreferrer" className="btn-square-details w-full text-center">
                        <Eye size={14} />
                        <span>معاينة تفاصيل الوحدة</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 3. PORTFOLIO & DEVELOPERS TEASER ─── */}
      <section className="portal-section border-t border-white/5">
        <div className="portal-container text-center">
          <span className="section-tag mb-3">سابقة أعمالنا</span>
          <h2 className="section-title-large">شراكات رسمية مع كبرى شركات التطوير في مصر</h2>
          <p className="section-subtitle max-w-2xl mx-auto mb-10">
            نعمل مع نخبة المطورين العقاريين: إعمار مصر، مجموعة طلعت مصطفى، بالم هيلز، سوديك، ماونتن فيو، وأورا ديفلوبرز.
          </p>
          <Link href="/portfolio" className="btn-secondary-white px-8 py-3.5 text-sm inline-flex">
            استكشف سجل سابقة الأعمال والشراكات بالكامل &larr;
          </Link>
        </div>
      </section>

      {/* ─── 4. SELL PROMO BANNER ─── */}
      <section className="portal-container mb-24">
        <div className="sell-unit-glass-banner">
          <div className="sell-text-side">
            <span className="section-tag gold">خدمة ملاك العقارات</span>
            <h2 className="sell-title">هل تملك وحدة وتريد بيعها بأعلى عائد ובسرية تامة؟</h2>
            <p className="sell-desc">
              اعرض وحدتك الآن عبر شركة دارك. نقوم بحجب رقم العمارة والشقة عن العامة وتصفية المشترين الجادين فقط قبل المعاينات الميدانية.
            </p>
            <Link href="/sell" className="sell-submit-action-btn">
              <span>سجل وحدتك وارفع صورها الآن &larr;</span>
            </Link>
          </div>
          <div className="sell-visual-side">
            <div className="sell-preview-card">
              <div className="preview-top-badge">نموذج العرض الآمن</div>
              <div className="preview-inner-box">
                <div className="text-xs text-gold font-bold mb-1">✓ حماية مطلقة لبيانات المالك</div>
                <div className="text-sm font-extrabold text-white mb-2">تسويق احترافي بالصور دون إفصاح العنوان الدقيق</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  نحن لا نعرض رقم الشقة أو هاتفك للعامة؛ بل نتولى التحقق المالي والائتماني الكامل من المشترين لضمان صفقة آمنة وسريعة.
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
