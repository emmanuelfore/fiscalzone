// FiscalStack Service Worker — v3
// Cache Strategy: Network-first for API, Cache-first for static assets

const CACHE_VERSION = 'v15';
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
// BACKGROUND SYNC — Invisible offline processing
// ─────────────────────────────────────────────────────────────
const DB_NAME = 'pos-offline';
const DB_VERSION = 5;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function syncSales() {
    console.log('[SW] Starting background sync process...');
    try {
        const db = await openDB();
        const tx = db.transaction('pendingSales', 'readwrite');
        const store = tx.objectStore('pendingSales');

        const sales = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!sales.length) {
            console.log('[SW] No pending sales to sync.');
            return;
        }

        for (const sale of sales) {
            // Skip if currently being handled by another process
            if (sale.status === 'syncing') continue;

            try {
                const response = await fetch('/api/invoices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sale.invoiceData)
                });

                if (response.ok) {
                    await new Promise((resolve, reject) => {
                        const deleteReq = store.delete(sale.id);
                        deleteReq.onsuccess = resolve;
                        deleteReq.onerror = reject;
                    });
                    console.log(`[SW] Successfully synced sale ${sale.id}`);
                } else {
                    console.warn(`[SW] Server rejected sale ${sale.id}: ${response.status}`);
                }
            } catch (err) {
                console.error(`[SW] Fetch failed for sale ${sale.id}:`, err);
            }
        }
    } catch (err) {
        console.error('[SW] Sync process error:', err);
    }
}

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-sales') {
        console.log('[SW] Background sync event triggered: sync-sales');
        event.waitUntil(syncSales());
    }
});

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
