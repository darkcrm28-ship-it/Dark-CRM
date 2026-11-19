"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavItem from "./NavItem";
import LogoutButton from "./LogoutButton";

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
        aria-label="Toggle Sidebar"
      >
        {isOpen ? "✕" : "☰"}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">D</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">دارك</div>
            <div className="sidebar-logo-subtitle">للاستثمار والتسويق العقاري</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sections.map((sec: any) => {
            const items = navItems.filter((i: any) => i.show && i.section === sec.key);
            if (!items.length) return null;
            return (
              <div key={sec.key}>
                <div className="nav-section-label">{sec.label}</div>
                {items.map((item: any) => (
                  <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{session.name?.charAt(0) || "U"}</div>
            <div className="user-info">
              <div className="user-name">{session.name}</div>
              <div className="user-role">{ROLE_LABELS[session.role] || session.role}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <LogoutButton />
            <button 
              onClick={() => document.body.classList.toggle("light-mode")} 
              className="btn btn-ghost btn-sm" 
              style={{ flex: 1, fontSize: 16 }}
              title="تغيير المظهر"
            >
              🌓
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
