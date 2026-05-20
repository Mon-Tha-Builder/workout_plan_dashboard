const CACHE_NAME = 'forge-fitness-os-v8-force-latest-sync';
const SCRIPT_VERSION = 'v8_force_latest_sync';
const CORE_ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-512.png', './forge_phase5.js', './forge_phase6.js', './forge_phase7_cross_device_sync.js'];

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
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function injectForgeScripts(response) {
  let html = await response.text();

  html = html
    .replace(/<script[^>]+forge_phase5\.js[^>]*><\/script>/g, '')
    .replace(/<script[^>]+forge_phase6\.js[^>]*><\/script>/g, '')
    .replace(/<script[^>]+forge_phase7_cross_device_sync\.js[^>]*><\/script>/g, '');

  const scripts = [
    `<script src="./forge_phase5.js?${SCRIPT_VERSION}"></script>`,
    `<script src="./forge_phase6.js?${SCRIPT_VERSION}"></script>`,
    `<script src="./forge_phase7_cross_device_sync.js?${SCRIPT_VERSION}"></script>`
  ].join('\n');

  html = html.replace('</body>', `${scripts}\n</body>`);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const isNavigation = request.mode === 'navigate' || request.destination === 'document';

  if (isNavigation) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => injectForgeScripts(response.clone()))
        .catch(() => caches.match('./index.html').then(cached => cached ? injectForgeScripts(cached.clone()) : cached))
    );
    return;
  }

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
