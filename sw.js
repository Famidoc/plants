const CACHE_NAME = 'nian-hua-re-cao-v100';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css?v=100',
  './css/gallery.css?v=100',
  './css/compare.css?v=100',
  './css/modal.css?v=100',
  './css/quiz.css?v=100',
  './js/app.js?v=100',
  './js/data.js?v=100',
  './js/sync.js?v=100',
  './js/compare.js?v=100',
  './js/gallery.js?v=100',
  './js/quiz.js?v=100'
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
  
  // ⚡ GAS API 請求完全不經過 SW，讓瀏覽器原生處理跨域 302 轉址，避免 SW 上下文中 CORS 失敗
  if (event.request.url.includes('script.google.com') || event.request.url.includes('script.googleusercontent.com')) {
    return; // 不呼叫 event.respondWith，完全繞過 SW
  }
  
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
