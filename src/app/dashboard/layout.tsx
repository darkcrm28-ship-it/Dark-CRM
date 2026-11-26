import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { getPageSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationsBell from "@/components/NotificationsBell";
import AutoLogout from "@/components/AutoLogout";
import CommandPalette from "@/components/CommandPalette";
import SmartLogger from "@/components/SmartLogger";
import DatabaseBackupTrigger from "@/components/DatabaseBackupTrigger";
import { ROLE, SALES_ROLES, SALES_MANAGER_ROLES, COMMISSION_ROLES } from "@/lib/auth";
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
  FileText,
  Crown,
  Globe,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  GENERAL_MANAGER: "المدير العام",
  SALES_MANAGER: "مدير مبيعات",
  SALES_EMPLOYEE: "مسؤول مبيعات",
  HR_MANAGER: "مدير موارد بشرية",
  ACCOUNTING_MANAGER: "مدير حسابات",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSession();
  if (!session) redirect("/login");

  const isSales = SALES_ROLES.includes(session.role);
  const isManager = SALES_MANAGER_ROLES.includes(session.role);
  const canViewCommissions = COMMISSION_ROLES.includes(session.role);

  const navItems = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard size={18} />,
      label: "لوحة القيادة",
      show: isSales,
      section: "overview",
    },
    {
      href: "/dashboard/profile",
      icon: <User size={18} />,
      label: "ملفي الشخصي",
      show: true,
      section: "overview",
    },

    // Core Business Sections
    {
      href: "/dashboard/customers",
      icon: <Database size={18} />,
      label: "قاعدة العملاء الشاملة",
      show: isSales,
      section: "customers",
    },
    {
      href: "/dashboard/available-for-sale",
      icon: <Building size={18} />,
      label: "الوحدات المعروضة",
      show: isSales,
      section: "inventory",
    },
    {
      href: "/dashboard/properties",
      icon: <Building size={18} />,
      label: "إدارة الوحدات والكتالوج",
      show: isManager,
      section: "inventory",
    },
    {
      href: "/dashboard/buyers",
      icon: <ShoppingBag size={18} />,
      label: "المشترين والمستأجرين",
      show: isSales,
      section: "customers",
    },
    {
      href: "/dashboard/not-interested",
      icon: <UserX size={18} />,
      label: "قائمة غير المهتمين",
      show: isSales,
      section: "customers",
    },

    {
      href: "/dashboard/projects",
      icon: <FolderKanban size={18} />,
      label: "المشاريع العقارية",
      show: isManager,
      section: "inventory",
    },
    {
      href: "/dashboard/documents",
      icon: <FileText size={18} />,
      label: "المستندات",
      show: isSales || session.role === ROLE.ACCOUNTING_MANAGER,
      section: "sales",
    },
    {
      href: "/dashboard/deal-cycle",
      icon: <Handshake size={18} />,
      label: "دورة الصفقات",
      show: isSales || session.role === ROLE.ACCOUNTING_MANAGER,
      section: "sales",
    },
    {
      href: "/dashboard/property-owners",
      icon: <Crown size={18} />,
      label: "الملاك والملكية",
      show: isManager || session.role === ROLE.ACCOUNTING_MANAGER,
      section: "inventory",
    },
    {
      href: "/dashboard/calendar",
      icon: <Calendar size={18} />,
      label: "التقويم والمواعيد",
      show: isSales,
      section: "customers",
    },
    {
      href: "/dashboard/overdue-reminders",
      icon: <AlertTriangle size={18} />,
      label: "المتابعات المتأخرة",
      show: isSales,
      section: "customers",
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
      section: "finance",
    },
    {
      href: "/dashboard/commissions",
      icon: <Coins size={18} />,
      label: "العمولات والرواتب",
      show: canViewCommissions,
      section: "finance",
    },
    {
      href: "/dashboard/audit",
      icon: <ShieldCheck size={18} />,
      label: "سجل العمليات (Audit)",
      show: session.role === ROLE.GENERAL_MANAGER,
      section: "system",
    },
    {
      href: "/dashboard/users",
      icon: <KeyRound size={18} />,
      label: "إدارة المستخدمين",
      show: session.role === ROLE.GENERAL_MANAGER,
      section: "system",
    },
    {
      href: "/dashboard/settings/custom-fields",
      icon: <SlidersHorizontal size={18} />,
      label: "الحقول الديناميكية",
      show: session.role === ROLE.GENERAL_MANAGER,
      section: "system",
    },
    {
      href: "/dashboard/site-content",
      icon: <Globe size={18} />,
      label: "إدارة صفحات الموقع",
      show: session.role === ROLE.GENERAL_MANAGER,
      section: "system",
    },
    {
      href: "/dashboard/settings",
      icon: <Settings size={18} />,
      label: "إعدادات النظام",
      show: session.role === ROLE.GENERAL_MANAGER,
      section: "system",
    },
    {
      href: "/dashboard/accounting",
      icon: <Wallet size={18} />,
      label: "المحاسبة والخزينة",
      show: session.role === ROLE.GENERAL_MANAGER || session.role === ROLE.ACCOUNTING_MANAGER,
      section: "finance",
    },
    {
      href: "/dashboard/integrations",
      icon: <Cpu size={18} />,
      label: "الربط التقني والتكامل",
      show: session.role === ROLE.GENERAL_MANAGER,
      section: "system",
    },
  ];

  const sections = [
    { key: "overview", label: "نظرة عامة", icon: <LayoutDashboard size={14} /> },
    { key: "customers", label: "العملاء والمتابعة", icon: <ShoppingBag size={14} /> },
    { key: "inventory", label: "العقارات والمخزون", icon: <Building size={14} /> },
    { key: "sales", label: "الصفقات والملفات", icon: <Handshake size={14} /> },
    { key: "finance", label: "التقارير والمالية", icon: <Wallet size={14} /> },
    { key: "system", label: "إدارة النظام", icon: <Settings size={14} /> },
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
            {isSales && <GlobalSearch />}
            <NotificationsBell />
          </div>
        </header>

        <main className="page-body">{children}</main>
      </div>

      {isSales && <CommandPalette />}
      <SmartLogger />

      {/* Mobile Bottom Navigation */}
      {isSales && <nav className="mobile-bottom-nav">
        <Link href="/dashboard" prefetch={false}>
          <LayoutDashboard size={18} />
          <span>الرئيسية</span>
        </Link>
        <Link href="/dashboard/customers" prefetch={false}>
          <Database size={18} />
          <span>العملاء</span>
        </Link>
        <Link href="/dashboard/buyers" prefetch={false}>
          <ShoppingBag size={18} />
          <span>المشترين</span>
        </Link>
        <Link href="/dashboard/available-for-sale" prefetch={false}>
          <Building size={18} />
          <span>المعروض</span>
        </Link>
      </nav>}
    </div>
  );
}
