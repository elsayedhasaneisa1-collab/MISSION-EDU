const CACHE_VERSION = 'mission-edu-v3';
const STATIC_CACHE = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';
const DATA_CACHE = CACHE_VERSION + '-data';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/student/index.html',
  '/admin/index.html',
  '/auth/login.html',
  '/auth/register.html',
  '/student/lesson.html',
  '/student/exam.html',
  '/student/profile.html',
  '/student/player.html',
  '/db.js',
  '/manifest.json',
  '/logo.png'
];

const NETWORK_TIMEOUT = 4000;
const MAX_RUNTIME_ITEMS = 60;
const MAX_DATA_ITEMS = 120;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to cache:', url, err && err.message);
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE && key !== DATA_CACHE) {
            return caches.delete(key);
          }
          return null;
        })
      );
      await self.clients.claim();
      const clientList = await self.clients.matchAll({ type: 'window' });
      clientList.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
      });
    })()
  );
});

function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeout);

    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  const toDelete = keys.slice(0, keys.length - maxItems);
  await Promise.all(toDelete.map((key) => cache.delete(key)));
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
      trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS);
    }
    return response;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'offline', message: 'لا يوجد اتصال بالإنترنت' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      trimCache(cacheName, cacheName === DATA_CACHE ? MAX_DATA_ITEMS : MAX_RUNTIME_ITEMS);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/student/index.html');
      if (offlinePage) return offlinePage;
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response(
      JSON.stringify({ error: 'offline', message: 'لا يوجد اتصال بالإنترنت' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
        trimCache(cacheName, MAX_RUNTIME_ITEMS);
      }
      return response;
    })
    .catch(() => null);
  return cached || networkPromise || new Response('', { status: 503 });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(networkFirst(request, RUNTIME_CACHE));
      return;
    }
    if (
      url.pathname.endsWith('.html') ||
      url.pathname === '/' ||
      url.pathname === '/db.js' ||
      url.pathname === '/manifest.json'
    ) {
      event.respondWith(networkFirst(request, RUNTIME_CACHE));
      return;
    }
    if (
      url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)$/i)
    ) {
      event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
      return;
    }
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in')
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (
    url.hostname.includes('youtube') ||
    url.hostname.includes('youtu.be') ||
    url.hostname.includes('vimeo') ||
    url.hostname.includes('pixabay.com') ||
    url.hostname.includes('google-analytics') ||
    url.hostname.includes('facebook.net') ||
    url.hostname.includes('facebook.com')
  ) {
    return;
  }

  event.respondWith(cacheFirst(request));
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'MISSION EDU',
    body: 'لديك إشعار جديد',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/student/index.html',
    tag: 'default',
    requireInteraction: false,
    actions: []
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (err) {
      try {
        data.body = event.data.text();
      } catch (err2) {
        console.warn('[SW] Could not parse push data');
      }
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    image: data.image,
    dir: 'rtl',
    lang: 'ar',
    tag: data.tag || 'mission-edu-' + Date.now(),
    data: {
      url: data.url || '/student/index.html',
      timestamp: Date.now()
    },
    vibrate: [200, 100, 200],
    requireInteraction: !!data.requireInteraction,
    renotify: true,
    actions: data.actions || []
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title, options);
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientList.forEach((client) => {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          title: data.title,
          body: data.body,
          url: data.url
        });
      });
      if (data.badge_count !== undefined && 'setAppBadge' in navigator) {
        try {
          if (data.badge_count > 0) {
            await navigator.setAppBadge(data.badge_count);
          } else {
            await navigator.clearAppBadge();
          }
        } catch (e) {}
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    '/student/index.html';

  const action = event.action;

  event.waitUntil(
    (async () => {
      if (action === 'close') {
        return;
      }

      let finalUrl = targetUrl;
      if (action === 'open_home') finalUrl = '/student/index.html';
      else if (action === 'open_practice') finalUrl = '/student/index.html?tab=practice';
      else if (action === 'open_daily') finalUrl = '/student/index.html?tab=daily-challenge';

      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of clientList) {
        if (client.url.includes(new URL(finalUrl, self.location.origin).pathname)) {
          if ('focus' in client) {
            client.postMessage({ type: 'NAVIGATE', url: finalUrl });
            return client.focus();
          }
        }
      }

      for (const client of clientList) {
        if (client.url.includes('/student/') && 'navigate' in client) {
          await client.navigate(finalUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(finalUrl);
      }
    })()
  );
});

self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'NOTIFICATION_CLOSED', data });
    });
  });
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSubscription = await self.registration.pushManager.subscribe(
          event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true }
        );

        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : null,
            newSubscription: newSubscription.toJSON()
          });
        });

        await fetch('/api/push/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : null,
            newSubscription: newSubscription.toJSON()
          })
        }).catch(() => {});
      } catch (err) {
        console.warn('[SW] pushsubscriptionchange failed:', err);
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        if (event.source && event.source.postMessage) {
          event.source.postMessage({ type: 'CACHE_CLEARED' });
        }
      })()
    );
    return;
  }

  if (data.type === 'CACHE_URLS') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const urls = data.urls || [];
        const results = await Promise.allSettled(
          urls.map((url) => cache.add(url).catch((e) => ({ error: e.message, url })))
        );
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'URLS_CACHED',
            results: results.map((r) => ({
              status: r.status,
              value: r.status === 'fulfilled' ? r.value : r.reason
            }))
          });
        }
      })()
    );
    return;
  }

  if (data.type === 'CACHE_LESSON') {
    event.waitUntil(
      (async () => {
        const urls = data.urls || [];
        const cache = await caches.open(DATA_CACHE);
        const results = await Promise.allSettled(
          urls.map((url) =>
            fetch(url)
              .then((res) => {
                if (res && res.status === 200) {
                  return cache.put(url, res.clone());
                }
                return null;
              })
              .catch((e) => ({ error: e.message, url }))
          )
        );
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'LESSON_CACHED',
            lessonId: data.lessonId,
            results: results.map((r) => ({
              status: r.status,
              value: r.status === 'fulfilled' ? r.value : r.reason
            }))
          });
        }
      })()
    );
    return;
  }

  if (data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      (async () => {
        const staticCache = await caches.open(STATIC_CACHE);
        const runtimeCache = await caches.open(RUNTIME_CACHE);
        const dataCache = await caches.open(DATA_CACHE);
        const [s, r, d] = await Promise.all([
          staticCache.keys(),
          runtimeCache.keys(),
          dataCache.keys()
        ]);
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'CACHE_STATUS',
            static: s.length,
            runtime: r.length,
            data: d.length,
            version: CACHE_VERSION
          });
        }
      })()
    );
    return;
  }

  if (data.type === 'PING') {
    if (event.source && event.source.postMessage) {
      event.source.postMessage({
        type: 'PONG',
        version: CACHE_VERSION,
        timestamp: Date.now()
      });
    }
    return;
  }

  if (data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delayMs, url, tag } = data;
    event.waitUntil(
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs || 1000));
        await self.registration.showNotification(title || 'MISSION EDU', {
          body: body || '',
          icon: '/logo.png',
          badge: '/logo.png',
          dir: 'rtl',
          lang: 'ar',
          tag: tag || 'scheduled-' + Date.now(),
          data: { url: url || '/student/index.html' },
          vibrate: [200, 100, 200]
        });
      })()
    );
    return;
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientList.forEach((client) => {
    client.postMessage({ type: 'SYNC_PENDING_ACTIONS' });
  });
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-daily-challenge') {
    event.waitUntil(checkDailyChallenge());
  }
});

async function checkDailyChallenge() {
  try {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clientList.length > 0) {
      clientList[0].postMessage({ type: 'CHECK_DAILY_CHALLENGE' });
      return;
    }
    await self.registration.showNotification('🏆 التحدي اليومي', {
      body: 'لا تنسى تحدي اليوم — اكسب 100 XP!',
      icon: '/logo.png',
      badge: '/logo.png',
      dir: 'rtl',
      lang: 'ar',
      tag: 'daily-challenge-reminder',
      data: { url: '/student/index.html?tab=daily-challenge' },
      vibrate: [200, 100, 200]
    });
  } catch (e) {
    console.warn('[SW] daily challenge check failed:', e);
  }
}

self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.message || event);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled Promise Rejection:', event.reason);
});