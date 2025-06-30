const CACHE_NAME = 'cvneat-v1';
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/api/restaurants',
  '/api/menus'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
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
            console.log('Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner la réponse du cache si elle existe
        if (response) {
          return response;
        }

        // Sinon, faire la requête réseau
        return fetch(event.request)
          .then((response) => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cloner la réponse
            const responseToCache = response.clone();

            // Mettre en cache la réponse
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // En cas d'erreur réseau, retourner la page offline
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification CVN\'Eat',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CVN\'Eat', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Synchroniser les données en arrière-plan
      syncData()
    );
  }
});

async function syncData() {
  try {
    // Synchroniser les commandes en attente
    const pendingOrders = await getPendingOrders();
    
    for (const order of pendingOrders) {
      await syncOrder(order);
    }
  } catch (error) {
    console.error('Erreur synchronisation:', error);
  }
}

async function getPendingOrders() {
  // Récupérer les commandes en attente depuis IndexedDB
  return [];
}

async function syncOrder(order) {
  // Synchroniser une commande avec le serveur
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify(order)
    });

    if (response.ok) {
      // Marquer la commande comme synchronisée
      await markOrderSynced(order.id);
    }
  } catch (error) {
    console.error('Erreur synchronisation commande:', error);
  }
}

async function getAuthToken() {
  // Récupérer le token d'authentification depuis IndexedDB
  return null;
}

async function markOrderSynced(orderId) {
  // Marquer une commande comme synchronisée dans IndexedDB
} 