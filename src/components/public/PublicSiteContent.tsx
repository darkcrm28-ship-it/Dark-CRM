"use client";

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { DEFAULT_VISIBILITY, pageForSiteHref, type SiteCopy, type SiteVisibility } from "@/lib/public-site-types";

type PublicSiteState = {
  copy: SiteCopy;
  shared: SiteCopy;
  contact: SiteCopy;
  visibility: SiteVisibility;
  heroImage: string;
};

const PublicSiteContext = createContext<PublicSiteState>({
  copy: {}, shared: {}, contact: {}, visibility: DEFAULT_VISIBILITY, heroImage: "",
});

export function PublicSiteContent({ value, children }: { value: PublicSiteState; children: ReactNode }) {
  return <PublicSiteContext.Provider value={value}>{children}</PublicSiteContext.Provider>;
}

export function useSiteText(shared = false) {
  const site = useContext(PublicSiteContext);
  const copy = shared ? site.shared : site.copy;
  return (key: string, values?: unknown[], fallback = "") => {
    const value = copy[key] ?? fallback;
    return values ? value.replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index) - 1] ?? "")) : value;
  };
}

export function usePublicSite() {
  const site = useContext(PublicSiteContext);
  return {
    ...site,
    canView(href: string) {
      const page = pageForSiteHref(href);
      return !page || site.visibility[page];
    },
  };
}

export function SiteLink({ href, prefetch = false, ...props }: ComponentProps<typeof Link>) {
  const { canView } = usePublicSite();
  if (typeof href === "string" && !canView(href)) return null;
  return <Link href={href} prefetch={prefetch} {...props} />;
}

export function publicWhatsAppLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function usePublicHeroStyle(gradient = true) {
  const { heroImage } = usePublicSite();
  if (!heroImage) return undefined;
  const cover = `url("${heroImage}")`;
  return {
    backgroundImage: gradient ? `linear-gradient(180deg, rgba(6, 12, 21, .76), rgba(6, 12, 21, .86)), ${cover}` : cover,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
