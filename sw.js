// Bump this on every release so old caches get cleared
const CACHE = 'sourdough-v2.3.1';
const APP_FILES = ['./', './index.html', './manifest.json'];
// Nice to have offline, but a missing one must not stop the app from installing
const EXTRA_FILES = ['./icon.svg', './icon-192.png', './badge-96.png', './apple-touch-icon.png'];
const TAILWIND = 'https://cdn.tailwindcss.com';

// Cache the app shell (and Tailwind) on install so the app works offline
self.addEventListener('install', function(event) {
    event.waitUntil(caches.open(CACHE).then(function(cache) {
        const tailwind = fetch(TAILWIND, { mode: 'no-cors' })
            .then(function(res) { return cache.put(TAILWIND, res); })
            .catch(function() {});
        const extras = EXTRA_FILES.map(function(f) { return cache.add(f).catch(function() {}); });
        return Promise.all([cache.addAll(APP_FILES), tailwind].concat(extras));
    }));
    self.skipWaiting();
});

// Remove caches from older versions
self.addEventListener('activate', function(event) {
    event.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

// Tapping a bake reminder brings the app to the front (or opens it)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
        for (const client of list) { if ('focus' in client) return client.focus(); }
        return self.clients.openWindow('./');
    }));
});

// Stale-while-revalidate: answer from cache instantly, refresh it in the background
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    event.respondWith(caches.open(CACHE).then(function(cache) {
        return cache.match(event.request, { ignoreSearch: true }).then(function(cached) {
            const network = fetch(event.request).then(function(res) {
                if (res && (res.ok || res.type === 'opaque')) cache.put(event.request, res.clone());
                return res;
            }).catch(function() { return cached; });
            return cached || network;
        });
    }));
});
