export function createClientReadCache<T>(ttlMs = 30_000, maxEntries = 12) {
  const entries = new Map<string, { data: T; expiresAt: number }>();
  let revision = 0;

  return {
    async load(url: string, signal?: AbortSignal): Promise<T> {
      const cached = entries.get(url);
      if (cached && cached.expiresAt > Date.now()) return cached.data;

      const requestRevision = revision;
      const response = await fetch(url, { signal });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          entries.clear();
          revision++;
        }
        throw new Error(`Request failed (${response.status})`);
      }

      const data: T = await response.json();
      if (requestRevision === revision && !signal?.aborted) {
        entries.delete(url);
        entries.set(url, { data, expiresAt: Date.now() + ttlMs });
        if (entries.size > maxEntries) {
          const oldest = entries.keys().next();
          if (!oldest.done) entries.delete(oldest.value);
        }
      }
      return data;
    },
    clear() {
      entries.clear();
      revision++;
    },
  };
}
