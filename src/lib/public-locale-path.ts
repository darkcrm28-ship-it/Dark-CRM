const publicPaths = new Set(["/", "/properties", "/portfolio", "/sell", "/contact", "/client-portal",
  "/guides/finishes", "/guides/decor", "/guides/news"]);

export function publicLocalePath(pathname: string) {
  const match = pathname.match(/^\/(ar|en)(\/.*)?$/);
  if (!match) return null;
  const path = match[2] || "/";
  if (!publicPaths.has(path) && !/^\/properties\/[a-zA-Z0-9-]+$/.test(path)) return null;
  return {locale:match[1],path};
}
