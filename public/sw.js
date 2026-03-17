const CACHE_NAME = 'smartos-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Cache básico para offline (opcional mas recomendado)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    // Não interceptar chamadas de API ou de terceiros (Stripe, Supabase, etc)
    if (url.pathname.includes('/api/') || url.origin !== self.location.origin) {
        return;
    }
    // Pass-through por enquanto, apenas para ativar o PWA
    event.respondWith(fetch(event.request));
});

// Push notification listener
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    event.waitUntil(
        self.registration.showNotification(data.titulo || 'SmartOS', {
            body: data.corpo || 'Nova notificação',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: { url: data.url || '/dashboard' },
            vibrate: [200, 100, 200]
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/dashboard';
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes(url) && 'focus' in client) return client.focus();
            }
            return clients.openWindow(url);
        })
    );
});
