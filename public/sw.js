// __BUILD_VERSION__ is replaced with a unique value at build time (see
// vite.config.ts). A byte-different sw.js is what makes the browser install
// the new worker and fire `updatefound`, driving the in-app update toast.
const CACHE_NAME = 'workout-__BUILD_VERSION__';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./']))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// The page posts this when the user taps "Reload" on the update toast.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function cacheResponse(request, response) {
  // Only keep successful same-origin responses; a cached 404 or error page
  // would otherwise be served forever offline.
  if (response && response.ok && response.type === 'basic') {
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Vite emits content-hashed filenames under /assets/, so a cached copy can
  // never be stale: serve it instantly and skip the network. This is what
  // makes the app open quickly on weak gym Wi-Fi.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => cacheResponse(request, res))
      )
    );
    return;
  }

  // Everything else (the HTML shell, manifest, icons, sw.js) is network-first
  // so a new deploy is picked up, with the cache as the offline fallback.
  event.respondWith(
    fetch(request)
      .then((res) => cacheResponse(request, res))
      .catch(() => caches.match(request))
  );
});

// ---------------------------------------------------------------------------
// Rest-timer notifications. The page asks for one at a deadline; if the page
// is still alive at that moment it cancels this and shows its own, so the
// user never gets two. Timers here die with the worker, which is the best a
// PWA can do without a native scheduler.
// ---------------------------------------------------------------------------
const restTimers = new Map();

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SCHEDULE_REST_END') {
    const existing = restTimers.get(data.id);
    if (existing) clearTimeout(existing);
    const delay = Math.max(0, data.at - Date.now());
    restTimers.set(data.id, setTimeout(() => {
      restTimers.delete(data.id);
      self.registration.showNotification('Rest over', {
        body: 'Time for the next set.',
        tag: 'rest-timer',
        renotify: true,
        vibrate: [200, 100, 200],
      });
    }, delay));
  } else if (data.type === 'CANCEL_REST_END') {
    const existing = restTimers.get(data.id);
    if (existing) clearTimeout(existing);
    restTimers.delete(data.id);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => 'focus' in c);
      if (client) return client.focus();
      return self.clients.openWindow('./');
    })
  );
});
