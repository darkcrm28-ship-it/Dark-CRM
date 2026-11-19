"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link href={href} className={`nav-item${isActive ? " active" : ""}`}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
