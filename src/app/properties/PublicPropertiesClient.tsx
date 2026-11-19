"use client";

import React, { useState, useMemo } from "react";
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
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Maximize2,
  BedDouble,
  Bath,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Layers,
  ChevronRight,
  ImageIcon,
} from "lucide-react";

interface PropertyItem {
  id: string;
  title?: string | null;
  projectName?: string | null;
  zone?: string | null;
  unitType?: string | null;
  finishing?: string | null;
  size?: number | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: string | null;
  images?: string | null;
  monthlyInstallment?: number | null;
  remainingMonths?: number | null;
  status: string;
  description?: string | null;
}

const UNIT_TYPES = ["الكل", "شقة", "فيلا", "ستوديو", "دوبلكس", "بنتهاوس", "محل تجاري", "مكتب إداري"];
const BEDROOMS_OPTIONS = ["الكل", "1", "2", "3", "4", "5+"];

export default function PublicPropertiesClient({
  initialProperties = [],
}: {
  initialProperties: PropertyItem[];
}) {
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnitType, setSelectedUnitType] = useState("الكل");
  const [selectedBedrooms, setSelectedBedrooms] = useState("الكل");
  const [selectedZone, setSelectedZone] = useState("الكل");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyInstallments, setOnlyInstallments] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Modal State for Viewing / Consultation
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<PropertyItem | null>(null);
  const [modalType, setModalType] = useState<"VIEWING" | "CONSULTATION">("VIEWING");

  const [inquiryName, setInquiryName] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryNotes, setInquiryNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Extract unique zones for filter dropdown
  const uniqueZones = useMemo(() => {
    const set = new Set<string>();
    initialProperties.forEach((p) => {
      if (p.zone && p.zone.trim()) set.add(p.zone.trim());
    });
    return ["الكل", ...Array.from(set)];
  }, [initialProperties]);

  // Filtered Properties
  const filteredProperties = useMemo(() => {
    return initialProperties.filter((p) => {
      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchProject = p.projectName?.toLowerCase().includes(q);
        const matchZone = p.zone?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchProject && !matchZone && !matchDesc) return false;
      }

      // Unit Type
      if (selectedUnitType !== "الكل" && p.unitType !== selectedUnitType) {
        return false;
      }

      // Bedrooms
      if (selectedBedrooms !== "الكل") {
        if (selectedBedrooms === "5+") {
          if (!p.bedrooms || p.bedrooms < 5) return false;
        } else {
          if (p.bedrooms !== parseInt(selectedBedrooms)) return false;
        }
      }

      // Zone
      if (selectedZone !== "الكل" && p.zone?.trim() !== selectedZone) {
        return false;
      }

      // Price Range
      if (minPrice && p.price && p.price < parseFloat(minPrice)) {
        return false;
      }
      if (maxPrice && p.price && p.price > parseFloat(maxPrice)) {
        return false;
      }

      // Installments Only
      if (onlyInstallments && (!p.monthlyInstallment || p.monthlyInstallment <= 0)) {
        return false;
      }

      return true;
    });
  }, [
    initialProperties,
    searchQuery,
    selectedUnitType,
    selectedBedrooms,
    selectedZone,
    minPrice,
    maxPrice,
    onlyInstallments,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedUnitType("الكل");
    setSelectedBedrooms("الكل");
    setSelectedZone("الكل");
    setMinPrice("");
    setMaxPrice("");
    setOnlyInstallments(false);
  };

  const openViewingModal = (unit: PropertyItem) => {
    setSelectedUnit(unit);
    setModalType("VIEWING");
    setInquiryName("");
    setInquiryPhone("");
    setInquiryNotes(`طلب معاينة للوحدة في مشروع: ${unit.projectName || ""}`);
    setSubmitSuccess(false);
    setSubmitError("");
    setModalOpen(true);
  };

  const openGeneralConsultation = () => {
    setSelectedUnit(null);
    setModalType("CONSULTATION");
    setInquiryName("");
    setInquiryPhone("");
    setInquiryNotes("طلب استشارة عامة بخصوص الوحدات المعروضة للبيع");
    setSubmitSuccess(false);
    setSubmitError("");
    setModalOpen(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        inquiryType: modalType,
        name: inquiryName.trim(),
        phone: inquiryPhone.trim(),
        notes: inquiryNotes.trim(),
        propertyId: selectedUnit?.id,
        preferredZone: selectedUnit?.zone,
      };

      const res = await fetch("/api/public/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الطلب");

      setSubmitSuccess(true);
      setTimeout(() => {
        setModalOpen(false);
      }, 3000);
    } catch (err: any) {
      setSubmitError(err.message || "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً.");
    } finally {
      setSubmitting(false);
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

  const countImages = (imagesStr?: string | null): number => {
    if (!imagesStr) return 0;
    try {
      const arr = JSON.parse(imagesStr);
      return Array.isArray(arr) ? arr.length : 1;
    } catch {
      return 1;
    }
  };

  return (
    <div dir="rtl" className="public-portal-root">
      {/* Background Glow */}
      <div className="portal-ambient-glow orb-gold" />
      <div className="portal-ambient-glow orb-blue" />

      {/* ─── 1. TOP NAVBAR (NO LOGIN LINKS) ─── */}
      <header className="portal-navbar">
        <div className="portal-container nav-container">
          <Link href="/" className="portal-brand">
            <div className="portal-brand-logo">
              <Building2 size={24} className="text-gold" />
            </div>
            <div>
              <div className="portal-brand-title">
                <span className="gold-gradient-text">دارك</span> للاستثمار العقاري
              </div>
              <div className="portal-brand-tagline">Darek Real Estate Portal</div>
            </div>
          </Link>

          <nav className="portal-nav-links">
            <Link href="/" className="portal-link">الرئيسية</Link>
            <Link href="/properties" className="portal-link active font-bold text-gold">عقارات للبيع</Link>
            <Link href="/#sell-section" className="portal-link">اعرض وحدتك للبيع</Link>
            <Link href="/#contact-section" className="portal-link">تواصل معنا</Link>
          </nav>

          <div className="portal-nav-actions">
            <button onClick={openGeneralConsultation} className="portal-consult-btn">
              <Calendar size={15} />
              <span>استشارة مجانية</span>
            </button>

            <a
              href="https://wa.me/?text=مرحباً شركة دارك العقارية، أود الاستفسار عن الوحدات والعقارات المعروضة للبيع."
              target="_blank"
              rel="noopener noreferrer"
              className="portal-whatsapp-pill"
            >
              <MessageCircle size={17} />
              <span>واتساب</span>
            </a>
          </div>
        </div>
      </header>

      {/* ─── 2. BREADCRUMB & HEADER BANNER ─── */}
      <div className="properties-page-header">
        <div className="portal-container">
          <div className="breadcrumb-row">
            <Link href="/" className="text-muted hover:text-gold">الرئيسية</Link>
            <ChevronRight size={14} className="text-muted" />
            <span className="text-gold font-bold">عقارات للبيع</span>
          </div>

          <div className="header-flex-row">
            <div>
              <h1 className="properties-page-title">
                عقارات ووحدات متميزة <span className="gold-gradient-text">للبيع</span>
              </h1>
              <p className="properties-page-sub">
                تصفح أفضل الفرص السكنية والتجارية المفحوصة والمحدثة دورياً مع كبرى شركات التطوير العقاري في مصر
              </p>
            </div>

            <div className="verified-badge-pill">
              <ShieldCheck size={16} className="text-gold" />
              <span>بيانات موثوقة &bull; حفظ سرية العناوين</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. ADVANCED SEARCH & FILTER BAR ─── */}
      <div className="portal-container mb-8">
        <div className="properties-filter-panel">
          {/* Top Search Input */}
          <div className="filter-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="ابحث باسم المشروع، الكومباوند، أو المنطقة (مثل: التجمع، زايد، العاصمة...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="clear-search-btn">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="filter-controls-row">
            {/* Unit Type */}
            <div className="filter-item">
              <label>نوع الوحدة</label>
              <select
                value={selectedUnitType}
                onChange={(e) => setSelectedUnitType(e.target.value)}
                className="filter-select"
              >
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Zone */}
            <div className="filter-item">
              <label>المنطقة / الكومباوند</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="filter-select"
              >
                {uniqueZones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {/* Bedrooms */}
            <div className="filter-item">
              <label>غرف النوم</label>
              <select
                value={selectedBedrooms}
                onChange={(e) => setSelectedBedrooms(e.target.value)}
                className="filter-select"
              >
                {BEDROOMS_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b === "الكل" ? "الكل" : `${b} غرف`}</option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div className="filter-item">
              <label>السعر من (ج.م)</label>
              <input
                type="number"
                placeholder="الحد الأدنى"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Max Price */}
            <div className="filter-item">
              <label>السعر إلى (ج.م)</label>
              <input
                type="number"
                placeholder="الحد الأقصى"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>

          {/* Bottom Filter Badges & Reset */}
          <div className="filter-bottom-bar">
            <div className="flex items-center gap-3">
              <label className="checkbox-filter-label">
                <input
                  type="checkbox"
                  checked={onlyInstallments}
                  onChange={(e) => setOnlyInstallments(e.target.checked)}
                  className="accent-gold"
                />
                <span>وحدات بتسهيلات سداد وأقساط فقط</span>
              </label>

              <button onClick={resetFilters} className="reset-filter-btn">
                <RotateCcw size={13} />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            </div>

            <div className="results-counter-pill">
              عرض <strong>{filteredProperties.length}</strong> من أصل {initialProperties.length} وحدة
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. PROPERTIES GRID ─── */}
      <div className="portal-container mb-16">
        <div className="properties-portal-grid">
          {filteredProperties.map((p) => {
            const cover = parseCover(p.images);
            const photosCount = countImages(p.images);

            const whatsappUnitMsg = encodeURIComponent(
              `مرحباً شركة دارك العقارية،\nأود الاستفسار عن الوحدة المعروضة للبيع:\n*${p.projectName || p.title}* في منطقة ${p.zone || ""}\nكود الوحدة: DK-${p.id.substring(0, 6).toUpperCase()}\nالرابط: ${typeof window !== "undefined" ? `${window.location.origin}/share/property/${p.id}` : ""}`
            );

            return (
              <div key={p.id} className="portal-property-card">
                {/* Image Cover */}
                <div className="portal-property-cover">
                  {cover ? (
                    <img src={cover} alt={p.projectName || "وحدة للبيع"} />
                  ) : (
                    <div className="portal-property-no-img">
                      <Building2 size={40} className="text-gold opacity-40 mb-2" />
                      <span>معاينة حصرية لدى المستشار</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="portal-property-badge">
                    <span>{p.unitType || "شقة سكنية"}</span>
                  </div>

                  {photosCount > 0 && (
                    <div className="property-card-photos-count">
                      <ImageIcon size={12} />
                      <span>{photosCount} صور</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="portal-property-body">
                  <h3 className="portal-property-title">{p.projectName || "مشروع عقاري متميز"}</h3>
                  <p className="portal-property-location">
                    <MapPin size={13} className="text-gold" />
                    <span>المنطقة: <strong>{p.zone || "القاهرة الكبرى"}</strong></span>
                  </p>

                  <div className="portal-property-specs">
                    {p.size && (
                      <span><Maximize2 size={13} /> {p.size} م²</span>
                    )}
                    {p.bedrooms && (
                      <span><BedDouble size={13} /> {p.bedrooms} غرف</span>
                    )}
                    {p.bathrooms && (
                      <span><Bath size={13} /> {p.bathrooms} حمام</span>
                    )}
                    {p.floor && (
                      <span><Layers size={13} /> دور {p.floor}</span>
                    )}
                  </div>

                  {/* Price Row */}
                  <div className="portal-property-price-row">
                    <div>
                      <span className="price-label">السعر المطلوب</span>
                      <div className="price-val">
                        {p.price ? `${p.price.toLocaleString()} ج.م` : "عند التواصل"}
                      </div>
                    </div>

                    {p.monthlyInstallment && p.monthlyInstallment > 0 ? (
                      <div className="installment-pill">
                        قسط: {p.monthlyInstallment.toLocaleString()} ج.م
                      </div>
                    ) : null}
                  </div>

                  {/* Action Buttons */}
                  <div className="portal-property-actions">
                    <Link
                      href={`/share/property/${p.id}`}
                      target="_blank"
                      className="btn-view-storefront"
                    >
                      <Eye size={15} />
                      <span>معاينة الكتالوج</span>
                    </Link>

                    <button
                      onClick={() => openViewingModal(p)}
                      className="btn-request-viewing"
                    >
                      <span>طلب معاينة</span>
                    </button>

                    <a
                      href={`https://wa.me/?text=${whatsappUnitMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp-icon"
                      title="استفسار فوري عبر واتساب"
                    >
                      <MessageCircle size={16} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProperties.length === 0 && (
            <div className="empty-properties-box col-span-full">
              <Building2 size={54} className="text-gold opacity-40 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-200">لا توجد وحدات تطابق معايير الفلترة الحالية</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                يمكنك إعادة ضبط الفلاتر أو التواصل مع مستشارينا لتوفير طلبك المخصص مباشرة من شبكة المطورين المعتمدة لدينا.
              </p>
              <div className="flex justify-center gap-3 mt-5">
                <button onClick={resetFilters} className="portal-consult-btn">
                  إعادة ضبط جميع الفلاتر
                </button>
                <button onClick={openGeneralConsultation} className="sell-submit-action-btn">
                  حجز استشارة مخصصة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. INTERACTIVE VIEWING / CONSULTATION MODAL ─── */}
      {modalOpen && (
        <div className="portal-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="portal-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-gold" />
                <h3 className="modal-heading">
                  {modalType === "VIEWING"
                    ? `طلب معاينة: ${selectedUnit?.projectName || "الوحدة العقارية"}`
                    : "حجز استشارة عقارية مجانية"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="modal-close-icon-btn">
                <X size={20} />
              </button>
            </div>

            {submitSuccess ? (
              <div className="modal-success-screen">
                <CheckCircle2 size={54} className="text-emerald-400 mb-3" />
                <h4 className="text-lg font-bold text-white mb-2">تم تسجيل طلبكم بنجاح!</h4>
                <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  شكراً لاهتمامكم. تم تحويل طلبكم مباشرة إلى مستشارينا المعتمدين وسيقوم الفريق بالتواصل معكم هاتفياً لترتيب الموعد والتفاصيل.
                </p>
                <button onClick={() => setModalOpen(false)} className="portal-consult-btn mt-6">
                  إغلاق النافذة
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitModal} className="modal-form-body">
                {submitError && (
                  <div className="form-alert-error mb-4">
                    <AlertCircle size={15} />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="modal-form-grid">
                  <div className="form-field">
                    <label>الاسم بالكامل *</label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم الثلاثي"
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      className="portal-input"
                    />
                  </div>

                  <div className="form-field">
                    <label>رقم الهاتف / الواتساب *</label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="01xxxxxxxxx"
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value)}
                      className="portal-input"
                    />
                  </div>
                </div>

                <div className="form-field mt-3">
                  <label>ملاحظات إضافية أو الموعد المفضل للمعاينة</label>
                  <textarea
                    rows={3}
                    placeholder="حدد اليوم أو الوقت المناسب للمعاينة أو أي استفسار محدد..."
                    value={inquiryNotes}
                    onChange={(e) => setInquiryNotes(e.target.value)}
                    className="portal-input"
                  />
                </div>

                <div className="modal-footer-actions mt-5">
                  <button type="submit" disabled={submitting} className="portal-submit-btn">
                    {submitting ? "جاري الإرسال..." : "تأكيد طلب المعاينة"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="portal-cancel-btn"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── 6. FOOTER ─── */}
      <footer className="portal-footer">
        <div className="portal-container footer-flex">
          <div className="footer-brand-side">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="text-gold" size={22} />
              <span className="font-extrabold text-base text-white">دارك للاستثمار والتسويق العقاري</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              بوابتك الموثوقة لأفضل الوحدات السكنية والاستثمارية في مصر. استشارات دقيقة، وسرية تامة لمعلومات الملاك والمشترين.
            </p>
          </div>

          <div className="footer-links-side">
            <div className="footer-col">
              <div className="footer-col-title">روابط سريعة</div>
              <Link href="/">الرئيسية</Link>
              <Link href="/properties">عقارات للبيع</Link>
              <Link href="/#sell-section">عرض وحدة للبيع</Link>
              <Link href="/#contact-section">تواصل معنا</Link>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">الخدمات السريعة</div>
              <button onClick={openGeneralConsultation} className="footer-link-btn">حجز استشارة مجانية</button>
              <Link href="/#sell-section" className="footer-link-btn">تسجيل وحدة مالك</Link>
            </div>
          </div>
        </div>

        <div className="portal-container copyright-row">
          <div>دارك للاستثمار العقاري &copy; 2026 &bull; كافة الحقوق محفوظة</div>
          <div className="text-[11px] text-slate-500">Darek Real Estate Properties Showcase</div>
        </div>
      </footer>
    </div>
  );
}
