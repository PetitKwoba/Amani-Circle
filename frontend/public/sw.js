const CACHE_NAME = 'amani-circle-shell-v1';
const SHELL_ASSETS = ['./', './offline.html', './manifest.webmanifest'];
const STATIC_EXTENSIONS = ['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.webmanifest', '.html'];

function isStaticShellRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/public/')) {
    return false;
  }
  return STATIC_EXTENSIONS.some((extension) => url.pathname.endsWith(extension)) || url.pathname === '/' || url.pathname.endsWith('/index.html');
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./offline.html')));
    return;
  }

  if (isStaticShellRequest(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
