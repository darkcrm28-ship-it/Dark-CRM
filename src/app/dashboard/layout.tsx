import Sidebar from "@/components/Sidebar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationsBell from "@/components/NotificationsBell";
import AutoLogout from "@/components/AutoLogout";
import CommandPalette from "@/components/CommandPalette";
import SmartLogger from "@/components/SmartLogger";
import DatabaseBackupTrigger from "@/components/DatabaseBackupTrigger";

const ROLE_LABELS: Record<string, string> = {
  GENERAL_MANAGER: "مدير عام",
  SALES_MANAGER: "مدير مبيعات",
  SALES_EMPLOYEE: "موظف مبيعات",
  HR_MANAGER: "مدير موارد بشرية",
  ACCOUNTING_MANAGER: "مدير حسابات",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isManager = session.role === "GENERAL_MANAGER" || session.role === "SALES_MANAGER";
  const isHR = session.role === "GENERAL_MANAGER" || session.role === "HR_MANAGER";

  const navItems = [
    { href: "/dashboard",               icon: "⊞",  label: "لوحة القيادة",          show: true,   section: "main" },
    { href: "/dashboard/profile",       icon: "👤",  label: "ملفي الشخصي",          show: true,   section: "main" },
    
    // Core Business Sections
    { href: "/dashboard/customers",     icon: "🌐",  label: "قاعدة البيانات الشاملة", show: true,   section: "main" },
    { href: "/dashboard/available-for-sale", icon: "🏠", label: "وحدات معروضة (بيع وإيجار)",    show: true,   section: "main" },
    { href: "/dashboard/buyers",        icon: "🛍️",  label: "المشترين والمستأجرين",       show: true,   section: "main" },
    { href: "/dashboard/not-interested", icon: "🚫",  label: "قائمة غير المهتمين",    show: true,   section: "main" },

    { href: "/dashboard/projects",      icon: "🏗️",  label: "المشاريع",            show: isManager, section: "main" },
    { href: "/dashboard/calendar",      icon: "📅",  label: "التقويم والتذكيرات",    show: true,   section: "main" },
    { href: "/dashboard/overdue-reminders", icon: "⚠️", label: "المتابعات المتأخرة", show: true,   section: "main" },

    // Hidden or Administrative
    { href: "/dashboard/properties",    icon: "🏢",  label: "قاعدة العقارات العامة", show: false,     section: "sales" },
    { href: "/dashboard/deals",         icon: "🤝",  label: "الصفقات",               show: isManager, section: "sales" },
    { href: "/dashboard/reports",       icon: "📊",  label: "التقارير والتحليلات",   show: isManager, section: "admin" },
    { href: "/dashboard/commissions",   icon: "💰",  label: "العمولات والمرتبات",    show: isHR,   section: "admin" },
    { href: "/dashboard/audit",         icon: "🕵️‍♂️",  label: "سجل الحركات",          show: session.role === "GENERAL_MANAGER", section: "admin" },
    { href: "/dashboard/users",         icon: "🔑",  label: "المستخدمين",            show: session.role === "GENERAL_MANAGER", section: "admin" },
    { href: "/dashboard/settings/custom-fields", icon: "📋", label: "الحقول الديناميكية", show: session.role === "GENERAL_MANAGER", section: "admin" },
    { href: "/dashboard/settings",      icon: "⚙️",  label: "الإعدادات",              show: session.role === "GENERAL_MANAGER", section: "admin" },
    { href: "/dashboard/accounting",    icon: "💰",  label: "المحاسبة والخزينة",      show: session.role === "GENERAL_MANAGER", section: "admin" },
    { href: "/dashboard/integrations",  icon: "🔌",  label: "الربط التقني",          show: session.role === "GENERAL_MANAGER", section: "admin" },
  ];

  const sections = [
    { key: "main",  label: "الرئيسية" },
    { key: "sales", label: "إدارة البيع" },
    { key: "admin", label: "الإدارة" },
  ];

  return (
    <div className="dashboard-wrapper">
      <AutoLogout />
      <Sidebar session={session} navItems={navItems} sections={sections} ROLE_LABELS={ROLE_LABELS} />

      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-title">نظام دارك CRM</div>
            <div className="topbar-subtitle">مرحباً، {session.name} — {ROLE_LABELS[session.role]}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isManager && <DatabaseBackupTrigger />}
            <GlobalSearch />
            <NotificationsBell />
          </div>
        </header>
        <div className="page-body">
          {children}
        </div>
      </div>
      <CommandPalette />
      <SmartLogger />

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <a href="/dashboard">
          <span>⊞</span>
          <span>الرئيسية</span>
        </a>
        <a href="/dashboard/leads">
          <span>🎯</span>
          <span>العملاء</span>
        </a>
        <a href="/dashboard/buyers">
          <span>🛍️</span>
          <span>المشترين/المستأجرين</span>
        </a>
        <a href="/dashboard/available-for-sale">
          <span>🏠</span>
          <span>الوحدات المعروضة</span>
        </a>
        <a href="/dashboard/customers">
          <span>👥</span>
          <span>الكل</span>
        </a>
      </nav>
    </div>
  );
}
