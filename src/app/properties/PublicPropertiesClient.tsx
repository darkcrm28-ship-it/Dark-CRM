"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Eye,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  MapPin,
  Maximize2,
  BedDouble,
  Bath,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Camera,
  ArrowUpRight,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

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

const UNIT_TYPES = ["الكل", "شقة", "فيلا", "توين هاوس", "تاون هاوس", "دوبلكس", "بنتهاوس", "محل تجاري", "مكتب إداري"];
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

  // Quick Viewing Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<PropertyItem | null>(null);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Extract unique zones
  const uniqueZones = useMemo(() => {
    const zones = new Set<string>();
    initialProperties.forEach((p) => {
      if (p.zone && p.zone.trim()) zones.add(p.zone.trim());
    });
    return ["الكل", ...Array.from(zones)];
  }, [initialProperties]);

  // Filtered Properties
  const filteredProperties = useMemo(() => {
    return initialProperties.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (p.title || "").toLowerCase().includes(q);
        const projectMatch = (p.projectName || "").toLowerCase().includes(q);
        const zoneMatch = (p.zone || "").toLowerCase().includes(q);
        if (!titleMatch && !projectMatch && !zoneMatch) return false;
      }

      // 2. Unit Type
      if (selectedUnitType !== "الكل") {
        if (!p.unitType || !p.unitType.toLowerCase().includes(selectedUnitType.toLowerCase())) {
          return false;
        }
      }

      // 3. Bedrooms
      if (selectedBedrooms !== "الكل") {
        if (selectedBedrooms === "5+") {
          if (!p.bedrooms || p.bedrooms < 5) return false;
        } else {
          if (p.bedrooms !== parseInt(selectedBedrooms)) return false;
        }
      }

      // 4. Zone
      if (selectedZone !== "الكل") {
        if (!p.zone || p.zone.trim() !== selectedZone.trim()) return false;
      }

      // 5. Price Min
      if (minPrice && !isNaN(Number(minPrice))) {
        if (!p.price || p.price < Number(minPrice)) return false;
      }

      // 6. Price Max
      if (maxPrice && !isNaN(Number(maxPrice))) {
        if (!p.price || p.price > Number(maxPrice)) return false;
      }

      // 7. Only Installments
      if (onlyInstallments) {
        if (!p.monthlyInstallment || p.monthlyInstallment <= 0) return false;
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
    setInquiryName("");
    setInquiryPhone("");
    setSubmitSuccess(false);
    setSubmitError("");
    setModalOpen(true);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/public/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryType: "VIEWING",
          name: inquiryName.trim(),
          phone: inquiryPhone.trim(),
          propertyId: selectedUnit?.id,
          preferredZone: selectedUnit?.zone,
          notes: `طلب معاينة لوحدة: ${selectedUnit?.projectName || ""} (كود: DK-${selectedUnit?.id?.substring(0, 6)?.toUpperCase()})`,
        }),
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
      <PublicHeader />

      {/* Header Banner */}
      <section className="catalog-hero-header">
        <div className="portal-container">
          <div className="breadcrumb-nav-row">
            <Link href="/" className="hover:text-gold text-muted">الرئيسية</Link>
            <ChevronRight size={14} className="text-muted" />
            <span className="text-gold font-bold">الكتالوج العقاري للوحدات</span>
          </div>

          <div className="catalog-title-wrap">
            <div>
              <div className="section-tag mb-2">معرض الوحدات الحصرية</div>
              <h1 className="catalog-main-title">
                كتالوج الوحدات العقارية <span className="gold-shimmer-text">المتاحة للبيع</span>
              </h1>
              <p className="catalog-sub-desc">
                تصفح أفضل الفرص السكنية والاستثمارية المفحوصة والمطابقة لمعايير الجودة، مع الحفاظ التام على خصوصية الملاك والعناوين.
              </p>
            </div>

            <div className="catalog-verified-chip">
              <ShieldCheck size={16} className="text-gold" />
              <span>فحص عقاري وقانوني معتمد</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="portal-container mb-10">
        <div className="catalog-filter-card">
          {/* Top Search Input */}
          <div className="catalog-search-field">
            <Search size={18} className="catalog-search-icon" />
            <input
              type="text"
              placeholder="ابحث باسم المشروع، الكومباوند، أو المنطقة (مثل: مدينتي، ميفيدا، التجمع، زايد...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="catalog-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="clear-search-btn">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Filter Selects Grid */}
          <div className="catalog-filter-grid">
            <div className="filter-select-wrap">
              <label>نوع الوحدة</label>
              <select
                value={selectedUnitType}
                onChange={(e) => setSelectedUnitType(e.target.value)}
                className="catalog-select"
              >
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrap">
              <label>المنطقة / الكومباوند</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="catalog-select"
              >
                {uniqueZones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrap">
              <label>عدد الغرف</label>
              <select
                value={selectedBedrooms}
                onChange={(e) => setSelectedBedrooms(e.target.value)}
                className="catalog-select"
              >
                {BEDROOMS_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b === "الكل" ? "الكل" : `${b} غرف`}</option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrap">
              <label>السعر من (ج.م)</label>
              <input
                type="number"
                placeholder="الحد الأدنى"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="catalog-select"
              />
            </div>

            <div className="filter-select-wrap">
              <label>السعر إلى (ج.م)</label>
              <input
                type="number"
                placeholder="الحد الأقصى"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="catalog-select"
              />
            </div>
          </div>

          {/* Bottom Bar: Checkbox + Reset + Count */}
          <div className="catalog-filter-footer">
            <label className="checkbox-filter-label">
              <input
                type="checkbox"
                checked={onlyInstallments}
                onChange={(e) => setOnlyInstallments(e.target.checked)}
                className="accent-gold"
              />
              <span>عرض الوحدات ذات التسهيلات والأقساط فقط</span>
            </label>

            <div className="flex items-center gap-4">
              <button onClick={resetFilters} className="btn-reset-filters">
                <RotateCcw size={13} />
                <span>إعادة ضبط</span>
              </button>
              <div className="catalog-counter-pill">
                عرض <strong>{filteredProperties.length}</strong> من أصل {initialProperties.length} وحدة
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SQUARES CATALOG GRID WITH DISTINCTIVE EDGE GLOWS ═══════════ */}
      <section className="portal-container mb-24">
        <div className="squares-catalog-grid">
          {filteredProperties.map((p) => {
            const cover = parseCover(p.images);
            const photosCount = countImages(p.images);
            const unitCode = `DK-${p.id.substring(0, 6).toUpperCase()}`;

            const whatsappUnitMsg = encodeURIComponent(
              `مرحباً شركة دارك العقارية،\nأود الاستفسار عن الوحدة المعروضة بالكتالوج:\n*${p.projectName || p.title}* في ${p.zone || ""}\nكود الوحدة: ${unitCode}`
            );

            return (
              <div key={p.id} className="square-property-box group">
                {/* Visual Glow Aura Border */}
                <div className="box-glowing-rim" />

                {/* Top Image Box */}
                <div className="square-cover-container">
                  {cover ? (
                    <img
                      src={cover}
                      alt={p.projectName || "وحدة عقارية"}
                      className="square-cover-img"
                    />
                  ) : (
                    <div className="square-no-img-box">
                      <Building2 size={38} className="text-gold opacity-50 mb-2" />
                      <span>معاينة حصرية لدى المستشار</span>
                    </div>
                  )}

                  {/* Badges Overlays */}
                  <div className="square-badges-top-row">
                    <span className="badge-unit-type">{p.unitType || "شقة سكنية"}</span>
                    {photosCount > 1 && (
                      <span className="badge-photos-count">
                        <Camera size={12} /> {photosCount} صور
                      </span>
                    )}
                  </div>

                  <div className="square-code-pill">{unitCode}</div>
                </div>

                {/* Body Details */}
                <div className="square-card-body">
                  <div className="square-header-line">
                    <h3 className="square-project-title" title={p.projectName || p.title || "مشروع متميز"}>
                      {p.projectName || p.title || "مشروع عقاري متميز"}
                    </h3>
                  </div>

                  <div className="square-location-row">
                    <MapPin size={13} className="text-gold shrink-0" />
                    <span className="truncate">{p.zone || "القاهرة الكبرى"}</span>
                  </div>

                  {/* Specs Grid */}
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

                  {/* Price & Installment */}
                  <div className="square-financials-row">
                    <div>
                      <span className="financial-label">السعر المطلوب</span>
                      <div className="financial-price">
                        {p.price ? `${p.price.toLocaleString()} ج.م` : "عند التواصل"}
                      </div>
                    </div>

                    {p.monthlyInstallment && (
                      <div className="financial-installment-tag">
                        قسط: {p.monthlyInstallment.toLocaleString()} ج.م/ش
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="square-actions-row">
                    <a
                      href={`/share/property/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-square-details"
                    >
                      <Eye size={14} />
                      <span>التفاصيل</span>
                    </a>

                    <button
                      onClick={() => openViewingModal(p)}
                      className="btn-square-viewing"
                    >
                      <Calendar size={14} />
                      <span>معاينة</span>
                    </button>

                    <a
                      href={`https://wa.me/?text=${whatsappUnitMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-square-whatsapp"
                      title="واتساب للوحدة"
                    >
                      <MessageCircle size={15} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProperties.length === 0 && (
          <div className="catalog-empty-card">
            <Building2 size={48} className="text-gold opacity-40 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">لا توجد وحدات مطابقة للبحث حالياً</h3>
            <p className="text-xs text-muted max-w-md mx-auto mb-6">
              جرّب تغيير خيارات البحث أو قم بإعادة ضبط الفلاتر للاطلاع على كافة الوحدات المتاحة.
            </p>
            <button onClick={resetFilters} className="btn-consultation-gold inline-flex">
              إعادة ضبط الفلاتر وعرض الكل
            </button>
          </div>
        )}
      </section>

      {/* Quick Viewing Modal */}
      {modalOpen && selectedUnit && (
        <div className="portal-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="portal-modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gold" />
                <h3 className="modal-heading">طلب معاينة وحدة ميدانياً</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="modal-close-icon">
                <X size={16} />
              </button>
            </div>

            <div className="selected-unit-preview-strip mb-4">
              <div className="font-extrabold text-white text-sm">
                {selectedUnit.projectName || selectedUnit.title}
              </div>
              <div className="text-xs text-gold">
                المنطقة: {selectedUnit.zone || "القاهرة الكبرى"} &bull; كود: DK-{selectedUnit.id.substring(0, 6).toUpperCase()}
              </div>
            </div>

            {submitSuccess && (
              <div className="form-alert-success mb-4 p-3">
                <CheckCircle2 size={18} className="shrink-0" />
                <div className="text-xs">تم تسجيل طلب المعاينة بنجاح! سيتواصل معك منسق المعاينات لتحديد الموعد.</div>
              </div>
            )}

            {submitError && (
              <div className="form-alert-error mb-4 p-3">
                <AlertCircle size={18} className="shrink-0" />
                <div className="text-xs">{submitError}</div>
              </div>
            )}

            <form onSubmit={handleInquirySubmit} className="portal-quick-form">
              <div className="form-field">
                <label>الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="اسمك الكريم..."
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

              <button
                type="submit"
                disabled={submitting}
                className="btn-consultation-gold w-full justify-center py-3 text-sm mt-3"
              >
                {submitting ? "جاري الإرسال..." : "تأكيد طلب موعد المعاينة"}
              </button>
            </form>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
