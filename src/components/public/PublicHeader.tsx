"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Calendar,
  MessageCircle,
  Menu,
  X,
  ShieldCheck,
  Compass,
  Briefcase,
  Home,
  PhoneCall,
} from "lucide-react";

export default function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "الرئيسية", href: "/" },
    { label: "الكتالوج العقاري", href: "/properties" },
    { label: "بورتفوليو وإنجازات الشركة", href: "/portfolio" },
    { label: "اعرض وحدتك للبيع", href: "/sell" },
    { label: "تواصل معنا", href: "/contact" },
  ];

  return (
    <header className="public-header-navbar">
      <div className="portal-container nav-inner-wrap">
        {/* Brand */}
        <Link href="/" className="public-brand-link">
          <div className="brand-logo-gem">
            <Building2 size={24} className="text-gold" />
          </div>
          <div className="brand-titles">
            <div className="brand-primary-name">
              <span className="gold-shimmer-text">دارك</span> للاستثمار والتسويق العقاري
            </div>
            <div className="brand-sub-tag">Darek Real Estate Consultancy</div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="public-desktop-nav">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`public-nav-item ${isActive ? "active-gold" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions CTA */}
        <div className="public-header-actions">
          <Link href="/contact" className="btn-consultation-gold">
            <Calendar size={15} />
            <span>حجز استشارة</span>
          </Link>

          <a
            href="https://wa.me/?text=مرحباً شركة دارك العقارية، أود الاستفسار عن الوحدات المتاحة وخدماتكم."
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp-compact"
            title="محادثة واتساب مباشرة"
          >
            <MessageCircle size={17} />
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
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`mobile-nav-link ${isActive ? "active-mobile" : ""}`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="mobile-drawer-cta-row">
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-consultation-gold w-full text-center"
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
