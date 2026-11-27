"use client";

import { useSiteText, usePublicHeroStyle, usePublicSite, publicWhatsAppLink, SiteLink as Link } from "@/components/public/PublicSiteContent";
import React, { useState, useEffect, useRef } from "react";

import { createClientReadCache } from "@/lib/client-read-cache";
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
import AreaMap from "@/components/public/AreaMap";
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
  purpose?: string;
  description?: string | null;
}

const UNIT_TYPES = ["الكل", "شقة", "فيلا", "توين هاوس", "تاون هاوس", "دوبلكس", "بنتهاوس", "محل تجاري", "مكتب إداري"];
const BEDROOMS_OPTIONS = ["الكل", "1", "2", "3", "4", "5+"];

export default function PublicPropertiesClient({
  initialCatalog,
  zones,
  initialFilters,
}: {
  initialCatalog: { properties: PropertyItem[]; total: number; page: number; pageSize: number };
  zones: string[];
  initialFilters: string;
}) {
  const text = useSiteText();
  const heroStyle = usePublicHeroStyle();
  const { contact, locale } = usePublicSite();
  // Filter States
  const initial = new URLSearchParams(initialFilters);
  const [searchQuery, setSearchQuery] = useState(initial.get("q") || "");
  const [selectedUnitType, setSelectedUnitType] = useState(initial.get("type") || "الكل");
  const [selectedBedrooms, setSelectedBedrooms] = useState(initial.get("rooms") || "الكل");
  const [selectedZone, setSelectedZone] = useState(initial.get("zone") || "الكل");

  const en = locale === "en";
  const [purpose, setPurpose] = useState(initial.get("purpose") || "");
  const [budget, setBudget] = useState(initial.get("budget") || "");

  const [minSize, setMinSize] = useState(initial.get("minSize") || "");
  const [finishing, setFinishing] = useState(initial.get("finishing") || "");
  const [deliveryMonth, setDeliveryMonth] = useState(initial.get("deliveryMonth") || "");
  const [sort, setSort] = useState(initial.get("sort") || "");

  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    try {
      const ids: unknown = JSON.parse(localStorage.getItem("darak-comparison") || "[]");
      if (Array.isArray(ids)) setSaved(ids.filter((id): id is string => typeof id === "string").slice(0,3));
    } catch { /* Storage is optional. */ }
  }, []);
  function toggleSaved(id: string) {
    const next = saved.includes(id) ? saved.filter(value => value !== id) : [...saved, id].slice(0,3);
    setSaved(next);
    try { localStorage.setItem("darak-comparison", JSON.stringify(next)); } catch { /* In-memory selection remains available. */ }
  }
  // Quick Viewing Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<PropertyItem | null>(null);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const requestKey = useRef("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [catalog, setCatalog] = useState(initialCatalog);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogCache] = useState(() => createClientReadCache<typeof initialCatalog>());
  const catalogRequest = useRef<AbortController | null>(null);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const page = catalog.page;
  const uniqueZones = ["الكل", ...zones];
  const filteredProperties = catalog.properties;
  useEffect(() => () => catalogRequest.current?.abort(), []);

  const loadCatalog = async (targetPage: number, filters = appliedFilters) => {
    catalogRequest.current?.abort();
    const controller = new AbortController();
    catalogRequest.current = controller;
    const params = new URLSearchParams(filters);
    params.set("page", String(targetPage));
    setLoadingCatalog(true);
    setCatalogError("");
    try {
      const result = await catalogCache.load('/api/public/properties?' + params, controller.signal);
      if (!controller.signal.aborted) {
        if (targetPage === 1) params.delete("page");
        window.history.replaceState(window.history.state, "", params.size ? "/properties?" + params : "/properties");
        setCatalog(result);
        setAppliedFilters(filters);
      }
    } catch {
      if (!controller.signal.aborted) setCatalogError(text("header.text1"));
    } finally {
      if (!controller.signal.aborted) setLoadingCatalog(false);
    }
  };

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (minSize) params.set("minSize", minSize);
    if (finishing) params.set("finishing", finishing);
    if (deliveryMonth) params.set("deliveryMonth", deliveryMonth);
    if (sort && purpose) params.set("sort", sort);
    if (purpose) params.set("purpose", purpose);
    if (purpose && Number(budget) > 0) params.set("budget", budget);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (selectedUnitType !== "الكل") params.set("type", selectedUnitType);
    if (selectedBedrooms !== "الكل") params.set("rooms", selectedBedrooms);
    if (selectedZone !== "الكل") params.set("zone", selectedZone);
    void loadCatalog(1, params.toString());
  };

  const resetFilters = () => {
    setSearchQuery("");
    setPurpose("");
    setBudget("");
    setMinSize("");
    setFinishing("");
    setDeliveryMonth("");
    setSort("");
    setSelectedUnitType("الكل");
    setSelectedBedrooms("الكل");
    setSelectedZone("الكل");
    void loadCatalog(1, "");
  };

  const openViewingModal = (unit: PropertyItem) => {
    requestKey.current = crypto.randomUUID();
    setSelectedUnit(unit);
    setInquiryName("");
    setInquiryPhone("");
    setReference("");
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
          requestKey: requestKey.current,
          preferredZone: selectedUnit?.zone,
          notes: `طلب معاينة لوحدة: ${selectedUnit?.projectName || ""} (كود: DK-${selectedUnit?.id?.substring(0, 6)?.toUpperCase()})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || text("header.text2"));

      setReference(data.reference);
    } catch (err: any) {
      setSubmitError(err.message || text("header.text3"));
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
    <div className="public-portal-root">
      <PublicHeader />

      {/* Header Banner */}
      <section className="catalog-hero-header" style={heroStyle}>
        <div className="portal-container">
          <div className="breadcrumb-nav-row">
            <Link href="/" className="hover:text-gold text-muted">{text("header.text4")}</Link>
            <ChevronRight size={14} className="text-muted" />
            <span className="text-gold font-bold">{text("header.text5")}</span>
          </div>

          <div className="catalog-title-wrap">
            <div>
              <div className="section-tag mb-2">{text("header.text6")}</div>
              <h1 className="catalog-main-title">{text("header.text7")} <span className="gold-shimmer-text">{text("header.text8")}</span>
              </h1>
              <p className="catalog-sub-desc">{text("header.text9")}</p>
            </div>

            <div className="catalog-verified-chip">
              <ShieldCheck size={16} className="text-gold" />
              <span>{text("header.text10")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="portal-container mb-10">
        <form className="catalog-filter-card" onSubmit={applySearch}>
          {/* Top Search Input */}
          <div className="catalog-search-field">
            <Search size={18} className="catalog-search-icon" />
            <input
              type="text"
              placeholder={text("filters.text1")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="catalog-search-input"
            />
            {searchQuery && (
              <button type="button" aria-label={text("filters.text2")} onClick={() => setSearchQuery("")} className="clear-search-btn">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Filter Selects Grid */}
          <div className="catalog-filter-grid">
            <label className="filter-select-wrap">{en ? "Listing purpose" : "غرض الإعلان"}
              <select className="catalog-select" value={purpose} onChange={e => setPurpose(e.target.value)}>
                <option value="">{en ? "All" : "الكل"}</option><option value="SALE">{en ? "Buy" : "شراء"}</option><option value="RENT">{en ? "Rent" : "إيجار"}</option>
              </select>
            </label>
            <label className="filter-select-wrap">{en ? "Minimum area (m²)" : "أقل مساحة (م²)"}
              <input type="number" className="catalog-select" min="0" step="any" value={minSize} onChange={e => setMinSize(e.target.value)} />
            </label>
            <label className="filter-select-wrap">{en ? "Finishing" : "التشطيب"}
              <select className="catalog-select" value={finishing} onChange={e => setFinishing(e.target.value)}>
                <option value="">{en ? "All" : "الكل"}</option>
                {[["خام", "Unfinished"], ["نصف تشطيب", "Semi-finished"], ["تشطيب كامل", "Fully finished"], ["سوبر لوكس", "Super lux"], ["ألترا سوبر لوكس", "Ultra super lux"]].map(([ar, label]) => <option key={ar} value={ar}>{en ? label : ar}</option>)}
              </select>
            </label>
            <label className="filter-select-wrap">{en ? "Handover month" : "شهر الاستلام"}
              <input type="month" className="catalog-select" value={deliveryMonth} onChange={e => setDeliveryMonth(e.target.value)} />
            </label>
            {purpose && <label className="filter-select-wrap">{en ? "Sort by" : "الترتيب"}
              <select className="catalog-select" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="">{en ? "Newest" : "الأحدث"}</option>
                <option value="asc">{en ? "Lowest price" : "الأقل سعرًا"}</option>
                <option value="desc">{en ? "Highest price" : "الأعلى سعرًا"}</option>
              </select>
            </label>}
            {purpose && <label className="filter-select-wrap">{purpose === "RENT" ? (en ? "Maximum monthly rent (EGP)" : "أقصى إيجار شهري بالجنيه") : (en ? "Maximum total price (EGP)" : "أقصى سعر إجمالي بالجنيه")}
              <input className="catalog-select" type="number" min="1" value={budget} onChange={e => setBudget(e.target.value)} />
            </label>}
            <div className="filter-select-wrap">
              <label>{text("filters.text3")}</label>
              <select
                value={selectedUnitType}
                onChange={(e) => setSelectedUnitType(e.target.value)}
                className="catalog-select"
              >
                {UNIT_TYPES.map((t, index) => (
                  <option key={t} value={t}>{text("filters.unitType" + (index + 1))}</option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrap">
              <label>{text("filters.text4")}</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="catalog-select"
              >
                {uniqueZones.map((z) => (
                  <option key={z} value={z}>{z === "الكل" ? text("filters.text6") : z}</option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrap">
              <label>{text("filters.text5")}</label>
              <select
                value={selectedBedrooms}
                onChange={(e) => setSelectedBedrooms(e.target.value)}
                className="catalog-select"
              >
                {BEDROOMS_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b === "الكل" ? text("filters.text6") : text("filters.text7", [b])}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom Bar: Reset + Count */}
          <div className="catalog-filter-footer">
            <div className="flex items-center gap-4">
              <button type="submit" disabled={loadingCatalog} className="btn-consultation-gold">{text("filters.text8")}</button>
              <button type="button" onClick={resetFilters} className="btn-reset-filters">
                <RotateCcw size={13} />
                <span>{text("filters.text9")}</span>
              </button>
              <div className="catalog-counter-pill">
                {loadingCatalog ? text("filters.text10") : <>{text("filters.text11")} <strong>{filteredProperties.length}</strong> {text("filters.text12")} {catalog.total} {text("filters.text13")}</>}
              </div>
            </div>
          </div>
        </form>
        {saved.length > 0 && <Link className="darak-compare-link" href={"/properties/compare?ids=" + saved.join(",")}>{en ? "Compare selected properties" : "قارن الوحدات المختارة"} ({saved.length}/3)</Link>}
        {appliedFilters && <Link className="darak-compare-link" href={"/client-portal?search=" + encodeURIComponent(appliedFilters)}>{en ? "Save search to my account" : "حفظ البحث في حسابي"}</Link>}
        <AreaMap zones={zones} en={en} />
      </section>

      {/* ═══════════ SQUARES CATALOG GRID WITH DISTINCTIVE EDGE GLOWS ═══════════ */}
      <section className="portal-container mb-24">
        <div className="squares-catalog-grid">
          {filteredProperties.map((p) => {
            const cover = parseCover(p.images);
            const photosCount = countImages(p.images);
            const unitCode = `DK-${p.id.substring(0, 6).toUpperCase()}`;

            const whatsappUnitMsg = text("results.whatsappMessage", [p.projectName || p.title, p.zone, unitCode]);

            return (
              <div key={p.id} className="square-property-box group">
                {/* Visual Glow Aura Border */}
                <div className="box-glowing-rim" />

                {/* Top Image Box */}
                <div className="square-cover-container">
                  {cover ? (
                    <img
                      src={cover}
                      alt={p.projectName || text("results.text1")}
                      loading="lazy"
                      className="square-cover-img"
                    />
                  ) : (
                    <div className="square-no-img-box">
                      <Building2 size={38} className="text-gold opacity-50 mb-2" />
                      <span>{text("results.text2")}</span>
                    </div>
                  )}

                  {/* Badges Overlays */}
                  <div className="square-badges-top-row">
                    <span className="badge-unit-type">{p.unitType || text("results.text3")}</span>
                    {photosCount > 1 && (
                      <span className="badge-photos-count">
                        <Camera size={12} /> {photosCount} {text("results.text4")}</span>
                    )}
                  </div>

                  <div className="square-code-pill">{unitCode}</div>
                </div>

                {/* Body Details */}
                <div className="square-card-body">
                  <div className="square-header-line">
                    <h3 className="square-project-title" title={p.projectName || p.title || text("results.text5")}>
                      {p.projectName || p.title || text("results.text6")}
                    </h3>
                  </div>

                  <div className="square-location-row">
                    <MapPin size={13} className="text-gold shrink-0" />
                    <span className="truncate">{p.zone || text("results.text7")}</span>
                  </div>

                  {/* Specs Grid */}
                  <div className="square-specs-strip">
                    {p.size && (
                      <div className="spec-badge">
                        <Maximize2 size={12} className="text-gold" />
                        <span>{p.size} {text("results.text8")}</span>
                      </div>
                    )}
                    {p.bedrooms && (
                      <div className="spec-badge">
                        <BedDouble size={12} className="text-gold" />
                        <span>{p.bedrooms} {text("results.text9")}</span>
                      </div>
                    )}
                    {p.bathrooms && (
                      <div className="spec-badge">
                        <Bath size={12} className="text-gold" />
                        <span>{p.bathrooms} {text("results.text10")}</span>
                      </div>
                    )}
                  </div>

                  {/* Price & Installment */}
                  <div className="square-financials-row">
                    <div>
                      <span className="financial-label">{p.purpose === "RENT" ? (en ? "Monthly rent" : "الإيجار الشهري") : text("results.text11")}</span>
                      <div className="financial-price">
                        {p.price ? text("results.text12", [p.price.toLocaleString()]) : text("results.text13")}
                      </div>
                    </div>

                    {p.monthlyInstallment && (
                      <div className="financial-installment-tag">{text("results.text14")} {p.monthlyInstallment.toLocaleString()} {text("results.text15")}</div>
                    )}
                  </div>

                  <button className="darak-save" aria-pressed={saved.includes(p.id)} disabled={!saved.includes(p.id) && saved.length >= 3} onClick={() => toggleSaved(p.id)}>
                    {saved.includes(p.id) ? (en ? "Remove from comparison" : "إزالة من المقارنة") : (en ? "Save to compare" : "حفظ للمقارنة")}
                  </button>
                  {/* Actions Row */}
                  <div className="square-actions-row">
                    <a
                      href={`/properties/${p.id}`}
                      className="btn-square-details"
                    >
                      <Eye size={14} />
                      <span>{text("results.text16")}</span>
                    </a>

                    <button
                      onClick={() => openViewingModal(p)}
                      className="btn-square-viewing"
                    >
                      <Calendar size={14} />
                      <span>{text("results.text17")}</span>
                    </button>

                    <a
                      href={publicWhatsAppLink(contact["details.whatsapp"] ?? "", whatsappUnitMsg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-square-whatsapp"
                      title={text("results.text18")}
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
        {catalogError && <p role="alert">{catalogError}</p>}
        {catalog.total > catalog.pageSize && (
          <nav aria-label={text("results.text19")} className="catalog-filter-footer">
            <button type="button" className="btn-reset-filters" disabled={loadingCatalog || page <= 1} onClick={() => void loadCatalog(page - 1)}>{text("results.text20")}</button>
            <span>{text("results.text21")} {catalog.page} {text("results.text22")} {Math.ceil(catalog.total / catalog.pageSize)}</span>
            <button type="button" className="btn-reset-filters" disabled={loadingCatalog || page * catalog.pageSize >= catalog.total} onClick={() => void loadCatalog(page + 1)}>{text("results.text23")}</button>
          </nav>
        )}
        {filteredProperties.length === 0 && !catalogError && !loadingCatalog && (
          <div className="catalog-empty-card">
            <Building2 size={48} className="text-gold opacity-40 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">{text("results.text24")}</h3>
            <p className="text-xs text-muted max-w-md mx-auto mb-6">{text("results.text25")}</p>
            <button onClick={resetFilters} className="btn-consultation-gold inline-flex">{text("results.text26")}</button>
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
                <h3 className="modal-heading">{text("viewing.text1")}</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="modal-close-icon">
                <X size={16} />
              </button>
            </div>

            <div className="selected-unit-preview-strip mb-4">
              <div className="font-extrabold text-white text-sm">
                {selectedUnit.projectName || selectedUnit.title}
              </div>
              <div className="text-xs text-gold">{text("viewing.text2")} {selectedUnit.zone || text("viewing.text3")} {text("viewing.text4")}{selectedUnit.id.substring(0, 6).toUpperCase()}
              </div>
            </div>

            {reference && (
              <div className="form-alert-success mb-4 p-3">
                <CheckCircle2 size={18} className="shrink-0" />
                <div role="status" className="text-xs">{text("viewing.text5")} {en ? "Reference" : "رقم الطلب"} <bdi>{reference}</bdi></div>
              </div>
            )}

            {submitError && (
              <div className="form-alert-error mb-4 p-3">
                <AlertCircle size={18} className="shrink-0" />
                <div className="text-xs">{submitError}</div>
              </div>
            )}

            {!reference && <form onSubmit={handleInquirySubmit} className="portal-quick-form">
              <div className="form-field">
                <label>{text("viewing.text6")}</label>
                <input
                  type="text"
                  required
                  placeholder={text("viewing.text7")}
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  className="portal-input"
                />
              </div>

              <div className="form-field">
                <label>{text("viewing.text8")}</label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  placeholder={text("viewing.text9")}
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
                {submitting ? text("viewing.text10") : text("viewing.text11")}
              </button>
            </form>}
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
