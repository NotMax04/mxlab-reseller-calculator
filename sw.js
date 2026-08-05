const CACHE_NAME = 'mxlab-reseller-hub-v3-2-2';
const ENHANCEMENT_SCRIPT = './listing-summary.js?v=1';
const APP_SHELL = [
  './', './styles.css', './app.js', './calculator.js', './inventory.js', './seed-data.js',
  './listing.js', './mxlab-ai.js', './media-store.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './listing-summary.js',
];

async function injectListingSummary(response) {
  if (!response?.ok) return response;
  const html = await response.text();
  const enhanced = html.includes('listing-summary.js')
    ? html
    : html.replace('</body>', `  <script type="module" src="${ENHANCEMENT_SCRIPT}"></script>\n  </body>`);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');
  headers.set('content-type', 'text/html; charset=UTF-8');
  return new Response(enhanced, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    const indexResponse = await fetch('./index.html', { cache: 'reload' });
    const enhancedIndex = await injectListingSummary(indexResponse);
    await cache.put('./index.html', enhancedIndex.clone());
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const request = event.request;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const enhanced = await injectListingSummary(response);
        if (enhanced?.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', enhanced.clone());
        }
        return enhanced;
      } catch {
        return caches.match('./index.html');
      }
    })());
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
