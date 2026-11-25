"use client";

import { useSiteText, usePublicSite, publicWhatsAppLink, SiteLink as Link } from "@/components/public/PublicSiteContent";
import React, { useState } from "react";

import { usePathname } from "next/navigation";
import {
  Calendar,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import DarakLogo from "./DarakLogo";
import MobileBottomNav from "./MobileBottomNav";

export default function PublicHeader() {
  const text = useSiteText(true);
  const { contact, canView } = usePublicSite();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Equal-weight concise nav tabs
  const navTabs = [
    { label: text("header.navTabs1_label"), href: "/" },
    { label: text("header.navTabs2_label"), href: "/properties" },
    { label: text("header.navTabs3_label"), href: "/portfolio" },
    { label: text("header.navTabs4_label"), href: "/sell" },
    { label: text("header.navTabs5_label"), href: "/contact" },
  ];

  return (
    <header className="public-header-navbar">
      <div className="portal-container nav-inner-wrap">
        {/* Brand with Transparent Custom Logo */}
        <Link href={["/", "/properties", "/portfolio", "/sell", "/contact"].find(canView) ?? "/login"} className="public-brand-link">
          <DarakLogo size={38} />
          <div className="brand-titles">
            <div className="brand-primary-name">
              <span className="gold-shimmer-text">{text("header.text1")}</span> {text("header.text2")}</div>
            <div className="brand-sub-tag">{text("header.text3")}</div>
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
            <span>{text("header.text4")}</span>
          </Link>

          <a
            href={publicWhatsAppLink(contact["details.whatsapp"] ?? "", contact["details.whatsappMessage"] ?? "")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-header-whatsapp"
            title={text("header.text5")}
          >
            <MessageCircle size={15} />
            <span>{text("header.text6")}</span>
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-hamburger-btn"
            aria-label={text("header.text7")}
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
              >{text("header.text8")}</Link>
            </div>
          </div>
        </div>
      )}

      {/* Modern Fixed Bottom Navigation Bar for Mobile */}
      <MobileBottomNav />
    </header>
  );
}
