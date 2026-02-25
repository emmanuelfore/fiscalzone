// FiscalStack Service Worker — v3
// Cache Strategy: Network-first for API, Cache-first for static assets

const CACHE_VERSION = 'v13';
const STATIC_CACHE = `fiscalstack-static-${CACHE_VERSION}`;
const FONT_CACHE = `fiscalstack-fonts-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.png',
    '/logo.svg',
    '/fiscalstack-logo.png',
    '/site.webmanifest'
];

// ─────────────────────────────────────────────────────────────
// INSTALL — Pre-cache shell with per-file resilience
// ─────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(async (cache) => {
            console.log(`[SW] Pre-caching v${CACHE_VERSION} shell...`);
            for (const asset of STATIC_ASSETS) {
                try {
                    const response = await fetch(asset, { cache: 'no-store' });
                    if (response.ok) {
                        await cache.put(asset, response);
                    }
                } catch (err) {
                    console.warn(`[SW] Failed to pre-cache ${asset}:`, err);
                }
            }
        })
    );
    self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────
// ACTIVATE — Remove stale caches
// ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    const validCaches = [STATIC_CACHE, FONT_CACHE];
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (!validCaches.includes(key)) {
                        console.log('[SW] Clean up old cache:', key);
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim();
});

// ─────────────────────────────────────────────────────────────
// FETCH — Route requests intelligently
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // 1. API requests — Network only
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(
                    JSON.stringify({ error: 'offline', message: 'Offline mode active.' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }

    // 2. Navigation requests (Page Reloads) — Network-First for App Shell
    // This ensures that when online, we always get the latest build (fix for stale ReferenceErrors)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).then((networkResponse) => {
                // Cache the new version of the page
                if (networkResponse.ok) {
                    const responseClone = networkResponse.clone();
                    caches.open(STATIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(async () => {
                // Only use cache if network is totally unreachable
                const appShell = await caches.match('/index.html') || await caches.match('/');
                if (appShell) return appShell;

                return new Response('Offline: App shell not cached yet.', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            })
        );
        return;
    }

    // 3. Static Assets & External Assets
    // Stale-While-Revalidate Strategy
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const networkFetch = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(STATIC_CACHE).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // If network fails, return cached or a generic 404 response
                return cachedResponse || new Response(null, { status: 404 });
            });

            return cachedResponse || networkFetch;
        })
    );
});

// ─────────────────────────────────────────────────────────────
// MESSAGE — Handle skip-waiting from app
// ─────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }
});
