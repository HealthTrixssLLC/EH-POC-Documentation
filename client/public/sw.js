const CACHE_NAME = 'easyhealth-v2';
const API_CACHE_NAME = 'easyhealth-api-v1';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/favicon.png',
];

const API_CACHE_PATTERNS = [
  '/api/visits/',
  '/api/demo/config',
  '/api/members/',
  '/api/plan-packs',
  '/api/clinical-rules',
  '/api/assessments/',
  '/api/measures/',
];

const API_NO_CACHE = [
  '/api/demo/reset',
  '/api/fhir/',
  '/api/audit-',
  '/api/ai-providers',
  '/api/transcribe',
  '/api/extract',
];

function shouldCacheApi(url) {
  const path = new URL(url).pathname;
  if (API_NO_CACHE.some(p => path.includes(p))) return false;
  return API_CACHE_PATTERNS.some(p => path.includes(p));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== API_CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  if (url.pathname.startsWith('/api/') && shouldCacheApi(request.url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.open(API_CACHE_NAME).then((cache) =>
            cache.match(request).then((cached) => {
              if (cached) {
                const headers = new Headers(cached.headers);
                headers.set('X-Offline-Cache', 'service-worker');
                return new Response(cached.body, {
                  status: cached.status,
                  statusText: cached.statusText,
                  headers,
                });
              }
              return new Response(
                JSON.stringify({ error: 'offline', message: 'No cached data available' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            })
          );
        })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/) ||
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }
});
