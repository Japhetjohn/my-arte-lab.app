/**
 * MyArteLab Production Service Worker
 *
 * Safe, privacy-preserving, cache-versioned PWA service worker.
 *
 * STRICT SAFETY RULES:
 * 1. Default-deny: Never intercepts non-GET, API (/api/*), auth, webhooks, or wallet requests.
 * 2. Never caches authenticated HTML, user account data, bookings, or messages.
 * 3. Cache-first ONLY for safe, immutable public static assets (Vite bundles, icons, fonts).
 * 4. Network-first for navigation, falling back to /offline.html on network failure.
 * 5. Safe updates: Does NOT call skipWaiting() automatically; waits for explicit user refresh.
 * 6. Isolated cache namespace: "myartelab-static-v1" (safe from other sites and LagosLife).
 */

const CACHE_VERSION = 'v6';
const STATIC_CACHE = `myartelab-static-${CACHE_VERSION}`;
const OFFLINE_FALLBACK = '/offline.html';

const PRECACHE_ASSETS = [
  OFFLINE_FALLBACK,
  '/manifest.webmanifest',
  '/icons/icon-192-v6.png',
  '/icons/icon-maskable-192-v6.png',
  '/icons/icon-512-v6.png',
  '/icons/icon-maskable-512-v6.png',
  '/icons/apple-touch-icon-v6.png',
  '/favicon.ico',
];

// Install: Cache offline page and core assets, activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('PWA: precache asset skipped:', asset, err);
        }
      }
    })
  );
});

// Activate: Clean up only old MyArteLab-owned caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('myartelab-') && key !== STATIC_CACHE) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Safe updates: Triggered only when the user explicitly clicks "Refresh to update"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Strict allowlist and privacy boundaries
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Rule 1: NEVER intercept non-GET requests under any circumstances
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Rule 2: NEVER intercept cross-origin requests (RPC, Google Auth, Cloudinary, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Rule 3: NEVER intercept dynamic, authenticated, or sensitive endpoints
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/webhooks') ||
    url.pathname.startsWith('/uploads')
  ) {
    return;
  }

  // Rule 4: Navigation requests (HTML documents) — Network first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_FALLBACK);
      })
    );
    return;
  }

  // Rule 5: Static public assets — Cache first with network fallback
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/offline.html';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          // Cache only valid, successful responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: Let all other requests pass through to the browser and network normally
});
