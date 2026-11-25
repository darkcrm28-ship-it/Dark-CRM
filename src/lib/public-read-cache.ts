const PUBLIC_CACHE_TTL_SECONDS = 30;

export async function readPublicCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (typeof caches === "undefined") return load();

  // Synthetic keys store JSON in the Worker's cache. They are never fetched.
  const request = new Request(`https://dark-crm.darkcrm28.workers.dev/_public-data/v1/${key}`);
  let cache: Cache | undefined;
  try {
    cache = await caches.open("dark-crm-public-v1");
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
