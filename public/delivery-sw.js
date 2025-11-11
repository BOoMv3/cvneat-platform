'use strict';

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.warn('Impossible de parser la payload push:', error);
  }

  const title = data.title || 'Nouvelle commande disponible';
  const notificationData = data.data || {};
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: notificationData,
    tag: data.tag || (notificationData.orderId ? `delivery-${notificationData.orderId}` : 'delivery-notification'),
    renotify: false,
    vibrate: [160, 120, 160],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/delivery/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }

      return Promise.resolve();
    })
  );
});

self.addEventListener('notificationclose', () => {
  // placeholder in case we want to log closure later
});

