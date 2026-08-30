/// KARTSEEK — Service Worker for PWA
/// Provides offline support, caching, background sync, and push notifications.

const CACHE_NAME = 'kartseek-v1';
const STATIC_CACHE = 'kartseek-static-v1';
const DYNAMIC_CACHE = 'kartseek-dynamic-v1';

// Static assets to precache
const PRECACHE_URLS = [
  '/',
  '/marketplace',
  '/restaurant',
  '/grocery',
  '/pharmacy',
  '/doctor',
  '/taxi',
  '/offline',
  '/manifest.json',
];

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch Strategy ─────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, API calls, and external requests
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (!url.origin.includes('kartseek')) return;

  // Static assets: Cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|avif|svg|woff2|ico)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // HTML pages: Network-first with offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/offline')))
    );
    return;
  }

  // Default: Stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from KARTSEEK',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'KARTSEEK', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Focus existing tab or open new one
      for (const client of clients) {
        if (client.url.includes('kartseek') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ─── Background Sync ────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncPendingOrders() {
  // Retrieve queued orders from IndexedDB and submit to API
  console.log('[SW] Syncing pending orders...');
}

async function syncCart() {
  console.log('[SW] Syncing cart...');
}
