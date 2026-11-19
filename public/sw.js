const CACHE_NAME = "darek-crm-v1";
const OFFLINE_URL = "/offline";

// Assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/offline",
  "/manifest.json",
];

// ─── INSTALL ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH ─── (Network-first for API, Cache-first for static)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API calls (always fresh)
  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  // Network-first strategy for HTML pages
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL) || caches.match("/"))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(
      (cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
    )
  );
});

// ─── PUSH NOTIFICATIONS ───
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "دارك CRM", body: event.data.text() };
  }

  const options = {
    body: data.body || "لديك إشعار جديد",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "rtl",
    lang: "ar",
    vibrate: [200, 100, 200],
    tag: data.tag || "darek-crm",
    renotify: true,
    data: {
      url: data.url || "/dashboard",
    },
    actions: [
      { action: "open", title: "فتح التطبيق" },
      { action: "dismiss", title: "تجاهل" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "دارك CRM", options)
  );
});

// ─── NOTIFICATION CLICK ───
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── BACKGROUND SYNC (for offline actions) ───
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-interactions") {
    event.waitUntil(syncPendingInteractions());
  }
});

async function syncPendingInteractions() {
  // Reads pending interactions from IndexedDB and sends them when online
  console.log("[SW] Syncing pending interactions...");
}
