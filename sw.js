const CACHE_NAME = 'nian-hua-re-cao-v44';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css?v=44',
  './css/gallery.css?v=44',
  './css/modal.css?v=44',
  './css/quiz.css?v=44',
  './js/app.js?v=44',
  './js/data.js?v=44',
  './js/sync.js?v=44',
  './js/gallery.js?v=44',
  './js/quiz.js?v=44'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('刪除舊版本快取:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
