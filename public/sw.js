// Service Worker pour PWA
const CACHE_NAME = 'cma-cgm-data-v1'
const urlsToCache = [
  '/',
  '/manifest.json',
  '/cma-logo.png',
  '/cma-logo-white.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
]

// Installer le service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('Cache install failed:', error)
      })
  )
  self.skipWaiting()
})

// Activer le service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    })
  )
  return self.clients.claim()
})

// Intercepter les requêtes réseau
self.addEventListener('fetch', (event) => {
  // Stratégie: Network First, puis Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache les réponses valides
        if (response && response.status === 200) {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      })
      .catch(() => {
        // En cas d'erreur réseau, retourner depuis le cache
        return caches.match(event.request)
      })
  )
})

