// Service worker Rentis — prudent: nu memorează date (Firestore, funcții, Storage), doar fișierele aplicației.
//  • navigare (pagini): rețeaua primește prioritate, cu pagină de rezervă din cache dacă nu e internet
//  • /assets/* (fișiere cu hash în nume, nu se schimbă): din cache, apoi rețea
// Schimbă VERSIUNE pentru a goli cache-ul vechi.
const VERSIUNE = 'rentis-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const chei = await caches.keys()
    await Promise.all(chei.filter(k => k !== VERSIUNE).map(k => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return            // Firebase, Google, FGO etc. nu trec prin cache
  if (url.pathname.startsWith('/.netlify/')) return           // funcțiile nu se memorează

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req)
        if (r.ok) (await caches.open(VERSIUNE)).put('/index.html', r.clone())
        return r
      } catch {
        const c = await caches.match('/index.html')
        return c || new Response('Fără conexiune la internet. Încearcă din nou când ești online.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      }
    })())
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith((async () => {
      const c = await caches.match(req)
      if (c) return c
      const r = await fetch(req)
      const tip = r.headers.get('content-type') || ''
      if (r.ok && !tip.includes('text/html')) (await caches.open(VERSIUNE)).put(req, r.clone())
      return r
    })())
  }
})
