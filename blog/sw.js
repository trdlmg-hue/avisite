/* ==========================================================================
   Avisite service worker: site ko offline bhi chalane deta hai.
   Naya version release karne par CACHE_NAME ka version badhayein.
   ========================================================================== */
const CACHE_NAME = "avisite-v2";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/about.html",
  "/contact.html",
  "/privacy-policy.html",
  "/terms.html",
  "/404.html",
  "/css/style.css",
  "/js/main.js",
  "/tools/index.html",
  "/tools/image-compressor.html",
  "/tools/image-to-pdf.html",
  "/tools/merge-pdf.html",
  "/tools/compress-pdf.html",
  "/tools/pdf-pages.html",
  "/js/tools/image-compressor.js",
  "/js/tools/image-to-pdf.js",
  "/js/tools/merge-pdf.js",
  "/js/tools/compress-pdf.js",
  "/js/tools/pdf-pages.js",
  "/quiz/index.html",
  "/quiz/prompt.html",
  "/quiz/start.html",
  "/quiz/play.html",
  "/js/quiz/validate.js",
  "/js/quiz/prompt.js",
  "/js/quiz/start.js",
  "/js/quiz/engine.js",
  "/blog/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") { return; }

  const url = new URL(req.url);

  // Same site: pehle network (naya content), fail ho to cache
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/404.html")))
    );
    return;
  }

  // Doosri site (fonts, pdf-lib, pdf.js): pehle cache, nahi to network aur cache mein daal do
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) { return hit; }
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
