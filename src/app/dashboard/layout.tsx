import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationsBell from "@/components/NotificationsBell";
import AutoLogout from "@/components/AutoLogout";
import CommandPalette from "@/components/CommandPalette";
import SmartLogger from "@/components/SmartLogger";
import DatabaseBackupTrigger from "@/components/DatabaseBackupTrigger";
import {
  LayoutDashboard,
  User,
  Database,
  Building,
  ShoppingBag,
  UserX,
  FolderKanban,
  Calendar,
  AlertTriangle,
  Handshake,
  BarChart3,
  Coins,
  ShieldCheck,
  KeyRound,
  SlidersHorizontal,
  Settings,
  Wallet,
  Cpu,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  GENERAL_MANAGER: "المدير العام",
  SALES_MANAGER: "مدير مبيعات",
  SALES_EMPLOYEE: "مسؤول مبيعات",
  HR_MANAGER: "مدير موارد بشرية",
  ACCOUNTING_MANAGER: "مدير حسابات",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isManager = session.role === "GENERAL_MANAGER" || session.role === "SALES_MANAGER";
  const isHR = session.role === "GENERAL_MANAGER" || session.role === "HR_MANAGER";

  const navItems = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard size={18} />,
      label: "لوحة القيادة",
      show: true,
      section: "main",
    },
    {
      href: "/dashboard/profile",
      icon: <User size={18} />,
      label: "ملفي الشخصي",
      show: true,
      section: "main",
    },

    // Core Business Sections
    {
      href: "/dashboard/customers",
      icon: <Database size={18} />,
      label: "قاعدة العملاء الشاملة",
      show: true,
      section: "main",
    },
    {
      href: "/dashboard/available-for-sale",
      icon: <Building size={18} />,
      label: "الوحدات المعروضة",
      show: true,
      section: "main",
    },
    {
      href: "/dashboard/buyers",
      icon: <ShoppingBag size={18} />,
      label: "المشترين والمستأجرين",
      show: true,
      section: "main",
    },
    {
      href: "/dashboard/not-interested",
      icon: <UserX size={18} />,
      label: "قائمة غير المهتمين",
      show: true,
      section: "main",
    },

    {
      href: "/dashboard/projects",
      icon: <FolderKanban size={18} />,
      label: "المشاريع العقارية",
      show: isManager,
      section: "main",
    },
    {
      href: "/dashboard/calendar",
      icon: <Calendar size={18} />,
      label: "التقويم والمواعيد",
      show: true,
      section: "main",
    },
    {
      href: "/dashboard/overdue-reminders",
      icon: <AlertTriangle size={18} />,
      label: "المتابعات المتأخرة",
      show: true,
      section: "main",
    },

    // Sales & Management
    {
      href: "/dashboard/deals",
      icon: <Handshake size={18} />,
      label: "إدارة الصفقات",
      show: isManager,
      section: "sales",
    },
    {
      href: "/dashboard/reports",
      icon: <BarChart3 size={18} />,
      label: "التقارير والإحصائيات",
      show: isManager,
      section: "admin",
    },
    {
      href: "/dashboard/commissions",
      icon: <Coins size={18} />,
      label: "العمولات والرواتب",
      show: isHR,
      section: "admin",
    },
    {
      href: "/dashboard/audit",
      icon: <ShieldCheck size={18} />,
      label: "سجل العمليات (Audit)",
      show: session.role === "GENERAL_MANAGER",
      section: "admin",
    },
    {
      href: "/dashboard/users",
      icon: <KeyRound size={18} />,
      label: "إدارة المستخدمين",
      show: session.role === "GENERAL_MANAGER",
      section: "admin",
    },
    {
      href: "/dashboard/settings/custom-fields",
      icon: <SlidersHorizontal size={18} />,
      label: "الحقول الديناميكية",
      show: session.role === "GENERAL_MANAGER",
      section: "admin",
    },
    {
      href: "/dashboard/settings",
      icon: <Settings size={18} />,
      label: "إعدادات النظام",
      show: session.role === "GENERAL_MANAGER",
      section: "admin",
    },
    {
      href: "/dashboard/accounting",
      icon: <Wallet size={18} />,
      label: "المحاسبة والخزينة",
      show: session.role === "GENERAL_MANAGER",
      section: "admin",
    },
    {
      href: "/dashboard/integrations",
      icon: <Cpu size={18} />,
      label: "الربط التقني والتكامل",
      show: session.role === "GENERAL_MANAGER",
      section: "admin",
    },
  ];

  const sections = [
    { key: "main", label: "الرئيسية والعمليات" },
    { key: "sales", label: "إدارة الصفقات والمبيعات" },
    { key: "admin", label: "الإدارة والنظام" },
  ];

  return (
    <div className="dashboard-wrapper">
      <AutoLogout />
      <Sidebar
        session={session}
        navItems={navItems}
        sections={sections}
        ROLE_LABELS={ROLE_LABELS}
      />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-user-greeting">
            <div className="topbar-title">
              <span className="gold-gradient-text">دارك</span> CRM
            </div>
            <div className="topbar-subtitle">
              أهلاً بك، {session.name} &bull;{" "}
              <span className="role-pill">{ROLE_LABELS[session.role] || session.role}</span>
            </div>
          </div>
          <div className="topbar-actions-group">
            {isManager && <DatabaseBackupTrigger />}
            <GlobalSearch />
            <NotificationsBell />
          </div>
        </header>

        <main className="page-body">{children}</main>
      </div>

      <CommandPalette />
      <SmartLogger />

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link href="/dashboard">
          <LayoutDashboard size={18} />
          <span>الرئيسية</span>
        </Link>
        <Link href="/dashboard/customers">
          <Database size={18} />
          <span>العملاء</span>
        </Link>
        <Link href="/dashboard/buyers">
          <ShoppingBag size={18} />
          <span>المشترين</span>
        </Link>
        <Link href="/dashboard/available-for-sale">
          <Building size={18} />
          <span>المعروض</span>
        </Link>
      </nav>
    </div>
  );
}
