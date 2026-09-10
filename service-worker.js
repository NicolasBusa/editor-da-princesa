const VERSION = 'editor-da-princesa-pwa-v1';
const PUBLIC_CACHE = `${VERSION}-public`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const PUBLIC_ASSETS = [
  '/login.html',
  '/login.js',
  '/access.css',
  '/pwa.css',
  '/pwa.js',
  '/offline.html',
  '/manifest.webmanifest',
  '/assets/mascot.svg',
  '/assets/pwa/apple-touch-icon.png',
  '/assets/pwa/favicon-64.png',
  '/assets/pwa/icon-192.png',
  '/assets/pwa/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(PUBLIC_CACHE).then(cache => cache.addAll(PUBLIC_ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('editor-da-princesa-pwa-') && ![PUBLIC_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  const isPublic = PUBLIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/assets/pwa/');
  if (isPublic) {
    event.respondWith(caches.match(request).then(cached => {
      const refresh = fetch(request).then(response => {
        if (response.ok) caches.open(PUBLIC_CACHE).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || refresh;
    }));
    return;
  }

  event.respondWith(fetch(request).then(response => {
    if (response.ok) caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
    return response;
  }).catch(() => caches.match(request)));
});
