/* Data Produksi v2 — konteks bersama (Ctx), registri halaman (Pages), dan komponen umum (K). */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;
  const KF = 'dp_filter_v1';
  const Ctx = {
    user: null, set: {}, izin: [], pending: null,
    can(x) { if (x === null || x === undefined) return true; const a = Array.isArray(x) ? x : [x]; return a.some((k) => this.izin.indexOf('*') >= 0 || this.izin.indexOf(k) >= 0); },
    get cakupan() { return this.user && this.user.divisi && this.user.divisi !== '*' ? String(this.user.divisi).split(',') : null; },
    go(page, params) { const q = params ? '?' + new URLSearchParams(params).toString() : ''; const h = '#/' + page + q; if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = h; },
    filter: (function () { try { return JSON.parse(sessionStorage.getItem(KF) || 'null') || {}; } catch (e) { return {}; } })(),
    simpanFilter() { try { sessionStorage.setItem(KF, JSON.stringify(this.filter)); } catch (e) {} },
    boot(p, force) {
      return new Promise((res, rej) => { let ok = false; API.swr('rekap.bootstrap', p ? { periode: p } : {}, (d) => { if (!ok) { ok = true; res(d); } }, { ttl: 60000, force: !!force }).catch((e) => { if (!ok) rej(e); }); });
    },
    async master() { const b = await this.boot(); return b.master; },
    async periodeList() { const b = await this.boot(); return b.periodeList || []; },
    levelKode(f) { f = f || this.filter; if (f.blok) return { level: 'blok', kode: f.blok }; if (f.sub) return { level: 'sub', kode: f.sub }; if (f.divisi) return { level: 'divisi', kode: f.divisi }; return { level: 'GT', kode: 'GT' }; }
  };
  window.Ctx = Ctx; window.Pages = {};

  // ---------- Komponen ----------
  const SATUAN = { gl: 'Kg', mt: 'Kg', rend: '', y: 'Kg/Ha', hk: 'HK', kghk: 'Kg/HK', kgha: 'Kg/Ha', sel: 'Kg', ha: 'Ha', luas: 'Ha', basah: 'Kg' };
  const NAMA_M = { gl: 'GL (daun basah)', mt: 'MT (teh kering)', rend: 'Rendemen', y: 'Yield/Ha', hk: 'HK', kghk: 'Kg/HK', kgha: 'Kg/Ha dipetik', sel: 'Selisih timbangan', ha: 'Ha dipetik', luas: 'Luas', basah: 'Basah timbangan' };
  const nilaiM = (k, v, d) => k === 'rend' ? fmt.pct(v, d === undefined ? 2 : d) : (k === 'y' || k === 'kghk' || k === 'kgha' || k === 'ha' || k === 'luas') ? fmt.n(v, d === undefined ? 1 : d) : fmt.n(v, d || 0);
  const K = {
    SATUAN, NAMA_M, nilaiM,
    statusBadge(s) { return UI.badge(s || 'Draf', s || 'Draf'); },
    kpi(o) { return '<div class="card kpi"><div class="l">' + esc(o.l) + (o.why ? '<button class="why" data-why="' + esc(o.why) + '" title="Dari mana angka ini?" aria-label="Dari mana angka ini?">' + ic('info') + '</button>' : '') + '</div><div class="v">' + o.v + (o.u ? '<span class="u">' + esc(o.u) + '</span>' : '') + '</div><div class="s">' + (o.sub || '') + '</div></div>'; },
    banding(cur, lalu, thl, k, bal) { const a = cur && cur[k], d1 = lalu ? UI.deltaHtml(a, lalu[k], bal) : '', d2 = thl ? UI.deltaHtml(a, thl[k], bal) : ''; return (d1 ? '<span title="dibanding bulan lalu">' + d1 + ' <span class="xs muted">bln lalu</span></span>' : '') + (d2 ? '<span title="dibanding tahun lalu">' + d2 + ' <span class="xs muted">thn lalu</span></span>' : ''); },
    opsiPeriode(list, val) { return (list || []).slice().reverse().map((x) => '<option value="' + x.p + '"' + (x.p === val ? ' selected' : '') + '>' + fmt.bulan(x.p) + (x.status && x.status !== 'Draf' ? ' · ' + x.status : '') + '</option>').join(''); },
    // Bilah filter global: periode, divisi, sub, blok, mandor
    async filterBar(host, onChange, o) {
      o = o || {}; const b = await Ctx.boot(), M = b.master || {}, F = Ctx.filter; let per = b.periodeList || [];
      if (!F.periode || !per.some((x) => x.p === F.periode)) F.periode = b.periode || (per.length ? per[per.length - 1].p : UI.periodeNow());
      const subs = (M.sub_wilayah || []).filter((s) => s.jenis === 'sub'), bl = M.blok || [];
      function opsi(arr, val, ph) { return '<option value="">' + ph + '</option>' + arr.map((x) => '<option value="' + esc(x[0]) + '"' + (x[0] === val ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join(''); }
      function gambar() {
        const dv = (M.divisi || []).map((d) => [d.kode, d.nama || 'Divisi ' + d.kode]);
        const sb = subs.filter((s) => !F.divisi || s.divisi === F.divisi).map((s) => [s.kode, s.kode + ' — ' + (s.nama || '')]);
        const kel = U.unik(bl.filter((x) => (!F.divisi || x.divisi === F.divisi) && (!F.sub || String(x.sub).split(',').indexOf(F.sub) >= 0)).map((x) => x.kelompok || x.kode)).sort((a, c) => a.localeCompare(c, 'id', { numeric: true })).map((k) => [k, 'Blok ' + k]);
        const md = (M.mandor || []).filter((m) => m.aktif !== false).map((m) => [m.nama, m.nama]).sort((a, c) => a[1].localeCompare(c[1]));
        const sc = Ctx.cakupan;
        host.innerHTML = '<div class="filters card"><label class="f">Periode<select class="sel" data-f="periode">' + K.opsiPeriode(per, F.periode) + '</select></label>' +
          (sc && sc.length === 1 ? '' : '<label class="f">Divisi<select class="sel" data-f="divisi">' + opsi(dv, F.divisi, 'Semua divisi') + '</select></label>') +
          '<label class="f">Sub-wilayah<select class="sel" data-f="sub">' + opsi(sb, F.sub, 'Semua sub') + '</select></label>' +
          '<label class="f">Blok<select class="sel" data-f="blok">' + opsi(kel, F.blok, 'Semua blok') + '</select></label>' +
          (o.mandor === false ? '' : '<label class="f">Mandor<select class="sel" data-f="mandor">' + opsi(md, F.mandor, 'Semua mandor') + '</select></label>') +
          '<div class="row" style="margin-left:auto"><button class="btn sm ghost" data-reset>' + ic('refresh') + 'Atur ulang</button></div></div>';
        $$('select[data-f]', host).forEach((s) => { s.onchange = () => { const k = s.dataset.f; F[k] = s.value; if (k === 'divisi') { F.sub = ''; F.blok = ''; F.mandor = ''; } if (k === 'sub') { F.blok = ''; F.mandor = ''; } if (k === 'blok') F.mandor = ''; if (k === 'mandor') { F.blok = ''; } Ctx.simpanFilter(); gambar(); onChange && onChange(k); }; });
        $('[data-reset]', host).onclick = () => { const p = F.periode; Object.keys(F).forEach((k) => delete F[k]); F.periode = p; Ctx.simpanFilter(); gambar(); onChange && onChange('reset'); };
      }
      const U = UI; gambar(); Ctx.simpanFilter(); return { ulang: gambar };
    },
    // Modal "Dari mana angka ini?"
    async asal(metrik, level, kode, periode) {
      let d; try { d = await API.call('rekap.asal', { periode: periode, level: level, kode: kode, metrik: metrik }); } catch (e) { return UI.toastErr(e); }
      const rows = Object.keys(d.masukan || {}).map((k) => { const v = d.masukan[k]; return '<tr><td>' + esc(k) + '</td><td class="num b">' + (typeof v === 'number' ? fmt.n(v, Math.abs(v) < 5 && v % 1 ? 4 : 2).replace(/,?0+$/, (m) => (m.indexOf(',') === 0 ? '' : m)) : esc(v)) + '</td></tr>'; }).join('');
      const rm = (d.rumus || []).map((r) => '<div class="card flat" style="padding:10px 12px"><div class="b">' + esc(r.kode) + ' — ' + esc(r.nama || '') + (r.versi ? ' <span class="badge info">v' + esc(r.versi) + '</span>' : '') + '</div><div class="small muted" style="margin-top:4px">' + esc(r.penjelasan || '') + '</div></div>').join('');
      const body = '<div class="small muted">' + esc(NAMA_M[metrik] || metrik) + ' · ' + esc(level === 'GT' ? 'Seluruh estate' : level + ' ' + kode) + ' · ' + fmt.bulan(periode) + '</div><div class="kpi"><div class="v">' + nilaiM(metrik, d.nilai, metrik === 'rend' ? 2 : 1) + '<span class="u">' + esc(SATUAN[metrik] || '') + '</span></div></div>' + rm + '<div class="tw"><table class="tbl compact"><thead><tr><th>Masukan</th><th class="num">Nilai</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="small">Sumber data: <b>' + esc(d.sumber || '-') + '</b></div>' + (d.catatan ? '<div class="banner info">' + ic('info') + '<div>' + esc(d.catatan) + '</div></div>' : '');
      const r = await UI.modal({ title: 'Dari mana angka ini?', body: body, size: 'lg', foot: [{ label: 'Tutup', val: false }, { label: 'Lihat rincian harian', cls: 'pri', ic: 'list', val: 'drill' }] });
      if (r === 'drill') K.drill(d.drill.periode, d.drill.level, d.drill.kode);
    },
    async drill(periode, level, kode) {
      let d; try { d = await API.call('rekap.drill', { periode: periode, level: level, kode: kode }); } catch (e) { return UI.toastErr(e); }
      const tgl = d.kolom[0] === 'tanggal'; const cols = d.kolom.map((k, i) => ({ h: k.toUpperCase(), num: i >= (level === 'blok' ? 3 : 1), v: (r) => r[i], fmt: (v) => (i === 0 ? fmt.tgl(v) : (typeof v === 'number' ? fmt.n(v, k === 'kg' || k === 'hk' && false ? 0 : (k === 'ha' || k === 'hk' ? 2 : 0)) : esc(v))), sort: true }));
      const host = UI.el('<div></div>'); UI.tabel(host, cols, d.baris, { zebra: true, maxH: 420 });
      const sum = UI.sum(d.baris, (r) => r[r.length - 1]);
      await UI.modal({ title: 'Rincian ' + (level === 'GT' ? 'Estate' : level + ' ' + kode) + ' — ' + fmt.bulan(periode), body: host, size: 'lg', foot: [{ label: 'Unduh CSV', ic: 'download', fn: () => { UI.unduhCSV('rincian_' + level + '_' + kode + '_' + periode + '.csv', d.kolom, d.baris); return false; } }, { label: 'Tutup', cls: 'pri', val: true }], onOpen: (ov) => { ov.querySelector('.mh h3').insertAdjacentHTML('afterend', '<span class="badge info">' + d.baris.length + ' baris · Σ ' + fmt.n(sum) + ' Kg</span>'); } });
    },
    // Adaptasi data umum -> spesifikasi grafik. d = {x:[...], seri:[{nama,v}]}
    TIPE_SERI: ['garis', 'step', 'area', 'area_tumpuk', 'batang', 'batang_kelompok', 'batang_tumpuk', 'batang_100', 'kombo', 'waterfall', 'heatmap', 'radar', 'boxplot', 'histogram', 'kalender'],
    TIPE_KAT: ['batang_h', 'batang', 'pareto', 'donat', 'pie', 'treemap', 'funnel', 'radar', 'waterfall', 'heatmap', 'batang_tumpuk', 'garis', 'area', 'scatter'],
    adaptasi(tipe, d, o) {
      o = o || {}; const base = { tipe: tipe, h: o.h, fmt: o.fmt, target: o.target, targetLabel: o.targetLabel }; const x = d.x || [], s = d.seri || [];
      if (['pie', 'donat', 'treemap', 'funnel'].indexOf(tipe) >= 0) return Object.assign(base, { item: x.map((n, i) => ({ n: n, v: Math.max(0, (s[0] && s[0].v[i]) || 0) })).filter((i) => i.v > 0), pusatLabel: o.unit });
      if (tipe === 'waterfall') { const v = s[0] ? s[0].v : []; return Object.assign(base, { item: x.map((n, i) => ({ n: n, v: i === 0 ? v[0] : (v[i] || 0) - (v[i - 1] || 0), total: i === 0 })).concat([{ n: 'Akhir', total: true }]) }); }
      if (tipe === 'radar') return Object.assign(base, { sumbu: x, seri: s });
      if (tipe === 'heatmap') return Object.assign(base, { baris: s.map((q) => q.nama), kolom: x, v: s.map((q) => q.v) });
      if (tipe === 'boxplot') return Object.assign(base, { kelompok: s.map((q) => ({ n: q.nama, nilai: q.v.filter((z) => z !== null) })) });
      if (tipe === 'histogram') return Object.assign(base, { nilai: (s[0] ? s[0].v : []).filter((z) => z !== null), nama: s[0] && s[0].nama });
      if (tipe === 'kalender') return /^\d{4}-\d{2}-\d{2}$/.test(x[0] || '') ? Object.assign(base, { hari: x.map((t, i) => ({ t: t, v: s[0] ? s[0].v[i] : null })) }) : Object.assign(base, { tipe: 'garis', x: x, seri: s });
      if (tipe === 'scatter' || tipe === 'bubble') return Object.assign(base, { titik: s.length >= 2 ? x.map((n, i) => ({ x: s[0].v[i], y: s[1].v[i], n: n })) : x.map((n, i) => ({ x: i + 1, y: s[0] ? s[0].v[i] : 0, n: n })), xLabel: s[0] && s[0].nama, yLabel: s[1] ? s[1].nama : s[0] && s[0].nama });
      if (tipe === 'kombo' && s.length > 1) return Object.assign(base, { x: x, seri: s.map((q, i) => (i ? Object.assign({}, q, { tipe: 'garis', sumbu: 2 }) : q)), fmt2: o.fmt2 });
      return Object.assign(base, { x: x, seri: s });
    },
    // Kartu grafik dengan pemilih jenis, unduh PNG/CSV. build(tipe)->spec
    kartuGrafik(host, o) {
      const id = 'cg' + Math.random().toString(36).slice(2, 7); let tipe = o.tipe;
      host.classList.add('widget');
      host.innerHTML = '<div class="wh"><h4 title="' + esc(o.judul) + '">' + esc(o.judul) + '</h4>' + (o.opsi && o.opsi.length > 1 ? '<select class="sel sm" aria-label="Jenis grafik">' + o.opsi.map((t) => '<option value="' + t + '"' + (t === tipe ? ' selected' : '') + '>' + (Charts.NAMA[t] || t) + '</option>').join('') + '</select>' : '') +
        '<button class="btn sm ghost ic-only" data-png title="Unduh gambar (PNG)" aria-label="Unduh PNG">' + ic('img') + '</button>' + (o.csv ? '<button class="btn sm ghost ic-only" data-csv title="Unduh data (CSV)" aria-label="Unduh CSV">' + ic('download') + '</button>' : '') + '</div><div id="' + id + '" class="chart"></div>' + (o.catatan ? '<div class="xs muted">' + esc(o.catatan) + '</div>' : '');
      const cv = $('#' + id, host);
      function gambar() { cv.innerHTML = ''; const spec = o.build(tipe); if (!spec) { cv.innerHTML = UI.kosong('Tidak ada data untuk grafik ini.', 'bar'); return; } Charts.render(cv, spec); }
      const sel = $('select', host); if (sel) sel.onchange = () => { tipe = sel.value; gambar(); o.onTipe && o.onTipe(tipe); };
      $('[data-png]', host).onclick = async () => { try { const r = await Charts.png(cv, 2, getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff'); UI.unduh((o.judul || 'grafik').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + '.png', r.blob); } catch (e) { UI.toastErr(e); } };
      const bc = $('[data-csv]', host); if (bc) bc.onclick = () => { const c = o.csv(); UI.unduhCSV((o.judul || 'data').replace(/\W+/g, '_') + '.csv', c.head, c.rows); };
      gambar(); return { ulang: gambar, cv: cv, tipe: () => tipe };
    },
    // Pilih beberapa periode berurutan untuk deret
    petaKunci(arr, k) { const m = {}; (arr || []).forEach((r) => { m[r[k]] = r; }); return m; },
    // Penanda kapasitas
    kapasitasWarna(p) { return p > 70 ? 'bad' : p >= 50 ? 'warn' : ''; },
    kosongSeed(host) { return UI.kosong('Belum ada data produksi.', 'leaf'); },
    sandiKuat(s) { return s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s); }
  };
  window.K = K;
})();
