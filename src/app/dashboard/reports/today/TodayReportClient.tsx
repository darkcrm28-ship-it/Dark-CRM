"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../Reports.module.css";

const TYPE_LABELS: Record<string, string> = { calls: "المكالمات", viewings: "المعاينات", notes: "الملاحظات", new_customers: "العملاء الجدد" };
const TYPE_ICONS: Record<string, string> = { CALL: "☎", VIEWING: "⌂", NOTE: "▤" };

type Interaction = { id: string; userId: string; customerId: string; type: string; notes?: string | null; createdAt: string | Date; user?: { id: string; name: string } | null; customer?: { id: string; name: string; phone?: string | null } | null };
type Customer = { id: string; name: string; phone?: string | null; createdAt: string | Date; assignedTo?: { name: string } | null };

export default function TodayReportClient({ interactions = [], newCustomers = [], employees = [], isManager, activeType, activeEmpId }: {
  interactions: Interaction[]; newCustomers: Customer[]; employees: { id: string; name: string }[]; isManager: boolean; activeType: string; activeEmpId: string;
}) {
  const router = useRouter();
  const today = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date());
  const calls = interactions.filter((item) => item.type === "CALL").length;
  const viewings = interactions.filter((item) => item.type === "VIEWING").length;
  const notes = interactions.filter((item) => item.type === "NOTE").length;
  const filter = (type: string, empId: string) => {
    const params = new URLSearchParams({ type, ...(empId ? { empId } : {}) });
    router.push(`/dashboard/reports/today?${params.toString()}`);
  };
  const time = (value: string | Date) => new Date(value).toLocaleTimeString("ar-EG", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" });
  const grouped = new Map<string, { name: string; rows: Interaction[] }>();
  interactions.forEach((item) => {
    const id = item.user?.id || item.userId || "unknown";
    const entry = grouped.get(id) || { name: item.user?.name || "موظف غير معروف", rows: [] };
    entry.rows.push(item); grouped.set(id, entry);
  });

  return <main className={styles.report} dir="rtl">
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>ملخص يومي · {today}</p><h1>تقرير اليوم</h1><p>الأنشطة والعملاء الجدد المسجلون خلال اليوم.</p></div>
      <Link href="/dashboard" className={styles.exportButton}>العودة إلى لوحة المتابعة</Link>
    </header>

    <section className={styles.kpis} aria-label="ملخص اليوم">
      <article className={`${styles.kpi} ${styles.kpiPrimary}`}><span>المكالمات</span><strong>{new Intl.NumberFormat("ar-EG").format(calls)}</strong><small>نشاط مسجل اليوم</small></article>
      <article className={styles.kpi}><span>المعاينات</span><strong>{new Intl.NumberFormat("ar-EG").format(viewings)}</strong><small>مواعيد مسجلة اليوم</small></article>
      <article className={styles.kpi}><span>الملاحظات</span><strong>{new Intl.NumberFormat("ar-EG").format(notes)}</strong><small>تحديثات مسجلة اليوم</small></article>
      <article className={styles.kpi}><span>عملاء جدد</span><strong>{new Intl.NumberFormat("ar-EG").format(newCustomers.length)}</strong><small>أضيفوا خلال اليوم</small></article>
    </section>

    <nav className={styles.todayFilters} aria-label="تصفية نوع النشاط">
      {Object.entries(TYPE_LABELS).map(([key, label]) => <button key={key} onClick={() => filter(key, activeEmpId)} className={activeType === key ? styles.activeFilter : ""} aria-pressed={activeType === key}>{label}</button>)}
    </nav>

    {isManager && <section className={`${styles.panel} ${styles.employeeFilter}`}>
      <div className={styles.sectionHeading}><div><h2>عرض حسب الموظف</h2><p>التصفية متاحة للمديرين.</p></div></div>
      <div className={styles.employeeChips}><button onClick={() => filter(activeType, "")} className={!activeEmpId ? styles.activeFilter : ""}>الفريق كله <b>{interactions.length}</b></button>
        {employees.map((employee) => <button key={employee.id} onClick={() => filter(activeType, employee.id)} className={activeEmpId === employee.id ? styles.activeFilter : ""}>{employee.name}<b>{interactions.filter((item) => item.userId === employee.id).length}</b></button>)}
      </div>
    </section>}

    {activeType === "new_customers" ? <section className={styles.panel}>
      <div className={styles.sectionHeading}><div><h2>العملاء المضافون اليوم</h2><p>سجلات العملاء الجديدة وتوقيت إضافتها.</p></div><span className={styles.sectionMark}>{newCustomers.length} عميل</span></div>
      <div className={styles.tableScroll}><table><thead><tr><th>العميل</th><th>رقم الهاتف</th><th>المسؤول</th><th>وقت الإضافة</th><th>التفاصيل</th></tr></thead><tbody>
        {newCustomers.map((customer) => <tr key={customer.id}><td>{customer.name}</td><td dir="ltr">{customer.phone || "—"}</td><td>{customer.assignedTo?.name || "—"}</td><td>{time(customer.createdAt)}</td><td><Link href={`/dashboard/customers/${customer.id}`} className={styles.textLink}>عرض الملف</Link></td></tr>)}
        {!newCustomers.length && <tr><td colSpan={5}><div className={styles.empty}>لا يوجد عملاء جدد في هذا اليوم.</div></td></tr>}
      </tbody></table></div>
    </section> : isManager && !activeEmpId ? <section className={styles.teamActivity}>
      {!grouped.size ? <div className={styles.panel}><div className={styles.empty}>لا توجد أنشطة مسجلة اليوم.</div></div> : [...grouped.entries()].map(([id, group]) => <article className={styles.panel} key={id}>
        <div className={styles.sectionHeading}><div><h2>{group.name}</h2><p>سجل أنشطة الموظف</p></div><span className={styles.sectionMark}>{group.rows.length} نشاط</span></div>
        <div className={styles.activityList}>{group.rows.map((item) => <div className={styles.activityRow} key={item.id}><i>{TYPE_ICONS[item.type] || "•"}</i><div><Link href={`/dashboard/customers/${item.customerId}`} className={styles.textLink}>{item.customer?.name || "عميل غير معروف"}</Link><small>{item.notes || "لا توجد ملاحظات"}</small></div><time>{time(item.createdAt)}</time></div>)}</div>
      </article>)}
    </section> : <section className={styles.panel}>
      <div className={styles.sectionHeading}><div><h2>{TYPE_LABELS[activeType] || "أنشطة اليوم"}</h2><p>التفاصيل المسجلة خلال اليوم.</p></div><span className={styles.sectionMark}>{interactions.length} نشاط</span></div>
      <div className={styles.tableScroll}><table><thead><tr><th>النوع</th><th>العميل</th>{isManager && <th>الموظف</th>}<th>ملاحظات</th><th>الوقت</th></tr></thead><tbody>
        {interactions.map((item) => <tr key={item.id}><td><span className={styles.pill}>{TYPE_LABELS[item.type.toLowerCase()] || item.type}</span></td><td><Link href={`/dashboard/customers/${item.customerId}`} className={styles.textLink}>{item.customer?.name || "عميل غير معروف"}</Link><small className={styles.subCell} dir="ltr">{item.customer?.phone || "—"}</small></td>{isManager && <td>{item.user?.name || "—"}</td>}<td>{item.notes || "—"}</td><td>{time(item.createdAt)}</td></tr>)}
        {!interactions.length && <tr><td colSpan={isManager ? 5 : 4}><div className={styles.empty}>لا توجد أنشطة من هذا النوع اليوم.</div></td></tr>}
      </tbody></table></div>
    </section>}
  </main>;
}
