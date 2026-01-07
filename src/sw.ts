/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// Precache assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Cleanup old caches
cleanupOutdatedCaches();

// Don't auto-skip waiting - wait for user to confirm update
// This prevents mixed bundle issues that cause React error #310
// self.skipWaiting();

// Listen for message to skip waiting (triggered by PWAUpdatePrompt)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Once activated, claim clients
self.addEventListener('activate', () => {
  clientsClaim();
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'Neura Financeira',
    body: 'Você tem uma nova notificação',
    icon: '/pwa/icon-192x192.png',
    badge: '/pwa/badge-icon.png',
    tag: 'neura-notification',
    url: '/',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
      console.log('[SW] Push payload:', payload);
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      // Try as text
      try {
        data.body = event.data.text();
      } catch (e2) {
        console.error('[SW] Error reading push text:', e2);
      }
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa/icon-192x192.png',
    badge: data.badge || '/pwa/icon-72x72.png',
    tag: data.tag || 'neura-notification',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: (data as any).requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // If no window open, open a new one
      return self.clients.openWindow(url);
    })
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

console.log('[SW] Custom service worker loaded with push support');
