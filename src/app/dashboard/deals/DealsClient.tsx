"use client";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  PENDING:   { label: "قيد المراجعة", badge: "badge-orange" },
  ACTIVE:    { label: "نشطة",         badge: "badge-blue" },
  COMPLETED: { label: "مكتملة",       badge: "badge-green" },
  CANCELLED: { label: "ملغاة",        badge: "badge-red" },
};

export default function DealsClient({ deals: list, isManager }: { deals: any[]; isManager: boolean }) {
  const totalRevenue = list.filter((d) => d.status === "COMPLETED").reduce((acc, d) => acc + d.finalPrice, 0);
  const totalCommission = list.filter((d) => d.status === "COMPLETED").reduce((acc, d) => acc + d.commissionAmt, 0);

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
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
          <Link href="/dashboard/deal-cycle" className="btn btn-primary">🤝 دورة الصفقات</Link>
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
