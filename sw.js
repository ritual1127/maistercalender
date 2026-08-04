const CACHE = 'meister-cal-v8';
const ASSETS = ['./index.html', './app.js', './data.js', './manifest.json', './icon-192.png', './icon-512.png'];

// 리다이렉트를 거친 Response는 그대로 캐시하면 iOS Safari가 내비게이션에서 거부한다
// ("Response served by service worker has redirections"). body만 뽑아 깨끗한 Response로 다시 만든다.
async function cleanResponse(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async url => {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        await c.put(url, await cleanResponse(res.clone()));
      } catch (_) {}
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('neis-proxy') || e.request.url.includes('open.neis.go.kr')) return; // 학교 API는 항상 네트워크

  // 페이지 이동(주소창 진입, 새로고침)은 항상 네트워크 우선. 오프라인일 때만 캐시된 index로 대체.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(async res => {
      const clean = await cleanResponse(res.clone());
      caches.open(CACHE).then(c => c.put(e.request, clean));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow('./');
  }));
});
