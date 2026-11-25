"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode | string;
  label: string;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link href={href} prefetch={false} className={`nav-item ${isActive ? "active" : ""}`}>
      <span className="nav-item-icon-box">{icon}</span>
      <span className="nav-item-label">{label}</span>
      {isActive && <span className="nav-active-indicator" />}
    </Link>
  );
}
