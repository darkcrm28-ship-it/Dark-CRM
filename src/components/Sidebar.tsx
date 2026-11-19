"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavItem from "./NavItem";
import LogoutButton from "./LogoutButton";
import { Menu, X, Building2, SunMoon } from "lucide-react";

export default function Sidebar({ session, navItems, sections, ROLE_LABELS }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const pathName = usePathname();

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathName]);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="sidebar-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="تبديل القائمة الجانبية"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Brand Logo Header */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Building2 size={24} className="text-gold" />
          </div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">
              <span className="gold-gradient-text">دارك</span> للواقع العقاري
            </div>
            <div className="sidebar-logo-subtitle">Dark Enterprise CRM</div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          {sections.map((sec: any) => {
            const items = navItems.filter((i: any) => i.show && i.section === sec.key);
            if (!items.length) return null;
            return (
              <div key={sec.key} className="nav-section-group">
                <div className="nav-section-label">{sec.label}</div>
                <div className="nav-items-list">
                  {items.map((item: any) => (
                    <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar-circle">
              {session.name?.charAt(0) || "U"}
            </div>
            <div className="user-details">
              <div className="user-name">{session.name}</div>
              <div className="user-role-tag">
                {ROLE_LABELS[session.role] || session.role}
              </div>
            </div>
          </div>

          <div className="sidebar-footer-actions">
            <LogoutButton />
            <button 
              onClick={() => document.body.classList.toggle("light-mode")} 
              className="theme-toggle-btn" 
              title="تبديل المظهر"
            >
              <SunMoon size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
