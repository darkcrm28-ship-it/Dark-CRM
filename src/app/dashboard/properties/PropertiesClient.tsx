"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import DynamicFields from "@/components/DynamicFields";
import { useEffect } from "react";

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  AVAILABLE: { label: "متاحة",   badge: "badge-green" },
  RESERVED:  { label: "محجوزة",  badge: "badge-orange" },
  SOLD:      { label: "مباعة",   badge: "badge-red" },
  RENTED:    { label: "مؤجرة",   badge: "badge-blue" },
};

const UNIT_TYPES = ["شقة", "فيلا", "ستوديو", "دوبلكس", "بنتهاوس", "محل تجاري", "مكتب"];
const FINISHING = ["خام", "نصف تشطيب", "تشطيب كامل", "سوبر لوكس"];

const EMPTY_FORM = { 
  projectName: "", unitNumber: "", buildingNumber: "", zone: "", floor: "", 
  size: "", bedrooms: "", bathrooms: "", unitType: "", finishing: "", price: "", 
  status: "AVAILABLE", description: "",
  monthlyInstallment: "", remainingMonths: "", installmentType: "FIXED", installmentPercentage: ""
};

export default function PropertiesClient({ properties, isManager, session }: { properties: any[]; isManager: boolean; session?: any }) {
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
    search: "", filterStatus: "", filterUnitType: "", filterBedrooms: "", filterBathrooms: "", filterFinishing: "", filterPriceMin: "", filterPriceMax: ""
  });
  
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchDefs = async () => {
      const res = await fetch("/api/settings/custom-fields");
      const data = await res.json();
      setCustomFieldDefs(data.filter((f: any) => f.entityType === "PROPERTY"));
    };
    fetchDefs();
  }, []);

  const filtered = list.filter((p) => {
    const { search: q, filterStatus: fStatus, filterUnitType: fUnitType, filterBedrooms: fBeds, filterBathrooms: fBaths, filterFinishing: fFinishing, filterPriceMin: fPMin, filterPriceMax: fPMax } = appliedFilters;
    
    const query = q.toLowerCase();
    const matchSearch = (!query || p.projectName?.toLowerCase().includes(query) || p.unitNumber?.includes(query) || p.zone?.toLowerCase().includes(query));
    const matchStatus = (!fStatus || p.status === fStatus);
    const matchUnitType = (!fUnitType || p.unitType === fUnitType);
    const matchBeds = (!fBeds || p.bedrooms === parseInt(fBeds));
    const matchBaths = (!fBaths || p.bathrooms === parseInt(fBaths));
    const matchFinishing = (!fFinishing || p.finishing === fFinishing);
    const matchPriceMin = (!fPMin || (p.price && p.price >= parseFloat(fPMin)));
    const matchPriceMax = (!fPMax || (p.price && p.price <= parseFloat(fPMax)));

    return matchSearch && matchStatus && matchUnitType && matchBeds && matchBaths && matchFinishing && matchPriceMin && matchPriceMax;
  });



  const exportToExcel = () => {
    const dataToExport = filtered.map((p) => ({
      "المشروع": p.projectName || "",
      "رقم الوحدة": p.unitNumber || "",
      "رقم المبنى": p.buildingNumber || "",
      "المنطقة": p.zone || "",
      "نوع الوحدة": p.unitType || "",
      "الحالة": STATUS_MAP[p.status]?.label || p.status,
      "السعر": p.price || "",
      "القسط الشهري": p.monthlyInstallment || "",
      "المدة المتبقية": p.remainingMonths || "",
      "المساحة": p.size || "",
      "غرف النوم": p.bedrooms || "",
      "الحمامات": p.bathrooms || "",
      "التشطيب": p.finishing || ""
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "العقارات");
    XLSX.writeFile(wb, "Properties_Full_Report.xlsx");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { 
      ...form, 
      floor: form.floor ? +form.floor : null, 
      size: form.size ? +form.size : null, 
      bedrooms: form.bedrooms ? +form.bedrooms : null, 
      bathrooms: form.bathrooms ? +form.bathrooms : null, 
      price: form.price ? +form.price : null,
      monthlyInstallment: form.monthlyInstallment ? +form.monthlyInstallment : null,
      remainingMonths: form.remainingMonths ? +form.remainingMonths : null,
      installmentPercentage: form.installmentPercentage ? +form.installmentPercentage : null
    };
    try {
      const res = await fetch(editing ? `/api/properties/${editing}` : "/api/properties", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("فشل الحفظ");
      if (editing) setList(list.map((p) => p.id === editing ? data.property : p));
      else setList([data.property, ...list]);
      setShowForm(false); setEditing(null); setForm(EMPTY_FORM);
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الوحدة؟")) return;
    await fetch(`/api/properties/${id}`, { method: "DELETE" });
    setList(list.filter((p) => p.id !== id));
  };

  const startEdit = (p: any) => {
    setForm({ 
      ...p, 
      floor: p.floor ?? "", size: p.size ?? "", bedrooms: p.bedrooms ?? "", 
      bathrooms: p.bathrooms ?? "", price: p.price ?? "",
      monthlyInstallment: p.monthlyInstallment ?? "",
      remainingMonths: p.remainingMonths ?? "",
      installmentType: p.installmentType ?? "FIXED",
      installmentPercentage: p.installmentPercentage ?? ""
    });
    setEditing(p.id); setShowForm(true);
  };

  const field = (key: string, label: string, type = "text", opts?: any) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {opts?.select ? (
        <select className="input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
          <option value="">اختر...</option>
          {opts.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} className="input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={opts?.placeholder || ""} />
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">قاعدة بيانات العقارات</div>
          <div className="page-subtitle">{list.length} وحدة — {list.filter(p => p.status === "AVAILABLE").length} متاحة</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {selectedForCompare.length > 0 && (
            <button onClick={() => setShowCompareModal(true)} className="btn btn-gold">
              ⚖️ مقارنة ({selectedForCompare.length}) وحدات
            </button>
          )}
          {session?.role === "GENERAL_MANAGER" && <button onClick={exportToExcel} className="btn btn-secondary">تصدير لـ Excel 📥</button>}
          {isManager && (
            <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY_FORM); }} className="btn btn-primary">
              {showForm && !editing ? "✕ إغلاق" : "+ إضافة وحدة"}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card animate-in" style={{ marginBottom: 20, borderTop: "2px solid var(--gold-primary)" }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{editing ? "✏️ تعديل الوحدة" : "🏢 إضافة وحدة جديدة"}</div>
          <form onSubmit={handleSubmit}>
            <div className="grid-3" style={{ marginBottom: 12 }}>
              {field("projectName", "اسم المشروع *")}
              {field("unitNumber", "رقم الوحدة *")}
              {field("buildingNumber", "رقم المبنى")}
              {field("zone", "المنطقة / الحي")}
              {field("floor", "الطابق", "number")}
              {field("size", "المساحة (م²)", "number")}
              {field("bedrooms", "غرف النوم", "number")}
              {field("bathrooms", "الحمامات", "number")}
              {field("unitType", "نوع الوحدة", "text", { select: true, options: UNIT_TYPES })}
              {field("finishing", "التشطيب", "text", { select: true, options: FINISHING })}
              {field("price", "السعر (جنيه)", "number")}
              <div className="form-group">
                <label className="form-label">الحالة</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS_MAP).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">وصف إضافي</label>
              <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ resize: "vertical" }} />
            </div>

            <div style={{ background: "rgba(212, 175, 55, 0.05)", padding: 16, borderRadius: 12, marginBottom: 12, border: "1px solid rgba(212, 175, 55, 0.1)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: "var(--gold-primary)" }}>💰 بيانات الأقساط (اختياري)</div>
              <div className="grid-4">
                {field("monthlyInstallment", "قيمة القسط الشهري", "number")}
                {field("remainingMonths", "المدة المتبقية (بالشهور)", "number")}
                <div className="form-group">
                  <label className="form-label">نوع القسط</label>
                  <select className="input" value={form.installmentType} onChange={(e) => setForm({ ...form, installmentType: e.target.value })}>
                    <option value="FIXED">ثابت</option>
                    <option value="INCREASING">متزايد</option>
                    <option value="DECREASING">متناقص</option>
                  </select>
                </div>
                {form.installmentType !== "FIXED" && field("installmentPercentage", "النسبة المئوية (%)", "number")}
              </div>
            </div>

            <DynamicFields 
              entityType="PROPERTY" 
              definitions={customFieldDefs} 
              values={form.customData || {}} 
              onChange={(name, val) => setForm({...form, customData: {...(form.customData || {}), [name]: val}})} 
            />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="submit" disabled={loading || !form.projectName || !form.unitNumber} className="btn btn-primary">
                {loading ? "جاري الحفظ..." : "💾 حفظ الوحدة"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn btn-ghost">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card animate-in-1" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input className="input" placeholder="🔍 بحث بالمشروع أو الوحدة أو المنطقة..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: "1 1 220px" }} />
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: "0 0 150px" }}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_MAP).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="btn btn-secondary" style={{ flex: "0 0 auto" }}>
            {showAdvancedFilters ? "إخفاء الفلاتر ▲" : "فلاتر متقدمة ⚙️"}
          </button>
          <button onClick={() => setAppliedFilters({ search, filterStatus, filterUnitType, filterBedrooms, filterBathrooms, filterFinishing, filterPriceMin, filterPriceMax })} className="btn btn-primary">
            🔍 بدء البحث
          </button>
        </div>

        {showAdvancedFilters && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border-subtle)" }}>
            <select className="input" value={filterUnitType} onChange={e => setFilterUnitType(e.target.value)}>
              <option value="">كل أنواع الوحدات</option>
              {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" className="input" placeholder="غرف النوم..." value={filterBedrooms} onChange={e => setFilterBedrooms(e.target.value)} />
            <input type="number" className="input" placeholder="الحمامات..." value={filterBathrooms} onChange={e => setFilterBathrooms(e.target.value)} />
            <select className="input" value={filterFinishing} onChange={e => setFilterFinishing(e.target.value)}>
              <option value="">كل أنواع التشطيب</option>
              {FINISHING.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input type="number" className="input" placeholder="السعر من (جنيه)..." value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)} />
            <input type="number" className="input" placeholder="السعر إلى (جنيه)..." value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)} />
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid-3 animate-in-2">
        {filtered.map((p) => {
          const st = STATUS_MAP[p.status] || { label: p.status, badge: "badge-gray" };
          return (
            <div key={p.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ background: "var(--bg-elevated)", padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input 
                    type="checkbox" 
                    checked={selectedForCompare.includes(p.id)} 
                    onChange={() => setSelectedForCompare(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} 
                    title="إضافة للمقارنة"
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.projectName}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>وحدة {p.unitNumber}{p.buildingNumber ? ` — مبنى ${p.buildingNumber}` : ""}</div>
                  </div>
                </div>
                <span className={`badge ${st.badge}`}>{st.label}</span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 12 }}>
                  {p.zone && <div style={{ fontSize: 12 }}>📍 {p.zone}</div>}
                  {p.floor != null && <div style={{ fontSize: 12 }}>🏬 طابق {p.floor}</div>}
                  {p.size && <div style={{ fontSize: 12 }}>📐 {p.size} م²</div>}
                  {p.bedrooms && <div style={{ fontSize: 12 }}>🛏 {p.bedrooms} غرف</div>}
                  {p.unitType && <div style={{ fontSize: 12 }}>🏠 {p.unitType}</div>}
                  {p.finishing && <div style={{ fontSize: 12 }}>🎨 {p.finishing}</div>}
                </div>
                {p.price && <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-green)", marginBottom: 12 }}>{p.price.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400 }}>جنيه</span></div>}
                
                {p.monthlyInstallment && (
                  <div className="badge badge-gold" style={{ width: "100%", justifyContent: "space-between", marginBottom: 12, padding: "8px 12px", borderRadius: 8 }}>
                    <span>قسط: <strong>{p.monthlyInstallment.toLocaleString()}</strong></span>
                    <span>لمدة: <strong>{p.remainingMonths} شهر</strong></span>
                    <span>({p.installmentType === "FIXED" ? "ثابت" : p.installmentType === "INCREASING" ? `متزايد ${p.installmentPercentage}%` : `متناقص ${p.installmentPercentage}%`})</span>
                  </div>
                )}

                {p.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>{p.description}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  {isManager && (
                    <>
                      <button onClick={() => startEdit(p)} className="btn btn-ghost btn-sm">✏️ تعديل</button>
                      <button onClick={() => handleDelete(p.id)} className="btn btn-danger btn-sm">🗑 حذف</button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/share/property/${p.id}`;
                      navigator.clipboard.writeText(url);
                      alert("تم نسخ رابط العرض بنجاح! يمكنك الآن إرساله للعميل.");
                    }} 
                    className="btn btn-ghost btn-sm" 
                    style={{ marginLeft: "auto", color: "var(--gold-primary)" }}
                  >
                    🔗 مشاركة
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <div className="empty-state-icon">🏢</div>
            <div className="empty-state-text">{list.length === 0 ? "لا توجد وحدات. قم بإضافة أول وحدة عقارية." : "لا توجد نتائج مطابقة."}</div>
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      {showCompareModal && (
        <div className="modal-overlay" onClick={() => setShowCompareModal(false)}>
          <div className="modal-content animate-in" style={{ maxWidth: "90vw", width: "fit-content" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 800 }}>⚖️ مقارنة الوحدات المختارة</div>
              <button onClick={() => setShowCompareModal(false)} className="btn-close">✕</button>
            </div>
            <div style={{ padding: 20, overflowX: "auto" }}>
              <table className="table" style={{ border: "1px solid var(--border-subtle)" }}>
                <thead>
                  <tr>
                    <th>الميزة</th>
                    {properties.filter(p => selectedForCompare.includes(p.id)).map(p => (
                      <th key={p.id} style={{ minWidth: 150, textAlign: "center" }}>
                        {p.projectName} - {p.unitNumber}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "📍 المنطقة", key: "zone" },
                    { label: "🏬 الدور", key: "floor" },
                    { label: "📐 المساحة", key: "size" },
                    { label: "🛏 غرف النوم", key: "bedrooms" },
                    { label: "🛁 الحمامات", key: "bathrooms" },
                    { label: "🏠 النوع", key: "unitType" },
                    { label: "🎨 التشطيب", key: "finishing" },
                    { label: "💰 السعر", key: "price", format: (v: any) => v?.toLocaleString() + " ج.م" },
                  ].map(row => (
                    <tr key={row.key}>
                      <td style={{ fontWeight: 800, background: "var(--bg-elevated)" }}>{row.label}</td>
                      {properties.filter(p => selectedForCompare.includes(p.id)).map(p => (
                        <td key={p.id} style={{ textAlign: "center" }}>
                          {row.format ? row.format(p[row.key]) : p[row.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
