// FORGE service worker · simplified
// The phase scripts are now in index.html directly. The SW just caches files
// for offline use — it no longer rewrites HTML.

const CACHE_NAME = 'forge-fitness-os-v8-iron-ember';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-512.png',
  './forge_phase5.js',
  './forge_phase6.js',
  './forge_phase7_cross_device_sync.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const url = new URL(request.url);

  // Never intercept the Cloudflare Worker or any cross-origin requests —
  // they must hit the network directly (cloud sync + Claude calls).
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === 'navigate' || request.destination === 'document';

  // Network-first for navigations, falling back to cache when offline
  if (isNavigation) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Network-first for static assets, cache fallback
  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
  );
});
