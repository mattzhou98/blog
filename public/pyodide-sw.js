/* Service Worker: caches the Pyodide runtime + wheels in the Cache API so a
 * reader downloads the (~tens of MB) scientific stack AT MOST ONCE — every later
 * visit (any post, even offline) loads it from disk with zero network. It only
 * touches jsDelivr's /pyodide/ URLs; everything else falls through untouched.
 *
 * Bump CACHE when upgrading the Pyodide version so stale assets are evicted.
 */
const CACHE = 'pyodide-v0.28.0-r1';
const PYO = 'https://cdn.jsdelivr.net/pyodide/';

self.addEventListener('install', () => {
  // Activate immediately so caching starts on this load, not the next one.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop caches from older Pyodide versions.
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('pyodide-') && k !== CACHE).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(PYO)) return; // only Pyodide CDN assets

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;                       // cache-first: these URLs are versioned/immutable

    const resp = await fetch(req);
    // Cache only full, OK responses (skip 206 range / errors / opaque).
    try {
      if (resp && resp.status === 200 && resp.type !== 'opaque') {
        await cache.put(req, resp.clone());
      }
    } catch (e) { /* cache.put can throw on some responses — ignore */ }
    return resp;
  })());
});
