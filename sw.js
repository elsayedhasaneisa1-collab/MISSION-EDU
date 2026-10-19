const CACHE_NAME = 'mission-edu-v2';
const PRECACHE = [
  '/',
  '/index.html',
  '/student/index.html',
  '/auth/login.html',
  '/auth/register.html',
  '/auth/banned.html',
  '/auth/forgot-password.html',
  '/404.html',
  '/db.js',
  '/manifest.json',
  '/logo.png'
];

const NETWORK_FIRST = [
  'supabase.co',
  'supabase.in',
  '/auth/'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;
  const isNetworkFirst = NETWORK_FIRST.some((p) => url.includes(p));

  if (isNetworkFirst) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone).catch(() => {}));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (req.headers.get('accept')?.includes('text/html')) {
            const notFound = await caches.match('/404.html');
            if (notFound) return notFound;
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then((c) => c.put(req, res.clone()).catch(() => {}));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone).catch(() => {}));
          return res;
        })
        .catch(async () => {
          if (req.headers.get('accept')?.includes('text/html')) {
            const notFound = await caches.match('/404.html');
            if (notFound) return notFound;
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'MISSION EDU', body: 'لديك إشعار جديد', icon: '/logo.png', url: '/student/index.html' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/logo.png',
      badge: '/logo.png',
      dir: 'rtl',
      lang: 'ar',
      tag: data.tag || 'mission-edu',
      data: { url: data.url || '/student/index.html' },
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/student/index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(target) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription?.options || { userVisibleOnly: true })
      .then((subscription) => {
        return fetch('/api/resubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        }).catch(() => {});
      }).catch(() => {})
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});