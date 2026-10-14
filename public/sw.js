const CACHE_NAME = 'world-focus-v3-__BUILD_ID__';
const APP_SHELL = [] /* BUILD_ASSETS */;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('world-focus-') && key !== CACHE_NAME).slice(0, -1).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      // Keep the known app shell on upstream errors and auth callback URLs.
      if (response.ok && url.pathname === '/') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('/', copy)));
      }
      return response;
    }).catch(() => caches.open(CACHE_NAME).then(cache => cache.match('/'))));
    return;
  }

  event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(request)).then(current => current || caches.match(request)).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(() => Response.error());
  }));
});
