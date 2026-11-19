"use client";
import * as XLSX from "xlsx";
import { useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد", NO_ANSWER: "لا يرد", INTERESTED: "مهتم",
  NOT_INTERESTED: "غير مهتم", WANTS_TO_SELL: "يرغب بالبيع",
  DO_NOT_SELL: "لا يرغب بالبيع", MEETING_SCHEDULED: "موعد معاينة", COMPLETED: "مكتمل",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "#64748b", NO_ANSWER: "#f59e0b", INTERESTED: "#10b981",
  NOT_INTERESTED: "#ef4444", WANTS_TO_SELL: "#3b82f6",
  DO_NOT_SELL: "#ef4444", MEETING_SCHEDULED: "#d4af37", COMPLETED: "#10b981",
};

export default function ReportsClient({ 
  employees, 
  statusGroups, 
  recentCustomers, 
  sourceGroups,
  session
}: { 
  employees: any[]; 
  statusGroups: any[]; 
  recentCustomers: any[];
  sourceGroups: any[];
  session?: any;
}) {
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const totalCustomers = statusGroups.reduce((acc, g) => acc + g._count._all, 0);

  const handleSearchDetailed = async () => {
    if (!selectedEmpId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/employee?id=${selectedEmpId}&start=${startDate}&end=${endDate}`);
      const data = await res.json();
      setDetailedStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Build last 14 days timeline
  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const count = recentCustomers.filter((c) => { const cd = new Date(c.createdAt); return cd >= d && cd < next; }).length;
    days.push({ label: `${d.getDate()}/${d.getMonth()+1}`, count });
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  const exportEmployees = () => {
    const data = employees.map((emp) => ({
      "الموظف": emp.name,
      "البريد": emp.email,
      "عدد العملاء": emp.customers.length,
      "العملاء المكتملة": emp.customers.filter((c: any) => c.status === "COMPLETED").length,
      "عدد المكالمات": emp.interactions.filter((i: any) => i.type === "CALL").length,
      "عدد المعاينات": emp.interactions.filter((i: any) => i.type === "VIEWING").length,
      "إجمالي العمولات": emp.commissions.reduce((a: number, c: any) => a + c.amount, 0),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أداء الموظفين");
    XLSX.writeFile(wb, "تقرير_أداء_الموظفين.xlsx");
  };

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">التقارير والتحليلات</div>
          <div className="page-subtitle">إجمالي العملاء: {totalCustomers}</div>
        </div>
        {session?.role === "GENERAL_MANAGER" && (
          <button onClick={exportEmployees} className="btn btn-secondary">⬇ تصدير Excel</button>
        )}
      </div>

      {/* Status & Source Distribution */}
      <div className="grid-3 animate-in" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 16 }}>📊 توزيع العملاء حسب الحالة</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {statusGroups.sort((a, b) => b._count._all - a._count._all).map((g) => {
              const pct = totalCustomers > 0 ? Math.round((g._count._all / totalCustomers) * 100) : 0;
              const color = STATUS_COLORS[g.status] || "#64748b";
              return (
                <div key={g.status}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{STATUS_LABELS[g.status] || g.status}</span>
                    <span style={{ fontWeight: 700 }}>{g._count._all} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 16 }}>🎯 تحليل مصادر العملاء (Sources)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(sourceGroups || []).sort((a, b) => b._count._all - a._count._all).map((g) => {
              const pct = totalCustomers > 0 ? Math.round((g._count._all / totalCustomers) * 100) : 0;
              const sourceName = g.source || "غير محدد";
              const colors: any = { "Facebook": "#1877F2", "Referral": "#F59E0B", "Website": "#10B981", "Call": "#3B82F6" };
              return (
                <div key={sourceName}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{sourceName}</span>
                    <span style={{ fontWeight: 700 }}>{g._count._all} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: colors[sourceName] || "var(--gold-primary)", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
            {(sourceGroups?.length || 0) === 0 && <div className="empty-state">لا توجد بيانات مصادر</div>}
          </div>
        </div>

        </div>

      {/* Detailed Employee Search */}
      <div className="card animate-in-1" style={{ marginBottom: 24, border: "1px solid var(--gold-primary)" }}>
        <div style={{ fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔍 بحث تفصيلي عن أداء الموظف</span>
          <span className="badge badge-gold">إصدار تقارير</span>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">الموظف</label>
            <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} className="input">
              <option value="">اختر الموظف...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">من تاريخ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
          </div>
          <div className="form-group">
            <label className="form-label">إلى تاريخ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
          </div>
          <button onClick={handleSearchDetailed} disabled={loading || !selectedEmpId} className="btn btn-primary" style={{ padding: "10px 30px" }}>
            {loading ? "جاري البحث..." : "توليد التقرير"}
          </button>
        </div>

        {detailedStats && (
          <div className="animate-in" style={{ marginTop: 24, padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
            <div className="grid-4" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ padding: 15 }}>
                <div className="stat-label">📞 مكالمات منجزة</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{detailedStats.callsCount}</div>
              </div>
              <div className="stat-card" style={{ padding: 15 }}>
                <div className="stat-label">🆕 عملاء مضافين</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{detailedStats.additionsCount}</div>
              </div>
              <div className="stat-card" style={{ padding: 15 }}>
                <div className="stat-label">✏️ تحديثات البيانات</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{detailedStats.updatesCount}</div>
              </div>
              <div className="stat-card" style={{ padding: 15 }}>
                <div className="stat-label">🏠 معاينات مجدولة</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{detailedStats.viewingsCount}</div>
              </div>
            </div>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "var(--text-secondary)" }}>📜 سجل الحركات التفصيلي بالفترة المختارة:</div>
            <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedStats.logs.map((log: any, idx: number) => (
                    <tr key={idx}>
                      <td>{new Date(log.createdAt).toLocaleString("ar-EG")}</td>
                      <td><span className="badge badge-gray">{log.type}</span></td>
                      <td>{log.details || log.notes || "—"}</td>
                    </tr>
                  ))}
                  {detailedStats.logs.length === 0 && (
                    <tr><td colSpan={3} className="empty-state">لا توجد حركات مسجلة لهذه الفترة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <button 
              onClick={() => {
                const data = detailedStats.logs.map((l: any) => ({
                  "التاريخ": new Date(l.createdAt).toLocaleString("ar-EG"),
                  "النوع": l.type,
                  "التفاصيل": l.details || l.notes || ""
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "تقرير حركات الموظف");
                XLSX.writeFile(wb, `Report_${employees.find(e=>e.id===selectedEmpId)?.name}_${startDate}.xlsx`);
              }} 
              className="btn btn-ghost btn-sm" 
              style={{ marginTop: 12 }}
            >
              📥 تصدير سجل الحركات لـ Excel
            </button>
          </div>
        )}
      </div>

      {/* Employee Performance Table */}
      <div className="card animate-in-2" style={{ padding: 0 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>👥 أداء فريق المبيعات</div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>العملاء</th>
                <th>صفقات مكتملة</th>
                <th>مكالمات</th>
                <th>معاينات</th>
                <th>إجمالي العمولات</th>
                <th>نسبة النجاح</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const totalC = emp.customers.length;
                const completed = emp.customers.filter((c: any) => c.status === "COMPLETED").length;
                const calls = emp.interactions.filter((i: any) => i.type === "CALL").length;
                const viewings = emp.interactions.filter((i: any) => i.type === "VIEWING").length;
                const totalComm = emp.commissions.reduce((a: number, c: any) => a + c.amount, 0);
                const rate = totalC > 0 ? Math.round((completed / totalC) * 100) : 0;
                return (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, var(--gold-primary), var(--gold-dark))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#000" }}>{emp.name?.charAt(0)}</div>
                        {emp.name}
                      </div>
                    </td>
                    <td>{totalC}</td>
                    <td><span className="badge badge-green">{completed}</span></td>
                    <td>📞 {calls}</td>
                    <td>🏠 {viewings}</td>
                    <td style={{ color: "var(--accent-green)", fontWeight: 700 }}>{totalComm.toLocaleString()} جنيه</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, background: "var(--bg-elevated)", borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${rate}%`, height: "100%", background: "var(--accent-green)", borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">لا يوجد موظفو مبيعات بعد</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
