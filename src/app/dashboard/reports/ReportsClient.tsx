"use client";

import * as XLSX from "xlsx";
import { useMemo, useState } from "react";
import styles from "./Reports.module.css";

type Employee = {
  id: string; name: string; email: string; customerCount: number;
  completedCount: number; callsCount: number; viewingsCount: number; commissionTotal: number;
};
type Group = { status?: string | null; source?: string | null; _count: { _all: number } };
type ReportLog = { id?: string; createdAt: string; type: string; details?: string | null; notes?: string | null };

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد", NO_ANSWER: "لا يرد", INTERESTED: "مهتم", NOT_INTERESTED: "غير مهتم",
  WANTS_TO_SELL: "يرغب في البيع", DO_NOT_SELL: "لا يرغب في البيع", MEETING_SCHEDULED: "معاينة مجدولة", COMPLETED: "مكتمل",
};
const STATUS_COLORS: Record<string, string> = {
  NEW: "#7aa9bd", NO_ANSWER: "#ffad01", INTERESTED: "#57bd9b", NOT_INTERESTED: "#d76c6c",
  WANTS_TO_SELL: "#3988a4", DO_NOT_SELL: "#d76c6c", MEETING_SCHEDULED: "#ffad01", COMPLETED: "#57bd9b",
};
const number = (value: number) => new Intl.NumberFormat("ar-EG").format(value || 0);
const dateInCairo = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const today = () => dateInCairo(new Date());

export default function ReportsClient({ employees = [], statusGroups = [], recentCustomers = [], sourceGroups = [], session }: {
  employees: Employee[]; statusGroups: Group[]; recentCustomers: { createdAt: string | Date }[]; sourceGroups: Group[]; session?: { role?: string } | null;
}) {
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [detailedStats, setDetailedStats] = useState<{ callsCount: number; additionsCount: number; updatesCount: number; viewingsCount: number; logs: ReportLog[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalCustomers = statusGroups.reduce((sum, group) => sum + (group._count?._all || 0), 0);
  const completedCustomers = statusGroups.find((group) => group.status === "COMPLETED")?._count?._all || 0;
  const activeEmployees = employees.length;
  const newCustomers = recentCustomers.length;
  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (13 - index));
    const key = dateInCairo(day);
    const count = recentCustomers.reduce((sum, row) => sum + (dateInCairo(new Date(row.createdAt)) === key ? 1 : 0), 0);
    return { key, label: new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short" }).format(day), count };
  }), [recentCustomers]);
  const maxCount = Math.max(1, ...days.map((day) => day.count));

  const handleSearchDetailed = async () => {
    if (!selectedEmpId || !startDate || !endDate) return;
    setLoading(true); setError(""); setDetailedStats(null);
    try {
      const query = new URLSearchParams({ id: selectedEmpId, start: startDate, end: endDate });
      const response = await fetch(`/api/reports/employee?${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "تعذر تحميل التقرير. تحقق من الفترة وحاول مجددًا.");
      setDetailedStats({ ...data, logs: Array.isArray(data.logs) ? data.logs : [] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ أثناء تحميل التقرير.");
    } finally { setLoading(false); }
  };

  const exportEmployees = () => {
    const rows = employees.map((employee) => ({
      "الموظف": employee.name || "—", "البريد الإلكتروني": employee.email || "—",
      "العملاء": employee.customerCount || 0, "العملاء المكتملون": employee.completedCount || 0,
      "المكالمات": employee.callsCount || 0, "المعاينات": employee.viewingsCount || 0,
      "إجمالي العمولات": employee.commissionTotal || 0,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "أداء الموظفين");
    XLSX.writeFile(workbook, "تقرير_أداء_الموظفين.xlsx");
  };

  const exportLogs = () => {
    if (!detailedStats) return;
    const rows = detailedStats.logs.map((log) => ({
      "التاريخ": new Date(log.createdAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" }),
      "النوع": log.type, "التفاصيل": log.details || log.notes || "—",
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "سجل الموظف");
    XLSX.writeFile(workbook, `تقرير_الموظف_${startDate}_${endDate}.xlsx`);
  };

  const sortedStatus = [...statusGroups].sort((a, b) => (b._count?._all || 0) - (a._count?._all || 0));
  const sortedSources = [...sourceGroups].sort((a, b) => (b._count?._all || 0) - (a._count?._all || 0));

  return <main className={styles.report} dir="rtl">
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>مركز المتابعة</p><h1>التقارير والتحليلات</h1><p>صورة واضحة لأداء فريق المبيعات وحركة العملاء.</p></div>
      {session?.role === "GENERAL_MANAGER" && <button onClick={exportEmployees} className={styles.exportButton}>تنزيل تقرير Excel <span aria-hidden>↓</span></button>}
    </header>

    <section className={styles.kpis} aria-label="مؤشرات التقرير">
      <article className={`${styles.kpi} ${styles.kpiPrimary}`}><span>إجمالي العملاء</span><strong>{number(totalCustomers)}</strong><small>في قاعدة العملاء</small></article>
      <article className={styles.kpi}><span>عملاء مكتملون</span><strong>{number(completedCustomers)}</strong><small>{totalCustomers ? `${Math.round(completedCustomers / totalCustomers * 100)}٪ من الإجمالي` : "لا توجد سجلات بعد"}</small></article>
      <article className={styles.kpi}><span>عملاء جدد</span><strong>{number(newCustomers)}</strong><small>خلال آخر 14 يومًا</small></article>
      <article className={styles.kpi}><span>فريق المبيعات</span><strong>{number(activeEmployees)}</strong><small>موظفًا ومديرًا</small></article>
    </section>

    <section className={styles.chartPanel}>
      <div className={styles.sectionHeading}><div><h2>إضافة العملاء</h2><p>الحركة اليومية خلال آخر أسبوعين</p></div><span className={styles.sectionMark}>14 يومًا</span></div>
      <div className={styles.chart} role="img" aria-label="عدد العملاء المضافين يوميًا خلال آخر 14 يومًا">
        {days.map((day) => <div className={styles.barColumn} key={day.key} title={`${day.label}: ${number(day.count)}`}>
          <span>{day.count ? number(day.count) : ""}</span><div className={styles.barTrack}><i style={{ height: `${Math.max(day.count ? 8 : 2, day.count / maxCount * 100)}%` }} /></div><small>{day.label}</small>
        </div>)}
      </div>
    </section>

    <section className={styles.distributions}>
      <article className={styles.panel}>
        <div className={styles.sectionHeading}><div><h2>حالات العملاء</h2><p>توزيع العملاء حسب الحالة الحالية</p></div></div>
        {sortedStatus.length ? <div className={styles.breakdown}>{sortedStatus.map((group) => {
          const count = group._count?._all || 0; const percent = totalCustomers ? Math.round(count / totalCustomers * 100) : 0;
          return <div className={styles.breakdownItem} key={group.status || "unknown"}><div><span>{STATUS_LABELS[group.status || ""] || group.status || "غير محدد"}</span><b>{number(count)} <small>{percent}٪</small></b></div><div className={styles.progress}><i style={{ width: `${percent}%`, background: STATUS_COLORS[group.status || ""] || "#3988a4" }} /></div></div>;
        })}</div> : <div className={styles.empty}>لا توجد بيانات حالات لعرضها.</div>}
      </article>
      <article className={styles.panel}>
        <div className={styles.sectionHeading}><div><h2>مصادر العملاء</h2><p>القنوات التي وصلت منها الطلبات</p></div></div>
        {sortedSources.length ? <div className={styles.breakdown}>{sortedSources.map((group, index) => {
          const count = group._count?._all || 0; const percent = totalCustomers ? Math.round(count / totalCustomers * 100) : 0;
          return <div className={styles.breakdownItem} key={group.source || "unknown"}><div><span><i className={styles.sourceDot} data-tone={index % 4} />{group.source || "غير محدد"}</span><b>{number(count)} <small>{percent}٪</small></b></div><div className={styles.progress}><i style={{ width: `${percent}%` }} /></div></div>;
        })}</div> : <div className={styles.empty}>لا توجد بيانات مصادر لعرضها.</div>}
      </article>
    </section>

    <section className={styles.panel}>
      <div className={styles.sectionHeading}><div><h2>تقرير أداء موظف</h2><p>اختر الموظف والفترة لمراجعة النشاط المسجل.</p></div></div>
      <div className={styles.filters}>
        <label>الموظف<select value={selectedEmpId} onChange={(event) => setSelectedEmpId(event.target.value)}><option value="">اختر موظفًا</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label>من تاريخ<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>إلى تاريخ<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <button onClick={handleSearchDetailed} disabled={loading || !selectedEmpId || !startDate || !endDate}>{loading ? "جارٍ إعداد التقرير…" : "عرض التقرير"}</button>
      </div>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {loading && <div className={styles.loading} role="status">جارٍ تحميل بيانات الفترة…</div>}
      {detailedStats && <div className={styles.detail}>
        <div className={styles.detailKpis}>{[["مكالمات", detailedStats.callsCount], ["عملاء جدد", detailedStats.additionsCount], ["تحديثات", detailedStats.updatesCount], ["معاينات", detailedStats.viewingsCount]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{number(Number(value))}</strong></div>)}</div>
        <div className={styles.tableHead}><h3>سجل النشاط</h3><button onClick={exportLogs} disabled={!detailedStats.logs.length}>تصدير السجل</button></div>
        <div className={styles.tableScroll}><table><thead><tr><th>التاريخ والوقت</th><th>النوع</th><th>التفاصيل</th></tr></thead><tbody>
          {detailedStats.logs.map((log, index) => <tr key={log.id || `${log.createdAt}-${index}`}><td>{new Date(log.createdAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}</td><td><span className={styles.pill}>{log.type}</span></td><td>{log.details || log.notes || "—"}</td></tr>)}
          {!detailedStats.logs.length && <tr><td colSpan={3}><div className={styles.empty}>لا توجد أنشطة مسجلة في هذه الفترة.</div></td></tr>}
        </tbody></table></div>
      </div>}
    </section>

    <section className={styles.panel}>
      <div className={styles.sectionHeading}><div><h2>أداء فريق المبيعات</h2><p>مؤشرات النشاط والنتائج المسجلة لكل عضو.</p></div></div>
      <div className={styles.tableScroll}><table><thead><tr><th>الموظف</th><th>العملاء</th><th>مكتمل</th><th>مكالمات</th><th>معاينات</th><th>العمولات</th><th>معدل الإكمال</th></tr></thead><tbody>
        {employees.map((employee) => { const total = employee.customerCount || 0; const completed = employee.completedCount || 0; const rate = total ? Math.round(completed / total * 100) : 0;
          return <tr key={employee.id}><td><div className={styles.person}><i>{employee.name?.charAt(0) || "؟"}</i><span>{employee.name || "موظف غير معروف"}</span></div></td><td>{number(total)}</td><td>{number(completed)}</td><td>{number(employee.callsCount)}</td><td>{number(employee.viewingsCount)}</td><td>{number(employee.commissionTotal)} ج.م</td><td><div className={styles.rate}><div><i style={{ width: `${rate}%` }} /></div><b>{number(rate)}٪</b></div></td></tr>;
        })}
        {!employees.length && <tr><td colSpan={7}><div className={styles.empty}>لا يوجد موظفون لعرض أدائهم.</div></td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
