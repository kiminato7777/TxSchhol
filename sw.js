// Self-cleaning service worker for localhost
// Bypasses network interception and unregisters itself and stale caches
self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
            .then(() => self.registration.unregister())
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(err => {
            console.warn('Network fetch error in sw.js:', err);
            return fetch(event.request);
        })
    );
});
