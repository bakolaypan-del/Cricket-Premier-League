// Service Worker for Cricket Premier League (CPL 2026 / JSL)
const CACHE_NAME = 'cpl-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles_v9.css?v=13.0.0',
  './assets/jsl_logo_white.jpg'
];

const ctx = typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : {});

if (typeof ctx.addEventListener === 'function') {
  ctx.addEventListener('install', (event) => {
    if (ctx.skipWaiting) ctx.skipWaiting();
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
      })
    );
  });

  ctx.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        );
      }).then(() => ctx.clients ? ctx.clients.claim() : null)
    );
  });

  // Push Event Notification Handler
  ctx.addEventListener('push', (event) => {
    let data = { title: '🏏 Cricket Match Alert', body: 'New match update in Cricket Premier League!', url: './' };
    if (event.data) {
      try {
        data = event.data.json();
      } catch (e) {
        data.body = event.data.text();
      }
    }

    const options = {
      body: data.body,
      icon: data.icon || 'assets/jsl_logo_white.jpg',
      badge: 'assets/jsl_logo_white.jpg',
      vibrate: [200, 100, 200],
      data: { url: data.url || './' },
      actions: [
        { action: 'open', title: '📊 View Match Centre' }
      ]
    };

    if (ctx.registration) {
      event.waitUntil(
        ctx.registration.showNotification(data.title, options)
      );
    }
  });

  // Notification Click Handler: Focus or Open Window
  ctx.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || './';

    if (ctx.clients) {
      event.waitUntil(
        ctx.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(ctx.registration?.scope || '') && 'focus' in client) {
              client.navigate(targetUrl);
              return client.focus();
            }
          }
          if (ctx.clients.openWindow) {
            return ctx.clients.openWindow(targetUrl);
          }
        })
      );
    }
  });
}
