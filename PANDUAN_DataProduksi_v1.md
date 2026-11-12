# PANDUAN PASANG — Data Produksi v1
PT Perkebunan Teh Patuahwattee · Metode 3 (Google Apps Script REST API + frontend Vercel) · 2026-11-08

Urutan: **A. Backend (Apps Script)** → **B. Frontend (isi config)** → **C. Git & GitHub (PowerShell)** → **D. Vercel** → **E. Pemakaian pertama & muat data awal** → **F. Memperbarui di kemudian hari**.

Berkas yang Anda terima:

| Berkas | Untuk |
| --- | --- |
| `Kode_v1.gs`, `Skema_v1.gs`, `Admin_v1.gs`, `Master_v1.gs`, `Produksi_v1.gs`, `Impor_v1.gs`, `Rekap_v1.gs`, `Narasi_v1.gs`, `Kesehatan_v1.gs`, `Seed_v1.gs`, `appsscript.json` | **UNTUK APPS SCRIPT** (backend). Bukan untuk GitHub/Vercel. |
| `DataProduksi_web_v1.zip` | **MANDIRI / VERCEL** (frontend). `index.html` ada di akar ZIP. |
| `seed_data_v1.json` | Data produksi hasil analisa 27 berkas Excel. **Jangan** masuk GitHub. Dimuat dari komputer Anda lewat menu aplikasi (langkah E). |
| `PANDUAN_DataProduksi_v1.md` | Panduan ini. |

> Nama berkas `.gs` boleh tetap ada akhiran `_v1`; yang dibaca Apps Script adalah isinya.

---

## A. Backend — Google Apps Script

1. Buka <https://script.google.com> dengan akun Google yang akan menjadi **pemilik** data → **Proyek baru** → ganti nama menjadi `Data Produksi API`.
2. **Setelan Proyek (ikon roda gigi)** → centang **Tampilkan berkas manifes "appsscript.json" di editor**.
3. Buka `appsscript.json` di editor → hapus isinya → tempel isi berkas `appsscript.json` yang Anda terima → simpan.
4. Untuk **setiap** berkas `.gs`: klik **+ → Skrip**, beri nama (mis. `Kode`, `Skema`, `Admin`, `Master`, `Produksi`, `Impor`, `Rekap`, `Narasi`, `Kesehatan`, `Seed`), tempel isi berkas yang sesuai. Berkas `Code.gs` bawaan dihapus atau dikosongkan. **Semua 10 berkas harus ada.**
5. Pilih fungsi **`setupAwal`** di menu fungsi → **Jalankan** → setujui izin Google (Spreadsheet, Drive, Email, layanan eksternal, pemicu). Jika muncul "Google belum memverifikasi aplikasi ini": **Lanjutan → Buka Data Produksi API (tidak aman)** — wajar untuk skrip milik sendiri.
6. Buka **Log eksekusi**. Anda akan melihat daftar yang dibuat dan baris **KATA SANDI AWAL** untuk akun `superadmin`. **Catat sekarang — hanya tampil sekali.** Aplikasi akan memaksa Anda menggantinya saat masuk pertama.
   - Setup aman diulang: tidak menimpa data, sandi, maupun rahasia yang sudah ada.
   - Rahasia internal (kunci token) dibuat otomatis dan tersimpan di **Script Properties**, bukan di kode.
7. **Deploy → Deployment baru → jenis: Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   - **Deploy** → salin **URL aplikasi web** (berakhiran `/exec`). Simpan; dipakai di langkah B.
8. (Opsional) Bila lupa sandi superadmin: jalankan fungsi `resetSandiSuperadmin` dari editor, lalu baca Log eksekusi.

> Setiap kali kode `.gs` diubah: **Deploy → Kelola deployment → ikon pensil → Versi baru → Deploy**. URL `/exec` tidak berubah.

---

## B. Frontend — isi alamat backend

1. Ekstrak `DataProduksi_web_v1.zip` ke folder, mis. `C:\Proyek\data-produksi`. Pastikan `index.html` **langsung** di folder itu (bukan di subfolder lagi).
2. Buka `js\config.js` dengan Notepad, ganti `GANTI_DENGAN_ID_DEPLOYMENT` hingga URL penuh sama dengan URL `/exec` dari langkah A.7:

```js
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
  VERSI: 'v1'
};
```
3. Simpan. Jangan mengisi apa pun selain URL ini.

---

## C. Git & GitHub (PowerShell)

> Repository GitHub dibuat **Public atau Private**, tetapi **tidak boleh berisi rahasia maupun `seed_data_v1.json`**.

Buka **PowerShell**, lalu satu per satu:

```powershell
git --version
```
Bila "tidak dikenali": pasang Git dari <https://git-scm.com/download/win>, tutup dan buka lagi PowerShell.

```powershell
git config --global user.name "Nama Anda"
git config --global user.email "email-anda@contoh.com"
```

Buat akun di <https://github.com> bila belum punya, lalu **New repository** bernama `data-produksi` (jangan centang README/ .gitignore). Lalu:

```powershell
cd C:\Proyek\data-produksi
dir
```
Pastikan terlihat `index.html`, `css`, `js`, `img`, `vendor`, `vercel.json`, `README.md`.

```powershell
git init
git add .
git commit -m "Data Produksi v1"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/data-produksi.git
git push -u origin main
```
Saat diminta kata sandi, pakai **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate, centang `repo`). Jangan membagikan token.

> Jangan unggah lewat tombol "Upload files" di web GitHub — struktur folder bisa rusak.

---

## D. Vercel

**Catatan paket (satu kali):** menurut dokumentasi Vercel, paket Hobby (gratis) dibatasi untuk penggunaan pribadi non-komersial; aplikasi perusahaan umumnya dianggap komersial dan memerlukan paket Pro. Baca <https://vercel.com/docs/limits/fair-use-guidelines> lalu pilih paket sesuai kebutuhan. Alternatif gratis: GitHub Pages.

1. <https://vercel.com> → **Sign Up → Continue with GitHub** → setujui akses ke repository `data-produksi`.
2. **Add New → Project → Import** repository `data-produksi`.
3. Isi persis: **Framework Preset: Other** · Root Directory `./` · Build Command **kosong** · Output Directory **kosong** · Install Command **kosong** · Environment Variables **kosong**.
4. **Deploy** → tunggu sampai muncul tautan `https://NAMA-ANDA.vercel.app`.
5. Buka tautan, tekan `Ctrl + Shift + R`, buka F12 → tab Console: tidak boleh ada galat merah.

`vercel.json` sudah memuat header keamanan dan CSP yang mengizinkan sambungan ke `script.google.com`. Bila Anda memakai domain kustom, tidak ada yang perlu diubah di CSP.

---

## E. Pemakaian pertama & muat data awal

1. Buka situs → **Masuk** dengan `superadmin` + sandi dari langkah A.6 → aplikasi meminta **ganti sandi** (min. 8 karakter, huruf + angka).
2. Menu **Unggah Excel → tab "Muat data awal"** → pilih `seed_data_v1.json` dari komputer Anda → **Muat**. Berisi 10.620 baris harian, 190 data kering, 88 ringkasan bulanan. Aman diulang (tidak menggandakan).
3. Periksa **Dashboard**, **Rekap**, dan **Kesehatan Data**. Catatan yang wajar muncul di Kesehatan Data tercantum di laporan penyelesaian.
4. **Pengaturan → Pengguna**: buat akun Admin, Assisten, Askep, Manager (kosongkan sandi = dibuatkan otomatis, tampil sekali). Isi "cakupan divisi" bila pengguna hanya boleh melihat satu divisi.
5. **Pengaturan → Persetujuan**: tentukan apakah periode wajib disetujui, siapa penyetuju, dan apakah otomatis terkunci setelah disetujui.
6. **Pengaturan → Tampilan & landing**: nama, warna, logo, sambutan.

---

## F. Memperbarui di kemudian hari

Frontend (setelah mengganti berkas di folder proyek):
```powershell
cd C:\Proyek\data-produksi
git add .
git commit -m "Deskripsi perubahan"
git push
```
Vercel otomatis deploy ulang (lihat tab **Deployments**). Mengembalikan versi lama: pilih deployment lama → titik tiga → **Promote to Production**.

Backend: ganti isi `.gs` → **Deploy → Kelola deployment → pensil → Versi baru**.

---

## Pemecahan masalah singkat

- **"Konfigurasi belum lengkap"** di aplikasi: `GAS_URL` di `js\config.js` masih placeholder.
- **Galat CORS / gagal tersambung**: akses deployment bukan **Siapa saja**, atau URL `/exec` salah/lama. Buat **Versi baru** setelah mengubah kode.
- **404 di semua halaman Vercel**: `index.html` tidak di akar repository (ada folder pembungkus).
- **CSS/JS 404**: huruf besar-kecil nama folder harus sama persis (`css`, `js`).
- **Sesi sering berakhir**: ubah "Umur sesi (jam)" di Pengaturan → Keamanan.
- **Kuota Apps Script**: pantau di Pengaturan → Sistem (kapasitas spreadsheet, performa API). Akun Google gratis memiliki batas harian pemanggilan dan email.

## Keamanan (ringkas)
Token HMAC + izin dibaca dari database tiap panggilan + whitelist aksi + audit; sandi disimpan hash+salt; rahasia hanya di Script Properties; frontend hanya memegang URL `/exec`; log dan audit diredaksi. Editor proyek Apps Script dapat melihat Script Properties — jangan menambah editor sembarangan.
