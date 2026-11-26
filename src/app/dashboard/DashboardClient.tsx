"use client";

import React, { useState } from "react";
import Link from "next/link";
import DatabaseBackupModal from "@/components/DatabaseBackupModal";
import NeonTransferUsageCard from "@/components/NeonTransferUsageCard";

export default function DashboardClient({ 
  session, 
  isManager, 
  isGeneralManager,
  stats, 
  recentInteractions, 
  neglectedCount,
  teamPerformance
}: any) {
  const [backupOpen, setBackupOpen] = useState(false);
  
  const INTERACTION_ICONS: Record<string, string> = { CALL: "📞", VIEWING: "👀", NOTE: "📝" };
  const INTERACTION_LABELS: Record<string, string> = { CALL: "مكالمة", VIEWING: "معاينة", NOTE: "ملاحظة" };

  const roleTitle = ({
    GENERAL_MANAGER: "مدير عام",
    SALES_MANAGER: "مدير مبيعات",
    SALES_EMPLOYEE: "موظف مبيعات",
    HR_MANAGER: "مدير موارد بشرية",
    ACCOUNTING_MANAGER: "مدير حسابات"
  } as any)[session?.role] || session?.role;

  const todayArabic = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Alerts */}
      {neglectedCount > 0 && (
        <div
          className="animate-in"
          style={{
            padding: "16px 20px",
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.04))",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            backdropFilter: "blur(16px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 8px 25px rgba(239, 68, 68, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <strong style={{ color: "#fca5a5", fontSize: 14 }}>مهام متابعة متأخرة:</strong>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", marginRight: 6 }}>
                يوجد {neglectedCount} عملاء بحاجة للتواصل فوراً لتجنب فقدانهم.
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/overdue-reminders"
            className="btn btn-sm btn-danger"
            style={{ borderRadius: 10, padding: "6px 16px", fontWeight: 700 }}
          >
            مراجعة المواعيد ←
          </Link>
        </div>
      )}

      {isGeneralManager && <NeonTransferUsageCard />}

      {/* Executive Welcome Glass Card */}
      <div
        className="card card-gold animate-in"
        style={{
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          background: "linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(15, 23, 42, 0.85))",
          backdropFilter: "blur(24px) saturate(190%)",
          border: "1px solid rgba(212, 175, 55, 0.28)",
          boxShadow: "0 15px 40px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(212, 175, 55, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--gold-primary), var(--gold-dark))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 900,
              color: "#000",
              boxShadow: "0 0 20px rgba(212, 175, 55, 0.4)",
              flexShrink: 0,
            }}
          >
            {session?.name?.charAt(0) || "U"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>
                مرحباً بك، {session?.name}
              </h1>
              <span className="badge badge-gold" style={{ fontSize: 11, padding: "4px 12px" }}>
                {roleTitle}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6 }}>
              📅 {todayArabic} — نظام دارك CRM العقاري السحابي
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            href="/dashboard/my-day"
            className="btn btn-primary"
            style={{ padding: "10px 20px", borderRadius: 12, fontWeight: 800 }}
          >
            ☀️ مهام يومي
          </Link>
          {isManager && (
            <button
              onClick={() => setBackupOpen(true)}
              className="btn btn-secondary"
              style={{ padding: "10px 18px", borderRadius: 12, fontWeight: 700 }}
            >
              💾 سحب قاعدة البيانات
            </button>
          )}
        </div>
      </div>

      {/* Daily Performance Glass Counters */}
      <div className="grid-4 animate-in">
        <Link href="/dashboard/reports/today?type=calls" style={{ textDecoration: "none" }}>
          <div className="stat-card" style={{ cursor: "pointer", borderTop: "3px solid var(--gold-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: "var(--gold-primary)", fontWeight: 800 }}>📞 مكالماتك اليوم</div>
              <span style={{ fontSize: 20 }}>📲</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)" }}>{stats.callsToday || 0}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>اضغط للتفاصيل والتقارير ←</div>
          </div>
        </Link>

        <Link href="/dashboard/reports/today?type=viewings" style={{ textDecoration: "none" }}>
          <div className="stat-card" style={{ cursor: "pointer", borderTop: "3px solid var(--accent-green)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: "var(--accent-green)", fontWeight: 800 }}>👀 معاينات اليوم</div>
              <span style={{ fontSize: 20 }}>🏡</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)" }}>{stats.viewingsToday || 0}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>اضغط لمتابعة المواعيد ←</div>
          </div>
        </Link>

        <Link href="/dashboard/reports/today?type=new_customers" style={{ textDecoration: "none" }}>
          <div className="stat-card" style={{ cursor: "pointer", borderTop: "3px solid var(--accent-blue)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: "var(--accent-blue)", fontWeight: 800 }}>🆕 عملاء جدد اليوم</div>
              <span style={{ fontSize: 20 }}>🎯</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)" }}>{stats.newLeadsToday || 0}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>المسجلين اليوم في النظام ←</div>
          </div>
        </Link>

        {isManager ? (
          <Link href="/dashboard/reports/today?type=calls" style={{ textDecoration: "none" }}>
            <div className="stat-card" style={{ cursor: "pointer", borderTop: "3px solid var(--accent-purple)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12.5, color: "var(--accent-purple)", fontWeight: 800 }}>👥 مكالمات الفريق اليوم</div>
                <span style={{ fontSize: 20 }}>📊</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent-purple)" }}>{stats.teamCallsToday || 0}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>إجمالي نشاط الفريق اليوم ←</div>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard/match" style={{ textDecoration: "none" }}>
            <div className="stat-card" style={{ cursor: "pointer", borderTop: "3px solid var(--gold-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12.5, color: "var(--gold-light)", fontWeight: 800 }}>🤖 المطابقة الذكية</div>
                <span style={{ fontSize: 20 }}>⚡</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "var(--gold-light)" }}>مطابقة</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>مطابقة المشترين بالوحدات ←</div>
            </div>
          </Link>
        )}
      </div>

      {/* Core Business Numbers */}
      <div className="grid-4 animate-in">
        <Link href="/dashboard/customers" style={{ textDecoration: "none" }}>
          <div className="stat-card" style={{ cursor: "pointer" }}>
            <div className="stat-icon">👥</div>
            <div className="stat-label">إجمالي العملاء</div>
            <div className="stat-value">{stats.totalCustomers}</div>
            <div className="stat-sub">{stats.totalBuyers} مشترٍ · {stats.totalSellers} بائع</div>
          </div>
        </Link>

        <Link href="/dashboard/leads?status=INTERESTED" style={{ textDecoration: "none" }}>
          <div className="stat-card green" style={{ cursor: "pointer" }}>
            <div className="stat-icon">✅</div>
            <div className="stat-label">عملاء مهتمون</div>
            <div className="stat-value" style={{ color: "var(--accent-green)" }}>{stats.interestedCount}</div>
            <div className="stat-sub">جاهزون للمتابعة والإغلاق</div>
          </div>
        </Link>

        <Link href="/dashboard/available-for-sale" style={{ textDecoration: "none" }}>
          <div className="stat-card blue" style={{ cursor: "pointer" }}>
            <div className="stat-icon">🏠</div>
            <div className="stat-label">وحدات معروضة للبيع</div>
            <div className="stat-value" style={{ color: "var(--accent-blue)" }}>{stats.wantsToSellCount}</div>
            <div className="stat-sub">المخزون المتاح للتسويق</div>
          </div>
        </Link>

        <Link href="/dashboard/deals" style={{ textDecoration: "none" }}>
          <div className="stat-card purple" style={{ cursor: "pointer" }}>
            <div className="stat-icon">🤝</div>
            <div className="stat-label">الصفقات الناجحة</div>
            <div className="stat-value" style={{ color: "var(--accent-purple)" }}>{stats.totalDeals}</div>
            <div className="stat-sub">بقيمة {stats.totalSalesValue?.toLocaleString()} ج.م</div>
          </div>
        </Link>
      </div>
      
      {/* Team Performance Table for Managers */}
      {isManager && teamPerformance.length > 0 && (
        <div className="card animate-in-1" style={{ borderTop: "4px solid var(--accent-blue)", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--accent-blue)", margin: 0 }}>
                📊 إحصائيات ونشاط فريق المبيعات
              </h3>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                متابعة أداء الموظفين ونسبة التواصل والعملاء المهتمين
              </div>
            </div>
            <span className="badge badge-blue">بيانات حية</span>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th style={{ textAlign: "center" }}>العملاء المسندون</th>
                  <th style={{ textAlign: "center" }}>المكالمات المنفذة</th>
                  <th style={{ textAlign: "center" }}>لم يتم التواصل</th>
                  <th style={{ textAlign: "center" }}>عملاء مهتمون</th>
                  <th style={{ textAlign: "center" }}>غير مهتمين</th>
                  <th style={{ textAlign: "center" }}>الملف الشخصي</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((u: any, idx: number) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14 }}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "👤"}
                        </span>
                        <span style={{ fontWeight: 800 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{u.assignedCount}</td>
                    <td style={{ textAlign: "center", color: "var(--gold-primary)", fontWeight: 800 }}>{u.callsCount}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={u.notContacted > 0 ? "badge badge-red" : "badge badge-gray"}>
                        {u.notContacted}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-green">{u.interested}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-gray">{u.notInterested}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Link href={`/dashboard/users/${u.id}`} className="btn btn-ghost btn-sm" style={{ borderRadius: 8 }}>
                        ملف الأداء ←
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity Feed Section */}
      <div className="card animate-in-2">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "var(--gold-primary)" }}>
            ⚡ آخر النشاطات والمتابعات (اليوم وأمس)
          </div>
          <span className="badge badge-gold">سجل فوري</span>
        </div>
        <div>
          {recentInteractions.length === 0 ? (
            <div className="empty-state" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>لا توجد نشاطات مسجلة بعد</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recentInteractions.map((i: any) => (
                <div
                  key={i.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "rgba(212, 175, 55, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        border: "1px solid rgba(212, 175, 55, 0.2)",
                      }}
                    >
                      {INTERACTION_ICONS[i.type] || "📌"}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                        <span style={{ color: "var(--gold-primary)" }}>{i.user.name}</span>
                        {" — "}
                        {INTERACTION_LABELS[i.type]} مع <span style={{ color: "#fff" }}>{i.customer.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {new Date(i.createdAt).toLocaleString("ar-EG")}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/customers/${i.customerId}`}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 12, color: "var(--accent-blue)" }}
                  >
                    عرض الملف ←
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Database Backup Modal */}
      <DatabaseBackupModal isOpen={backupOpen} onClose={() => setBackupOpen(false)} />
    </div>
  );
}

