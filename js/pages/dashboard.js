/* Data Produksi v2 — Dashboard: filter global, KPI, narasi otomatis, isu & gagasan, grafik interaktif, "dari mana angka ini", mode presentasi. */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;
  const bulanPendek = (p) => fmt.bulan(p, true);

  function hitungKids(M, lk, p, b) {
    // Kembalikan {level, rows} anak dari level terpilih (dari bootstrap bila tanpa filter, selain itu dari rekap.tabel)
    const subs = (M.sub_wilayah || []).filter((s) => s.jenis === 'sub');
    if (lk.level === 'GT') return { level: 'sub', ambil: () => Promise.resolve((b && b.periode === p) ? b.sub : null).then((r) => r || API.call('rekap.tabel', { skala: 'bulanan', periode: p, level: 'sub' }).then((x) => x.baris)), filter: () => true };
    if (lk.level === 'divisi') return { level: 'sub', ambil: () => API.call('rekap.tabel', { skala: 'bulanan', periode: p, level: 'sub' }).then((x) => x.baris), filter: (r) => (subs.find((s) => s.kode === r.k) || {}).divisi === lk.kode };
    if (lk.level === 'sub') { const set = new Set((M.blok || []).filter((x) => String(x.sub).split(',').indexOf(lk.kode) >= 0).map((x) => x.kelompok || x.kode)); return { level: 'blok', ambil: () => API.call('rekap.tabel', { skala: 'bulanan', periode: p, level: 'blok' }).then((x) => x.baris), filter: (r) => set.has(r.k) }; }
    return null;
  }
  const NAMA_LEVEL = { GT: 'Estate', divisi: 'Divisi', sub: 'Sub-wilayah', blok: 'Blok' };

  Pages.dashboard = {
    judul: 'Dashboard', scopes: ['rekap', 'data', 'periode', 'master', 'set'],
    mount(host) {
      host.innerHTML = '<div id="fb"></div><div id="bn"></div><div class="g g6 keep2" id="kpi">' + [1, 2, 3, 4, 5, 6].map(() => '<div class="card">' + UI.skel(3, 14) + '</div>').join('') + '</div><div id="isi"></div>';
      const S = { data: null, narasi: null, mandorBaris: null, token: 0, jenis: { tren: 'kombo', komp: 'donat', yoy: 'garis', rank: 'batang_h', hari: 'area' }, metrikYoy: 'gl' };
      let fb = null, ok = true;
      const dest = [];
      async function muat(diam) {
        const tok = ++S.token, F = Ctx.filter, p = F.periode, lk = Ctx.levelKode();
        if (!diam) { $('#kpi', host).style.opacity = .55; }
        try {
          const b = await Ctx.boot(p);
          if (tok !== S.token) return;
          const M = b.master || {}; let kpi, tren, sub, divisi, terbaik, terendah, status = b.status;
          if (b.periode !== p || lk.level !== 'GT' || F.mandor) { /* butuh data khusus */ }
          const tasks = {};
          if (F.mandor) tasks.mandor = API.call('rekap.mandor', { periode: p });
          else if (lk.level !== 'GT' || b.periode !== p) tasks.deret = API.call('rekap.deret', { skala: 'bulanan', level: lk.level, kode: lk.kode, dari: UI.geser(p, -13), sampai: p });
          tasks.harian = F.mandor ? Promise.resolve(null) : API.call('rekap.deret', { skala: 'harian', level: lk.level, kode: lk.kode, dari: p + '-01', sampai: p + '-31' }).catch(() => null);
          tasks.narasi = Ctx.can('dash.baca') ? API.call('narasi.baca', { periode: p }).catch(() => null) : Promise.resolve(null);
          const kids = F.mandor ? null : hitungKids(M, lk, p, b);
          if (kids) tasks.kids = kids.ambil();
          const keys = Object.keys(tasks), vals = await Promise.all(keys.map((k) => tasks[k].catch((e) => { if (k === 'deret' || k === 'mandor') throw e; return null; })));
          if (tok !== S.token) return;
          const R = {}; keys.forEach((k, i) => { R[k] = vals[i]; });
          if (R.deret) { const r = R.deret.data || []; const g = (q) => r.find((x) => x.p === q) || null; kpi = { sekarang: g(p), lalu: g(UI.geser(p, -1)), tahunLalu: g(UI.geser(p, -12)) }; tren = r.slice(-14); }
          else if (!F.mandor) { kpi = b.kpi; tren = b.tren; }
          if (F.mandor) { const m = (R.mandor.baris || []).find((x) => x.mandor === F.mandor); kpi = { sekarang: m ? { gl: m.gl, mt: m.mt, y: m.y, luas: m.luas, rend: R.mandor.rendemen, hk: null, kghk: null, sel: null, kgha: m.kgha } : null, lalu: null, tahunLalu: null }; tren = []; }
          let kidRows = []; if (R.kids && kids) kidRows = (R.kids || []).filter(kids.filter);
          if (lk.level === 'GT' && !F.mandor) { divisi = b.periode === p ? b.divisi : null; terbaik = b.blokTerbaik; terendah = b.blokTerendah; }
          S.data = { b: b, M: M, p: p, lk: lk, kpi: kpi, tren: tren || [], kids: kidRows, kidLevel: kids && kids.level, divisi: divisi, terbaik: terbaik, terendah: terendah, harian: R.harian && R.harian.data || [], status: status, mandor: R.mandor || null };
          S.narasi = R.narasi;
          gambar();
        } catch (e) { if (tok !== S.token) return; $('#kpi', host).style.opacity = 1; $('#isi', host).innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; $('#kpi', host).innerHTML = ''; }
      }
      function kpiHtml() {
        const D = S.data, c = D.kpi && D.kpi.sekarang, l = D.kpi && D.kpi.lalu, t = D.kpi && D.kpi.tahunLalu, p = D.p, why = (m) => (Ctx.cakupan && D.lk.level === 'GT' ? '' : m);
        if (!c) return '<div class="card s12" style="grid-column:1/-1">' + UI.kosong('Belum ada data produksi untuk pilihan ini pada ' + fmt.bulan(p) + '.', 'leaf') + '</div>';
        const sel = c.sel, ada = sel !== null && sel !== undefined;
        return [
          K.kpi({ l: 'GL — daun basah', v: fmt.n(c.gl), u: 'Kg', sub: K.banding(c, l, t, 'gl'), why: why('gl') }),
          K.kpi({ l: 'MT — teh kering', v: c.mt === null || c.mt === undefined ? '–' : fmt.n(c.mt), u: c.mt === null || c.mt === undefined ? '' : 'Kg', sub: c.mt === null || c.mt === undefined ? '<span class="muted">Menunggu data kering</span>' : K.banding(c, l, t, 'mt'), why: why('mt') }),
          K.kpi({ l: 'Rendemen', v: c.rend === null || c.rend === undefined ? '–' : fmt.pct(c.rend), sub: c.rend === null || c.rend === undefined ? '<span class="muted">Kering belum diisi</span>' : K.banding(c, l, t, 'rend'), why: why('rend') }),
          K.kpi({ l: 'Yield / Ha', v: c.y === null || c.y === undefined ? '–' : fmt.n(c.y, 1), u: 'Kg/Ha', sub: c.y === null || c.y === undefined ? '' : K.banding(c, l, t, 'y'), why: why('y') }),
          K.kpi({ l: 'Hari Kerja (HK)', v: c.hk === null || c.hk === undefined ? '–' : fmt.n(c.hk), sub: c.kghk ? '<span class="muted">' + fmt.n(c.kghk, 1) + ' Kg/HK</span> ' + K.banding(c, l, t, 'kghk') : '', why: why('hk') }),
          K.kpi({ l: 'Cek silang pabrik', v: ada ? fmt.n(sel) : '–', u: ada ? 'Kg' : '', sub: ada ? (Math.abs(sel) < 1 ? UI.badge('Cocok', 'ok') : UI.badge('Ada selisih', 'warn')) + ' <span class="muted xs">Σ GL − basah timbangan</span>' : '<span class="muted xs">Tersedia pada level Estate/Sub</span>', why: ada ? why('sel') : '' })
        ].join('');
      }
      function narasiHtml() {
        const N = S.narasi; if (!N) return '<div class="card"><div class="hd"><h3>Narasi otomatis</h3></div>' + UI.kosong('Narasi belum tersedia.', 'file') + '</div>';
        const lst = N.bagian.map((b) => '<div class="narasi" data-b="' + esc(b.bagian) + '"><div class="row" style="gap:6px"><h4>' + esc(b.judul) + '</h4>' + (b.diedit ? '<span class="bg">Disunting</span>' : '<span class="bg">Otomatis</span>') + (b.basi ? '<span class="badge warn" title="Data berubah sejak teks ini disunting">Data berubah</span>' : '') + '<span class="sp"></span>' + (N.bolehEdit ? '<button class="btn sm ghost ic-only" data-ed title="Sunting">' + ic('edit') + '</button>' + (b.diedit ? '<button class="btn sm ghost ic-only" data-rs title="Kembalikan ke otomatis">' + ic('undo') + '</button>' : '') : '') + '</div><p>' + esc(b.teks) + '</p></div>').join('');
        return '<div class="card"><div class="hd"><h3>Narasi otomatis</h3><span class="badge info">' + esc(N.lingkup) + ' · ' + esc(N.label) + '</span><span class="sp"></span><button class="btn sm" data-ulang>' + ic('wand') + 'Buat ulang</button></div>' + lst + '</div>';
      }
      function isuHtml() {
        const N = S.narasi, is = (N && N.isu) || []; if (!is.length) return '<div class="card"><div class="hd"><h3>Isu &amp; gagasan</h3></div><div class="banner ok">' + ic('ok') + '<div>Tidak ada isu menonjol pada periode ini menurut aturan di Pengaturan.</div></div></div>';
        return '<div class="card"><div class="hd"><h3>Isu &amp; gagasan</h3><span class="badge">' + is.length + '</span></div><div class="col">' + is.slice(0, 6).map((i) => '<div class="isu ' + esc(i.tingkat) + '"><div class="grow"><div class="row" style="gap:6px"><b>' + esc(i.nama) + '</b>' + UI.badge(i.tingkat, i.tingkat) + '<span class="muted small">' + esc(i.objek) + '</span></div><div class="small" style="margin-top:4px">' + esc(i.teks) + '</div><div class="small muted" style="margin-top:4px">' + ic('wand') + ' ' + esc(i.gagasan) + (i.lainnya ? ' · +' + i.lainnya + ' lainnya' : '') + '</div></div></div>').join('') + '</div></div>';
      }
      function tabelAnak() {
        const D = S.data; if (D.mandor) { const m = D.mandor; return '<div class="card nopad"><div class="hd" style="padding:14px 16px 0"><h3>Per mandor</h3><span class="muted small">GL dibagi menurut proporsi luas</span></div><div id="tm" style="padding:12px"></div></div>'; }
        if (!D.kids || !D.kids.length) return D.lk.level === 'blok' ? '<div class="card"><div class="hd"><h3>Rincian blok ' + esc(D.lk.kode) + '</h3><span class="sp"></span><button class="btn sm" data-drill>' + ic('list') + 'Lihat rincian harian</button></div></div>' : '';
        return '<div class="card nopad"><div class="hd" style="padding:14px 16px 0"><h3>' + (D.kidLevel === 'sub' ? 'Per sub-wilayah' : 'Per blok') + '</h3><span class="muted small">Klik baris untuk menelusuri lebih dalam</span><span class="sp"></span><button class="btn sm" data-xlsx>' + ic('download') + 'Excel</button></div><div id="tk" style="padding:12px"></div></div>';
      }
      const kolomRekap = (lvl) => [{ h: lvl === 'sub' ? 'Sub' : lvl === 'blok' ? 'Blok' : 'Kode', k: 'k', cls: 'b' }, { h: 'GL (Kg)', num: true, k: 'gl', fmt: (v) => fmt.n(v) }, { h: 'HK', num: true, k: 'hk', fmt: (v) => fmt.n(v) }, { h: 'MT (Kg)', num: true, k: 'mt', fmt: (v) => fmt.n(v) }, { h: 'Rend.', num: true, k: 'rend', fmt: (v) => fmt.pct(v) }, { h: 'Yield/Ha', num: true, k: 'y', fmt: (v) => fmt.n(v, 1) }, { h: 'Kg/HK', num: true, k: 'kghk', fmt: (v) => fmt.n(v, 1) }, { h: 'Luas (Ha)', num: true, k: 'luas', fmt: (v) => fmt.n(v, 2) }];
      function gambar() {
        const D = S.data; $('#kpi', host).style.opacity = 1; $('#kpi', host).innerHTML = kpiHtml();
        const stt = D.b && D.b.periode === D.p ? D.b.status : (D.status || 'Draf');
        $('#bn', host).innerHTML = (D.b && D.b.peringatan && D.b.peringatan.belumDitinjau > 0 && Ctx.can('kesehatan.baca') ? '<div class="banner warn">' + ic('alert') + '<div><b>' + D.b.peringatan.belumDitinjau + ' peringatan kesehatan data belum ditinjau.</b> <a href="#/kesehatan">Tinjau sekarang</a></div></div>' : '') + '<div class="row"><span class="small muted">Status periode:</span> ' + K.statusBadge(stt) + (Ctx.filter.mandor ? '' : ' <span class="muted small">· Level: ' + NAMA_LEVEL[D.lk.level] + (D.lk.level !== 'GT' ? ' ' + esc(D.lk.kode) : '') + '</span>') + '</div>';
        $('#isi', host).innerHTML = '<div class="g g12"><div class="s7" id="nr">' + narasiHtml() + '</div><div class="s5">' + isuHtml() + '</div></div><div class="g g12" style="margin-top:var(--pad)"><div class="card s8" id="w-tren"></div><div class="card s4" id="w-komp"></div><div class="card s6" id="w-yoy"></div><div class="card s6" id="w-rank"></div><div class="card s12" id="w-hari"></div></div><div style="margin-top:var(--pad)">' + tabelAnak() + '</div>';
        $$('[data-why]', host).forEach((b) => { b.onclick = () => K.asal(b.dataset.why, D.lk.level, D.lk.kode, D.p); });
        pasangNarasi(); widget();
        const tk = $('#tk', host); if (tk) { UI.tabel(tk, kolomRekap(D.kidLevel), D.kids, { sortI: 1, sortDir: -1, zebra: true, onRow: (r) => { const F = Ctx.filter; if (D.kidLevel === 'sub') { F.sub = r.k; F.blok = ''; } else { F.blok = r.k; } Ctx.simpanFilter(); fb.ulang(); muat(); } }); const x = $('[data-xlsx]', host); if (x) x.onclick = () => UI.unduhXLSX('rekap_' + D.p + '.xlsx', [{ nama: 'Rekap', head: ['Kode', 'GL', 'HK', 'MT', 'Rendemen', 'Yield/Ha', 'Kg/HK', 'Luas'], rows: D.kids.map((r) => [r.k, r.gl, r.hk, r.mt, r.rend, r.y, r.kghk, r.luas]) }]); }
        const tm = $('#tm', host); if (tm) UI.tabel(tm, [{ h: 'Mandor', k: 'mandor', cls: 'b' }, { h: 'Divisi', k: 'divisi' }, { h: 'Wilayah', k: 'wilayah' }, { h: 'Blok', num: true, k: 'blok' }, { h: 'Luas (Ha)', num: true, k: 'luas', fmt: (v) => fmt.n(v, 2) }, { h: 'GL (Kg)', num: true, k: 'gl', fmt: (v) => fmt.n(v) }, { h: 'MT (Kg)', num: true, k: 'mt', fmt: (v) => fmt.n(v) }, { h: 'Yield/Ha', num: true, k: 'y', fmt: (v) => fmt.n(v, 1) }], D.mandor.baris, { sortI: 5, sortDir: -1, zebra: true, rowCls: (r) => r.mandor === Ctx.filter.mandor ? 'sel' : '' });
        const dr = $('[data-drill]', host); if (dr) dr.onclick = () => K.drill(D.p, 'blok', D.lk.kode);
      }
      function pasangNarasi() {
        const N = S.narasi; if (!N) return; const p = S.data.p;
        const u = $('[data-ulang]', host); if (u) u.onclick = async () => { u.disabled = true; try { S.narasi = await API.call('narasi.buat', { periode: p }); $('#nr', host).innerHTML = narasiHtml(); pasangNarasi(); UI.toast('Narasi dibuat ulang dari data terbaru.'); } catch (e) { UI.toastErr(e); u.disabled = false; } };
        $$('.narasi', host).forEach((n) => {
          const kode = n.dataset.b, b = N.bagian.find((x) => x.bagian === kode), ed = $('[data-ed]', n), rs = $('[data-rs]', n);
          if (ed) ed.onclick = async () => { const r = await UI.modal({ title: 'Sunting: ' + b.judul, size: 'lg', body: '<label class="f">Teks narasi<textarea class="inp" id="tx" rows="8" maxlength="4000">' + esc(b.teks) + '</textarea></label><div class="hint">Teks otomatis: ' + esc(b.auto) + '</div>', foot: [{ label: 'Batal', val: undefined }, { label: 'Simpan', cls: 'pri', ic: 'save', fn: async (ov) => { const t = $('#tx', ov).value.trim(); if (!t) { UI.toast('Teks tidak boleh kosong.', 'warn'); return false; } await API.call('narasi.simpan', { periode: p, bagian: kode, teks: t }); return true; } }] }); if (r) { S.narasi = await API.call('narasi.baca', { periode: p }); $('#nr', host).innerHTML = narasiHtml(); pasangNarasi(); UI.toast('Narasi tersimpan.'); } };
          if (rs) rs.onclick = async () => { if (!await UI.konfirmasi('Kembalikan bagian "' + b.judul + '" ke teks otomatis?')) return; try { await API.call('narasi.reset', { periode: p, bagian: kode }); S.narasi = await API.call('narasi.baca', { periode: p }); $('#nr', host).innerHTML = narasiHtml(); pasangNarasi(); } catch (e) { UI.toastErr(e); } };
        });
      }
      function widget() {
        const D = S.data, tr = D.tren, X = tr.map((r) => bulanPendek(r.p)), jd = (t) => t + (D.lk.level === 'GT' ? '' : ' — ' + NAMA_LEVEL[D.lk.level] + ' ' + D.lk.kode);
        // Tren
        K.kartuGrafik($('#w-tren', host), { judul: jd('Tren 14 bulan'), tipe: S.jenis.tren, opsi: K.TIPE_SERI, onTipe: (t) => { S.jenis.tren = t; },
          build: (t) => tr.length ? (t === 'kombo' ? K.adaptasi('kombo', { x: X, seri: [{ nama: 'GL (Kg)', v: tr.map((r) => r.gl) }, { nama: 'Rendemen', v: tr.map((r) => r.rend) }] }, { fmt2: (v) => fmt.pct(v, 0), h: 280 }) : K.adaptasi(t, { x: X, seri: [{ nama: 'GL (Kg)', v: tr.map((r) => r.gl) }, { nama: 'MT (Kg)', v: tr.map((r) => r.mt) }] }, { h: 280 })) : null,
          csv: () => ({ head: ['Periode', 'GL', 'MT', 'Rendemen', 'Yield/Ha'], rows: tr.map((r) => [r.p, r.gl, r.mt, r.rend, r.y]) }) });
        // Komposisi / peringkat
        const kids = D.kids || [];
        const komp = $('#w-komp', host);
        if (kids.length) K.kartuGrafik(komp, { judul: 'Komposisi GL', tipe: S.jenis.komp, opsi: K.TIPE_KAT, onTipe: (t) => { S.jenis.komp = t; }, build: (t) => K.adaptasi(t, { x: kids.map((r) => r.k), seri: [{ nama: 'GL (Kg)', v: kids.map((r) => r.gl) }] }, { h: 280, unit: 'Kg' }), csv: () => ({ head: ['Kode', 'GL'], rows: kids.map((r) => [r.k, r.gl]) }) });
        else komp.innerHTML = '<h4>Komposisi</h4>' + UI.kosong('Tidak ada rincian di bawah level ini.', 'pie');
        const rank = $('#w-rank', host), src = kids.length ? kids : (D.terbaik || []);
        if (src.length) { const pakaiY = src.some((r) => r.y !== null && r.y !== undefined), mk = pakaiY ? 'y' : 'gl', srt = src.filter((r) => r[mk] !== null && r[mk] !== undefined).sort((a, b) => b[mk] - a[mk]).slice(0, 20); K.kartuGrafik(rank, { judul: (pakaiY ? 'Yield/Ha' : 'GL (Kg), MT belum ada') + ' — ' + (kids.length ? 'peringkat ' + (D.kidLevel === 'sub' ? 'sub' : 'blok') : 'blok terbaik'), tipe: S.jenis.rank, opsi: K.TIPE_KAT, onTipe: (t) => { S.jenis.rank = t; }, build: (t) => srt.length ? K.adaptasi(t, { x: srt.map((r) => r.k), seri: [{ nama: pakaiY ? 'Yield/Ha' : 'GL', v: srt.map((r) => r[mk]) }] }, { h: Math.max(220, Math.min(480, 40 + srt.length * 26)), fmt: (v) => fmt.n(v, 0) }) : null, csv: () => ({ head: ['Kode', pakaiY ? 'Yield/Ha' : 'GL'], rows: srt.map((r) => [r.k, r[mk]]) }) }); } else rank.innerHTML = '<h4>Peringkat</h4>' + UI.kosong('Belum ada data.', 'bar');
        // YoY
        const yoy = $('#w-yoy', host); yoy.innerHTML = '<div class="row" style="margin-bottom:6px"><b>Perbandingan antar tahun</b><span class="sp"></span><select class="sel sm" id="my"><option value="gl">GL</option><option value="mt">MT</option><option value="y">Yield/Ha</option><option value="rend">Rendemen</option><option value="kghk">Kg/HK</option></select></div><div id="yw"></div>';
        const my = $('#my', yoy); my.value = S.metrikYoy;
        const muatYoy = async () => { const yw = $('#yw', yoy); yw.innerHTML = UI.skel(3, 16); try { const d = await API.call('rekap.banding', { level: D.lk.level, kode: D.lk.kode, metrik: S.metrikYoy }); const mf = S.metrikYoy === 'rend' ? (v) => fmt.pct(v, 1) : null; yw.innerHTML = ''; K.kartuGrafik(yw, { judul: 'Per bulan: ' + K.NAMA_M[S.metrikYoy], tipe: S.jenis.yoy, opsi: K.TIPE_SERI, onTipe: (t) => { S.jenis.yoy = t; }, build: (t) => K.adaptasi(t, { x: UI.BLN.map((m) => m.slice(0, 3)), seri: d.seri.map((s) => ({ nama: s.tahun, v: s.nilai })) }, { h: 260, fmt: mf || undefined }), csv: () => ({ head: ['Bulan'].concat(d.seri.map((s) => s.tahun)), rows: UI.BLN.map((m, i) => [m].concat(d.seri.map((s) => s.nilai[i]))) }) }); } catch (e) { yw.innerHTML = UI.kosong(UI.galatTxt(e), 'alert'); } };
        my.onchange = () => { S.metrikYoy = my.value; muatYoy(); }; muatYoy();
        // Harian
        const hr = D.harian || [], hw = $('#w-hari', host);
        if (hr.length) K.kartuGrafik(hw, { judul: 'GL harian — ' + fmt.bulan(D.p), tipe: S.jenis.hari, opsi: K.TIPE_SERI, onTipe: (t) => { S.jenis.hari = t; }, build: (t) => K.adaptasi(t, { x: hr.map((r) => String(Number(String(r.k).slice(8, 10)))), seri: [{ nama: 'GL (Kg)', v: hr.map((r) => r.gl) }] }, { h: 240 }), csv: () => ({ head: ['Tanggal', 'GL', 'HK', 'Ha'], rows: hr.map((r) => [r.k, r.gl, r.hk, r.ha]) }) });
        else hw.innerHTML = '<h4>GL harian</h4>' + UI.kosong(D.p < '2025-02' ? 'Periode ini hanya tersedia sebagai total bulanan.' : 'Belum ada data harian untuk pilihan ini.', 'bar');
      }
      async function awal() {
        fb = await K.filterBar($('#fb', host), () => muat(), {});
        const head = UI.el('<div class="row no-print" style="justify-content:flex-end"><button class="btn" data-pres>' + ic('play') + 'Mode presentasi</button>' + (Ctx.can('laporan.baca') ? '<button class="btn pri" data-lap>' + ic('download') + 'Unduh laporan</button>' : '') + '<button class="btn ghost ic-only" data-rf title="Muat ulang">' + ic('refresh') + '</button></div>');
        $('#fb', host).after(head);
        head.querySelector('[data-pres]').onclick = () => presentasi(S);
        const lp = head.querySelector('[data-lap]'); if (lp) lp.onclick = () => Ctx.go('laporan', { periode: Ctx.filter.periode });
        head.querySelector('[data-rf]').onclick = () => { API.invalidasi(); muat(); };
        muat();
      }
      awal().catch((e) => { host.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; });
      return { refresh() { muat(true); }, destroy() { ok = false; S.token++; } };
    }
  };

  // ---------- Mode presentasi ----------
  function presentasi(S) {
    const D = S.data; if (!D || !D.kpi || !D.kpi.sekarang) return UI.toast('Belum ada data untuk dipresentasikan.', 'warn');
    const c = D.kpi.sekarang, l = D.kpi.lalu, N = S.narasi, tr = D.tren, kids = D.kids || [];
    const judul = Ctx.set.nama_app || 'Data Produksi', per = fmt.bulan(D.p), lingkup = D.lk.level === 'GT' ? 'Estate Patuahwattee' : NAMA_LEVEL[D.lk.level] + ' ' + D.lk.kode;
    const kp = (lbl, v, u, sub) => '<div class="card kpi"><div class="l">' + lbl + '</div><div class="v" style="font-size:2.4rem">' + v + '<span class="u">' + u + '</span></div><div class="s">' + sub + '</div></div>';
    const slides = [
      { html: '<div style="margin:auto;text-align:center"><img src="img/logo.png" alt="" style="height:90px;background:#fff;padding:10px 18px;border-radius:12px"><h1 style="font-size:2.6rem;margin-top:24px">' + esc(judul) + '</h1><h2 style="font-weight:500;margin-top:8px">' + esc(lingkup) + ' — ' + esc(per) + '</h2><p class="muted">' + esc(Ctx.set.perusahaan || '') + '</p></div>' },
      { html: '<h2>Ringkasan kinerja — ' + esc(per) + '</h2><div class="g g3">' + kp('GL — daun basah', fmt.n(c.gl), 'Kg', K.banding(c, l, null, 'gl')) + kp('MT — teh kering', c.mt === null || c.mt === undefined ? '–' : fmt.n(c.mt), 'Kg', K.banding(c, l, null, 'mt')) + kp('Rendemen', c.rend === null || c.rend === undefined ? '–' : fmt.pct(c.rend), '', K.banding(c, l, null, 'rend')) + kp('Yield / Ha', c.y === null || c.y === undefined ? '–' : fmt.n(c.y, 1), 'Kg/Ha', K.banding(c, l, null, 'y')) + kp('HK', c.hk === null || c.hk === undefined ? '–' : fmt.n(c.hk), '', c.kghk ? fmt.n(c.kghk, 1) + ' Kg/HK' : '') + kp('Luas', fmt.n(c.luas, 1), 'Ha', '') + '</div>' }
    ];
    if (N && N.bagian.length) slides.push({ html: '<h2>Narasi</h2><div class="col" style="max-width:1000px;font-size:1.15rem;line-height:1.7">' + N.bagian.slice(0, 4).map((b) => '<div><b>' + esc(b.judul) + '.</b> ' + esc(b.teks) + '</div>').join('') + '</div>' });
    if (tr.length) slides.push({ html: '<h2>Tren 14 bulan</h2><div class="card"><div id="pc1"></div></div>', after: (r) => Charts.render($('#pc1', r), K.adaptasi('kombo', { x: tr.map((x) => bulanPendek(x.p)), seri: [{ nama: 'GL (Kg)', v: tr.map((x) => x.gl) }, { nama: 'Rendemen', v: tr.map((x) => x.rend) }] }, { fmt2: (v) => fmt.pct(v, 0), h: 340 })) });
    if (kids.length) slides.push({ html: '<h2>Komposisi dan peringkat</h2><div class="g g2"><div class="card"><div id="pc2"></div></div><div class="card"><div id="pc3"></div></div></div>', after: (r) => { Charts.render($('#pc2', r), K.adaptasi('donat', { x: kids.map((x) => x.k), seri: [{ nama: 'GL', v: kids.map((x) => x.gl) }] }, { h: 320, unit: 'Kg' })); const s = kids.filter((x) => x.y !== null).sort((a, b) => b.y - a.y).slice(0, 12); Charts.render($('#pc3', r), K.adaptasi('batang_h', { x: s.map((x) => x.k), seri: [{ nama: 'Yield/Ha', v: s.map((x) => x.y) }] }, { h: 320, fmt: (v) => fmt.n(v, 0) })); } });
    if (N && N.isu && N.isu.length) slides.push({ html: '<h2>Isu dan gagasan</h2><div class="col" style="max-width:1000px">' + N.isu.slice(0, 5).map((i) => '<div class="isu ' + esc(i.tingkat) + '" style="background:#111A2C;border-color:#22304A"><div><b>' + esc(i.nama) + '</b> <span class="muted">' + esc(i.objek) + '</span><div>' + esc(i.teks) + '</div><div class="muted small">' + esc(i.gagasan) + '</div></div></div>').join('') + '</div>' });
    K.slideshow(slides);
  }
  K.slideshow = function (slides) {
    let i = 0, laser = false, prevOverflow = document.body.style.overflow;
    const ov = UI.el('<div class="present nobar" role="dialog" aria-label="Mode presentasi"><div class="slide"></div><div class="pbar"><button class="btn sm" data-p>' + ic('left') + '</button><span class="small muted" data-n></span><button class="btn sm" data-nx>' + ic('right') + '</button><span class="sp"></span><button class="btn sm" data-l title="Penunjuk laser (L)">' + ic('zap') + 'Laser</button><button class="btn sm" data-fs>' + ic('max') + '</button><button class="btn sm" data-x>' + ic('x') + 'Keluar (Esc)</button></div></div>');
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const sl = $('.slide', ov), dot = UI.el('<div class="laser hide"></div>'); document.body.appendChild(dot);
    function tampil() { i = Math.max(0, Math.min(slides.length - 1, i)); sl.innerHTML = slides[i].html; $('[data-n]', ov).textContent = (i + 1) + ' / ' + slides.length; if (slides[i].after) slides[i].after(sl); }
    function keluar() { document.removeEventListener('keydown', kb); document.removeEventListener('mousemove', mv); ov.remove(); dot.remove(); document.body.style.overflow = prevOverflow; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
    function kb(e) { if (e.key === 'Escape') keluar(); else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { i++; tampil(); e.preventDefault(); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { i--; tampil(); } else if (e.key === 'Home') { i = 0; tampil(); } else if (e.key === 'End') { i = slides.length - 1; tampil(); } else if (e.key.toLowerCase() === 'l') { laser = !laser; dot.classList.toggle('hide', !laser); ov.style.cursor = laser ? 'none' : ''; } }
    function mv(e) { if (laser) { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; } ov.classList.remove('nobar'); clearTimeout(mv.t); mv.t = setTimeout(() => ov.classList.add('nobar'), 2500); }
    document.addEventListener('keydown', kb); document.addEventListener('mousemove', mv);
    $('[data-p]', ov).onclick = () => { i--; tampil(); }; $('[data-nx]', ov).onclick = () => { i++; tampil(); }; $('[data-x]', ov).onclick = keluar;
    $('[data-l]', ov).onclick = () => { laser = !laser; dot.classList.toggle('hide', !laser); };
    $('[data-fs]', ov).onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else ov.requestFullscreen && ov.requestFullscreen().catch(() => {}); };
    tampil(); mv({ clientX: 0, clientY: 0 });
    return { tutup: keluar };
  };
})();
