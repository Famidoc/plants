const CACHE_NAME = 'nian-hua-re-cao-v65';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css?v=65',
  './css/gallery.css?v=65',
  './css/modal.css?v=65',
  './css/quiz.css?v=65',
  './js/app.js?v=65',
  './js/data.js?v=65',
  './js/sync.js?v=65',
  './js/gallery.js?v=65',
  './js/quiz.js?v=65'
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
  
  // ⚡ 關鍵修復：GAS API 請求必須直接走網路，絕不快取，避免 Service Worker 攔截 302 轉址引發手機端卡死
  if (event.request.url.includes('script.google.com') || event.request.url.includes('script.googleusercontent.com')) {
    event.respondWith(fetch(event.request, { redirect: 'follow' }));
    return;
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
