const CACHE = 'recovery-finance.ogzie.com-v1';
const OFFLINE = '/offline.html';
self.addEventListener('install', event => {
 event.waitUntil((async () => {
  const response = await fetch(OFFLINE, { cache: 'no-store', redirect: 'error' });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Offline fallback unavailable');
  const cache = await caches.open(CACHE); await cache.put(OFFLINE, response);
 })());
});
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
 const request = event.request;
 if (request.method !== 'GET' || request.mode !== 'navigate' || new URL(request.url).origin !== self.location.origin) return;
 event.respondWith((async () => {
  try { return await fetch(request, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) }); }
  catch {
   const fallback = await (await caches.open(CACHE)).match(OFFLINE);
   return fallback ? new Response(fallback.body, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }) : Response.error();
  }
 })());
});
