/* Data Produksi v2 — Rekap: tabel berjenjang (bulanan/mingguan/harian/tahunan), per mandor, banding antar tahun, pembangun grafik + preset. */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;
  const natur = (a, b) => String(a).localeCompare(String(b), 'id', { numeric: true });
  const LEVEL = [['blok', 'Blok'], ['sub', 'Sub-wilayah'], ['divisi', 'Divisi'], ['GT', 'Estate (GT)']];
  const METRIK = [['gl', 'GL (Kg)'], ['mt', 'MT (Kg)'], ['rend', 'Rendemen'], ['y', 'Yield/Ha'], ['kghk', 'Kg/HK'], ['hk', 'HK']];
  const KF = { gl: (v) => fmt.n(v), mt: (v) => fmt.n(v), hk: (v) => fmt.n(v), ha: (v) => fmt.n(v, 1), rend: (v) => fmt.pct(v), y: (v) => fmt.n(v, 1), kghk: (v) => fmt.n(v, 1), luas: (v) => fmt.n(v, 2), sel: (v) => fmt.n(v) };
  const HDR = { gl: 'GL (Kg)', mt: 'MT (Kg)', hk: 'HK', ha: 'Ha dipetik', rend: 'Rendemen', y: 'Yield/Ha', kghk: 'Kg/HK', luas: 'Luas (Ha)', sel: 'Selisih' };
  const fm = (m) => (m === 'rend' ? (v) => fmt.pct(v, 1) : (m === 'y' || m === 'kghk') ? (v) => fmt.n(v, 1) : (v) => fmt.n(v));

  // Pemilih level + kode (bersama untuk Banding dan Pembangun)
  function opsiKode(M, level) {
    const subs = (M.sub_wilayah || []).filter((s) => s.jenis === 'sub'), sc = Ctx.cakupan;
    if (level === 'GT') return [['GT', 'Seluruh estate']];
    if (level === 'divisi') return (M.divisi || []).filter((d) => !sc || sc.indexOf(d.kode) >= 0).map((d) => [d.kode, d.nama || 'Divisi ' + d.kode]);
    if (level === 'sub') return subs.filter((s) => !sc || sc.indexOf(s.divisi) >= 0).sort((a, b) => natur(a.kode, b.kode)).map((s) => [s.kode, s.kode + (s.nama ? ' — ' + s.nama : '')]);
    return UI.unik((M.blok || []).filter((b) => !sc || sc.indexOf(b.divisi) >= 0).map((b) => b.kelompok || b.kode)).sort(natur).map((k) => [k, 'Blok ' + k]);
  }
  const opt = (arr, v) => arr.map((x) => '<option value="' + esc(x[0]) + '"' + (x[0] === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('');
  function pasangLK(host, M, st, onChange) {
    const lv = $('[data-lv]', host), kd = $('[data-kd]', host);
    const isi = () => { const o = opsiKode(M, st.level); if (!o.some((x) => x[0] === st.kode)) st.kode = o.length ? o[0][0] : 'GT'; kd.innerHTML = opt(o, st.kode); };
    lv.onchange = () => { st.level = lv.value; isi(); onChange(); }; kd.onchange = () => { st.kode = kd.value; onChange(); }; isi();
  }
  const htmlLK = (st) => '<label class="f">Level<select class="sel" data-lv>' + opt(LEVEL.slice().reverse(), st.level) + '</select></label><label class="f">Kode<select class="sel" data-kd></select></label>';

  Pages.rekap = {
    judul: 'Rekap', scopes: ['data', 'rekap', 'master', 'periode', 'set'],
    mount(host, params) {
      const S = { mode: (params && params.mode) || 'tabel', skala: 'bulanan', level: 'blok', p: Ctx.filter.periode || '', tgl: '', minggu: '', tahun: '', lv: { level: 'GT', kode: 'GT' }, tok: 0, M: null, per: [] };
      host.innerHTML = '<div class="seg" id="md"><button data-m="tabel">Tabel</button><button data-m="mandor">Per Mandor</button><button data-m="banding">Banding antar tahun</button><button data-m="grafik">Pembangun grafik</button></div><div id="ct"></div>';
      const ct = $('#ct', host);
      $$('#md button', host).forEach((b) => { b.onclick = () => { S.mode = b.dataset.m; tampil(); }; });
      async function awal() {
        const b = await Ctx.boot(); S.M = b.master || {}; S.per = b.periodeList || [];
        if (!S.p || !S.per.some((x) => x.p === S.p)) S.p = b.periode || (S.per.length ? S.per[S.per.length - 1].p : UI.periodeNow());
        S.tahun = S.p.slice(0, 4); S.tgl = S.p + '-01'; tampil();
      }
      function tampil() { ++S.tok; ct.onchange = null; $$('#md button', host).forEach((b) => b.classList.toggle('on', b.dataset.m === S.mode)); ({ tabel, mandor, banding, grafik })[S.mode](); }
      const selPeriode = () => '<label class="f">Periode<select class="sel" id="pp">' + K.opsiPeriode(S.per, S.p) + '</select></label>';

      // ---- Tabel ----
      function tabel() {
        ct.innerHTML = '<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="f">Skala<select class="sel" id="sk"><option value="bulanan">Bulanan</option><option value="mingguan">Mingguan</option><option value="harian">Harian</option><option value="tahunan">Tahunan</option></select></label><span id="pk"></span><label class="f">Level<select class="sel" id="lvl">' + opt(LEVEL, S.level) + '</select></label><label class="f grow">Cari kode<input class="inp" id="q" placeholder="mis. 36 atau BRS1" autocomplete="off"></label><span class="sp"></span><button class="btn" id="xl">' + ic('download') + 'Excel</button></div></div><div class="card nopad" id="tw"></div>';
        $('#sk', ct).value = S.skala; $('#lvl', ct).value = S.level;
        const pk = $('#pk', ct);
        async function isiPicker() {
          if (S.skala === 'bulanan') { pk.innerHTML = selPeriode(); $('#pp', pk).onchange = (e) => { S.p = e.target.value; Ctx.filter.periode = S.p; Ctx.simpanFilter(); muat(); }; }
          else if (S.skala === 'harian') { pk.innerHTML = '<label class="f">Tanggal<input class="inp" type="date" id="tg" value="' + S.tgl + '"></label>'; $('#tg', pk).onchange = (e) => { S.tgl = e.target.value; muat(); }; }
          else if (S.skala === 'tahunan') { pk.innerHTML = '<label class="f">Tahun<input class="inp" type="number" id="th" min="2015" max="2100" value="' + S.tahun + '" style="width:96px"></label>'; $('#th', pk).onchange = (e) => { S.tahun = e.target.value; muat(); }; }
          else {
            pk.innerHTML = '<label class="f">Minggu<select class="sel" id="mg"><option>Memuat…</option></select></label>';
            try { const d = await API.call('rekap.deret', { skala: 'mingguan', level: 'GT', kode: 'GT', batas: 400 }); const w = (d.data || []).slice().reverse(); if (!S.minggu || !w.some((x) => x.k === S.minggu)) S.minggu = w.length ? w[0].k : ''; $('#mg', pk).innerHTML = w.map((x) => '<option value="' + x.k + '"' + (x.k === S.minggu ? ' selected' : '') + '>' + esc((x.label || '') + ' · mulai ' + fmt.tgl(x.k)) + '</option>').join('') || '<option value="">Tidak ada data</option>'; $('#mg', pk).onchange = (e) => { S.minggu = e.target.value; muat(); }; } catch (e) { pk.innerHTML = UI.galatTxt(e); }
          }
        }
        let rowsAll = [], ti = null;
        function kolom() {
          const ada = (k) => rowsAll.some((r) => r[k] !== undefined && r[k] !== null);
          const L = [{ h: LEVEL.find((x) => x[0] === S.level)[1], k: 'k', cls: 'b', click: S.skala === 'bulanan' }];
          ['gl', 'hk', 'ha', 'mt', 'rend', 'y', 'kghk', 'luas', 'sel'].forEach((k) => { if (ada(k)) L.push({ h: HDR[k], k: k, num: true, fmt: (v) => KF[k](v), click: S.skala === 'bulanan' && ['gl', 'mt', 'rend', 'y'].indexOf(k) >= 0 }); });
          return L;
        }
        function gambar() {
          const q = $('#q', ct).value.trim().toLowerCase(); const d = q ? rowsAll.filter((r) => String(r.k).toLowerCase().indexOf(q) >= 0) : rowsAll;
          const sortI = Math.max(0, kolom().findIndex((c) => c.k === 'gl'));
          const tot = (k) => d.reduce((a, r) => a + (typeof r[k] === 'number' ? r[k] : 0), 0);
          ti = UI.tabel($('#tw', ct), kolom(), d, { sortI: S.level === 'blok' ? 0 : sortI, sortDir: S.level === 'blok' ? 1 : -1, zebra: true, maxH: 560,
            foot: (rows) => '<tr><td>Σ ' + rows.length + ' baris</td>' + kolom().slice(1).map((c) => '<td class="num">' + (['gl', 'hk', 'ha', 'mt', 'luas'].indexOf(c.k) >= 0 ? KF[c.k](rows.reduce((a, r) => a + (typeof r[c.k] === 'number' ? r[c.k] : 0), 0)) : '') + '</td>').join('') + '</tr>',
            onCell: (k, r) => { if (S.skala !== 'bulanan') return; if (k === 'k') K.drill(S.p, S.level, r.k); else K.asal(k, S.level, r.k, S.p); } });
        }
        async function muat() {
          const tok = ++S.tok, tw = $('#tw', ct); tw.innerHTML = '<div style="padding:16px">' + UI.skel(6, 24) + '</div>';
          const q = { skala: S.skala, level: S.level }; if (S.skala === 'bulanan') q.periode = S.p; else if (S.skala === 'harian') q.tanggal = S.tgl; else if (S.skala === 'mingguan') q.mulai = S.minggu; else q.tahun = S.tahun;
          try { const d = await API.call('rekap.tabel', q); if (tok !== S.tok) return; rowsAll = d.baris || []; if (!rowsAll.length) { tw.innerHTML = '<div style="padding:16px">' + UI.kosong('Belum ada data untuk pilihan ini.', 'table') + '</div>'; return; } gambar(); } catch (e) { if (tok === S.tok) tw.innerHTML = '<div style="padding:16px">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; }
        }
        $('#sk', ct).onchange = async (e) => { S.skala = e.target.value; await isiPicker(); muat(); };
        $('#lvl', ct).onchange = (e) => { S.level = e.target.value; muat(); };
        $('#q', ct).oninput = UI.debounce(() => { if (rowsAll.length) gambar(); }, 150);
        $('#xl', ct).onclick = () => { if (!rowsAll.length) return UI.toast('Tidak ada data.', 'warn'); const L = kolom(); UI.unduhXLSX('rekap_' + S.skala + '_' + S.level + '.xlsx', [{ nama: 'Rekap', head: L.map((c) => c.h), rows: rowsAll.map((r) => L.map((c) => r[c.k])) }]); };
        isiPicker().then(muat);
      }

      // ---- Per mandor ----
      function mandor() {
        ct.innerHTML = '<div class="card"><div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">' + selPeriode() + '<span class="small muted">GL unit dibagi menurut proporsi luas tiap mandor pada unit itu.</span><span class="sp"></span><button class="btn" id="xl">' + ic('download') + 'Excel</button></div></div><div id="bn"></div><div class="g g12"><div class="card nopad s7" id="tw"></div><div class="card s5" id="gw"></div></div>';
        let D = null; const tok = ++S.tok;
        const muat = async () => {
          $('#tw', ct).innerHTML = '<div style="padding:16px">' + UI.skel(6, 24) + '</div>';
          try {
            D = await API.call('rekap.mandor', { periode: S.p }); if (tok !== S.tok) return;
            $('#bn', ct).innerHTML = (D.tanpaMandor > 0 ? '<div class="banner info">' + ic('info') + '<div>GL pada blok tanpa mandor: <b>' + fmt.n(D.tanpaMandor) + ' Kg</b> (tidak masuk tabel di bawah).</div></div>' : '') + (D.rendemen === null || D.rendemen === undefined ? '<div class="banner warn">' + ic('alert') + '<div>MT belum bisa dihitung karena data kering ' + fmt.bulan(S.p) + ' belum diisi.</div></div>' : '');
            UI.tabel($('#tw', ct), [{ h: 'Mandor', k: 'mandor', cls: 'b' }, { h: 'Divisi', k: 'divisi' }, { h: 'Wilayah', k: 'wilayah' }, { h: 'Blok', num: true, k: 'blok' }, { h: 'Luas (Ha)', num: true, k: 'luas', fmt: (v) => fmt.n(v, 2) }, { h: 'GL (Kg)', num: true, k: 'gl', fmt: (v) => fmt.n(v) }, { h: 'MT (Kg)', num: true, k: 'mt', fmt: (v) => fmt.n(v) }, { h: 'Yield/Ha', num: true, k: 'y', fmt: (v) => fmt.n(v, 1) }, { h: 'Kg/Ha dipetik', num: true, k: 'kgha', fmt: (v) => fmt.n(v, 0) }], D.baris, { sortI: 5, sortDir: -1, zebra: true, maxH: 560, onRow: (r) => { Ctx.filter.mandor = r.mandor; Ctx.filter.periode = S.p; Ctx.simpanFilter(); Ctx.go('dashboard'); } });
            const top = D.baris.slice(0, 20); const pakaiY = top.some((r) => r.y !== null && r.y !== undefined);
            K.kartuGrafik($('#gw', ct), { judul: pakaiY ? 'Yield/Ha per mandor' : 'GL per mandor (Kg)', tipe: 'batang_h', opsi: K.TIPE_KAT, build: (t) => K.adaptasi(t, { x: top.map((r) => r.mandor), seri: [{ nama: pakaiY ? 'Yield/Ha' : 'GL', v: top.map((r) => pakaiY ? r.y : r.gl) }] }, { h: Math.max(240, 40 + top.length * 26), fmt: (v) => fmt.n(v, 0) }), csv: () => ({ head: ['Mandor', 'GL', 'MT', 'Yield/Ha'], rows: D.baris.map((r) => [r.mandor, r.gl, r.mt, r.y]) }) });
          } catch (e) { if (tok === S.tok) $('#tw', ct).innerHTML = '<div style="padding:16px">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; }
        };
        $('#pp', ct).onchange = (e) => { S.p = e.target.value; Ctx.filter.periode = S.p; Ctx.simpanFilter(); muat(); };
        $('#xl', ct).onclick = () => { if (!D) return; UI.unduhXLSX('rekap_mandor_' + S.p + '.xlsx', [{ nama: 'Per Mandor', head: ['Mandor', 'Divisi', 'Wilayah', 'Blok', 'Luas', 'GL', 'MT', 'Yield/Ha'], rows: D.baris.map((r) => [r.mandor, r.divisi, r.wilayah, r.blok, r.luas, r.gl, r.mt, r.y]) }]); };
        muat();
      }

      // ---- Banding antar tahun ----
      function banding() {
        const st = S.lv, years = UI.unik(S.per.map((x) => x.p.slice(0, 4))).sort(); let metrik = S.bm || 'gl'; let pilih = S.by || years.slice(-3);
        ct.innerHTML = '<div class="card"><div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">' + htmlLK(st) + '<label class="f">Metrik<select class="sel" id="mk">' + opt(METRIK, metrik) + '</select></label><div class="f">Tahun<div class="row" id="ty" style="gap:8px">' + years.map((y) => '<label class="row small" style="gap:4px"><input type="checkbox" value="' + y + '"' + (pilih.indexOf(y) >= 0 ? ' checked' : '') + '>' + y + '</label>').join('') + '</div></div></div></div><div class="card" id="gw"></div><div class="card nopad" id="tw"></div>';
        const muat = async () => {
          S.bm = metrik; S.by = pilih; const tok = ++S.tok, gw = $('#gw', ct); gw.innerHTML = UI.skel(4, 20);
          try {
            const d = await API.call('rekap.banding', { level: st.level, kode: st.kode, metrik: metrik, tahun: pilih }); if (tok !== S.tok) return;
            const seri = d.seri || []; if (!seri.length) { gw.innerHTML = UI.kosong('Tidak ada data.', 'bar'); $('#tw', ct).innerHTML = ''; return; }
            K.kartuGrafik(gw, { judul: (METRIK.find((x) => x[0] === metrik) || [])[1] + ' per bulan — ' + (st.level === 'GT' ? 'Estate' : st.level + ' ' + st.kode), tipe: 'garis', opsi: K.TIPE_SERI, build: (t) => K.adaptasi(t, { x: UI.BLN.map((m) => m.slice(0, 3)), seri: seri.map((s) => ({ nama: s.tahun, v: s.nilai })) }, { h: 320, fmt: fm(metrik) }), csv: () => ({ head: ['Bulan'].concat(seri.map((s) => s.tahun)), rows: UI.BLN.map((m, i) => [m].concat(seri.map((s) => s.nilai[i]))) }) });
            const kol = [{ h: 'Bulan', k: 'b', cls: 'b' }].concat(seri.map((s, i) => ({ h: String(s.tahun), k: 't' + i, num: true, fmt: (v) => (v === null || v === undefined ? '–' : fm(metrik)(v)) })));
            if (seri.length > 1) kol.push({ h: 'Δ ' + seri[seri.length - 1].tahun + ' vs ' + seri[seri.length - 2].tahun, k: 'dl', num: true, html: true, v: (r) => { const a = r['t' + (seri.length - 1)], b = r['t' + (seri.length - 2)]; return UI.deltaHtml(a, b) || '–'; } });
            const rows = UI.BLN.map((m, i) => { const r = { b: m }; seri.forEach((s, j) => { r['t' + j] = s.nilai[i]; }); return r; });
            UI.tabel($('#tw', ct), kol, rows, { sortI: -1, zebra: true, maxH: 460 });
          } catch (e) { if (tok === S.tok) gw.innerHTML = UI.kosong(UI.galatTxt(e), 'alert'); }
        };
        pasangLK(ct, S.M, st, () => muat());
        $('#mk', ct).onchange = (e) => { metrik = e.target.value; muat(); };
        $('#ty', ct).onchange = () => { pilih = $$('#ty input:checked', ct).map((i) => i.value); muat(); };
        muat();
      }

      // ---- Pembangun grafik + preset ----
      function grafik() {
        const awalP = S.per.length ? S.per[Math.max(0, S.per.length - 12)].p : S.p, akhirP = S.per.length ? S.per[S.per.length - 1].p : S.p;
        const g = S.g = S.g || { level: 'GT', kode: 'GT', metrik: ['gl'], dari: awalP, sampai: akhirP, tipe: 'garis' }; let presets = [];
        const cb = METRIK.map((m) => '<label class="row small" style="gap:4px"><input type="checkbox" data-mk value="' + m[0] + '"' + (g.metrik.indexOf(m[0]) >= 0 ? ' checked' : '') + '>' + m[1] + '</label>').join('');
        const po = (v) => S.per.map((x) => [x.p, fmt.bulan(x.p)]).map((x) => '<option value="' + x[0] + '"' + (x[0] === v ? ' selected' : '') + '>' + x[1] + '</option>').join('');
        ct.innerHTML = '<div class="g g12"><div class="card s4"><h3>Susun grafik</h3><div class="col" style="gap:10px">' + htmlLK(g) + '<div class="f">Metrik (boleh lebih dari satu)<div class="col" style="gap:4px">' + cb + '</div></div><div class="row" style="gap:8px"><label class="f grow">Dari<select class="sel" id="d1">' + po(g.dari) + '</select></label><label class="f grow">Sampai<select class="sel" id="d2">' + po(g.sampai) + '</select></label></div><label class="f">Jenis grafik<select class="sel" id="tp">' + K.TIPE_SERI.map((t) => '<option value="' + t + '"' + (t === g.tipe ? ' selected' : '') + '>' + (Charts.NAMA[t] || t) + '</option>').join('') + '</select></label><hr style="border:0;border-top:1px solid var(--line)"><div class="f">Preset tersimpan<div id="ps" class="col" style="gap:4px"></div></div><button class="btn" id="sv">' + ic('save') + 'Simpan sebagai preset</button></div></div><div class="card s8" id="gw"></div></div>';
        const gw = $('#gw', ct);
        async function gambar() {
          const tok = ++S.tok; gw.innerHTML = UI.skel(4, 20);
          if (!g.metrik.length) { gw.innerHTML = UI.kosong('Pilih minimal satu metrik.', 'bar'); return; }
          try {
            const d = await API.call('rekap.deret', { skala: 'bulanan', level: g.level, kode: g.kode, dari: g.dari, sampai: g.sampai, batas: 400 }); if (tok !== S.tok) return;
            const r = d.data || []; if (!r.length) { gw.innerHTML = UI.kosong('Tidak ada data pada rentang ini.', 'bar'); return; }
            const seri = g.metrik.map((m) => ({ nama: (METRIK.find((x) => x[0] === m) || [])[1], v: r.map((x) => x[m]) }));
            K.kartuGrafik(gw, { judul: (g.level === 'GT' ? 'Estate' : g.level + ' ' + g.kode) + ' · ' + fmt.bulan(g.dari, true) + ' – ' + fmt.bulan(g.sampai, true), tipe: g.tipe, opsi: K.TIPE_SERI, onTipe: (t) => { g.tipe = t; $('#tp', ct).value = t; }, build: (t) => K.adaptasi(t, { x: r.map((x) => fmt.bulan(x.p, true)), seri: seri }, { h: 360 }), csv: () => ({ head: ['Periode'].concat(seri.map((s) => s.nama)), rows: r.map((x, i) => [x.p].concat(seri.map((s) => s.v[i]))) }), catatan: g.metrik.length > 1 && ['kombo', 'garis', 'batang_kelompok'].indexOf(g.tipe) < 0 ? 'Metrik dengan satuan berbeda lebih mudah dibaca pada jenis Kombinasi.' : '' });
          } catch (e) { if (tok === S.tok) gw.innerHTML = UI.kosong(UI.galatTxt(e), 'alert'); }
        }
        async function muatPreset() {
          try { presets = (await API.call('grafik.presetDaftar', {})).rows || []; } catch (e) { presets = []; }
          const ps = $('#ps', ct); ps.innerHTML = presets.length ? presets.map((p) => '<div class="row" style="gap:4px"><button class="btn sm grow" style="justify-content:flex-start" data-pk="' + esc(p.id) + '">' + esc(p.nama) + '</button><button class="btn sm ghost ic-only" data-pd="' + esc(p.id) + '" title="Hapus" aria-label="Hapus preset ' + esc(p.nama) + '">' + ic('trash') + '</button></div>').join('') : '<span class="small muted">Belum ada preset.</span>';
          $$('[data-pk]', ps).forEach((b) => { b.onclick = () => { const p = presets.find((x) => x.id === b.dataset.pk); try { Object.assign(g, JSON.parse(p.definisi)); } catch (e) { return UI.toast('Preset rusak.', 'warn'); } grafik(); }; });
          $$('[data-pd]', ps).forEach((b) => { b.onclick = async () => { if (!(await UI.konfirmasi('Hapus preset ini?', { ya: 'Hapus', bahaya: true }))) return; try { await API.call('grafik.presetHapus', { id: b.dataset.pd }); muatPreset(); } catch (e) { UI.toastErr(e); } }; });
        }
        pasangLK(ct, S.M, g, gambar);
        ct.onchange = (e) => { const t = e.target; if (t.matches('[data-mk]')) { g.metrik = $$('[data-mk]:checked', ct).map((i) => i.value); gambar(); } else if (t.id === 'd1' || t.id === 'd2') { g.dari = $('#d1', ct).value; g.sampai = $('#d2', ct).value; if (g.dari > g.sampai) { const x = g.dari; g.dari = g.sampai; g.sampai = x; $('#d1', ct).value = g.dari; $('#d2', ct).value = g.sampai; } gambar(); } else if (t.id === 'tp') { g.tipe = t.value; gambar(); } };
        $('#sv', ct).onclick = async () => { const nama = await UI.tanya('Nama preset', { judul: 'Simpan preset grafik', ok: 'Simpan' }); if (!nama) return; try { await API.call('grafik.presetSimpan', { nama: nama, definisi: { level: g.level, kode: g.kode, metrik: g.metrik, dari: g.dari, sampai: g.sampai, tipe: g.tipe } }); UI.toast('Preset disimpan.', 'ok'); muatPreset(); } catch (e) { UI.toastErr(e); } };
        gambar(); muatPreset();
      }
      awal().catch((e) => { ct.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; });
      return { refresh() { if (S.mode !== 'grafik') tampil(); }, destroy() { S.tok++; } };
    }
  };
})();
