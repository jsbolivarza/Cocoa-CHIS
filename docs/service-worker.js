/* service-worker.js
   Cache-first offline shell. Bump CACHE_NAME on every deployed change so
   returning devices pick up the new version instead of serving a stale
   cached copy indefinitely. */
const CACHE_NAME = "cocoa-capture-v16";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/i18n.js",
  "./js/data-model.js",
  "./js/calc.js",
  "./js/storage.js",
  "./js/app.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
