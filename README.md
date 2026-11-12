# Data Produksi v2 — Frontend (PT Perkebunan Teh Patuahwattee)

Frontend statis (HTML/CSS/JS, tanpa build). Backend: Google Apps Script (`/exec`).

1. Isi `js/config.js` → `GAS_URL` dengan URL Web App Apps Script (berakhiran `/exec`). Itu satu-satunya nilai konfigurasi; bukan rahasia.
2. Deploy ke Vercel lewat GitHub (lihat `PANDUAN_DataProduksi_v2.md`).
3. Tidak ada data produksi atau rahasia di repository ini. Data awal dimuat dari file lokal lewat menu **Unggah Excel → Muat data awal**.

Baru di v2: aplikasi bisa dipasang di HP (PWA) — `manifest.webmanifest`, `sw.js`, `js/pwa.js`, ikon di `img/`. Backend Apps Script tidak berubah dari v1.

Versi: v2 (2026-11-12)
