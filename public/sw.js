// Service Worker for 100% Offline PWA & Telegram WebApp Support
const CACHE_NAME = 'academic-portal-v3'

const PRECACHE_ASSETS = [
  '/',
  '/schedule',
  '/courses',
  '/activities',
  '/reports',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/window.svg',
  'https://telegram.org/js/telegram-web-app.js',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching partial fallback:', err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Listen for messages from client to cache dynamic runtime chunks
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return Promise.all(
          event.data.urls.map((url) =>
            fetch(url)
              .then((res) => {
                if (res.ok) return cache.put(url, res)
              })
              .catch(() => {})
          )
        )
      })
    )
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip non-HTTP/HTTPS protocols
  if (!url.protocol.startsWith('http')) return

  // 1. Static Assets (Next.js JS/CSS chunks, fonts, images, icons): Cache-First
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/i) ||
    url.hostname === 'telegram.org'

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background if online
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone()
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
              }
            })
            .catch(() => {})
          return cachedResponse
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            }
            return networkResponse
          })
          .catch(async () => {
            // Offline fallback for any static match
            const fallback = await caches.match(event.request, { ignoreSearch: true })
            if (fallback) return fallback
            return new Response('', { status: 408, statusText: 'Offline Asset Unavailable' })
          })
      })
    )
    return
  }

  // 2. Navigation Requests (HTML Pages in Telegram WebApp or Browser): Network with Cache Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return networkResponse
        })
        .catch(async () => {
          // Offline navigation: match requested URL (ignoring Telegram query params)
          const cached = await caches.match(event.request, { ignoreSearch: true })
          if (cached) return cached
          // Root fallback if exact path not precached
          const rootFallback = await caches.match('/', { ignoreSearch: true })
          if (rootFallback) return rootFallback
          return new Response('Offline', { status: 503, statusText: 'Offline' })
        })
    )
    return
  }

  // 3. Data & API Requests: Network with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return networkResponse
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  )
})
