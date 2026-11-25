"use client";

import { useSiteText, SiteLink as Link } from "@/components/public/PublicSiteContent";
import React from "react";

import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  Award,
  Tag,
  PhoneCall,
} from "lucide-react";

export default function MobileBottomNav() {
  const text = useSiteText(true);
  const pathname = usePathname();

  const navItems = [
    {
      label: text("mobile.navItems1_label"),
      href: "/",
      icon: Home,
    },
    {
      label: text("mobile.navItems2_label"),
      href: "/properties",
      icon: Building2,
    },
    {
      label: text("mobile.navItems3_label"),
      href: "/portfolio",
      icon: Award,
    },
    {
      label: text("mobile.navItems4_label"),
      href: "/sell",
      icon: Tag,
    },
    {
      label: text("mobile.navItems5_label"),
      href: "/contact",
      icon: PhoneCall,
    },
  ];

  return (
    <nav className="mobile-bottom-nav-bar" aria-label={text("mobile.text1")}>
      <div className="bottom-nav-inner">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${isActive ? "active-bottom-tab" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="bottom-nav-icon-wrapper">
                <IconComponent size={20} className="bottom-nav-icon" />
                {isActive && <span className="bottom-nav-active-pip" />}
              </div>
              <span className="bottom-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
