"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function UserProfileClient({ user, customers, deals, reminders, interactions, kpis }: any) {
  const [activeTab, setActiveTab] = useState("overview");

  const handlePrint = () => {
    window.print();
  };

  const roleMap: Record<string, string> = {
    "GENERAL_MANAGER": "مدير عام",
    "SALES_MANAGER": "مدير مبيعات",
    "SALES_EMPLOYEE": "موظف مبيعات",
    "HR_MANAGER": "مدير موارد بشرية",
    "ACCOUNTING_MANAGER": "مدير حسابات",
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <span className="badge badge-orange">قيد الانتظار</span>;
      case "COMPLETED": return <span className="badge badge-green">مكتمل</span>;
      case "OVERDUE": return <span className="badge badge-red">متأخر</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  return (
    <div className="print-container">
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
          .card { border: 1px solid #ddd; box-shadow: none; break-inside: avoid; }
        }
      `}} />

      <div className="page-header animate-in no-print">
        <div>
          <div className="page-title">ملف الأداء الوظيفي</div>
          <div className="page-subtitle">تقرير شامل لأداء الموظف: {user.name}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handlePrint} className="btn btn-secondary">🖨️ طباعة التقرير</button>
          <Link href="/dashboard/users" className="btn btn-ghost">← عودة للموظفين</Link>
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setActiveTab("overview")} className={`btn ${activeTab === "overview" ? "btn-primary" : "btn-ghost"}`}>📊 نظرة عامة على الأداء</button>
        <button onClick={() => setActiveTab("profile")} className={`btn ${activeTab === "profile" ? "btn-primary" : "btn-ghost"}`}>📂 ملف البيانات الشخصية</button>
      </div>

      {activeTab === "overview" ? (
        <>
      {/* Profile Header Card */}
      <div className="card animate-in-1" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, borderTop: "4px solid var(--gold-primary)" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--gold-primary), var(--gold-dark))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 32, color: "#000", flexShrink: 0
        }}>
          {user.name?.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 24 }}>{user.name}</h2>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14, color: "var(--text-secondary)" }}>
            <div><strong>الوظيفة:</strong> {roleMap[user.role] || user.role}</div>
            <div><strong>البريد:</strong> {user.email}</div>
            <div><strong>الهاتف:</strong> {user.phone || "—"}</div>
            <div><strong>تاريخ التعيين:</strong> {user.dateJoined ? new Date(user.dateJoined).toLocaleDateString("ar-EG") : "—"}</div>
            <div><strong>حالة الحساب:</strong> {user.isActive ? <span style={{color: "var(--accent-green)"}}>نشط 🟢</span> : <span style={{color: "var(--accent-red)"}}>موقوف 🔴</span>}</div>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid-4 animate-in-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "var(--gold-primary)" }}>{kpis.totalDeals}</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>إجمالي الصفقات المنجزة</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent-green)" }}>{kpis.totalSalesValue.toLocaleString()}</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>قيمة المبيعات (ج.م)</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent-blue)" }}>{kpis.totalCommissions.toLocaleString()}</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>إجمالي العمولات المكتسبة (ج.م)</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent-purple)" }}>{kpis.conversionRate}%</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>معدل التحويل (إغلاق الصفقات)</div>
        </div>
      </div>

      {/* Details Sections */}
      <div className="grid-2 animate-in-3" style={{ alignItems: "start" }}>
        
        {/* Activity & Tasks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Tasks Summary */}
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>المهام والمتابعات</h3>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-orange)" }}>{kpis.pendingReminders}</div>
                <div style={{ fontSize: 12 }}>قيد الانتظار</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-green)" }}>{kpis.completedReminders}</div>
                <div style={{ fontSize: 12 }}>تم الإنجاز</div>
              </div>
            </div>
            {reminders.slice(0, 5).map((r: any) => (
              <div key={r.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border-subtle)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{r.title}</strong>
                  <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{r.customer?.name}</div>
                </div>
                <div>{getStatusBadge(r.status)}</div>
              </div>
            ))}
          </div>

          {/* Activity Log */}
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>سجل التفاعلات الأخير (Activity Log)</h3>
            {interactions.length === 0 ? <div className="empty-state">لا توجد نشاطات مسجلة بعد.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {interactions.map((interaction: any) => (
                  <div key={interaction.id} style={{ padding: 12, background: "var(--bg-elevated)", borderRadius: 8, borderLeft: "3px solid var(--gold-primary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="badge badge-gray">{interaction.type}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(interaction.createdAt).toLocaleDateString("ar-EG")}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>العميل: {interaction.customer?.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{interaction.notes}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Deals & Customers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Recent Deals */}
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>أحدث الصفقات المغلقة ({deals.length})</h3>
            {deals.length === 0 ? <div className="empty-state">لم يتم إغلاق أي صفقات بعد.</div> : (
              <table className="table">
                <thead><tr><th>العميل</th><th>القيمة</th><th>العمولة</th><th>التاريخ</th></tr></thead>
                <tbody>
                  {deals.slice(0, 5).map((d: any) => (
                    <tr key={d.id}>
                      <td>{d.customer?.name}</td>
                      <td style={{ fontWeight: 700, color: "var(--accent-green)" }}>{d.finalPrice?.toLocaleString()}</td>
                      <td>{d.commissionAmt?.toLocaleString() || "—"}</td>
                      <td style={{ fontSize: 12 }}>{new Date(d.createdAt).toLocaleDateString("ar-EG")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Assigned Customers */}
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>العملاء التابعين للموظف ({customers.length})</h3>
            {customers.length === 0 ? <div className="empty-state">لا يوجد عملاء مخصصين لهذا الموظف.</div> : (
              <table className="table">
                <thead><tr><th>الاسم</th><th>النوع</th><th>الحالة</th></tr></thead>
                <tbody>
                  {customers.slice(0, 5).map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.phone}</div>
                      </td>
                      <td>{c.type === "BUYER" ? "مشتري" : "بائع"}</td>
                      <td><span className="badge badge-gray">{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {customers.length > 5 && (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <Link href="/dashboard/customers" className="btn btn-ghost btn-sm no-print">عرض كل العملاء ←</Link>
              </div>
            )}
          </div>
        </div>

      </div>
      </>
      ) : (
        <div className="animate-in-1">
          <div className="grid-2" style={{ gap: 24 }}>
            <div className="card">
              <h3 style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12, marginBottom: 16 }}>📂 البيانات الشخصية</h3>
              <div className="grid-2" style={{ gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>الاسم الكامل</div>
                  <div style={{ fontWeight: 700 }}>{user.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>الرقم القومي</div>
                  <div style={{ fontWeight: 700 }}>{user.nationalId || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>تاريخ الميلاد</div>
                  <div style={{ fontWeight: 700 }}>{user.birthDate ? new Date(user.birthDate).toLocaleDateString("ar-EG") : "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>رقم الهاتف</div>
                  <div style={{ fontWeight: 700 }}>{user.phone || "—"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>العنوان</div>
                  <div style={{ fontWeight: 700 }}>{user.address || "—"}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12, marginBottom: 16 }}>🚨 بيانات الطوارئ</h3>
              <div className="grid-2" style={{ gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>جهة الاتصال</div>
                  <div style={{ fontWeight: 700 }}>{user.emergencyContactName || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>رقم هاتف الطوارئ</div>
                  <div style={{ fontWeight: 700 }}>{user.emergencyContactPhone || "—"}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12, marginBottom: 16 }}>🎓 المؤهلات والخبرة</h3>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>المؤهل الدراسي</div>
                <div style={{ fontWeight: 700 }}>{user.qualification || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>الخبرات السابقة</div>
                <div style={{ fontWeight: 500, whiteSpace: "pre-wrap" }}>{user.experience || "—"}</div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12, marginBottom: 16 }}>💳 البيانات المالية والعقد</h3>
              <div className="grid-2" style={{ gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>الراتب الأساسي</div>
                  <div style={{ fontWeight: 700, color: "var(--accent-green)" }}>{user.salaryBase?.toLocaleString()} ج.م</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>تاريخ التعيين</div>
                  <div style={{ fontWeight: 700 }}>{user.dateJoined ? new Date(user.dateJoined).toLocaleDateString("ar-EG") : "—"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>بيانات الحساب البنكي</div>
                  <div style={{ fontWeight: 700 }}>{user.bankAccountDetails || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
