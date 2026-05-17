self.addEventListener('install', () => {
  // Wait until the app asks this worker to take over, so an open Admin screen
  // can show an update prompt instead of swapping under the running bundle.
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') {
    return
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => fetch(event.request)),
  )
})

self.addEventListener('push', (event) => {
  let payload = {
    title: 'FullTank Garage',
    body: 'มีข้อมูลใหม่ในระบบ',
    url: '/',
  }

  if (event.data) {
    try {
      payload = {
        ...payload,
        ...event.data.json(),
      }
    } catch {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      badge: '/fulltank-favicon-32.png',
      icon: '/pwa-icons/fulltank-icon-192.png',
      data: {
        url: payload.url || '/',
      },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin)
    .href

  event.waitUntil(
    self.clients
      .matchAll({
        includeUncontrolled: true,
        type: 'window',
      })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }

        return self.clients.openWindow(targetUrl)
      }),
  )
})
