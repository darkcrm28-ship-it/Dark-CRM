"use client";

import React, { useState } from "react";
import {
  Building2,
  Maximize2,
  BedDouble,
  Bath,
  Layers,
  Sparkles,
  PhoneCall,
  MessageCircle,
  Share2,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  CreditCard,
  Calendar,
  Home,
} from "lucide-react";

interface UnitProps {
  id: string;
  refCode: string;
  title: string;
  projectName: string;
  zone: string;
  size?: number | null;
  unitType?: string | null;
  finishing?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: string | null;
  price?: number | null;
  monthlyInstallment?: number | null;
  remainingMonths?: number | null;
  installmentType?: string | null;
  description?: string | null;
  images: string[];
  status: string;
}

export default function PropertyShowcaseClient({ unit }: { unit: UnitProps }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const images = unit.images && unit.images.length > 0 ? unit.images : [];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: unit.title,
        text: `تفاصيل الوحدة العقارية المميزة (${unit.refCode})`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `مرحباً شركة دارك العقارية،\nأود الاستفسار عن تفاصيل ومعاينة الوحدة المعروضة:\n*${unit.title}*\nكود الوحدة: ${unit.refCode}\nالرابط: ${typeof window !== "undefined" ? window.location.href : ""}`
  );

  return (
    <div dir="rtl" className="showcase-page-wrapper">
      {/* Dynamic Background */}
      <div className="showcase-mesh-bg" />

      {/* Top Navbar / Header */}
      <header className="showcase-navbar">
        <div className="showcase-container navbar-inner">
          <div className="brand-badge-box">
            <div className="brand-logo-icon">
              <Building2 size={24} className="text-gold" />
            </div>
            <div>
              <div className="brand-logo-title">
                <span className="gold-gradient-text">دارك</span> للاستثمار العقاري
              </div>
              <div className="brand-logo-sub">Darak Real Estate Showcase</div>
            </div>
          </div>

          <div className="navbar-actions">
            <button onClick={handleShare} className="showcase-share-btn" title="مشاركة رابط الوحدة">
              <Share2 size={16} />
              <span>{copied ? "تم النسخ!" : "مشاركة"}</span>
            </button>
            <a
              href={`https://wa.me/?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="showcase-whatsapp-btn"
            >
              <MessageCircle size={18} />
              <span>تواصل واتساب</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="showcase-container main-content-layout">
        {/* Unit Header Title & Location */}
        <section className="showcase-header-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="unit-ref-pill">
              <ShieldCheck size={14} className="text-gold" />
              <span>كود الوحدة: {unit.refCode}</span>
            </div>
            <div className="unit-status-tag">
              {unit.status === "AVAILABLE" ? "متاحة للتعاقد" : "قيد الحجز"}
            </div>
          </div>

          <h1 className="showcase-unit-title">{unit.title}</h1>
          <p className="showcase-unit-zone">
            <span>المنطقة: <strong>{unit.zone}</strong></span>
            &bull;
            <span>المشروع: <strong>{unit.projectName}</strong></span>
          </p>
        </section>

        {/* Image Gallery Section */}
        <section className="showcase-gallery-section">
          {images.length > 0 ? (
            <div className="gallery-container">
              {/* Main Image Display */}
              <div className="gallery-main-view" onClick={() => setLightboxOpen(true)}>
                <img
                  src={images[activeImageIndex]}
                  alt={`${unit.title} - صورة ${activeImageIndex + 1}`}
                  className="gallery-main-img"
                />
                <div className="gallery-image-counter">
                  <span>{activeImageIndex + 1} / {images.length}</span>
                </div>
                <div className="gallery-expand-hint">
                  <Maximize2 size={16} />
                  <span>تكبير الصورة</span>
                </div>

                {/* Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                      }}
                      className="gallery-nav-arrow arrow-right"
                    >
                      <ChevronRight size={22} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                      }}
                      className="gallery-nav-arrow arrow-left"
                    >
                      <ChevronLeft size={22} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Carousel */}
              {images.length > 1 && (
                <div className="gallery-thumbnails-strip">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`gallery-thumb-item ${i === activeImageIndex ? "active" : ""}`}
                    >
                      <img src={img} alt={`مصغرة ${i + 1}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="no-images-placeholder">
              <Building2 size={48} className="text-gold opacity-50 mb-3" />
              <div className="text-base font-bold text-slate-300">معاينة صور الوحدة قيد التجهيز</div>
              <div className="text-xs text-slate-500 mt-1">تواصل مع المستشار العقاري لطلب فيديو ومعاينة حية للموقع</div>
            </div>
          )}
        </section>

        {/* Pricing & Key Specifications Grid */}
        <div className="showcase-grid-two-cols">
          {/* Right Column: Specs */}
          <div className="showcase-card">
            <h2 className="section-title">
              <Sparkles size={18} className="text-gold" />
              <span>مواصفات وتفاصيل الوحدة</span>
            </h2>

            <div className="specs-features-grid">
              <div className="spec-item-box">
                <div className="spec-icon-wrap"><Maximize2 size={18} /></div>
                <div>
                  <div className="spec-label">المساحة الإجمالية</div>
                  <div className="spec-value">{unit.size ? `${unit.size} م²` : "غير محددة"}</div>
                </div>
              </div>

              <div className="spec-item-box">
                <div className="spec-icon-wrap"><Home size={18} /></div>
                <div>
                  <div className="spec-label">نوع الوحدة</div>
                  <div className="spec-value">{unit.unitType || "شقة سكنية"}</div>
                </div>
              </div>

              <div className="spec-item-box">
                <div className="spec-icon-wrap"><BedDouble size={18} /></div>
                <div>
                  <div className="spec-label">غرف النوم</div>
                  <div className="spec-value">{unit.bedrooms ? `${unit.bedrooms} غرف` : "—"}</div>
                </div>
              </div>

              <div className="spec-item-box">
                <div className="spec-icon-wrap"><Bath size={18} /></div>
                <div>
                  <div className="spec-label">الحمامات</div>
                  <div className="spec-value">{unit.bathrooms ? `${unit.bathrooms} حمام` : "—"}</div>
                </div>
              </div>

              <div className="spec-item-box">
                <div className="spec-icon-wrap"><Layers size={18} /></div>
                <div>
                  <div className="spec-label">الدور / الطابق</div>
                  <div className="spec-value">{unit.floor || "متميز"}</div>
                </div>
              </div>

              <div className="spec-item-box">
                <div className="spec-icon-wrap"><Sparkles size={18} /></div>
                <div>
                  <div className="spec-label">مستوى التشطيب</div>
                  <div className="spec-value">{unit.finishing || "تشطيب كامل"}</div>
                </div>
              </div>
            </div>

            {/* Description */}
            {unit.description && (
              <div className="unit-description-block">
                <h3 className="description-title">الوصف والمزايا الإضافية</h3>
                <p className="description-text">{unit.description}</p>
              </div>
            )}
          </div>

          {/* Left Column: Price & Payment Breakdown */}
          <div className="showcase-card financial-card">
            <h2 className="section-title">
              <CreditCard size={18} className="text-gold" />
              <span>بيانات السعر وخطة السداد</span>
            </h2>

            {/* Price Box */}
            <div className="price-hero-box">
              <span className="price-sub-label">إجمالي السعر المطلوب</span>
              <div className="price-main-number">
                {unit.price ? `${unit.price.toLocaleString()} جنيه` : "السعر عند التواصل"}
              </div>
            </div>

            {/* Installments details if applicable */}
            {unit.monthlyInstallment && unit.monthlyInstallment > 0 ? (
              <div className="installments-breakdown-box">
                <div className="flex items-center gap-2 mb-3 text-gold font-bold text-sm">
                  <Calendar size={16} />
                  <span>تسهيلات السداد والأقساط</span>
                </div>
                <div className="installment-row">
                  <span>القسط الشهري التقريبي:</span>
                  <strong className="text-white">{unit.monthlyInstallment.toLocaleString()} ج.م / شهر</strong>
                </div>
                {unit.remainingMonths && (
                  <div className="installment-row">
                    <span>عدد الأشهر المتبقية:</span>
                    <strong className="text-white">{unit.remainingMonths} شهر</strong>
                  </div>
                )}
                {unit.installmentType && (
                  <div className="installment-row">
                    <span>نوع القسط:</span>
                    <strong className="text-white">{unit.installmentType === "FIXED" ? "قسط ثابت" : "متغير"}</strong>
                  </div>
                )}
              </div>
            ) : null}

            {/* Guarantee / Privacy badge */}
            <div className="privacy-guarantee-pill">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>بيانات موثوقة ومفحوصة بالكامل من خلال مستشاري شركة دارك العقارية.</span>
            </div>

            {/* Direct CTA Buttons */}
            <div className="cta-actions-stack">
              <a
                href={`https://wa.me/?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-whatsapp-cta"
              >
                <MessageCircle size={20} />
                <span>حجز موعد معاينة عبر واتساب</span>
              </a>

              <a
                href="tel:"
                className="secondary-call-cta"
              >
                <PhoneCall size={18} />
                <span>اتصال بالمستشار العقاري</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && images.length > 0 && (
        <div className="lightbox-modal-overlay" onClick={() => setLightboxOpen(false)}>
          <button className="lightbox-close-btn" onClick={() => setLightboxOpen(false)}>
            <X size={24} />
          </button>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={images[activeImageIndex]} alt="معاينة مكبرة" className="lightbox-img" />
          </div>

          {images.length > 1 && (
            <>
              <button
                className="lightbox-arrow lightbox-arrow-right"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                }}
              >
                <ChevronRight size={32} />
              </button>
              <button
                className="lightbox-arrow lightbox-arrow-left"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                }}
              >
                <ChevronLeft size={32} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Floating Bottom Contact Bar (Mobile) */}
      <div className="mobile-floating-cta-bar">
        <div>
          <div className="text-[11px] text-slate-400">كود: {unit.refCode}</div>
          <div className="text-sm font-bold text-gold">
            {unit.price ? `${unit.price.toLocaleString()} ج.م` : "عند التواصل"}
          </div>
        </div>
        <a
          href={`https://wa.me/?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-cta-btn"
        >
          <MessageCircle size={16} />
          <span>معاينة الوحدة</span>
        </a>
      </div>

      {/* Footer */}
      <footer className="showcase-footer">
        <div className="showcase-container footer-content">
          <div>دارك للاستثمار والتسويق العقاري &copy; 2026 &bull; كافة الحقوق محفوظة</div>
          <div className="text-xs text-slate-500 mt-1">
            تم إعداد ومشاركة هذا الكتالوج العقاري الحصري عبر منصة Dark CRM
          </div>
        </div>
      </footer>
    </div>
  );
}
