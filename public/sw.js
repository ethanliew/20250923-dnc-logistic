self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('e-leave-v1').then((cache) => cache.addAll([
            '/',
            '/offline'
        ]))
    );
});


self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request).then((res) => res || caches.match('/offline')))
    );
});