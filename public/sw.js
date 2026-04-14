/// <reference lib="webworker" />

const CACHE_NAME = "alice-atendimentos-v2";

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/registros",
  "/relatorios",
  "/tipos",
  "/dados",
  "/conquistas",
  "/insights",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: precache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Notification click: open the app on the relevant route
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const tag = event.notification.tag || "";
  let url = "/";
  if (tag.startsWith("backup")) url = "/dados";
  else if (tag.startsWith("meta")) url = "/";
  else if (tag.startsWith("lembrete-pausa")) url = "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Fetch: network-first for navigation, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http
  if (!request.url.startsWith("http")) return;

  // Navigation requests: network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Static assets: cache-first
  if (
    request.url.includes("/_next/static/") ||
    request.url.includes("/icons/") ||
    request.url.endsWith(".css") ||
    request.url.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }
});
