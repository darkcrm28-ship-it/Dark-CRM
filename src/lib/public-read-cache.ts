const PUBLIC_CACHE_TTL_SECONDS = 30;
const PUBLIC_CACHE_NAME = "dark-crm-public-v1";

function publicCacheRequest(key: string) {
  return new Request(`https://dark-crm.darkcrm28.workers.dev/_public-data/v1/${key}`);
}

export async function readPublicCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (typeof caches === "undefined") return load();

  // Synthetic keys store JSON in the Worker's cache. They are never fetched.
  const request = publicCacheRequest(key);
  let cache: Cache | undefined;
  try {
    cache = await caches.open(PUBLIC_CACHE_NAME);
    const hit = await cache.match(request);
    if (hit) return await hit.json() as T;
  } catch {
    // A cache error must not prevent a public read from reaching the database.
  }

  const data = await load();
  if (cache && data !== null) {
    await cache.put(request, Response.json(data, {
      headers: { "Cache-Control": `public, max-age=${PUBLIC_CACHE_TTL_SECONDS}` },
    })).catch(() => {});
  }
  return data;
}

export async function invalidatePublicCache(key: string) {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(PUBLIC_CACHE_NAME);
    await cache.delete(publicCacheRequest(key));
  } catch {
    // Other locations and failed invalidations are bounded by the cache TTL.
  }
}
