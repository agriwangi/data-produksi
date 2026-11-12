# PANDUAN — Data Produksi v2: Pasang di HP (PWA)
PT Perkebunan Teh Patuahwattee · 2026-11-12

**Yang baru:** aplikasi bisa dipasang di layar utama HP (Android dan iPhone) dan komputer, tampil layar penuh tanpa kolom alamat peramban, ikon AGRIWANGI, dan cangkang aplikasi tersimpan sehingga terbuka cepat.

**Yang tidak berubah:** backend Apps Script (tidak perlu deploy ulang), data, akun, dan tampilan lainnya.

**Batas yang jujur:** saat HP tidak ada sinyal, aplikasi tetap terbuka tetapi data baru tidak bisa dimuat atau disimpan. Mode input luring belum ada.

| Berkas | Keterangan |
| --- | --- |
| `DataProduksi_update_v2.zip` | **MANDIRI / VERCEL.** Berkas pembaruan v2. **Tidak berisi** `js/config.js`, jadi URL `/exec` Anda aman. |
| `DataProduksi_web_v2.zip` | **MANDIRI / VERCEL.** Paket penuh v2 (untuk pasang baru; `js/config.js` masih placeholder). |
| Berkas `.gs` | Tidak ada pembaruan. Backend tetap v1. |

---

## A. Terapkan pembaruan (PowerShell)

Folder repo Anda: `D:\0.0.73 aplikasi web\0.0.73.50 Data Produksi\DataProduksi_web_v1` (nama folder boleh tetap).

1. Ekstrak `DataProduksi_update_v2.zip` **ke dalam folder repo itu** dan pilih **Replace / timpa** bila ditanya. Pastikan `manifest.webmanifest` dan `sw.js` berada langsung di folder repo (sejajar `index.html`), bukan di subfolder.
2. Buka PowerShell, lalu satu per satu:

```powershell
cd "D:\0.0.73 aplikasi web\0.0.73.50 Data Produksi\DataProduksi_web_v1"
dir
```
Harus terlihat `manifest.webmanifest` dan `sw.js`.

```powershell
Select-String -Path js\config.js -Pattern "GAS_URL"
```
Harus masih URL `/exec` Anda sendiri (bukan `GANTI_DENGAN_ID_DEPLOYMENT`). Bila terlanjur tertimpa placeholder, isi ulang di `js\config.js` dengan Notepad.

```powershell
git status
git add .
git commit -m "Data Produksi v2 - pasang di HP (PWA)"
git push
```

3. Vercel otomatis deploy ulang (lihat tab **Deployments**, tunggu **Ready**).

---

## B. Pasang di HP

Buka alamat Vercel Anda di HP (harus `https://`).

**Android (Chrome)**
1. Masuk ke aplikasi, buka menu **Profil & Bantuan**. Kartu **Pasang di HP** punya tombol **Pasang aplikasi** (muncul bila Chrome mengizinkan). Ketuk, lalu **Pasang**.
2. Cara lain: menu **⋮** di kanan atas Chrome → **Pasang aplikasi** (atau **Tambahkan ke layar utama**).
3. Ikon "Data Produksi" muncul di layar utama. Tekan lama ikon untuk pintasan **Input Harian** dan **Dashboard**.

**iPhone / iPad (Safari — wajib Safari)**
1. Ketuk tombol **Bagikan** (kotak dengan panah ke atas).
2. Pilih **Tambah ke Layar Utama** → **Tambah**.

**Komputer (Chrome/Edge):** ikon pasang muncul di kolom alamat; atau menu ⋮ → **Pasang Data Produksi**.

Setelah terpasang, aplikasi membuka halaman terakhir yang dipakai dan sesi login tetap berlaku sampai habis atau Anda Keluar.

---

## C. Pemecahan masalah

- **Tombol Pasang tidak muncul / menu Pasang tidak ada:** pastikan alamatnya `https://`, muat ulang satu kali (`Ctrl + Shift + R` di komputer), tunggu beberapa detik, coba lagi. Bila aplikasi sudah terpasang, kartu menampilkan "Sudah terpasang".
- **Tampilan lama masih muncul setelah pembaruan:** tutup aplikasi sepenuhnya lalu buka lagi (dua kali). Aplikasi selalu mengambil versi terbaru dari jaringan lebih dulu.
- **Ingin menghapus:** tekan lama ikon → **Hapus/Copot**; di iPhone: tekan lama → **Hapus Aplikasi**.
- **Layar putih setelah dipasang:** periksa `js\config.js` masih berisi URL `/exec` yang benar.
- **Mengembalikan ke v1:** di Vercel → Deployments → pilih deployment sebelumnya → **Promote to Production**.

## Catatan teknis (ringkas)
`sw.js` hanya menyimpan berkas aplikasi (HTML/CSS/JS/gambar). Panggilan ke Apps Script, data produksi, dan token tidak pernah disimpan atau dicegat. Jaringan selalu didahulukan, jadi pembaruan langsung terlihat. Header `sw.js` di `vercel.json` dibuat tanpa cache agar pembaruan tidak tertahan.
