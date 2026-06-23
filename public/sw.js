const CACHE_NAME = 'messagerie-landaise-v1';

// Fichiers à mettre en cache immédiatement (Optionnel pour l'installation mais bien pour le offline)
const ASSETS_TO_CACHE = [
  '/',
  '/Logo.png',
  '/manifest.json'
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
    Promise.all([
      // Nettoyage des anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ])
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Ignorer complètement les requêtes de développement Next.js/HMR
  if (
    event.request.url.includes('/_next/') || 
    event.request.url.includes('webpack') ||
    event.request.url.includes('hot-update')
  ) {
    return;
  }

  // Ne JAMAIS intercepter les requêtes vers version.json
  if (event.request.url.includes('version.json')) {
    return;
  }

  // En développement local (localhost ou IP locale), on n'intercepte rien
  const isLocal = event.request.url.includes('localhost') || 
                  event.request.url.includes('127.0.0.1') ||
                  event.request.url.includes('192.168.') ||
                  event.request.url.includes('10.') ||
                  event.request.url.includes('172.');

  if (isLocal) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'reply' && event.reply) {
    // Si c'est une réponse directe depuis la notification
    const replyText = event.reply;
    
    // On envoie le message au client (l'application)
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].postMessage({
            type: 'REPLY_NOTIFICATION',
            text: replyText,
            groupId: event.notification.data ? event.notification.data.groupId : 'general'
          });
          return clientList[0].focus();
        }
      })
    );
  } else {
    // Clic normal sur la notification
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});
