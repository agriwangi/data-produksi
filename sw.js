/* Data Produksi v2 — service worker: cangkang aplikasi tersimpan untuk dibuka cepat/luring.
   Panggilan ke Apps Script (lintas asal), POST, dan data TIDAK pernah disimpan atau dicegat. */
'use strict';
const VERSI = 'v2';
const CACHE = 'dp-' + VERSI;
const INTI = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css', 'js/config.js', 'js/pwa.js', 'js/api.js', 'js/ui.js', 'js/charts.js',
  'js/pages/umum.js', 'js/pages/dashboard.js', 'js/pages/input.js', 'js/pages/impor.js', 'js/pages/rekap.js', 'js/pages/pucuk.js', 'js/pages/laporan.js',
  'js/pages/kendali.js', 'js/pages/master.js', 'js/pages/pengaturan.js', 'js/app.js',
  'img/logo.png', 'img/icon.png', 'img/leaf.png', 'img/wordmark.png', 'img/icon-192.png', 'img/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(INTI.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.indexOf('dp-') === 0 && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;     // Apps Script & POST lewat langsung
  if (u.pathname.indexOf('/vendor/') === 0) {                              // pustaka besar: cache dulu
    e.respondWith(caches.match(r).then((h) => h || fetch(r).then((n) => { if (n.ok) { const k = n.clone(); caches.open(CACHE).then((c) => c.put(r, k)); } return n; })));
    return;
  }
  e.respondWith(fetch(r).then((n) => {                                      // lainnya: jaringan dulu → selalu versi terbaru
    if (n.ok && n.type === 'basic') { const k = n.clone(); caches.open(CACHE).then((c) => c.put(r, k)); }
    return n;
  }).catch(() => caches.match(r).then((h) => h || (r.mode === 'navigate' ? caches.match('index.html') || caches.match('./') : Response.error()))));
});
