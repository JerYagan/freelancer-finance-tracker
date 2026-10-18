const CACHE_NAME = "fft-pwa-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/transactions",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Don't intercept non-GET requests or auth/storage routes
  if (
    request.method !== "GET" ||
    request.url.includes("/api/auth/") ||
    request.url.includes("/api/v1/mock-storage/")
  ) {
    return;
  }

  // Network-first strategy with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone and store valid responses
        if (
          response &&
          response.status === 200 &&
          response.type === "basic" &&
          !request.url.includes("/api/v1/")
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // When offline, try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // For navigation requests, fallback to cached dashboard or root
        if (request.mode === "navigate") {
          const fallback =
            (await caches.match("/dashboard")) || (await caches.match("/"));
          if (fallback) {
            return fallback;
          }
        }

        return new Response("Offline - Freelancer Finance Tracker", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" },
        });
      }),
  );
});
