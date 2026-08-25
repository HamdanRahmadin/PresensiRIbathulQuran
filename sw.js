const CACHE_NAME = 'presensi-rq-v3';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './presensi.html',
  './santri.html',
  './rekap.html',
  './libur.html',
  './css/style.css',
  './js/config.js',
  './js/api.js',
  './js/auth.js',
  './js/utils.js',
  './js/dashboard.js',
  './js/presensi.js',
  './js/santri.js',
  './js/rekap.js',
  './js/libur.js',
  './manifest.json',
  './logo.jpg',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Install Event - Caching file statis
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching files...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Membersihkan cache lama
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Mengembalikan cache untuk aset statis, atau request network
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Jangan cache request ke Google Apps Script API (data dinamis)
  if (url.hostname.includes('script.google.com') || url.pathname.includes('macros')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Strategi Cache First, fall back to Network untuk file lokal
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then(networkResponse => {
        // Simpan asset baru yang di-fetch secara dinamis ke cache (jika method-nya GET)
        if (e.request.method === 'GET') {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback offline jika gagal
        const accept = e.request.headers.get('accept');
        if (accept && accept.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
