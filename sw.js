/* RideOS Service Worker — kompatibel Safari iOS 15 */
const CACHE = 'rideos-v0.1.0';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './css/rideos.css',
  './js/app.js',
  './js/storage.js',
  './js/orientation.js',
  './js/gps.js',
  './js/trip.js',
  './js/navigation.js',
  './js/media.js',
  './js/settings.js'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // addAll akan gagal jika ada satu file hilang; pakai satu-satu agar toleran.
      return Promise.all(CORE.map(function (url) {
        return cache.add(url).catch(function () { /* toleran */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  // Hanya tangani same-origin.
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        // Cache aset inti yang berhasil diambil.
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // Fallback offline: untuk navigasi, sajikan index.html.
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        // Fallback lain: tidak ada.
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
