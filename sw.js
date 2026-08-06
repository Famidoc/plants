const CACHE_NAME = 'nian-hua-re-cao-v9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css?v=9',
  './css/gallery.css?v=9',
  './css/modal.css?v=9',
  './css/quiz.css?v=9',
  './js/app.js?v=9',
  './js/data.js?v=9',
  './js/sync.js?v=9',
  './js/gallery.js?v=9',
  './js/quiz.js?v=9'
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
            console.log('刪除舊版本 快取:', key);
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
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
