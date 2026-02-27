// FiscalStack Service Worker
// Uses injectManifest strategy — Workbox injects __WB_MANIFEST at build time

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

const CACHE_VERSION = 'v14';
const FONT_CACHE = `fiscalstack-fonts-${CACHE_VERSION}`;

// ─────────────────────────────────────────────────────────────
// PRECACHE — Vite build chunks auto-injected here at build time
// ─────────────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─────────────────────────────────────────────────────────────
// ROUTING
// ─────────────────────────────────────────────────────────────

// 1. API — network only, return offline JSON on failure
registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    async ({ request }) => {
        try {
            return await fetch(request);
        } catch {
            return new Response(
                JSON.stringify({ error: 'offline', message: 'Offline mode active.' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }
);

// 2. Google Fonts — cache first
registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new CacheFirst({
        cacheName: FONT_CACHE,
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
    })
);

// 3. Navigation (page loads) — network first, fall back to precached /index.html
registerRoute(
    new NavigationRoute(
        new NetworkFirst({
            cacheName: 'navigation',
            plugins: [new CacheableResponsePlugin({ statuses: [200] })],
        })
    )
);

// ─────────────────────────────────────────────────────────────
// BACKGROUND SYNC — Sync pending sales when back online
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

async function getAuthToken() {
    try {
        const clients = await self.clients.matchAll({ type: 'window' });
        if (clients.length === 0) return null;

        return new Promise((resolve) => {
            const channel = new MessageChannel();
            const timeout = setTimeout(() => resolve(null), 2000);
            channel.port1.onmessage = (event) => {
                clearTimeout(timeout);
                resolve(event.data?.token ?? null);
            };
            clients[0].postMessage({ type: 'GET_AUTH_TOKEN' }, [channel.port2]);
        });
    } catch {
        return null;
    }
}

async function syncSales() {
    console.log('[SW] Starting background sync...');
    try {
        const token = await getAuthToken();
        if (!token) {
            console.warn('[SW] No auth token — skipping sync');
            return;
        }

        const db = await openDB();
        const tx = db.transaction('pendingSales', 'readwrite');
        const store = tx.objectStore('pendingSales');

        const sales = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!sales.length) {
            console.log('[SW] No pending sales.');
            return;
        }

        for (const sale of sales) {
            if (sale.status === 'syncing') continue;
            try {
                const response = await fetch('/api/invoices', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(sale.invoiceData),
                });

                if (response.ok) {
                    await new Promise((resolve, reject) => {
                        const req = store.delete(sale.id);
                        req.onsuccess = resolve;
                        req.onerror = reject;
                    });
                    console.log(`[SW] Synced sale ${sale.id}`);
                } else {
                    console.warn(`[SW] Server rejected sale ${sale.id}: ${response.status}`);
                }
            } catch (err) {
                console.error(`[SW] Failed sale ${sale.id}:`, err);
            }
        }
    } catch (err) {
        console.error('[SW] Sync error:', err);
    }
}

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-sales') {
        event.waitUntil(syncSales());
    }
});

// ─────────────────────────────────────────────────────────────
// LIFECYCLE
// ─────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (event.data?.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }
});

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());