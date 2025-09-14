// Service Worker pour les notifications push
const CACHE_NAME = 'cvneat-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('Notification push reçue:', event);

  const options = {
    body: 'Vous avez une nouvelle notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir la commande',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icon-192x192.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }

  event.waitUntil(
    self.registration.showNotification('CVNeat', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Notification cliquée:', event);

  event.notification.close();

  if (event.action === 'explore') {
    // Ouvrir l'application
    event.waitUntil(
      clients.openWindow('/profile')
    );
  } else if (event.action === 'close') {
    // Fermer la notification
    event.notification.close();
  } else {
    // Clic sur la notification (pas sur une action)
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Gestion des requêtes réseau
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner la réponse du cache si disponible
        if (response) {
          return response;
        }
        
        // Sinon, faire la requête réseau
        return fetch(event.request);
      }
    )
  );
});
