// FiscalStack Service Worker — v3
// Cache Strategy: Network-first for API, Cache-first for static assets

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `fiscalstack-static-${CACHE_VERSION}`;
const FONT_CACHE = `fiscalstack-fonts-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.ico',
    '/logo.svg',
    '/web-app-manifest-192x192.png',
    '/web-app-manifest-512x512.png',
];

// ─────────────────────────────────────────────────────────────
// INSTALL — Pre-cache critical static shell
// ─────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Pre-caching static shell...');
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Pre-cache partial failure:', err);
            });
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
                        console.log('[SW] Deleting stale cache:', key);
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

    // Skip Vite dev internals
    if (url.pathname.startsWith('/@vite/') ||
        url.pathname.startsWith('/node_modules/') ||
        url.pathname.includes('vite-hmr')) {
        return;
    }

    // 1. API requests — Network only, no caching
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() => {
                // If API is unreachable, return a structured offline error
                return new Response(
                    JSON.stringify({ error: 'offline', message: 'You are currently offline. The POS will queue your transactions.' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }

    // 2. Google Fonts — Cache first, then network
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.open(FONT_CACHE).then((cache) =>
                cache.match(request).then((cached) => {
                    if (cached) return cached;
                    return fetch(request).then((response) => {
                        cache.put(request, response.clone());
                        return response;
                    });
                })
            )
        );
        return;
    }

    // 3. App shell & static assets — Cache first, then network, update cache
    event.respondWith(
        caches.open(STATIC_CACHE).then((cache) =>
            cache.match(request).then((cached) => {
                const networkFetch = fetch(request)
                    .then((response) => {
                        if (response && response.status === 200 && response.type === 'basic') {
                            cache.put(request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => {
                        // On network failure for navigation, serve the app shell
                        if (request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });

                // Return cached immediately, update in background (stale-while-revalidate)
                return cached || networkFetch;
            })
        )
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
