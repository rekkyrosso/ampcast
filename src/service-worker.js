const appName = '%appName%';
const appVersion = '%appVersion%';
const cacheName = `${appName}/v${appVersion}`;

const primaryAppFiles = [
    '/',
    'bundle.js',
    'bundle.css',
    'runtime.js',
    'lib/butterchurn.js',
    'lib/unidecode.js',
    'lib/vendors.js',
];

const secondaryAppFiles = [
    'lib/463.js',
    'lib/ampshader-presets.js',
    'lib/butterchurn-presets.js',
    'lib/butterchurn-presets-extra.js',
    'lib/hls.js',
    'lib/music-metadata-browser.js',
    'lib/shaka-player.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(cacheName);
            await cache.addAll(primaryAppFiles.map(addVersionToPath));
            await cache.addAll(secondaryAppFiles.map(addVersionToPath));
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key === cacheName) {
                        return;
                    }
                    return caches.delete(key);
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.origin === location.origin) {
        event.respondWith(
            (async () => {
                const cachedResponse = await caches.match(event.request);
                return cachedResponse || fetch(event.request);
            })()
        );
    }
});

function addVersionToPath(path) {
    return path.startsWith('/') ? path : `/v${appVersion}/${path}`;
}
