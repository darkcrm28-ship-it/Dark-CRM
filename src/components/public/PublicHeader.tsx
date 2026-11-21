"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import DarakLogo from "./DarakLogo";

export default function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Equal-weight concise nav tabs
  const navTabs = [
    { label: "الرئيسية", href: "/" },
    { label: "الكتالوج العقاري", href: "/properties" },
    { label: "بورتفوليو الشركة", href: "/portfolio" },
    { label: "اعرض وحدتك", href: "/sell" },
    { label: "تواصل معنا", href: "/contact" },
  ];

  return (
    <header className="public-header-navbar">
      <div className="portal-container nav-inner-wrap">
        {/* Brand with Transparent Custom Logo */}
        <Link href="/" className="public-brand-link">
          <DarakLogo size={38} />
          <div className="brand-titles">
            <div className="brand-primary-name">
              <span className="gold-shimmer-text">دارك</span> للاستثمار العقاري
            </div>
            <div className="brand-sub-tag">Darak Real Estate</div>
          </div>
        </Link>

        {/* Desktop Harmonious Navigation Tabs */}
        <nav className="public-desktop-nav-tabs">
          {navTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`unified-nav-tab ${isActive ? "active-tab" : ""}`}
              >
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions CTA: Sized identically to tabs */}
        <div className="public-header-actions">
          <Link href="/contact" className="btn-header-consultation">
            <Calendar size={14} />
            <span>حجز استشارة</span>
          </Link>

          <a
            href="https://wa.me/?text=مرحباً شركة دارك العقارية، أود الاستفسار عن الوحدات المتاحة وخدماتكم."
            target="_blank"
            rel="noopener noreferrer"
            className="btn-header-whatsapp"
            title="محادثة واتساب مباشرة"
          >
            <MessageCircle size={15} />
            <span>واتساب</span>
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-hamburger-btn"
            aria-label="قائمة التنقل"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer animate-in">
          <div className="portal-container mobile-drawer-inner">
            {navTabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`mobile-nav-link ${isActive ? "active-mobile" : ""}`}
                >
                  <span>{tab.label}</span>
                </Link>
              );
            })}
            <div className="mobile-drawer-cta-row">
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-header-consultation w-full text-center justify-center py-3"
              >
                حجز استشارة مجانية
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
