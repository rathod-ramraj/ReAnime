/* AnimeXplore service worker — required for browser install (address bar icon) */
const CACHE = 'animexplore-shell-v4';
const SHELL = [
  '/manifest.json',
  '/favicon.png?v=2',
];

const NETWORK_FIRST = [
  '/css/',
  '/js/',
  '/index.html',
  '/bg-footer.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isNetworkFirst(url, request) {
  if (url.searchParams.has('v')) return true;
  if (request.mode === 'navigate') return true;
  if (url.pathname === '/' || url.pathname === '/index.html') return true;
  return NETWORK_FIRST.some((path) => url.pathname.startsWith(path) || url.pathname.includes(path));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/proxy/')) return;

  if (isNetworkFirst(url, request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
