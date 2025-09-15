// Service Worker pour les notifications push et le cache
const CACHE_NAME = 'cvneat-v1';
const STATIC_CACHE = 'cvneat-static-v1';
const DYNAMIC_CACHE = 'cvneat-dynamic-v1';

// Fichiers à mettre en cache statique
const STATIC_FILES = [
  '/',
  '/offline',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installé');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Mise en cache des fichiers statiques');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Cache statique initialisé');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Erreur installation Service Worker:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activé');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('🗑️ Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Nettoyage des anciens caches terminé');
        return self.clients.claim();
      })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Stratégie de cache pour les images
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              
              return fetch(request)
                .then((fetchResponse) => {
                  // Mettre en cache seulement les images valides
                  if (fetchResponse.ok) {
                    cache.put(request, fetchResponse.clone());
                  }
                  return fetchResponse;
                })
                .catch(() => {
                  // Retourner une image de fallback si l'image ne charge pas
                  return new Response(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f3f4f6"/><text x="150" y="100" text-anchor="middle" fill="#9ca3af" font-family="Arial" font-size="14">Image non disponible</text></svg>',
                    { headers: { 'Content-Type': 'image/svg+xml' } }
                  );
                });
            });
        })
    );
    return;
  }

  // Stratégie Network First pour les API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache les réponses API valides
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Retourner une réponse en cache si le réseau échoue
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              return new Response(
                JSON.stringify({ error: 'Service indisponible' }),
                { 
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Stratégie Cache First pour les pages statiques
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then((fetchResponse) => {
            // Mettre en cache seulement les pages HTML valides
            if (fetchResponse.ok && fetchResponse.headers.get('content-type')?.includes('text/html')) {
              const responseClone = fetchResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return fetchResponse;
          })
          .catch(() => {
            // Retourner la page offline pour les pages HTML
            if (request.destination === 'document') {
              return caches.match('/offline');
            }
            throw new Error('Réseau indisponible');
          });
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('📱 Notification push reçue');
  
  if (!event.data) {
    console.warn('⚠️ Aucune donnée dans la notification push');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📊 Données notification:', data);
    
    const options = {
      body: data.message || data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data.data || data,
      tag: data.tag || 'cvneat-notification',
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: [200, 100, 200],
      actions: data.actions || [
        {
          action: 'feedback',
          title: 'Donner mon avis',
          icon: '/icon-192x192.png'
        },
        {
          action: 'view',
          title: 'Voir',
          icon: '/icon-192x192.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
    
    console.log('✅ Notification affichée');
  } catch (error) {
    console.error('❌ Erreur traitement notification push:', error);
    
    // Notification de fallback
    event.waitUntil(
      self.registration.showNotification('CVNeat', {
        body: 'Nouvelle notification',
        icon: '/icon-192x192.png',
        tag: 'cvneat-fallback'
      })
    );
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification cliquée:', event.action);
  
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Déterminer l'URL cible selon l'action
  if (event.action === 'feedback' && data.feedback_url) {
    targetUrl = data.feedback_url;
  } else if (event.action === 'view' && data.order_url) {
    targetUrl = data.order_url;
  } else if (event.action === 'complaint' && data.complaint_url) {
    targetUrl = data.complaint_url;
  } else if (data.order_id) {
    targetUrl = `/orders/${data.order_id}`;
  } else if (data.feedback_url) {
    targetUrl = data.feedback_url;
  } else if (data.order_url) {
    targetUrl = data.order_url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Chercher un client existant
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Ouvrir une nouvelle fenêtre si aucun client trouvé
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
      .catch((error) => {
        console.error('❌ Erreur ouverture fenêtre:', error);
      })
  );
});

// Gestion des actions de notification
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification fermée');
  
  // Analytics optionnel pour suivre les notifications fermées
  if (event.notification.data && event.notification.data.analytics) {
    // Envoyer un événement analytics si nécessaire
    console.log('📊 Notification fermée - Analytics:', event.notification.data.analytics);
  }
});

// Gestion des erreurs du Service Worker
self.addEventListener('error', (event) => {
  console.error('❌ Erreur Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rejetée non gérée:', event.reason);
});

// Messages du client vers le Service Worker
self.addEventListener('message', (event) => {
  console.log('💬 Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('🔧 Service Worker CVNeat chargé');