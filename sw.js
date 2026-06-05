const CACHE_NAME = 'system-interface-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: Cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first for assets, network-first for data
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // For API/data requests (if you add later): Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For static assets: Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      
      return fetch(request)
        .then((response) => {
          // Cache valid responses
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback for HTML pages when offline
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
    })
  );
});

// Background sync (for future quest sync features)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-quests') {
    event.waitUntil(
      // Placeholder for future background sync logic
      Promise.resolve()
    );
  }
});

// Push notification support (optional foundation)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'System Alert', {
      body: data.body || 'A new quest is available.',
      icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect fill="%230a0a0c" width="192" height="192" rx="32"/%3E%3Ctext x="96" y="120" font-size="100" text-anchor="middle" fill="%2300d2ff"%3E👑%3C/text%3E%3C/svg%3E',
      badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"%3E%3Crect fill="%2300d2ff" width="96" height="96" rx="48"/%3E%3C/svg%3E',
      tag: 'system-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200]
    })
  );
});
