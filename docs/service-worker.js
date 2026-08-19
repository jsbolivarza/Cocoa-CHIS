/* service-worker.js
   Offline shell for the capture app.

   The previous version could not update itself. ASSETS listed icon paths that
   do not exist in the repository, and caching them as one batch rejects the whole promise
   if a single file 404s. Install failed, the new worker never activated, and
   the old one kept serving old code until someone reinstalled the app.

   Three things changed:

   1. Assets are cached one at a time and a failure is logged, not fatal. A
      wrong path can never again block an update.
   2. Application code and HTML are fetched network first. A device with signal
      always runs the deployed version; the cache is the offline fallback, not
      the source of truth.
   3. The new worker waits instead of taking over immediately. Swapping code
      under a half-finished interview is worse than running a version behind,
      so the app asks and the coach chooses when to reload.

   VERSION is the one line to change on every deploy. It must match
   APP_VERSION in app.js, which is what the Settings screen displays. */

const VERSION = "17";
const CACHE_NAME = `cocoa-capture-v${VERSION}`;

/* Paths are relative to this file. Keep this list in step with index.html. */
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./i18n.js",
  "./data-model.js",
  "./calc.js",
  "./storage.js",
  "./app.js",
  "./icon192.png",
  "./icon512.png",
  "./icon512maskable.png",
];

/* Anything whose freshness matters more than its speed. Everything else, fonts
   and icons, is served from cache first because it never changes. */
const CODE = /\.(?:js|css|html|json)$/i;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(
      ASSETS.map(async path => {
        const response = await fetch(new Request(path, { cache: "reload" }));
        if (!response.ok) throw new Error(`${path} returned ${response.status}`);
        return cache.put(path, response);
      })
    );
    const failed = results
      .map((r, i) => (r.status === "rejected" ? ASSETS[i] : null))
      .filter(Boolean);
    if (failed.length) {
      console.warn(`[sw] ${CACHE_NAME} installed without: ${failed.join(", ")}`);
    }
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Sent by the page when the coach accepts an update. */
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "GET_VERSION" && event.source) {
    event.source.postMessage({ type: "VERSION", version: VERSION });
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const wantsFresh = request.mode === "navigate" || (sameOrigin && CODE.test(url.pathname));

  if (wantsFresh) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.status === 200) {
          const copy = fresh.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return fresh;
      } catch (e) {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("./index.html");
          if (shell) return shell;
        }
        throw e;
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => cached);
    return cached || network;
  })());
});
