/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

try {
  const handler = createHandlerBoundToURL('/index.html')
  const navigationRoute = new NavigationRoute(handler)
  registerRoute(navigationRoute)
} catch (error) {
  console.error('Error registering navigation route:', error)
}

// Cache Google Fonts stylesheets
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })]
  })
)

// Cache Google Fonts (webfonts)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }) // 1 year
    ]
  })
)

// Cache Supabase API requests (NetworkFirst with short cache)
registerRoute(
  ({ url }) => url.href.includes('supabase') || url.href.includes('rest'),
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 5 }) // 5 minutes
    ]
  })
)

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }) // 30 days
    ]
  })
)

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'تنبيه جديد — ORI ERP'
    const options = {
      body: data.body || 'لديك إشعار جديد في النظام',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-192x192.svg',
      data: data.data || {},
      vibrate: [200, 100, 200],
      actions: [{ action: 'open', title: 'عرض التفاصيل' }]
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (err) {
    console.error('Error handling push event:', err)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const urlToOpen = new URL('/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen)
    })
  )
})
