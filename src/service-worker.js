const appVersion = '%appVersion%';
const cacheName = `%appName%/v${appVersion}-%timeStamp%`;

const primaryAppFiles = [
    '/',
    'bundle.css',
    'bundle.js',
    'runtime.js',
    'lib/unidecode.js',
    'lib/vendors.js',
].map(addVersionToPath);

const cacheableOrigins = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(cacheName);
            await cache.addAll(primaryAppFiles);
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            if (keys.length === 1 && keys[0] === cacheName) {
                return self.clients.claim();
            } else {
                return Promise.all(
                    keys.map((key) => {
                        if (key === cacheName) {
                            return;
                        }
                        return caches.delete(key);
                    })
                );
            }
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (isCacheable(event.request)) {
        event.respondWith(
            (async () => {
                const cachedResponse = await caches.match(event.request);
                return cachedResponse || fetchAndCache(event.request);
            })()
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

async function fetchAndCache(request) {
    const response = await fetch(request);
    if (response.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone());
    }
    return response;
}

function isCacheable(request) {
    const url = new URL(request.url);
    if (url.origin === location.origin) {
        return url.pathname === '/' || url.pathname.startsWith(`/v${appVersion}/`);
    } else {
        return cacheableOrigins.includes(url.origin);
    }
}

function addVersionToPath(path) {
    return path.startsWith('/') ? path : `/v${appVersion}/${path}`;
}
