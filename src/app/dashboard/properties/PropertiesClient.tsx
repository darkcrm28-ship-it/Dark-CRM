"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import DynamicFields from "@/components/DynamicFields";
import UnitImageManager from "@/components/UnitImageManager";
import {
  Building2,
  Plus,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Share2,
  Edit,
  Trash2,
  ImageIcon,
  Check,
  Download,
  Eye,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  AVAILABLE: { label: "متاحة", badge: "badge-green" },
  RESERVED: { label: "محجوزة", badge: "badge-orange" },
  SOLD: { label: "مباعة", badge: "badge-red" },
  RENTED: { label: "مؤجرة", badge: "badge-blue" },
};

const UNIT_TYPES = ["شقة", "فيلا", "ستوديو", "دوبلكس", "بنتهاوس", "محل تجاري", "مكتب إداري", "أرض"];
const FINISHING = ["خام", "نصف تشطيب", "تشطيب كامل", "سوبر لوكس", "ألترا سوبر لوكس"];

const EMPTY_FORM = {
  projectName: "",
  unitNumber: "",
  buildingNumber: "",
  zone: "",
  floor: "",
  size: "",
  bedrooms: "",
  bathrooms: "",
  unitType: "شقة",
  finishing: "تشطيب كامل",
  price: "",
  status: "AVAILABLE",
  description: "",
  monthlyInstallment: "",
  remainingMonths: "",
  installmentType: "FIXED",
  installmentPercentage: "",
  images: [] as string[],
  customData: {},
};

export default function PropertiesClient({
  properties,
  isManager,
  session,
}: {
  properties: any[];
  isManager: boolean;
  session?: any;
}) {
  const [list, setList] = useState(properties);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterUnitType, setFilterUnitType] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");
  const [filterBathrooms, setFilterBathrooms] = useState("");
  const [filterFinishing, setFilterFinishing] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");

  const [appliedFilters, setAppliedFilters] = useState<any>({
    search: "",
    filterStatus: "",
    filterUnitType: "",
    filterBedrooms: "",
    filterBathrooms: "",
    filterFinishing: "",
    filterPriceMin: "",
    filterPriceMax: "",
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);

  // Publication field selector (replaces window.prompt)
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [pendingPublicationProperty, setPendingPublicationProperty] = useState<any>(null);

  const PUBLISHABLE_FIELDS: { key: string; label: string }[] = [
    { key: "title", label: "العنوان" },
    { key: "projectName", label: "اسم المشروع" },
    { key: "zone", label: "المنطقة" },
    { key: "unitType", label: "نوع الوحدة" },
    { key: "finishing", label: "التشطيب" },
    { key: "size", label: "المساحة" },
    { key: "bedrooms", label: "غرف النوم" },
    { key: "bathrooms", label: "الحمامات" },
    { key: "images", label: "الصور" },
    { key: "description", label: "الوصف" },
  ];

  const router = useRouter();

  useEffect(() => {
    const fetchDefs = async () => {
      try {
        const res = await fetch("/api/settings/custom-fields");
        const data = await res.json();
        setCustomFieldDefs(data.filter((f: any) => f.entityType === "PROPERTY"));
      } catch (err) {
        console.error(err);
      }
    };
    fetchDefs();
  }, []);

  const filtered = list.filter((p) => {
    const {
      search: q,
      filterStatus: fStatus,
      filterUnitType: fUnitType,
      filterBedrooms: fBeds,
      filterBathrooms: fBaths,
      filterFinishing: fFinishing,
      filterPriceMin: fPMin,
      filterPriceMax: fPMax,
    } = appliedFilters;

    const query = q.toLowerCase();
    const matchSearch =
      !query ||
      p.projectName?.toLowerCase().includes(query) ||
      p.unitNumber?.includes(query) ||
      p.zone?.toLowerCase().includes(query);
    const matchStatus = !fStatus || p.status === fStatus;
    const matchUnitType = !fUnitType || p.unitType === fUnitType;
    const matchBeds = !fBeds || p.bedrooms === parseInt(fBeds);
    const matchBaths = !fBaths || p.bathrooms === parseInt(fBaths);
    const matchFinishing = !fFinishing || p.finishing === fFinishing;
    const matchPMin = !fPMin || (p.price && p.price >= parseFloat(fPMin));
    const matchPMax = !fPMax || (p.price && p.price <= parseFloat(fPMax));

    return (
      matchSearch &&
      matchStatus &&
      matchUnitType &&
      matchBeds &&
      matchBaths &&
      matchFinishing &&
      matchPMin &&
      matchPMax
    );
  });

  const exportToExcel = () => {
    const data = filtered.map((p) => ({
      "اسم المشروع": p.projectName,
      "رقم الوحدة": p.unitNumber,
      "رقم المبنى": p.buildingNumber || "",
      "المنطقة": p.zone || "",
      "الطابق": p.floor || "",
      "المساحة": p.size || "",
      "غرف النوم": p.bedrooms || "",
      "الحمامات": p.bathrooms || "",
      "نوع الوحدة": p.unitType || "",
      "التشطيب": p.finishing || "",
      "السعر": p.price || "",
      "الحالة": STATUS_MAP[p.status]?.label || p.status,
      "القسط الشهري": p.monthlyInstallment || "",
      "المدة (شهور)": p.remainingMonths || "",
      "عدد الصور": p.images ? (JSON.parse(p.images) || []).length : 0,
      "الوصف": p.description || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الوحدات العقارية");
    XLSX.writeFile(wb, `Dark-CRM-Properties-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      images: JSON.stringify(form.images || []),
      floor: form.floor ? form.floor.toString() : null,
      size: form.size ? +form.size : null,
      bedrooms: form.bedrooms ? +form.bedrooms : null,
      bathrooms: form.bathrooms ? +form.bathrooms : null,
      price: form.price ? +form.price : null,
      monthlyInstallment: form.monthlyInstallment ? +form.monthlyInstallment : null,
      remainingMonths: form.remainingMonths ? +form.remainingMonths : null,
      installmentPercentage: form.installmentPercentage ? +form.installmentPercentage : null,
    };

    try {
      const res = await fetch(editing ? `/api/properties/${editing}` : "/api/properties", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حفظ الوحدة");

      if (editing) {
        setList(list.map((p) => (p.id === editing ? data.property : p)));
      } else {
        setList([data.property, ...list]);
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء حفظ الوحدة");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الوحدة نهائياً؟")) return;
    try {
      await fetch(`/api/properties/${id}`, { method: "DELETE" });
      setList(list.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const updatePublication = async (property: any) => {
    const isGeneralManager = session?.role === "GENERAL_MANAGER";
    const current = property.customData?.publicListing || {};
    const fields: string[] = Array.isArray(current.fields) ? current.fields : [];
    let status: "PENDING" | "APPROVED" | "REJECTED";

    // If currently PENDING or APPROVED, use the existing status-change flow
    if (current.status === "PENDING" && isGeneralManager) {
      status = confirm("اعتماد نشر هذه الوحدة بالحقول المحددة؟") ? "APPROVED" : "REJECTED";
    } else if (current.status === "APPROVED") {
      if (!isGeneralManager) return;
      status = "PENDING";
    } else {
      // Show field selection UI instead of prompt
      setPendingPublicationProperty(property);
      setSelectedFields(Array.isArray(current.fields) ? current.fields : []);
      setShowFieldSelector(true);
      return; // UI will handle submission
    }

    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, fields }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث حالة النشر");
      setList((items) => items.map((item) => item.id === property.id ? {
        ...item,
        customData: { ...(item.customData || {}), publicListing: { status, fields } },
      } : item));
      router.refresh();
    } catch (error: any) {
      alert(error.message || "تعذر تحديث حالة النشر");
    }
  };

  const handleConfirmPublication = async () => {
    const property = pendingPublicationProperty;
    if (!property) return;
    const status = "PENDING";
    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, fields: selectedFields }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث حالة النشر");
      setList((items) => items.map((item) => item.id === property.id ? {
        ...item,
        customData: { ...(item.customData || {}), publicListing: { status, fields: selectedFields } },
      } : item));
      router.refresh();
    } catch (error: any) {
      alert(error.message || "تعذر تحديث حالة النشر");
    } finally {
      setShowFieldSelector(false);
      setPendingPublicationProperty(null);
      setSelectedFields([]);
    }
  };

  const startEdit = (p: any) => {
    let parsedImages: string[] = [];
    if (p.images) {
      try {
        const parsed = JSON.parse(p.images);
        if (Array.isArray(parsed)) parsedImages = parsed;
        else if (typeof parsed === "string") parsedImages = [parsed];
      } catch {
        parsedImages = [p.images];
      }
    }

    setForm({
      ...p,
      floor: p.floor ?? "",
      size: p.size ?? "",
      bedrooms: p.bedrooms ?? "",
      bathrooms: p.bathrooms ?? "",
      price: p.price ?? "",
      monthlyInstallment: p.monthlyInstallment ?? "",
      remainingMonths: p.remainingMonths ?? "",
      installmentType: p.installmentType ?? "FIXED",
      installmentPercentage: p.installmentPercentage ?? "",
      images: parsedImages,
      customData: p.customData || {},
    });
    setEditing(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyShareLink = (id: string) => {
    const url = `${window.location.origin}/properties/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const parseCoverImage = (imagesStr?: string | null): string | null => {
    if (!imagesStr) return null;
    try {
      const arr = JSON.parse(imagesStr);
      if (Array.isArray(arr) && arr.length > 0) return arr[0];
    } catch {
      return imagesStr;
    }
    return null;
  };

  const field = (
    name: string,
    label: string,
    type = "text",
    opts?: { select?: boolean; options?: string[] }
  ) => (
    <div className="form-group" key={name}>
      <label className="form-label">{label}</label>
      {opts?.select ? (
        <select
          className="input"
          value={form[name] || ""}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        >
          {opts.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className="input"
          value={form[name] ?? ""}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        />
      )}
    </div>
  );

  return (
    <div>
      {/* Header Bar */}
      <div className="page-header flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="text-gold" />
            <span>قاعدة الوحدات العقارية المعروضة</span>
          </h1>
          <p className="page-subtitle">
            إدارة المعروض العقاري &bull; كتالوجات العملاء ومشاركة الروابط بدون إفصاح العناوين
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {session?.role === "GENERAL_MANAGER" && (
            <button onClick={exportToExcel} className="btn btn-secondary flex items-center gap-1.5">
              <Download size={16} />
              <span>تصدير Excel</span>
            </button>
          )}

          {isManager && (
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditing(null);
                setForm(EMPTY_FORM);
              }}
              className="btn btn-primary flex items-center gap-1.5"
            >
              {showForm && !editing ? (
                <span>إغلاق النموذج</span>
              ) : (
                <>
                  <Plus size={16} />
                  <span>إضافة وحدة جديدة</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="card animate-in mb-6 border-t-2 border-gold">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-subtle">
            <div className="font-extrabold text-base text-gold flex items-center gap-2">
              <Building2 size={20} />
              <span>{editing ? "تعديل بيانات الوحدة والصور" : "إضافة وحدة جديدة إلى الكتالوج"}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="btn btn-ghost btn-sm"
            >
              إلغاء
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Primary Details */}
            <div className="grid-3 mb-4">
              {field("projectName", "اسم المشروع أو الكومباوند *")}
              {field("unitNumber", "رقم الوحدة الداخلي (سري للشركة) *")}
              {field("buildingNumber", "رقم العمارة / المبنى (سري)")}
              {field("zone", "المنطقة / الحي (يظهر للعميل)")}
              {field("floor", "الطابق / الدور", "text")}
              {field("size", "المساحة (م²)", "number")}
              {field("bedrooms", "غرف النوم", "number")}
              {field("bathrooms", "الحمامات", "number")}
              {field("unitType", "نوع الوحدة", "text", { select: true, options: UNIT_TYPES })}
              {field("finishing", "مستوى التشطيب", "text", { select: true, options: FINISHING })}
              {field("price", "إجمالي السعر المطلوب (جنيه)", "number")}
              <div className="form-group">
                <label className="form-label">حالة الوحدة</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group mb-4">
              <label className="form-label">الوصف والمزايا التسويقية (تظهر في صفحة الكتالوج)</label>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="اكتب وصفاً جذاباً للوحدة، الفيو، القرب من الخدمات..."
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Installments Breakdown */}
            <div className="p-4 rounded-xl bg-gold-5 border border-gold-20 mb-4">
              <div className="text-xs font-bold text-gold mb-3">بيانات الأقساط وتسهيلات السداد (اختياري)</div>
              <div className="grid-4">
                {field("monthlyInstallment", "قيمة القسط الشهري", "number")}
                {field("remainingMonths", "المدة المتبقية (بالشهور)", "number")}
                <div className="form-group">
                  <label className="form-label">نوع القسط</label>
                  <select
                    className="input"
                    value={form.installmentType}
                    onChange={(e) => setForm({ ...form, installmentType: e.target.value })}
                  >
                    <option value="FIXED">قسط ثابت</option>
                    <option value="INCREASING">قسط متزايد</option>
                    <option value="DECREASING">قسط متناقص</option>
                  </select>
                </div>
                {form.installmentType !== "FIXED" &&
                  field("installmentPercentage", "النسبة المئوية (%)", "number")}
              </div>
            </div>

            {/* ✨ UNIT IMAGES MANAGER CONTROL PANEL (Max 10 images, <= 500 KB) */}
            <div className="mb-5">
              <UnitImageManager
                images={form.images || []}
                onChange={(imgs) => setForm({ ...form, images: imgs })}
                maxImages={10}
              />
            </div>

            {/* Dynamic Custom Fields */}
            {customFieldDefs.length > 0 && (
              <div className="mb-4">
                <DynamicFields
                  entityType="PROPERTY"
                  definitions={customFieldDefs}
                  values={form.customData || {}}
                  onChange={(name, val) =>
                    setForm({
                      ...form,
                      customData: { ...(form.customData || {}), [name]: val },
                    })
                  }
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t border-subtle">
              <button
                type="submit"
                disabled={loading || !form.projectName || !form.unitNumber}
                className="btn btn-primary"
              >
                {loading ? "جاري الحفظ..." : "حفظ بيانات الوحدة والصور"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="btn btn-ghost"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filters */}
      <div className="card mb-4 p-3.5">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px] relative">
            <input
              className="input pr-9"
              placeholder="بحث بالمشروع، رقم الوحدة، أو المنطقة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} className="absolute right-3 top-3 text-muted" />
          </div>

          <select
            className="input w-[150px]"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_MAP).map(([v, { label }]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="btn btn-secondary flex items-center gap-1.5"
          >
            <SlidersHorizontal size={15} />
            <span>{showAdvancedFilters ? "إخفاء الفلاتر" : "فلاتر متقدمة"}</span>
          </button>

          <button
            onClick={() =>
              setAppliedFilters({
                search,
                filterStatus,
                filterUnitType,
                filterBedrooms,
                filterBathrooms,
                filterFinishing,
                filterPriceMin,
                filterPriceMax,
              })
            }
            className="btn btn-primary"
          >
            تطبيق البحث
          </button>
        </div>

        {/* Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="grid-4 gap-3 mt-3 pt-3 border-t border-subtle">
            <div>
              <label className="text-[11px] text-muted block mb-1">نوع الوحدة</label>
              <select
                className="input"
                value={filterUnitType}
                onChange={(e) => setFilterUnitType(e.target.value)}
              >
                <option value="">الكل</option>
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1">غرف النوم</label>
              <input
                type="number"
                className="input"
                placeholder="عدد الغرف"
                value={filterBedrooms}
                onChange={(e) => setFilterBedrooms(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1">السعر الأدنى</label>
              <input
                type="number"
                className="input"
                placeholder="من جنيه"
                value={filterPriceMin}
                onChange={(e) => setFilterPriceMin(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1">السعر الأقصى</label>
              <input
                type="number"
                className="input"
                placeholder="إلى جنيه"
                value={filterPriceMax}
                onChange={(e) => setFilterPriceMax(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Units Cards Grid */}
      <div className="grid-3 gap-4">
        {filtered.map((p) => {
          const coverImage = parseCoverImage(p.images);
          const imagesCount = p.images ? (JSON.parse(p.images) || []).length : 0;

          return (
            <div key={p.id} className="card p-0 overflow-hidden flex flex-col property-catalog-card">
              {/* Unit Card Image Preview Header */}
              <div className="property-card-cover-wrapper">
                {coverImage ? (
                  <img src={coverImage} alt={p.projectName} className="property-card-cover-img" />
                ) : (
                  <div className="property-card-no-cover">
                    <Building2 size={36} className="text-gold opacity-40 mb-1" />
                    <span className="text-[11px] text-slate-400">لا توجد صور مرفوعة</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="property-card-badge-top">
                  <span className={`badge ${STATUS_MAP[p.status]?.badge || "badge-gray"}`}>
                    {STATUS_MAP[p.status]?.label || p.status}
                  </span>
                </div>

                {/* Photos Count Pill */}
                {imagesCount > 0 && (
                  <div className="property-card-photos-count">
                    <ImageIcon size={12} />
                    <span>{imagesCount} صور</span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-extrabold text-base text-slate-100">{p.projectName}</h3>
                    <span className="text-xs text-muted font-mono bg-subtle px-2 py-0.5 rounded">
                      وحدة {p.unitNumber}
                    </span>
                  </div>

                  <p className="text-xs text-muted mb-3">
                    {p.zone || "منطقة متميزة"} &bull; {p.unitType || "شقة"} &bull; دور {p.floor || "—"}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-300 mb-3 bg-subtle p-2 rounded-lg">
                    {p.size && <span>المساحة: <strong>{p.size} م²</strong></span>}
                    {p.bedrooms && <span>غرف: <strong>{p.bedrooms}</strong></span>}
                    {p.bathrooms && <span>حمامات: <strong>{p.bathrooms}</strong></span>}
                  </div>

                  {/* Price */}
                  {p.price && (
                    <div className="text-lg font-black text-emerald-400 mb-3">
                      {p.price.toLocaleString()} <span className="text-xs text-muted font-normal">جنيه</span>
                    </div>
                  )}

                  {p.monthlyInstallment && (
                    <div className="text-[11px] text-gold mb-3 flex items-center justify-between bg-gold-5 p-2 rounded border border-gold-15">
                      <span>قسط: <strong>{p.monthlyInstallment.toLocaleString()} ج.م</strong></span>
                      <span>لمدة: <strong>{p.remainingMonths} شهر</strong></span>
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="pt-3 border-t border-subtle flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    {isManager && (
                      <>
                        <button
                          onClick={() => updatePublication(p)}
                          className="btn btn-secondary btn-sm text-xs"
                          title="إدارة موافقة نشر الحقول العامة"
                        >
                          {p.customData?.publicListing?.status === "APPROVED"
                            ? "إلغاء النشر"
                            : p.customData?.publicListing?.status === "PENDING"
                              ? session?.role === "GENERAL_MANAGER" ? "مراجعة النشر" : "قيد المراجعة"
                              : "طلب نشر"}
                        </button>
                        <button
                          onClick={() => startEdit(p)}
                          className="btn btn-ghost btn-sm p-1.5"
                          title="تعديل الوحدة والصور"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="btn btn-danger btn-sm p-1.5"
                          title="حذف الوحدة"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Storefront in new tab */}
                    <a
                      href={`/properties/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm flex items-center gap-1 text-xs"
                      title="معاينة صفحة المتجر للعميل بدون عنوان"
                    >
                      <Eye size={13} />
                      <span>معاينة</span>
                    </a>

                    {/* Copy Client Share Link */}
                    <button
                      onClick={() => copyShareLink(p.id)}
                      className={`btn btn-sm flex items-center gap-1 text-xs ${
                        copiedId === p.id ? "btn-primary" : "btn-ghost text-gold"
                      }`}
                      title="نسخ رابط العميل (آمن بدون عنوان)"
                    >
                      {copiedId === p.id ? (
                        <>
                          <Check size={13} />
                          <span>تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={13} />
                          <span>رابط العميل</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="empty-state col-span-full py-12 text-center card">
            <Building2 size={48} className="mx-auto text-gold opacity-40 mb-2" />
            <div className="text-base font-bold text-slate-300">لا توجد وحدات مطابقة للبحث</div>
            <p className="text-xs text-muted mt-1">
              {list.length === 0
                ? "ابدأ بإضافة أول وحدة عقارية من زر 'إضافة وحدة جديدة' في الأعلى."
                : "جرب تغيير معايير البحث أو تصفية الحالات."}
            </p>
          </div>
        )}
        {showFieldSelector && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full border">
              <h3 className="text-xl font-bold mb-4">اختيار الحقول العامة</h3>
              <div className="space-y-3">
                {PUBLISHABLE_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={(e) =>
                        e.target.checked
                          ? setSelectedFields([...selectedFields, field.key])
                          : setSelectedFields(selectedFields.filter((k) => k !== field.key))
                      }
                      className="form-checkbox form-checkbox-info"
                      id={`field-${field.key}`}
                    />
                    <label htmlFor={`field-${field.key}`} className="text-sm">
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t">
                <p className="text-sm text-muted mb-2">معاينة:</p>
                <div className="text-xs text-slate-400">
                  <strong>العنوان:</strong>{" "}
                  {selectedFields.includes("title") ? "وحدة عقارية" : "—"}
                  <br />
                  <strong>اسم المشروع:</strong>{" "}
                  {selectedFields.includes("projectName") ? "اسم المشروع" : "—"}
                  <br />
                  <strong>الوصف:</strong>{" "}
                  {selectedFields.includes("description") ? "وصف الوحدة" : "—"}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleConfirmPublication}
                  className="btn btn-primary"
                >
                  تأكيد النشر
                </button>
                <button
                  onClick={() => {
                    setShowFieldSelector(false);
                    setSelectedFields([]);
                  }}
                  className="btn btn-ghost"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
