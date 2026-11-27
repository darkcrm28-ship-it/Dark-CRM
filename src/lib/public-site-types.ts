export const SITE_PAGES = {
  home: { title: "الرئيسية", path: "/" },
  properties: { title: "الكتالوج العقاري", path: "/properties" },
  portfolio: { title: "البورتفوليو", path: "/portfolio" },
  sell: { title: "اعرض وحدتك", path: "/sell" },
  finishes: { title: "التشطيبات", path: "/guides/finishes" },
  decor: { title: "الديكور", path: "/guides/decor" },
  news: { title: "أخبار دارك", path: "/guides/news" },
  contact: { title: "الاتصال", path: "/contact" },
} as const;

export type SitePage = keyof typeof SITE_PAGES;
export type SiteContentKey = SitePage | "shared";
export type SiteCopy = Record<string, string>;
export type SiteVisibility = Record<SitePage, boolean>;
export type SiteContent = {
  enabled: boolean;
  revision: number;
  overrides: SiteCopy;
  heroImage: string;
};

export const SITE_CONTENT_KEYS: SiteContentKey[] = [
  "home", "properties", "portfolio", "sell", "contact", "finishes", "decor", "news", "shared",
];

export const DEFAULT_VISIBILITY: SiteVisibility = {
  finishes: true, decor: true, news: true, home: true, properties: true, portfolio: true, sell: true, contact: true,
};

export function isSiteContentKey(value: unknown): value is SiteContentKey {
  return typeof value === "string" && SITE_CONTENT_KEYS.some(key => key === value);
}

export function pageForSiteHref(href: string): SitePage | undefined {
  const pathname = href.split(/[?#]/, 1)[0];
  if (pathname.startsWith("/properties/")) return "properties";
  return (Object.keys(SITE_PAGES) as SitePage[]).find(page => SITE_PAGES[page].path === pathname);
}
