import { cache } from "react";
import type {} from "react/canary";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { invalidatePublicCache, readPublicCache } from "@/lib/public-read-cache";
import copyDefinition from "@/lib/public-site-copy.json";
import {
  DEFAULT_VISIBILITY, SITE_CONTENT_KEYS, isSiteContentKey,
  type SiteContent, type SiteContentKey, type SiteCopy, type SitePage,
} from "@/lib/public-site-types";

export type CopyGroup = {
  label: string;
  fields: { key: string; label: string; value: string }[];
};

export const siteCopyGroups = Object.fromEntries(SITE_CONTENT_KEYS.map(key =>
  [key, Object.values(copyDefinition[key])],
)) as Record<SiteContentKey, CopyGroup[]>;

const defaultCopy = Object.fromEntries(SITE_CONTENT_KEYS.map(key => [
  key, Object.fromEntries(siteCopyGroups[key].flatMap(group => group.fields.map(field => [field.key, field.value]))),
])) as Record<SiteContentKey, SiteCopy>;

const SITE_CACHE_KEY = "site-content-v1";
const EMPTY_SITE_CONTENT: SiteContent = { enabled: true, revision: 0, overrides: {}, heroImage: "" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSiteImage(value: string) {
  if (!value || /^\/images\/[\w-]+\.(jpe?g|png|webp)$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "ik.imagekit.io" && !url.username && !url.password
      && !url.port && !url.search && !url.hash
      && /^\/[\w-]+\/dark-crm\/site-content\/[\w.-]+\.(jpe?g|png|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

const contactLinks: Record<string, (text: string) => boolean> = {
  "details.phone": (value) => !value || /^\+?[0-9][0-9\s()-]{7,24}$/.test(value),
  "details.whatsapp": (value) => !value || /^\+?[1-9][0-9]{7,14}$/.test(value),
  "details.email": (value) => !value || /^[A-Z0-9._+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value),
  "details.maps": (value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && !url.port &&
        (url.hostname === "maps.app.goo.gl" ||
          (["www.google.com", "maps.google.com", "google.com"].includes(url.hostname) && url.pathname.startsWith("/maps")));
    } catch {
      return false;
    }
  },
};

export function parseSiteContentUpdate(key: SiteContentKey, input: unknown): SiteContent | null {
  if (!isRecord(input) || !isRecord(input.overrides) ||
    typeof input.enabled !== "boolean" || typeof input.revision !== "number" ||
    !Number.isInteger(input.revision) || input.revision < 0 || input.revision >= 2_147_483_647 ||
    typeof input.heroImage !== "string" || input.heroImage.length > 500 || !isSiteImage(input.heroImage)) {
    return null;
  }
  const overrides: SiteCopy = {};
  for (const [field, value] of Object.entries(input.overrides)) {
    if (!Object.prototype.hasOwnProperty.call(defaultCopy[key], field) ||
      typeof value !== "string" || value.length > 2000 || value.includes("\u0000")) return null;
    if (key === "contact" && contactLinks[field] && !contactLinks[field](value)) return null;
    if (value !== defaultCopy[key][field]) overrides[field] = value;
  }
  return {
    enabled: key === "shared" || input.enabled,
    revision: input.revision,
    overrides,
    heroImage: key === "shared" ? "" : input.heroImage,
  };
}

export async function readPublicSiteContent(): Promise<Record<SiteContentKey, SiteContent>> {
  const content = Object.fromEntries(SITE_CONTENT_KEYS.map(key => [key, EMPTY_SITE_CONTENT])) as Record<SiteContentKey, SiteContent>;
  const rows = await prisma.publicSitePage.findMany({
    where: { key: { in: SITE_CONTENT_KEYS } },
    select: { key: true, enabled: true, revision: true, content: true },
  });
  for (const row of rows) {
    if (!isSiteContentKey(row.key)) continue;
    const data = isRecord(row.content) ? row.content : {};
    const overrides = isRecord(data.overrides) ? data.overrides : {};
    // Keep known fields if a later build retires copy keys.
    const knownOverrides = Object.fromEntries(Object.entries(overrides).filter(([field]) =>
      Object.prototype.hasOwnProperty.call(defaultCopy[row.key as SiteContentKey], field),
    ));
    const record = parseSiteContentUpdate(row.key, {
      enabled: row.enabled,
      revision: row.revision,
      overrides: knownOverrides,
      heroImage: data.heroImage ?? "",
    });
    content[row.key] = record ?? { ...EMPTY_SITE_CONTENT, enabled: row.enabled, revision: row.revision };
  }
  return content;
}

function loadPublicSite() {
  return readPublicCache(SITE_CACHE_KEY, readPublicSiteContent);
}

export const getPublicSiteContent = typeof cache === "function" ? cache(loadPublicSite) : loadPublicSite;

export function invalidatePublicSite() {
  return invalidatePublicCache(SITE_CACHE_KEY);
}

export async function getSitePageRender(page: SitePage, snapshot?: Awaited<ReturnType<typeof getPublicSiteContent>>) {
  const settings = snapshot ?? await getPublicSiteContent();
  if (!settings[page].enabled) notFound();
  const visibility = { ...DEFAULT_VISIBILITY };
  for (const key of Object.keys(visibility) as SitePage[]) visibility[key] = settings[key].enabled;
  const contact = { ...defaultCopy.contact, ...settings.contact.overrides };
  return {
    copy: { ...defaultCopy[page], ...settings[page].overrides },
    shared: { ...defaultCopy.shared, ...settings.shared.overrides },
    contact: {
      "details.phone": contact["details.phone"],
      "details.whatsapp": contact["details.whatsapp"],
      "details.whatsappMessage": contact["details.whatsappMessage"],
    },
    heroImage: settings[page].heroImage,
    visibility,
  };
}

export async function getSitePageMetadata(page: SitePage) {
  const settings = (await getPublicSiteContent())[page];
  if (!settings.enabled) return { title: "الصفحة غير متاحة", robots: { index: false, follow: false } };
  return {
    title: settings.overrides["meta.title"] ?? defaultCopy[page]["meta.title"],
    description: settings.overrides["meta.description"] ?? defaultCopy[page]["meta.description"],
  };
}
