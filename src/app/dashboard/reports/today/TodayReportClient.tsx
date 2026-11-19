"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  calls: "📞 المكالمات",
  viewings: "👀 المعاينات",
  notes: "📝 الملاحظات",
  new_customers: "🆕 العملاء الجدد",
};

const INTERACTION_ICONS: Record<string, string> = {
  CALL: "📞",
  VIEWING: "👀",
  NOTE: "📝",
};

export default function TodayReportClient({
  interactions,
  newCustomers,
  employees,
  session,
  isManager,
  activeType,
  activeEmpId,
}: any) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const handleFilter = (type: string, empId: string) => {
    const params = new URLSearchParams({ type, ...(empId ? { empId } : {}) });
    router.push(`/dashboard/reports/today?${params.toString()}`);
  };

  // Group interactions by employee for manager view
  const byEmployee: Record<string, any[]> = {};
  interactions.forEach((i: any) => {
    const name = i.user?.name || "غير معروف";
    if (!byEmployee[name]) byEmployee[name] = [];
    byEmployee[name].push(i);
  });

  return (
    <div>
      <div className="page-header animate-in">
        <div>
          <div className="page-title">📅 تقرير اليوم</div>
          <div className="page-subtitle">{today}</div>
        </div>
        <Link href="/dashboard" className="btn btn-ghost">← العودة للوحة القيادة</Link>
      </div>

      {/* Type Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleFilter(key, activeEmpId)}
            className={`btn ${activeType === key ? "btn-primary" : "btn-ghost"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Employee Filter (managers only) */}
      {isManager && (
        <div className="card animate-in-1" style={{ marginBottom: 20, padding: "14px 20px" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>تصفية حسب الموظف:</span>
            <button
              onClick={() => handleFilter(activeType, "")}
              className={`btn btn-sm ${!activeEmpId ? "btn-primary" : "btn-ghost"}`}
            >
              👥 الكل ({interactions.length})
            </button>
            {employees.map((emp: any) => {
              const count = interactions.filter((i: any) => i.userId === emp.id).length;
              return (
                <button
                  key={emp.id}
                  onClick={() => handleFilter(activeType, emp.id)}
                  className={`btn btn-sm ${activeEmpId === emp.id ? "btn-primary" : "btn-ghost"}`}
                >
                  {emp.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeType === "new_customers" ? (
        /* New Customers View */
        <div className="card animate-in-1" style={{ padding: 0 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 800 }}>
            🆕 العملاء المضافون اليوم ({newCustomers.length})
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>رقم الهاتف</th>
                  <th>الموظف المسؤول</th>
                  <th>وقت الإضافة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {newCustomers.map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.assignedTo?.name || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(c.createdAt).toLocaleTimeString("ar-EG")}</td>
                    <td>
                      <Link href={`/dashboard/customers/${c.id}`} className="btn btn-ghost btn-sm">عرض</Link>
                    </td>
                  </tr>
                ))}
                {newCustomers.length === 0 && (
                  <tr><td colSpan={5}><div className="empty-state">لا يوجد عملاء جدد اليوم</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Interactions View */
        isManager && !activeEmpId ? (
          /* Manager: grouped by employee */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.keys(byEmployee).length === 0 ? (
              <div className="card"><div className="empty-state">لا توجد نشاطات مسجلة اليوم</div></div>
            ) : Object.entries(byEmployee).map(([empName, items]) => (
              <div key={empName} className="card animate-in" style={{ padding: 0 }}>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(212,175,55,0.05)" }}>
                  <div style={{ fontWeight: 800 }}>👤 {empName}</div>
                  <span className="badge badge-gold">{items.length} نشاط</span>
                </div>
                <div className="table-wrapper">
                  <table className="table" style={{ fontSize: 13 }}>
                    <tbody>
                      {items.map((i: any) => (
                        <tr key={i.id}>
                          <td style={{ width: 40 }}>{INTERACTION_ICONS[i.type] || "📌"}</td>
                          <td>
                            <Link href={`/dashboard/customers/${i.customerId}`} style={{ fontWeight: 700 }}>
                              {i.customer?.name}
                            </Link>
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{i.notes || "—"}</td>
                          <td style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {new Date(i.createdAt).toLocaleTimeString("ar-EG")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single employee or employee view */
          <div className="card animate-in-1" style={{ padding: 0 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 800 }}>
              {TYPE_LABELS[activeType]} ({interactions.length})
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>النوع</th>
                    <th>العميل</th>
                    {isManager && <th>الموظف</th>}
                    <th>الملاحظات</th>
                    <th>الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {interactions.map((i: any) => (
                    <tr key={i.id}>
                      <td>{INTERACTION_ICONS[i.type] || "📌"}</td>
                      <td>
                        <Link href={`/dashboard/customers/${i.customerId}`} style={{ fontWeight: 700 }}>
                          {i.customer?.name}
                        </Link>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{i.customer?.phone}</div>
                      </td>
                      {isManager && <td>{i.user?.name}</td>}
                      <td style={{ maxWidth: 250, fontSize: 12 }}>{i.notes || "—"}</td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {new Date(i.createdAt).toLocaleTimeString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                  {interactions.length === 0 && (
                    <tr><td colSpan={5}><div className="empty-state">لا توجد نشاطات في هذه الفئة اليوم</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
