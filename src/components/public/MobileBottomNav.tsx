"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  Award,
  Tag,
  PhoneCall,
} from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "الرئيسية",
      href: "/",
      icon: Home,
    },
    {
      label: "الكتالوج",
      href: "/properties",
      icon: Building2,
    },
    {
      label: "أعمالنا",
      href: "/portfolio",
      icon: Award,
    },
    {
      label: "اعرض عقارك",
      href: "/sell",
      icon: Tag,
    },
    {
      label: "تواصل",
      href: "/contact",
      icon: PhoneCall,
    },
  ];

  return (
    <nav className="mobile-bottom-nav-bar" aria-label="شريط التنقل السفلي">
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
