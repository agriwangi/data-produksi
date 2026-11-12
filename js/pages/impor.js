/* Data Produksi v1 — Unggah Excel: wizard (berkas → pemetaan → pratinjau → terapkan), riwayat + rollback, profil pemetaan, muat data awal (JSON). */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;

  // ---------- Definisi jenis data & kolom ----------
  // f: kunci paket; w: wajib; al: alias judul kolom (dinormalkan huruf kecil tanpa simbol)
  const JENIS = {
    harian: { nama: 'Produksi harian', paket: 'harian', f: [
      { k: 't', n: 'Tanggal', w: 1, al: ['tanggal', 'tgl', 'date', 'hari'] },
      { k: 's', n: 'Sub-wilayah', w: 1, al: ['sub', 'subwilayah', 'afdeling', 'afd', 'wilayah', 'divisisub', 'kebun'] },
      { k: 'b', n: 'Blok', w: 1, al: ['blok', 'block', 'kodeblok', 'unit'] },
      { k: 'ha', n: 'Ha dipetik', al: ['ha', 'hadipetik', 'luaspetik', 'luas', 'hektar'] },
      { k: 'hk', n: 'HK', al: ['hk', 'harikerja', 'jumlahhk', 'tenagakerja'] },
      { k: 'kg', n: 'Kg daun basah', al: ['kg', 'gl', 'kgdaun', 'daunbasah', 'berat', 'glkg', 'hasil', 'pucuk'] }] },
    kering: { nama: 'Teh kering bulanan', paket: 'kering', f: [
      { k: 'p', n: 'Periode (bulan)', w: 1, al: ['periode', 'bulan', 'period', 'bln', 'tanggal'] },
      { k: 's', n: 'Sub-wilayah / GT', w: 1, al: ['sub', 'subwilayah', 'afdeling', 'afd', 'wilayah', 'divisisub', 'kebun'] },
      { k: 'hk', n: 'HK', al: ['hk', 'harikerja', 'jumlahhk'] },
      { k: 'basah', n: 'Daun basah (Kg)', w: 1, al: ['basah', 'daunbasah', 'gl', 'timbanganbasah', 'kgbasah'] },
      { k: 'kering', n: 'Teh kering (Kg)', w: 1, al: ['kering', 'mt', 'tehkering', 'kgkering', 'produksikering'] },
      { k: 'cat', n: 'Catatan', al: ['catatan', 'ket', 'keterangan'] }] },
    timbangan: { nama: 'Timbangan pabrik harian', paket: 'timbangan', f: [
      { k: 't', n: 'Tanggal', w: 1, al: ['tanggal', 'tgl', 'date', 'hari'] },
      { k: 's', n: 'Sub-wilayah / GT', w: 1, al: ['sub', 'subwilayah', 'afdeling', 'afd', 'wilayah', 'kebun'] },
      { k: 'basah', n: 'Daun basah timbangan (Kg)', w: 1, al: ['basah', 'daunbasah', 'gl', 'timbangan', 'kgbasah', 'berat', 'kg'] }] },
    bulanan: { nama: 'Produksi bulanan per blok (ringkas)', paket: 'bulanan', f: [
      { k: 'p', n: 'Periode (bulan)', w: 1, al: ['periode', 'bulan', 'period', 'bln', 'tanggal'] },
      { k: 'b', n: 'Blok', w: 1, al: ['blok', 'block', 'kodeblok', 'unit'] },
      { k: 'gl', n: 'GL (Kg)', al: ['gl', 'kg', 'daunbasah', 'basah'] },
      { k: 'mt', n: 'MT (Kg)', al: ['mt', 'kering', 'tehkering'] }] }
  };
  const URUT = ['harian', 'kering', 'timbangan', 'bulanan'];
  const norm = (s) => String(s === null || s === undefined ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const MAKS_BARIS = 80000;

  // ---------- Penguraian nilai ----------
  const p2 = (n) => (n < 10 ? '0' : '') + n;
  const BLN = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, agt: 8, agus: 8, agustus: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12 };
  function serialKeTanggal(n) { const d = new Date(Math.round((n - 25569) * 86400000)); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
  function tgl(v) { // → 'YYYY-MM-DD' atau null
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) return v.getFullYear() + '-' + p2(v.getMonth() + 1) + '-' + p2(v.getDate());
    if (typeof v === 'number') return v > 20000 && v < 80000 ? serialKeTanggal(v) : null;
    const s = String(v).trim(); let m;
    if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s))) return m[1] + '-' + p2(+m[2]) + '-' + p2(+m[3]);
    if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s))) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return y + '-' + p2(+m[2]) + '-' + p2(+m[1]); }
    if ((m = /^(\d{1,2})[\s-]+([A-Za-z]+)[\s-]+(\d{2,4})$/.exec(s)) && BLN[m[2].toLowerCase()]) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return y + '-' + p2(BLN[m[2].toLowerCase()]) + '-' + p2(+m[1]); }
    return null;
  }
  function per(v) { // → 'YYYY-MM' atau null
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'string') {
      const s = v.trim(); let m;
      if ((m = /^(\d{4})[-/.](\d{1,2})$/.exec(s))) return m[1] + '-' + p2(+m[2]);
      if ((m = /^(\d{1,2})[-/.](\d{4})$/.exec(s))) return m[2] + '-' + p2(+m[1]);
      if ((m = /^([A-Za-z]+)[\s-]+(\d{2,4})$/.exec(s)) && BLN[m[1].toLowerCase()]) { const y = +m[2] < 100 ? 2000 + +m[2] : +m[2]; return y + '-' + p2(BLN[m[1].toLowerCase()]); }
    }
    const t = tgl(v); return t ? t.slice(0, 7) : null;
  }
  function angka(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).trim().replace(/\s/g, ''); if (!s || s === '-') return null;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') >= 0 && s.indexOf('.') < 0) s = s.replace(',', '.');
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    const n = Number(s); return isFinite(n) ? n : null;
  }
  const teks = (v) => (v === null || v === undefined ? '' : String(v).trim());

  // ---------- Berkas & SHA-256 ----------
  async function sha256(buf) {
    if (!(window.crypto && crypto.subtle)) return '';
    const h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h)).map((b) => (b < 16 ? '0' : '') + b.toString(16)).join('');
  }
  async function bacaBerkas(file) {
    const buf = await file.arrayBuffer(), sha = await sha256(buf);
    await UI.muatXLSX();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true });
    const lembar = wb.SheetNames.map((nm) => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, raw: true, defval: null, blankrows: false });
      return { nama: nm, rows: rows.slice(0, MAKS_BARIS), total: rows.length };
    }).filter((l) => l.rows.length);
    return { nama: file.name, sha: sha, lembar: lembar };
  }

  // ---------- Deteksi jenis + baris judul ----------
  function tebak(rows) {
    let terbaik = { skor: 0, jenis: 'harian', hdr: 0, peta: {} };
    const lim = Math.min(rows.length, 15);
    for (let r = 0; r < lim; r++) {
      const kol = (rows[r] || []).map(norm);
      if (kol.filter(Boolean).length < 2) continue;
      URUT.forEach((j) => {
        const peta = {}; let skor = 0, wajib = 0;
        JENIS[j].f.forEach((f) => {
          const i = kol.findIndex((c, ix) => c && f.al.indexOf(c) >= 0 && Object.keys(peta).every((k) => peta[k] !== ix));
          if (i >= 0) { peta[f.k] = i; skor += f.w ? 3 : 1; if (f.w) wajib++; }
        });
        const butuh = JENIS[j].f.filter((f) => f.w).length;
        if (wajib === butuh) skor += 5;
        if (skor > terbaik.skor) terbaik = { skor: skor, jenis: j, hdr: r, peta: peta, wajibLengkap: wajib === butuh };
      });
    }
    return terbaik;
  }
  const sidik = (rows, hdr) => (rows[hdr] || []).map(norm).filter(Boolean).join('|'); // tanda tangan format untuk profil

  // ---------- Bentuk paket dari lembar + pemetaan ----------
  function bangunPaket(L, st) {
    const J = JENIS[st.jenis], out = [], masalah = [];
    const ambil = (r, k) => { const i = st.peta[k]; return i === undefined || i === null || i === '' ? undefined : r[Number(i)]; };
    for (let i = st.hdr + 1; i < L.rows.length; i++) {
      const r = L.rows[i] || [];
      if (!r.some((x) => x !== null && x !== '')) continue;
      const no = i + 1; let baris = null;
      if (st.jenis === 'harian') {
        const t = tgl(ambil(r, 't')), s = teks(ambil(r, 's')), b = teks(ambil(r, 'b'));
        if (!t || !s || !b) { masalah.push({ no, alasan: 'tanggal/sub/blok tidak terbaca' }); continue; }
        baris = [t, s, b, angka(ambil(r, 'ha')), angka(ambil(r, 'hk')), angka(ambil(r, 'kg'))];
      } else if (st.jenis === 'kering') {
        const p = per(ambil(r, 'p')), s = teks(ambil(r, 's')), ba = angka(ambil(r, 'basah')), ke = angka(ambil(r, 'kering'));
        if (!p || !s || ba === null || ke === null) { masalah.push({ no, alasan: 'periode/sub/basah/kering tidak terbaca' }); continue; }
        baris = [p, s, angka(ambil(r, 'hk')), ba, ke, teks(ambil(r, 'cat'))];
      } else if (st.jenis === 'timbangan') {
        const t = tgl(ambil(r, 't')), s = teks(ambil(r, 's')), ba = angka(ambil(r, 'basah'));
        if (!t || !s || ba === null) { masalah.push({ no, alasan: 'tanggal/sub/basah tidak terbaca' }); continue; }
        baris = [t, s, ba];
      } else {
        const p = per(ambil(r, 'p')), b = teks(ambil(r, 'b'));
        if (!p || !b) { masalah.push({ no, alasan: 'periode/blok tidak terbaca' }); continue; }
        baris = [p, b, angka(ambil(r, 'gl')), angka(ambil(r, 'mt'))];
      }
      out.push(baris);
    }
    const paket = { harian: [], kering: [], timbangan: [], bulanan: [] }; paket[J.paket] = out;
    return { paket: paket, n: out.length, masalah: masalah };
  }

  // ---------- Pengiriman berbatch ke backend ----------
  const gabung = (a, b) => { URUT.forEach((j) => { a[j] = (a[j] || []).concat(b[j] || []); }); return a; };
  const jumlah = (p) => URUT.reduce((n, j) => n + ((p[j] || []).length), 0);
  async function kirimPaket(o, prog) {
    // o: {nama, sha, jenis, profil, paket}
    prog = prog || (() => {});
    let m = await API.call('impor.mulai', { nama: o.nama, sha256: o.sha || '', jenis: o.jenis || 'campuran', profil: o.profil || '' });
    if (m.duplikat && !o.paksa) {
      const d = m.duplikat;
      const lanjut = await UI.konfirmasi('Berkas dengan isi yang sama sudah diterapkan ' + (d.waktu ? 'pada ' + String(d.waktu).slice(0, 16).replace('T', ' ') : '') + (d.user ? ' oleh ' + d.user : '') + '. Tetap unggah ulang?', { judul: 'Berkas ini pernah diterapkan', ya: 'Tetap unggah', html: '<div class="hint" style="margin-top:8px">Mode "Tambah baru" tidak menimpa data yang sudah ada, jadi mengunggah ulang aman.</div>' });
      if (!lanjut) return null;
      m = await API.call('impor.mulai', { nama: o.nama, sha256: o.sha || '', jenis: o.jenis || 'campuran', profil: o.profil || '', paksa: true });
    }
    const batas = Math.max(50, Math.min(600, m.batas_per_kirim || 600));
    const id = m.id; let no = 0, terkirim = 0; const total = jumlah(o.paket);
    for (let k = 0; k < URUT.length; k++) {
      const j = URUT[k], arr = o.paket[j] || []; let i = 0;
      while (i < arr.length) {
        let n = Math.min(batas, arr.length - i), potong = arr.slice(i, i + n);
        while (potong.length > 20 && JSON.stringify(potong).length > 40000) { n = Math.floor(n * 0.7); potong = arr.slice(i, i + n); }
        const d = { id: id, no: ++no }; d[j] = potong;
        await API.call('impor.kirim', d);
        i += potong.length; terkirim += potong.length; prog(terkirim, total);
      }
    }
    return id;
  }

  // ---------- Tampilan umum ----------
  const jenisTeks = (p) => URUT.filter((j) => (p[j] || []).length).map((j) => JENIS[j].nama + ' (' + fmt.n((p[j] || []).length) + ')').join(', ');
  function tabelRingkas(P) {
    const r = [];
    URUT.forEach((j) => { const x = P[j]; if (x) r.push('<tr><td>' + esc(JENIS[j].nama) + '</td><td class="num">' + fmt.n(x.baru) + '</td><td class="num">' + fmt.n(x.diubah) + '</td><td class="num">' + fmt.n(x.sama) + '</td><td class="num">' + (x.ditolak ? '<b style="color:var(--dng)">' + fmt.n(x.ditolak) + '</b>' : '0') + '</td></tr>'); });
    return '<div class="tw"><table class="tbl"><thead><tr><th>Jenis</th><th class="num">Baru</th><th class="num">Berubah</th><th class="num">Sama</th><th class="num">Ditolak</th></tr></thead><tbody>' + (r.join('') || '<tr><td colspan="5" class="muted">Tidak ada baris.</td></tr>') + '</tbody></table></div>';
  }
  function blokPratinjau(P) {
    let h = '<div class="g g3" style="margin-bottom:10px"><div class="card kpi"><div class="l">Akan ditambahkan</div><div class="v">' + fmt.n(P.rangkum.baru) + '</div></div><div class="card kpi"><div class="l">Akan berubah (jika mode perbarui)</div><div class="v">' + fmt.n(P.rangkum.diubah) + '</div></div><div class="card kpi"><div class="l">Periode terdampak</div><div class="v" style="font-size:15px">' + esc((P.periode || []).map((x) => fmt.bulan(x)).join(', ') || '–') + '</div></div></div>';
    h += tabelRingkas(P);
    if (P.rentang) h += '<div class="hint" style="margin-top:6px">Rentang harian: ' + esc(P.rentang.dari) + ' s.d. ' + esc(P.rentang.sampai) + ' (' + fmt.n(P.rentang.hari) + ' hari).</div>';
    const ts = P.tidakDikenal || {}, ks = Object.keys(ts.sub || {}), kb = Object.keys(ts.blok || {});
    if (ks.length || kb.length) h += '<div class="banner warn" style="margin-top:10px">' + ic('alert') + '<div><b>Nama tidak dikenal</b> (baris terkait ditolak): ' + (ks.length ? 'sub-wilayah — ' + ks.slice(0, 12).map((k) => esc(k) + ' (' + ts.sub[k] + ')').join(', ') : '') + (ks.length && kb.length ? '; ' : '') + (kb.length ? 'blok — ' + kb.slice(0, 20).map((k) => esc(k) + ' (' + ts.blok[k] + ')').join(', ') : '') + '. Perbaiki di Excel atau tambahkan di Data Master, lalu unggah ulang.</div></div>';
    const cd = [];
    URUT.forEach((j) => { const x = P[j]; if (x && x.contohDitolak) x.contohDitolak.slice(0, 8).forEach((c) => cd.push('<tr><td>' + esc(JENIS[j].nama) + '</td><td>' + esc([c.t, c.s, c.b].filter(Boolean).join(' · ') || c.no || '') + '</td><td>' + esc(c.alasan || '') + '</td></tr>')); });
    if (cd.length) h += '<details style="margin-top:10px"><summary>Contoh baris ditolak (' + cd.length + ')</summary><div class="tw"><table class="tbl"><thead><tr><th>Jenis</th><th>Baris</th><th>Alasan</th></tr></thead><tbody>' + cd.join('') + '</tbody></table></div></details>';
    if ((P.tolakPemetaan || []).length) h += '<details style="margin-top:10px"><summary>Baris gagal dipetakan (' + P.tolakPemetaan.length + (P.tolakPemetaan.length >= 50 ? '+' : '') + ')</summary><ul class="hint">' + P.tolakPemetaan.slice(0, 20).map((x) => '<li>' + esc(x.jenis) + ' #' + x.no + ': ' + esc(x.alasan) + '</li>').join('') + '</ul></details>';
    if ((P.contohBeda || []).length) h += '<details style="margin-top:10px"><summary>Contoh nilai yang akan berubah</summary><div class="tw"><table class="tbl"><thead><tr><th>Kunci</th><th>Lama</th><th>Baru</th></tr></thead><tbody>' + P.contohBeda.slice(0, 10).map((x) => '<tr><td>' + esc(x.kunci || '') + '</td><td>' + esc(JSON.stringify(x.lama)) + '</td><td>' + esc(JSON.stringify(x.baru || '')) + '</td></tr>').join('') + '</tbody></table></div></details>';
    return h;
  }

  // Alur bersama: kirim → pratinjau → konfirmasi → terapkan. Mengembalikan hasil terapan atau null.
  async function alurTerapkan(host, o) {
    const area = host;
    area.innerHTML = '<div class="card"><h3 style="margin-top:0">Mengirim data…</h3><div class="prog"><div class="prog-i" id="ib" style="width:0%"></div></div><div class="hint" id="it">Menyiapkan…</div></div>';
    const id = await kirimPaket(o, (a, b) => { const bi = $('#ib', area), it = $('#it', area); if (bi) bi.style.width = Math.round(a / Math.max(1, b) * 100) + '%'; if (it) it.textContent = fmt.n(a) + ' dari ' + fmt.n(b) + ' baris terkirim'; });
    if (!id) return null;
    return new Promise((resolve) => {
      let mode = 'tambah';
      async function pratinjau() {
        area.innerHTML = '<div class="card">' + UI.skel(4, 18) + '</div>';
        let P; try { P = await API.call('impor.pratinjau', { id: id, mode: mode }); } catch (e) { UI.toastErr(e); area.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '<div style="margin-top:10px"><button class="btn" id="bt">Batalkan sesi</button></div></div>'; $('#bt', area).onclick = async () => { try { await API.call('impor.batal', { id: id }); } catch (x) {} resolve(null); }; return; }
        area.innerHTML = '<div class="card"><h3 style="margin-top:0">Pratinjau — periksa sebelum diterapkan</h3>' + blokPratinjau(P) +
          '<div class="seg" id="md" style="margin-top:12px"><button data-m="tambah">Tambah baru saja (aman)</button><button data-m="perbarui">Perbarui yang sudah ada</button></div>' +
          '<div class="hint" id="mh" style="margin-top:6px"></div>' +
          '<div class="row" style="gap:8px;margin-top:14px"><button class="btn pri" id="ok">' + ic('check') + 'Terapkan</button><button class="btn" id="ba">Batalkan</button></div></div>';
        const mh = () => { $$('#md button', area).forEach((b) => b.classList.toggle('on', b.dataset.m === mode)); $('#mh', area).textContent = mode === 'tambah' ? 'Hanya baris yang belum ada yang ditambahkan; data lama tidak disentuh. Bisa dibatalkan lewat Riwayat (rollback).' : 'Baris yang sudah ada ditimpa dengan nilai dari berkas. Nilai lama disimpan sehingga rollback bisa memulihkannya.'; };
        mh(); $$('#md button', area).forEach((b) => { b.onclick = () => { if (mode === b.dataset.m) return; mode = b.dataset.m; pratinjau(); }; });
        $('#ba', area).onclick = async () => { try { await API.call('impor.batal', { id: id }); UI.toast('Impor dibatalkan.'); } catch (e) { UI.toastErr(e); } resolve(null); };
        $('#ok', area).onclick = async () => {
          const bt = $('#ok', area); let konf = false;
          if (mode === 'perbarui') { if (!(await UI.konfirmasi('Mode perbarui akan menimpa ' + fmt.n(P.rangkum.diubah) + ' nilai yang sudah ada. Lanjutkan?', { ya: 'Ya, timpa', bahaya: true }))) return; konf = true; }
          bt.disabled = true; bt.innerHTML = 'Menerapkan…';
          try { const r = await API.call('impor.terapkan', { id: id, mode: mode, konfirmasi: konf }); resolve(r); } catch (e) { UI.toastErr(e); bt.disabled = false; bt.innerHTML = ic('check') + 'Terapkan'; }
        };
      }
      pratinjau();
    });
  }
  function tampilHasil(host, r, kembali) {
    host.innerHTML = '<div class="card"><div class="banner ok">' + ic('ok') + '<div><b>Impor selesai.</b> ' + fmt.n(r.baru) + ' baris baru, ' + fmt.n(r.diubah) + ' diperbarui, ' + fmt.n(r.dilewati) + ' sudah sama, ' + fmt.n(r.ditolak) + ' ditolak.' + ((r.terkunci || []).length ? ' Periode terkunci dilewati: ' + esc(r.terkunci.join(', ')) + '.' : '') + '</div></div>' +
      '<div class="hint" style="margin-top:8px">Periode terdampak: ' + esc((r.periode || []).map((x) => fmt.bulan(x)).join(', ') || '–') + '. Rekap sudah dihitung ulang.</div>' +
      '<div class="row" style="gap:8px;margin-top:12px"><button class="btn pri" id="d">' + ic('dash') + 'Buka Dashboard</button><button class="btn" id="r">' + ic('hist') + 'Lihat riwayat</button><button class="btn" id="n">Unggah lagi</button></div></div>';
    $('#d', host).onclick = () => Ctx.go('dashboard'); $('#r', host).onclick = () => Ctx.go('impor', { tab: 'riwayat' }); $('#n', host).onclick = kembali;
  }

  // ---------- Halaman ----------
  Pages.impor = {
    judul: 'Unggah Excel', scopes: ['data', 'periode', 'master'],
    mount(host, params) {
      const S = { tab: (params && params.tab) || 'unggah', berkas: null, ix: 0, st: null, profil: [], sibuk: false };
      host.innerHTML = '<div class="seg" id="tb"><button data-t="unggah">Unggah Excel</button><button data-t="riwayat">Riwayat impor</button><button data-t="profil">Profil format</button><button data-t="awal">Muat data awal</button></div><div id="tc" style="margin-top:12px"></div>';
      const tc = $('#tc', host);
      $$('#tb button', host).forEach((b) => { b.onclick = () => { if (S.sibuk) { UI.toast('Tunggu proses impor selesai.', 'warn'); return; } S.tab = b.dataset.t; tampil(); }; });
      function tampil() { $$('#tb button', host).forEach((b) => b.classList.toggle('on', b.dataset.t === S.tab)); if (S.tab === 'riwayat') riwayat(); else if (S.tab === 'profil') profil(); else if (S.tab === 'awal') awal(); else unggah(); }

      // ---- Tab: Unggah ----
      function unggah() {
        S.berkas = null;
        tc.innerHTML = '<div class="card"><h3 style="margin-top:0">1. Pilih berkas Excel</h3><div class="drop" id="dz" tabindex="0" role="button" aria-label="Pilih berkas Excel">' + ic('upload') + '<div style="margin-top:6px"><b>Seret berkas ke sini</b> atau klik untuk memilih</div><div class="hint">.xlsx, .xls, atau .csv — data dalam bentuk tabel (satu baris = satu catatan) dengan baris judul kolom. Pemetaan kolom bisa diatur dan disimpan sebagai profil.</div></div><input type="file" id="fi" accept=".xlsx,.xls,.csv" hidden></div><div id="wz"></div>';
        const dz = $('#dz', tc), fi = $('#fi', tc);
        dz.onclick = () => fi.click(); dz.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } };
        dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('on'); }; dz.ondragleave = () => dz.classList.remove('on');
        dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('on'); if (e.dataTransfer.files[0]) pilih(e.dataTransfer.files[0]); };
        fi.onchange = () => { if (fi.files[0]) pilih(fi.files[0]); };
      }
      async function pilih(file) {
        const wz = $('#wz', tc);
        if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { UI.toast('Gunakan berkas .xlsx, .xls, atau .csv.', 'warn'); return; }
        if (file.size > 25 * 1024 * 1024) { UI.toast('Berkas terlalu besar (maks 25 MB).', 'warn'); return; }
        wz.innerHTML = '<div class="card">' + UI.skel(3, 18) + '</div>';
        try {
          S.berkas = await bacaBerkas(file);
          if (!S.berkas.lembar.length) { wz.innerHTML = '<div class="card">' + UI.kosong('Berkas tidak berisi data.', 'file') + '</div>'; return; }
          try { const r = await API.call('impor.profilDaftar', {}); S.profil = r.rows || []; } catch (e) { S.profil = []; }
          S.ix = 0; siapkanLembar(); pemetaan();
        } catch (e) { wz.innerHTML = '<div class="card">' + UI.kosong('Gagal membaca berkas: ' + UI.galatTxt(e), 'alert') + '</div>'; }
      }
      function siapkanLembar() {
        const L = S.berkas.lembar[S.ix], t = tebak(L.rows);
        let st = { jenis: t.jenis, hdr: t.hdr, peta: t.peta, profil: '' };
        const sg = sidik(L.rows, t.hdr);
        const cocok = S.profil.filter((p) => { try { return JSON.parse(p.pola || '{}').sidik === sg; } catch (e) { return false; } })[0];
        if (cocok) { try { const pm = JSON.parse(cocok.pemetaan || '{}'); st = { jenis: cocok.jenis || pm.jenis || st.jenis, hdr: t.hdr, peta: pm.peta || st.peta, profil: cocok.id, profilNama: cocok.nama }; } catch (e) {} }
        S.st = st;
      }
      function pemetaan() {
        const wz = $('#wz', tc), B = S.berkas, L = B.lembar[S.ix], st = S.st, J = JENIS[st.jenis];
        const kolom = (L.rows[st.hdr] || []).map((c, i) => [i, teks(c) || 'Kolom ' + (i + 1)]);
        const opsiK = (v) => '<option value="">— tidak ada —</option>' + kolom.map((c) => '<option value="' + c[0] + '"' + (String(v) === String(c[0]) ? ' selected' : '') + '>' + esc(c[1]) + '</option>').join('');
        const hasil = bangunPaket(L, st);
        const wajibKurang = J.f.filter((f) => f.w && (st.peta[f.k] === undefined || st.peta[f.k] === '')).map((f) => f.n);
        wz.innerHTML = '<div class="card" style="margin-top:12px"><h3 style="margin-top:0">2. Petakan kolom</h3>' +
          '<div class="hint">Berkas: <b>' + esc(B.nama) + '</b>' + (B.lembar.length > 1 ? ' — lembar: <select class="sel" id="ls">' + B.lembar.map((l, i) => '<option value="' + i + '"' + (i === S.ix ? ' selected' : '') + '>' + esc(l.nama) + ' (' + fmt.n(l.total) + ' baris)</option>').join('') + '</select>' : ' — ' + fmt.n(L.total) + ' baris') + (st.profilNama ? ' · memakai profil <b>' + esc(st.profilNama) + '</b>' : '') + '</div>' +
          '<div class="row" style="gap:12px;flex-wrap:wrap;margin:10px 0"><label class="f">Jenis data<select class="sel" id="jn">' + URUT.map((j) => '<option value="' + j + '"' + (j === st.jenis ? ' selected' : '') + '>' + esc(JENIS[j].nama) + '</option>').join('') + '</select></label><label class="f">Baris judul<input class="inp" id="hd" type="number" min="1" max="' + Math.min(L.rows.length, 50) + '" value="' + (st.hdr + 1) + '" style="width:80px"></label></div>' +
          '<div class="g g3">' + J.f.map((f) => '<label class="f">' + esc(f.n) + (f.w ? ' *' : '') + '<select class="sel" data-f="' + f.k + '">' + opsiK(st.peta[f.k]) + '</select></label>').join('') + '</div>' +
          (wajibKurang.length ? '<div class="banner warn" style="margin-top:10px">' + ic('alert') + '<div>Kolom wajib belum dipetakan: ' + esc(wajibKurang.join(', ')) + '.</div></div>' : '') +
          '<h4 style="margin:14px 0 6px">Contoh hasil baca (' + fmt.n(hasil.n) + ' baris valid' + (hasil.masalah.length ? ', ' + fmt.n(hasil.masalah.length) + ' dilewati' : '') + ')</h4>' + contoh(st.jenis, hasil, J) +
          (hasil.masalah.length ? '<details style="margin-top:8px"><summary>Baris yang dilewati</summary><ul class="hint">' + hasil.masalah.slice(0, 15).map((m) => '<li>Baris ' + m.no + ': ' + esc(m.alasan) + '</li>').join('') + (hasil.masalah.length > 15 ? '<li>… dan ' + fmt.n(hasil.masalah.length - 15) + ' lainnya</li>' : '') + '</ul></details>' : '') +
          '<div class="row" style="gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn pri" id="lj"' + (wajibKurang.length || !hasil.n ? ' disabled' : '') + '>Lanjut ke pratinjau</button><button class="btn" id="sp">' + ic('save') + 'Simpan sebagai profil</button>' + (B.lembar.length > 1 ? '<span class="hint">Setiap lembar diunggah terpisah.</span>' : '') + '</div></div>';
        const ls = $('#ls', wz); if (ls) ls.onchange = () => { S.ix = Number(ls.value); siapkanLembar(); pemetaan(); };
        $('#jn', wz).onchange = (e) => { S.st.jenis = e.target.value; const t = tebak(L.rows); S.st.peta = t.jenis === S.st.jenis ? t.peta : autoPeta(L.rows[S.st.hdr] || [], S.st.jenis); S.st.profil = ''; S.st.profilNama = ''; pemetaan(); };
        $('#hd', wz).onchange = (e) => { const h = Math.max(1, Math.min(50, Number(e.target.value) || 1)) - 1; S.st.hdr = h; S.st.peta = autoPeta(L.rows[h] || [], S.st.jenis); S.st.profil = ''; S.st.profilNama = ''; pemetaan(); };
        $$('[data-f]', wz).forEach((s) => { s.onchange = () => { if (s.value === '') delete S.st.peta[s.dataset.f]; else S.st.peta[s.dataset.f] = Number(s.value); S.st.profil = ''; S.st.profilNama = ''; pemetaan(); }; });
        $('#sp', wz).onclick = simpanProfil;
        $('#lj', wz).onclick = () => lanjut(hasil);
      }
      function autoPeta(baris, jenis) {
        const kol = baris.map(norm), peta = {};
        JENIS[jenis].f.forEach((f) => { const i = kol.findIndex((c, ix) => c && f.al.indexOf(c) >= 0 && Object.keys(peta).every((k) => peta[k] !== ix)); if (i >= 0) peta[f.k] = i; });
        return peta;
      }
      function contoh(jenis, hasil, J) {
        const arr = hasil.paket[J.paket].slice(0, 6); if (!arr.length) return '<div class="hint">Belum ada baris yang bisa dibaca. Periksa baris judul dan pemetaan kolom.</div>';
        return '<div class="tw"><table class="tbl"><thead><tr>' + J.f.map((f) => '<th>' + esc(f.n) + '</th>').join('') + '</tr></thead><tbody>' + arr.map((r) => '<tr>' + r.map((v) => '<td' + (typeof v === 'number' ? ' class="num"' : '') + '>' + esc(typeof v === 'number' ? fmt.n(v, 2) : v === null ? '–' : v) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
      }
      async function simpanProfil() {
        const L = S.berkas.lembar[S.ix], st = S.st;
        const nama = await UI.tanya('Nama profil', { judul: 'Simpan profil format', def: st.profilNama || (S.berkas.nama.replace(/\.[^.]+$/, '') + ' — ' + L.nama), hint: 'Berkas dengan judul kolom yang sama akan dikenali otomatis lain kali.' });
        if (!nama) return;
        try { const r = await API.call('impor.profilSimpan', { id: st.profil || undefined, nama: nama, jenis: st.jenis, pola: { sidik: sidik(L.rows, st.hdr), hdr: st.hdr }, pemetaan: { jenis: st.jenis, peta: st.peta } }); st.profil = r.id; st.profilNama = nama; UI.toast('Profil disimpan.'); pemetaan(); } catch (e) { UI.toastErr(e); }
      }
      async function lanjut(hasil) {
        const B = S.berkas, st = S.st, area = $('#wz', tc);
        S.sibuk = true; $$('#tb button', host).forEach((b) => { b.disabled = true; });
        try {
          const r = await alurTerapkan(area, { nama: B.nama + (B.lembar.length > 1 ? ' [' + B.lembar[S.ix].nama + ']' : ''), sha: B.sha, jenis: st.jenis, profil: st.profil || '', paket: hasil.paket });
          if (r) tampilHasil(area, r, unggah); else pemetaan();
        } catch (e) { UI.toastErr(e); pemetaan(); }
        finally { S.sibuk = false; $$('#tb button', host).forEach((b) => { b.disabled = false; }); }
      }

      // ---- Tab: Riwayat ----
      async function riwayat() {
        tc.innerHTML = '<div class="card">' + UI.skel(5, 18) + '</div>';
        let r; try { r = await API.call('impor.riwayat', {}); } catch (e) { tc.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; return; }
        const rows = r.rows || [];
        if (!rows.length) { tc.innerHTML = '<div class="card">' + UI.kosong('Belum ada impor.', 'hist') + '</div>'; return; }
        tc.innerHTML = '<div class="card"><div class="tw"><table class="tbl"><thead><tr><th>Waktu</th><th>Berkas</th><th>Oleh</th><th>Status</th><th class="num">Baru</th><th class="num">Berubah</th><th class="num">Ditolak</th><th>Periode</th><th></th></tr></thead><tbody>' +
          rows.map((x) => {
            const bisaRb = x.status === 'Diterapkan', bisaBatal = x.status === 'Dikirim';
            return '<tr><td>' + esc(String(x.waktu || '').slice(0, 16).replace('T', ' ')) + '</td><td title="' + esc(x.catatan || '') + '">' + esc(x.nama || '') + '</td><td>' + esc(x.user || '') + '</td><td>' + UI.badge(x.status || '', x.status === 'Diterapkan' ? 'ok' : x.status === 'Dikirim' ? 'warn' : 'nu') + '</td><td class="num">' + fmt.n(x.baru) + '</td><td class="num">' + fmt.n(x.diubah) + '</td><td class="num">' + fmt.n(x.ditolak) + '</td><td>' + esc(String(x.periode || '').split(',').filter(Boolean).slice(0, 3).join(', ') + (String(x.periode || '').split(',').length > 3 ? '…' : '')) + '</td><td style="white-space:nowrap">' +
              (bisaRb ? '<button class="btn sm" data-rb="' + esc(x.id) + '">' + ic('undo') + 'Rollback</button>' : '') + (bisaBatal ? '<button class="btn sm" data-bt="' + esc(x.id) + '">Batalkan</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div><div class="hint" style="margin-top:8px">Rollback menghapus baris yang ditambahkan impor itu dan memulihkan nilai lama (mode perbarui). Periode terkunci harus dibuka kuncinya dulu.</div></div>';
        $$('[data-rb]', tc).forEach((b) => { b.onclick = async () => {
          if (!(await UI.konfirmasi('Batalkan seluruh dampak impor ini? Data yang ditambahkan akan dihapus.', { judul: 'Rollback impor', ya: 'Ya, rollback', bahaya: true }))) return;
          b.disabled = true; try { const x = await API.call('impor.rollback', { id: b.dataset.rb }); const h = x.hapus || {}; UI.toast('Rollback selesai: dihapus harian ' + fmt.n(h.harian || 0) + ', kering ' + fmt.n(h.kering || 0) + ', timbangan ' + fmt.n(h.timbangan || 0) + ', bulanan ' + fmt.n(h.bulanan || 0) + '; dipulihkan ' + fmt.n(x.dipulihkan || 0) + '.'); riwayat(); } catch (e) { b.disabled = false; UI.toastErr(e); }
        }; });
        $$('[data-bt]', tc).forEach((b) => { b.onclick = async () => { b.disabled = true; try { await API.call('impor.batal', { id: b.dataset.bt }); UI.toast('Sesi dibatalkan.'); riwayat(); } catch (e) { b.disabled = false; UI.toastErr(e); } }; });
      }

      // ---- Tab: Profil format ----
      async function profil() {
        tc.innerHTML = '<div class="card">' + UI.skel(3, 18) + '</div>';
        let r; try { r = await API.call('impor.profilDaftar', {}); } catch (e) { tc.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; return; }
        const rows = r.rows || [];
        tc.innerHTML = '<div class="card"><div class="hint" style="margin-bottom:8px">Profil menyimpan pemetaan kolom untuk satu format Excel. Dibuat dari wizard Unggah lewat tombol "Simpan sebagai profil"; berkas dengan judul kolom yang sama dikenali otomatis.</div>' +
          (rows.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Nama</th><th>Jenis</th><th>Dibuat oleh</th><th>Pada</th><th></th></tr></thead><tbody>' + rows.map((p) => '<tr><td>' + esc(p.nama) + '</td><td>' + esc((JENIS[p.jenis] || {}).nama || p.jenis) + '</td><td>' + esc(p.oleh || '') + '</td><td>' + esc(String(p.pada || '').slice(0, 10)) + '</td><td><button class="btn sm dng" data-h="' + esc(p.id) + '">' + ic('trash') + 'Hapus</button></td></tr>').join('') + '</tbody></table></div>' : UI.kosong('Belum ada profil tersimpan.', 'file')) + '</div>';
        $$('[data-h]', tc).forEach((b) => { b.onclick = async () => { if (!(await UI.konfirmasi('Hapus profil ini?', { ya: 'Hapus', bahaya: true }))) return; try { await API.call('impor.profilHapus', { id: b.dataset.h }); UI.toast('Profil dihapus.'); profil(); } catch (e) { UI.toastErr(e); } }; });
      }

      // ---- Tab: Muat data awal (JSON dari alat konversi) ----
      function awal() {
        tc.innerHTML = '<div class="card"><h3 style="margin-top:0">Muat data awal</h3><p class="hint" style="margin-top:0">Untuk pengisian pertama dari berkas <b>seed_data.json</b> (hasil konversi 27 berkas Excel). Pilih berkasnya dari komputer Anda — data tidak pernah disimpan di repository publik. Mode yang dipakai adalah <b>tambah baru</b>, jadi aman dijalankan lagi.</p><div class="drop" id="dz" tabindex="0" role="button">' + ic('db') + '<div style="margin-top:6px"><b>Pilih seed_data.json</b></div></div><input type="file" id="fi" accept=".json,application/json" hidden></div><div id="wz"></div>';
        const dz = $('#dz', tc), fi = $('#fi', tc);
        dz.onclick = () => fi.click(); dz.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } };
        fi.onchange = async () => {
          const f = fi.files[0]; if (!f) return; const wz = $('#wz', tc);
          let d, buf; try { buf = await f.arrayBuffer(); d = JSON.parse(new TextDecoder().decode(buf)); } catch (e) { UI.toast('Berkas JSON tidak valid.', 'err'); return; }
          const paket = { harian: Array.isArray(d.harian) ? d.harian : [], kering: Array.isArray(d.kering) ? d.kering : [], timbangan: Array.isArray(d.timbangan) ? d.timbangan : [], bulanan: Array.isArray(d.bulanan) ? d.bulanan : [] };
          if (!jumlah(paket)) { UI.toast('Berkas tidak memuat data harian/kering/timbangan/bulanan.', 'warn'); return; }
          const ok = await UI.konfirmasi('Muat ' + jenisTeks(paket) + ' dari ' + f.name + '?', { judul: 'Muat data awal', ya: 'Kirim & pratinjau' });
          if (!ok) return;
          S.sibuk = true; $$('#tb button', host).forEach((b) => { b.disabled = true; });
          try {
            const r = await alurTerapkan(wz, { nama: f.name, sha: await sha256(buf), jenis: 'campuran', paket: paket });
            if (r) tampilHasil(wz, r, awal); else wz.innerHTML = '';
          } catch (e) { UI.toastErr(e); wz.innerHTML = ''; }
          finally { S.sibuk = false; $$('#tb button', host).forEach((b) => { b.disabled = false; }); }
        };
      }

      tampil();
      return { refresh() { if (!S.sibuk && (S.tab === 'riwayat' || S.tab === 'profil')) tampil(); }, destroy() {} };
    }
  };
})();
