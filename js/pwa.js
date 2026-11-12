/* Data Produksi v2 — PWA: pendaftaran service worker + pemasangan aplikasi di layar utama HP/komputer. */
(function () {
  'use strict';
  const ua = navigator.userAgent || '';
  const st = { evt: null, terpasang: false };
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  st.terpasang = standalone();
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); st.evt = e; document.dispatchEvent(new CustomEvent('pwa-state')); });
  window.addEventListener('appinstalled', () => { st.evt = null; st.terpasang = true; document.dispatchEvent(new CustomEvent('pwa-state')); });
  const aman = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && aman) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW gagal didaftarkan', e && e.message)); });
  }
  window.PWA = {
    terpasang: () => st.terpasang || standalone(),
    bisaPasang: () => !!st.evt,
    ios: () => /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1),
    async pasang() {
      if (!st.evt) return 'tidak-tersedia';
      const e = st.evt; st.evt = null; e.prompt();
      let pil = null; try { pil = await e.userChoice; } catch (x) { /* abaikan */ }
      document.dispatchEvent(new CustomEvent('pwa-state'));
      return pil && pil.outcome === 'accepted' ? 'diterima' : 'ditolak';
    }
  };
})();
