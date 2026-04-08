// sw.js — Service Worker para Fichajes PWA
// Cambia CACHE_VERSION cuando actualices index.html para forzar recarga en todos los clientes
const CACHE_VERSION = 'fichajes-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap'
];

// ── Instalación: precachea todos los assets ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activación: elimina cachés antiguas ──────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first con fallback a red ────────────────────────────────────
// Estrategia: sirve desde caché si existe; si no, va a la red y cachea la respuesta.
// Para index.html usa network-first para detectar actualizaciones.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isIndexHtml = url.pathname.endsWith('index.html') || url.pathname.endsWith('/');

  if (isIndexHtml) {
    // Network-first para index.html: detecta nuevas versiones
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first para el resto (fuentes, iconos, manifest)
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          return response;
        }))
    );
  }
});
