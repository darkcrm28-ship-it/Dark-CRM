"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  PENDING:   { label: "قيد المراجعة", badge: "badge-orange" },
  ACTIVE:    { label: "نشطة",         badge: "badge-blue" },
  COMPLETED: { label: "مكتملة",       badge: "badge-green" },
  CANCELLED: { label: "ملغاة",        badge: "badge-red" },
};

export default function DealsClient({ deals, customers, properties, isManager }: { deals: any[]; customers: any[]; properties: any[]; isManager: boolean }) {
  const [list, setList] = useState(deals);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [commissionPct, setCommissionPct] = useState("2");
  const [manualCommissionAmt, setManualCommissionAmt] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [downPayment, setDownPayment] = useState("");
  const [installmentMonths, setInstallmentMonths] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const commissionAmt = manualCommissionAmt ? parseFloat(manualCommissionAmt) : (finalPrice && commissionPct ? ((+finalPrice * +commissionPct) / 100) : 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId, propertyId: propertyId || null,
          finalPrice: +finalPrice, 
          commission: manualCommissionAmt ? null : +commissionPct,
          commissionAmt: +commissionAmt,
          paymentType, downPayment: downPayment ? +downPayment : null,
          installmentMonths: installmentMonths ? +installmentMonths : null,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الصفقة");
      setList([data.deal, ...list]);
      setShowForm(false);
      router.refresh();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const totalRevenue = list.filter((d) => d.status === "COMPLETED").reduce((acc, d) => acc + d.finalPrice, 0);
  const totalCommission = list.filter((d) => d.status === "COMPLETED").reduce((acc, d) => acc + d.commissionAmt, 0);

  const exportToExcel = () => {
    const dataToExport = list.map((d) => ({
      "العميل": d.customer?.name || "",
      "رقم الهاتف": d.customer?.phone || "",
      "الوحدة": d.property ? d.property.title : "بدون وحدة",
      "السعر النهائي": d.finalPrice || 0,
      "العمولة": d.commissionAmt || 0,
      "طريقة الدفع": d.paymentType === "CASH" ? "كاش" : "تقسيط",
      "المقدم": d.downPayment || "",
      "شهور التقسيط": d.installmentMonths || "",
      "مسؤول المبيعات": d.salesRep?.name || "",
      "الحالة": STATUS_MAP[d.status]?.label || d.status,
      "التاريخ": new Date(d.createdAt).toLocaleDateString("ar-EG")
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الصفقات");
    XLSX.writeFile(wb, "Deals_Export.xlsx");
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">الصفقات</div>
          <div className="page-subtitle">{list.length} صفقة — {list.filter((d) => d.status === "COMPLETED").length} مكتملة</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {isManager && <button onClick={exportToExcel} className="btn btn-secondary">تصدير لـ Excel 📥</button>}
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? "✕ إغلاق" : "🤝 صفقة جديدة"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-3 animate-in" style={{ marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-label">إجمالي الإيرادات</div>
          <div className="stat-value" style={{ color: "var(--accent-green)", fontSize: 22 }}>{totalRevenue.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400 }}>جنيه</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">إجمالي العمولات</div>
          <div className="stat-value" style={{ color: "var(--gold-primary)", fontSize: 22 }}>{totalCommission.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400 }}>جنيه</span></div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">صفقات معلقة</div>
          <div className="stat-value" style={{ color: "var(--accent-blue)", fontSize: 22 }}>{list.filter((d) => d.status === "PENDING" || d.status === "ACTIVE").length}</div>
        </div>
      </div>

      {showForm && (
        <div className="card animate-in" style={{ marginBottom: 20, borderTop: "2px solid var(--accent-green)" }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>🤝 إنشاء صفقة جديدة</div>
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">العميل *</label>
                <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="">اختر العميل...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">الوحدة العقارية (اختياري)</label>
                <select className="input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                  <option value="">بدون وحدة محددة</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">السعر النهائي *</label>
                <input type="number" className="input" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} required placeholder="1,500,000" />
              </div>
              <div className="form-group">
                <label className="form-label">نسبة العمولة %</label>
                <input type="number" step="0.1" className="input" value={commissionPct} onChange={(e) => { setCommissionPct(e.target.value); setManualCommissionAmt(""); }} />
              </div>
              <div className="form-group">
                <label className="form-label">مبلغ العمولة (يدوي)</label>
                <input type="number" className="input" value={manualCommissionAmt} onChange={(e) => { setManualCommissionAmt(e.target.value); setCommissionPct(""); }} placeholder="أو أدخل المبلغ المقطوع" />
              </div>
            </div>

            {finalPrice && (
              <div className="card card-gold" style={{ padding: "10px 14px", marginBottom: 12 }}>
                <span style={{ fontSize: 13 }}>💰 قيمة العمولة المعتمدة: <strong style={{ color: "var(--gold-primary)" }}>{commissionAmt.toLocaleString()} جنيه</strong></span>
              </div>
            )}

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">طريقة الدفع</label>
                <select className="input" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                  <option value="CASH">كاش</option>
                  <option value="INSTALLMENT">تقسيط</option>
                </select>
              </div>
              {paymentType === "INSTALLMENT" && (
                <>
                  <div className="form-group">
                    <label className="form-label">المقدم</label>
                    <input type="number" className="input" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="300,000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">عدد الأشهر</label>
                    <input type="number" className="input" value={installmentMonths} onChange={(e) => setInstallmentMonths(e.target.value)} placeholder="36" />
                  </div>
                </>
              )}
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ resize: "vertical" }} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "جاري الحفظ..." : "✅ إتمام الصفقة"}
            </button>
          </form>
        </div>
      )}

      {/* Deals Table */}
      <div className="card animate-in-2" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>العميل</th>
                <th>الوحدة</th>
                <th>السعر النهائي</th>
                <th>العمولة</th>
                <th>طريقة الدفع</th>
                <th>مسؤول المبيعات</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const st = STATUS_MAP[d.status] || { label: d.status, badge: "badge-gray" };
                return (
                  <tr key={d.id}>
                    <td><div style={{ fontWeight: 600 }}>{d.customer?.name}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.customer?.phone}</div></td>
                    <td>{d.property ? d.property.title : "—"}</td>
                    <td style={{ fontWeight: 700, color: "var(--accent-green)" }}>{d.finalPrice.toLocaleString()} جنيه</td>
                    <td style={{ color: "var(--gold-primary)" }}>{d.commissionAmt?.toLocaleString()} جنيه {d.commission ? <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({d.commission}%)</span> : <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(مقطوع)</span>}</td>
                    <td>{d.paymentType === "CASH" ? "💵 كاش" : `📅 تقسيط ${d.installmentMonths ? `(${d.installmentMonths} شهر)` : ""}`}</td>
                    <td>{d.salesRep?.name}</td>
                    <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                    <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(d.createdAt).toLocaleDateString("ar-EG")}</td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">🤝</div><div className="empty-state-text">لا توجد صفقات بعد</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
