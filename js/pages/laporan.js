/* Data Produksi v2 — Laporan: pratinjau, template (bagian yang dipilih), unduh PDF (server) / Excel / PowerPoint / gambar, mode presentasi. */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;
  const BAGIAN = [['kpi', 'Indikator utama'], ['narasi', 'Narasi'], ['sub', 'Rekap per sub-wilayah'], ['divisi', 'Rekap per divisi'], ['blok', 'Blok terbaik & terendah'], ['tren', 'Tren 12 bulan'], ['isu', 'Isu & gagasan tindak lanjut']];
  const BAWAAN = { id: '', nama: 'Laporan standar (bawaan)', judul: 'Laporan Produksi', bagian: BAGIAN.map((b) => b[0]) };
  const pc = (v, d) => (v === null || v === undefined ? '–' : fmt.pct(v, d === undefined ? 2 : d));
  const nn = (v, d) => (v === null || v === undefined ? '–' : fmt.n(v, d || 0));
  const slug = (s) => String(s || 'laporan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function b64Blob(b64, mime) { const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); }

  // ---------- Pratinjau (cermin dari PDF di server) ----------
  function tabelBaris(judul, baris, kolom) {
    if (!baris || !baris.length) return '';
    return '<h3 class="lp-h">' + esc(judul) + '</h3><div class="tw"><table class="tbl"><thead><tr><th>' + esc(kolom) + '</th><th class="num">GL (Kg)</th><th class="num">HK</th><th class="num">Kg/HK</th><th class="num">MT (Kg)</th><th class="num">Yield (Kg/Ha)</th></tr></thead><tbody>' +
      baris.map((r) => '<tr><td>' + esc(r.k) + '</td><td class="num">' + nn(r.gl) + '</td><td class="num">' + nn(r.hk) + '</td><td class="num">' + nn(r.kghk, 1) + '</td><td class="num">' + nn(r.mt) + '</td><td class="num">' + nn(r.y, 1) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  function delta(a, b) { if (a === null || a === undefined || !b) return ''; const c = (a - b) / Math.abs(b); return ' <span class="' + (c >= 0 ? 'ok' : 'bad') + '" style="font-size:.8em">(' + (c >= 0 ? '+' : '') + fmt.n(c * 100, 1) + '%)</span>'; }
  function htmlPratinjau(L) {
    const w = L.bagian, k = L.kpi.sekarang, lb = L.kpi.lalu; let h = '';
    h += '<div class="lp-head"><div class="muted">' + esc(L.perusahaan) + '</div><h2 style="margin:2px 0">' + esc(L.judul) + '</h2><div>' + esc(L.label) + ' · ' + esc(L.lingkup) + ' · Status: ' + esc(L.status) + '</div></div>';
    if (w.indexOf('kpi') >= 0 && k) {
      h += '<div class="g g5" style="margin:10px 0">' + [['GL (Kg)', nn(k.gl) + delta(k.gl, lb && lb.gl)], ['MT (Kg)', nn(k.mt) + delta(k.mt, lb && lb.mt)], ['Rendemen', pc(k.rend)], ['Yield (Kg/Ha)', nn(k.y, 1) + delta(k.y, lb && lb.y)], ['Kg GL/HK', nn(k.kghk, 1) + delta(k.kghk, lb && lb.kghk)]].map((x) => '<div class="card kpi"><div class="l">' + esc(x[0]) + '</div><div class="v" style="font-size:1.3rem">' + x[1] + '</div></div>').join('') + '</div><div class="hint">Perubahan dibanding ' + esc(L.kpi.labelLalu) + '.</div>';
    }
    if (w.indexOf('narasi') >= 0) (L.narasi || []).forEach((b) => { if (b.bagian === 'isu' || b.bagian === 'gagasan' || !b.teks) return; h += '<h3 class="lp-h">' + esc(b.judul) + '</h3><p class="lp-p">' + esc(b.teks).replace(/\n/g, '<br>') + '</p>'; });
    if (w.indexOf('sub') >= 0) h += tabelBaris('Rekap per Sub-wilayah', L.sub, 'Sub');
    if (w.indexOf('divisi') >= 0) h += tabelBaris('Rekap per Divisi', L.divisi, 'Divisi');
    if (w.indexOf('blok') >= 0) { h += tabelBaris('Blok dengan Yield Tertinggi', L.blokTerbaik, 'Blok'); h += tabelBaris('Blok dengan Yield Terendah', L.blokTerendah, 'Blok'); }
    if (w.indexOf('tren') >= 0 && (L.tren || []).length) h += '<h3 class="lp-h">Tren 12 Bulan Terakhir</h3><div id="lpg"></div>';
    if (w.indexOf('isu') >= 0) (L.narasi || []).forEach((b) => { if ((b.bagian !== 'isu' && b.bagian !== 'gagasan') || !b.teks) return; h += '<h3 class="lp-h">' + esc(b.judul) + '</h3><p class="lp-p">' + esc(b.teks).replace(/\n/g, '<br>') + '</p>'; });
    h += '<div class="hint" style="margin-top:14px;border-top:1px solid var(--line);padding-top:6px">Dibuat otomatis oleh ' + esc(L.namaApp) + ' pada ' + esc(String(L.dibuat || '').slice(0, 16).replace('T', ' ')) + '.' + (L.penandatangan ? ' ' + esc(L.penandatangan) : '') + '</div>';
    return h;
  }
  const spekTren = (L) => K.adaptasi('kombo', { x: L.tren.map((x) => fmt.bulan(x.p, true)), seri: [{ nama: 'GL (Kg)', v: L.tren.map((x) => x.gl) }, { nama: 'Rendemen', v: L.tren.map((x) => x.rend) }] }, { h: 260, fmt: (v) => fmt.n(v, 0), fmt2: (v) => fmt.pct(v, 1) });

  // ---------- Ekspor ----------
  async function eksporExcel(L) {
    const k = L.kpi.sekarang || {}, lb = L.kpi.lalu || {}, th = L.kpi.tahunLalu || {};
    const bar = (r) => [r.k, r.gl, r.hk, r.kghk, r.mt, r.luas, r.y, r.rend];
    const H = ['Kode', 'GL (Kg)', 'HK', 'Kg/HK', 'MT (Kg)', 'Luas (Ha)', 'Yield (Kg/Ha)', 'Rendemen'];
    const ls = [{ nama: 'Ringkasan', head: ['Indikator', L.label, L.kpi.labelLalu, L.kpi.labelTahunLalu], rows: [['GL (Kg)', k.gl, lb.gl, th.gl], ['MT (Kg)', k.mt, lb.mt, th.mt], ['Rendemen', k.rend, lb.rend, th.rend], ['Yield (Kg/Ha)', k.y, lb.y, th.y], ['Kg GL/HK', k.kghk, lb.kghk, th.kghk], ['HK', k.hk, lb.hk, th.hk]] }];
    if ((L.sub || []).length) ls.push({ nama: 'Sub-wilayah', head: H, rows: L.sub.map(bar) });
    if ((L.divisi || []).length) ls.push({ nama: 'Divisi', head: H, rows: L.divisi.map(bar) });
    const bl = (L.blokTerbaik || []).map((r) => ['Tertinggi'].concat(bar(r))).concat((L.blokTerendah || []).map((r) => ['Terendah'].concat(bar(r))));
    if (bl.length) ls.push({ nama: 'Blok', head: ['Peringkat'].concat(H), rows: bl });
    if ((L.tren || []).length) ls.push({ nama: 'Tren', head: ['Periode', 'GL (Kg)', 'MT (Kg)', 'Rendemen', 'Yield (Kg/Ha)'], rows: L.tren.map((r) => [r.p, r.gl, r.mt, r.rend, r.y]) });
    if ((L.narasi || []).length) ls.push({ nama: 'Narasi', head: ['Bagian', 'Teks'], rows: L.narasi.map((b) => [b.judul, b.teks]) });
    await UI.unduhXLSX('laporan-' + L.periode + '-' + slug(L.judul) + '.xlsx', ls);
  }
  async function gambarTren(L) {
    const h = document.createElement('div'); h.style.cssText = 'position:absolute;left:-9999px;top:0;width:920px;background:#fff'; document.body.appendChild(h);
    try { Charts.render(h, spekTren(L)); await UI.sleep(60); return await Charts.png(h, 2, '#ffffff'); } finally { h.remove(); }
  }
  async function eksporPptx(L) {
    await UI.muatPPTX();
    const P = new PptxGenJS(); P.layout = 'LAYOUT_WIDE'; P.title = L.judul + ' — ' + L.label;
    const HIJAU = '1B4332', k = L.kpi.sekarang || {}, w = L.bagian;
    const judulSlide = (s, t) => { s.addShape(P.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: HIJAU } }); s.addText(t, { x: 0.5, y: 0.12, w: 12.3, h: 0.66, fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Calibri' }); s.addText(L.perusahaan + ' · ' + L.label, { x: 0.5, y: 7.05, w: 12.3, h: 0.3, fontSize: 10, color: '64748B' }); };
    let s = P.addSlide(); s.background = { color: HIJAU };
    s.addText(L.perusahaan, { x: 0.8, y: 2.0, w: 11.7, h: 0.5, fontSize: 18, color: 'B7E4C7' }); s.addText(L.judul, { x: 0.8, y: 2.6, w: 11.7, h: 1.1, fontSize: 40, bold: true, color: 'FFFFFF' }); s.addText(L.label + ' · ' + L.lingkup, { x: 0.8, y: 3.8, w: 11.7, h: 0.6, fontSize: 22, color: 'FFFFFF' });
    if (w.indexOf('kpi') >= 0 && L.kpi.sekarang) {
      s = P.addSlide(); judulSlide(s, 'Indikator utama — ' + L.label);
      const lb = L.kpi.lalu || {}, d = (a, b) => (a === null || a === undefined || !b ? '' : ((a - b) / Math.abs(b) >= 0 ? '+' : '') + fmt.n((a - b) / Math.abs(b) * 100, 1) + '% vs ' + L.kpi.labelLalu);
      [['GL — daun basah (Kg)', nn(k.gl), d(k.gl, lb.gl)], ['MT — teh kering (Kg)', nn(k.mt), d(k.mt, lb.mt)], ['Rendemen', pc(k.rend), ''], ['Yield/Ha (Kg)', nn(k.y, 1), d(k.y, lb.y)], ['Kg GL per HK', nn(k.kghk, 1), d(k.kghk, lb.kghk)], ['Hari kerja (HK)', nn(k.hk), d(k.hk, lb.hk)]].forEach((x, i) => {
        const cx = 0.5 + (i % 3) * 4.15, cy = 1.3 + Math.floor(i / 3) * 2.7;
        s.addShape(P.ShapeType.roundRect, { x: cx, y: cy, w: 3.95, h: 2.4, fill: { color: 'F1F5F9' }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
        s.addText(x[0], { x: cx + 0.2, y: cy + 0.15, w: 3.55, h: 0.4, fontSize: 13, color: '475569' }); s.addText(x[1], { x: cx + 0.2, y: cy + 0.7, w: 3.55, h: 0.9, fontSize: 32, bold: true, color: HIJAU }); s.addText(x[2], { x: cx + 0.2, y: cy + 1.7, w: 3.55, h: 0.4, fontSize: 11, color: '64748B' });
      });
    }
    if (w.indexOf('narasi') >= 0) { const nr = (L.narasi || []).filter((b) => b.bagian !== 'isu' && b.bagian !== 'gagasan' && b.teks); if (nr.length) { s = P.addSlide(); judulSlide(s, 'Narasi'); s.addText(nr.slice(0, 4).map((b) => [{ text: b.judul + '. ', options: { bold: true, color: HIJAU } }, { text: b.teks, options: { breakLine: true } }]).reduce((a, x) => a.concat(x), []), { x: 0.6, y: 1.2, w: 12.1, h: 5.6, fontSize: 14, valign: 'top', color: '1E293B', paraSpaceAfter: 8 }); } }
    const tabel = (judul, baris, kol) => { if (!baris || !baris.length) return; const per = 12; for (let i = 0; i < baris.length; i += per) { const sl = P.addSlide(); judulSlide(sl, judul + (baris.length > per ? ' (' + (Math.floor(i / per) + 1) + ')' : '')); const hd = [kol, 'GL (Kg)', 'HK', 'Kg/HK', 'MT (Kg)', 'Yield/Ha'].map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: HIJAU }, align: t === kol ? 'left' : 'right' } })); const rw = baris.slice(i, i + per).map((r) => [{ text: String(r.k) }, { text: nn(r.gl), options: { align: 'right' } }, { text: nn(r.hk), options: { align: 'right' } }, { text: nn(r.kghk, 1), options: { align: 'right' } }, { text: nn(r.mt), options: { align: 'right' } }, { text: nn(r.y, 1), options: { align: 'right' } }]); sl.addTable([hd].concat(rw), { x: 0.5, y: 1.2, w: 12.3, fontSize: 12, border: { type: 'solid', color: 'E2E8F0', pt: 0.5 }, rowH: 0.38 }); } };
    if (w.indexOf('sub') >= 0) tabel('Rekap per sub-wilayah', L.sub, 'Sub');
    if (w.indexOf('divisi') >= 0) tabel('Rekap per divisi', L.divisi, 'Divisi');
    if (w.indexOf('blok') >= 0) { tabel('Blok dengan yield tertinggi', L.blokTerbaik, 'Blok'); tabel('Blok dengan yield terendah', L.blokTerendah, 'Blok'); }
    if (w.indexOf('tren') >= 0 && (L.tren || []).length) { try { const g = await gambarTren(L); s = P.addSlide(); judulSlide(s, 'Tren 12 bulan terakhir'); const lebar = 12.3, tinggi = Math.min(5.6, lebar * g.h / g.w); s.addImage({ data: g.url, x: 0.5, y: 1.2, w: lebar, h: tinggi }); } catch (e) { /* lewati bila grafik gagal */ } }
    if (w.indexOf('isu') >= 0) { const is = (L.narasi || []).filter((b) => (b.bagian === 'isu' || b.bagian === 'gagasan') && b.teks); if (is.length) { s = P.addSlide(); judulSlide(s, 'Isu & gagasan tindak lanjut'); s.addText(is.map((b) => [{ text: b.judul + '. ', options: { bold: true, color: HIJAU } }, { text: b.teks, options: { breakLine: true } }]).reduce((a, x) => a.concat(x), []), { x: 0.6, y: 1.2, w: 12.1, h: 5.6, fontSize: 14, valign: 'top', color: '1E293B', paraSpaceAfter: 8 }); } }
    await P.writeFile({ fileName: 'laporan-' + L.periode + '-' + slug(L.judul) + '.pptx' });
  }
  function presentasi(L) {
    const k = L.kpi.sekarang; if (!k) return UI.toast('Belum ada data untuk dipresentasikan.', 'warn');
    const kp = (lbl, v, u) => '<div class="card kpi"><div class="l">' + esc(lbl) + '</div><div class="v" style="font-size:2.4rem">' + v + '<span class="u">' + u + '</span></div></div>';
    const slides = [
      { html: '<div style="margin:auto;text-align:center"><img src="img/logo.png" alt="" style="height:90px;background:#fff;padding:10px 18px;border-radius:12px"><h1 style="font-size:2.6rem;margin-top:24px">' + esc(L.judul) + '</h1><h2 style="font-weight:500;margin-top:8px">' + esc(L.lingkup) + ' — ' + esc(L.label) + '</h2></div>' },
      { html: '<h2>Indikator utama — ' + esc(L.label) + '</h2><div class="g g3">' + kp('GL — daun basah', nn(k.gl), 'Kg') + kp('MT — teh kering', nn(k.mt), 'Kg') + kp('Rendemen', pc(k.rend), '') + kp('Yield/Ha', nn(k.y, 1), 'Kg') + kp('Kg GL/HK', nn(k.kghk, 1), 'Kg') + kp('Hari kerja', nn(k.hk), 'HK') + '</div>' }
    ];
    const nr = (L.narasi || []).filter((b) => b.bagian !== 'isu' && b.bagian !== 'gagasan' && b.teks);
    if (L.bagian.indexOf('narasi') >= 0 && nr.length) slides.push({ html: '<h2>Narasi</h2><div class="col" style="max-width:1000px;font-size:1.15rem;line-height:1.7">' + nr.slice(0, 4).map((b) => '<div><b>' + esc(b.judul) + '.</b> ' + esc(b.teks) + '</div>').join('') + '</div>' });
    if (L.bagian.indexOf('tren') >= 0 && (L.tren || []).length) slides.push({ html: '<h2>Tren 12 bulan</h2><div class="card"><div id="pg1"></div></div>', after: (r) => Charts.render($('#pg1', r), spekTren(L)) });
    if (L.bagian.indexOf('sub') >= 0 && (L.sub || []).length) slides.push({ html: '<h2>Per sub-wilayah — GL (Kg)</h2><div class="card"><div id="pg2"></div></div>', after: (r) => Charts.render($('#pg2', r), K.adaptasi('batang', { x: L.sub.map((x) => x.k), seri: [{ nama: 'GL (Kg)', v: L.sub.map((x) => x.gl) }] }, { h: 360, fmt: (v) => fmt.n(v, 0) })) });
    const is = (L.narasi || []).filter((b) => (b.bagian === 'isu' || b.bagian === 'gagasan') && b.teks);
    if (L.bagian.indexOf('isu') >= 0 && is.length) slides.push({ html: '<h2>Isu & gagasan</h2><div class="col" style="max-width:1000px;font-size:1.1rem;line-height:1.6">' + is.map((b) => '<div><b>' + esc(b.judul) + '.</b> ' + esc(b.teks) + '</div>').join('') + '</div>' });
    K.slideshow(slides);
  }

  // ---------- Halaman ----------
  Pages.laporan = {
    judul: 'Laporan', scopes: ['data', 'rekap', 'periode', 'set', 'narasi'],
    mount(host, params) {
      const S = { p: (params && (params.periode || params.p)) || Ctx.filter.periode || UI.periodeNow(), tpl: '', tpls: [], L: null, tok: 0, spek: null };
      const bisaTemplate = Ctx.can('narasi.tulis');
      host.innerHTML = '<div class="card no-print"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="f">Periode<select class="sel" id="lp"></select></label><label class="f">Template<select class="sel" id="lt"></select></label>' + (bisaTemplate ? '<button class="btn" id="te">' + ic('edit') + 'Atur template</button><button class="btn" id="tb2">' + ic('plus') + 'Template baru</button>' : '') + '<span style="flex:1"></span><button class="btn" id="lpr">' + ic('play') + 'Presentasi</button><button class="btn" id="lpp">' + ic('img') + 'Gambar</button><button class="btn" id="lx">' + ic('table') + 'Excel</button><button class="btn" id="lw">' + ic('pie') + 'PowerPoint</button><button class="btn pri" id="ld">' + ic('file') + 'PDF</button></div></div><div class="card lp" id="lpv" style="margin-top:12px">' + UI.skel(6, 18) + '</div>';
      const lv = $('#lpv', host), tombol = ['lpr', 'lpp', 'lx', 'lw', 'ld'].map((i) => $('#' + i, host));
      const aktif = (a) => tombol.forEach((b) => { b.disabled = !a; });
      aktif(false);

      async function siap() {
        const b = await Ctx.boot(); let pl = b.periodeList || []; if (!pl.some((x) => x.p === S.p)) pl = pl.concat([{ p: S.p, status: 'Draf' }]);
        $('#lp', host).innerHTML = K.opsiPeriode(pl, S.p);
        await muatTemplate();
      }
      async function muatTemplate() {
        let rows = []; try { rows = (await API.call('laporan.templateDaftar', {})).rows || []; } catch (e) { rows = []; }
        S.tpls = rows.map((r) => { let d = {}; try { d = JSON.parse(r.definisi || '{}'); } catch (e) {} return { id: r.id, nama: r.nama, judul: d.judul || r.nama, bagian: (d.bagian || []).filter((x) => BAGIAN.some((q) => q[0] === x)), oleh: r.oleh }; });
        if (S.tpl && !S.tpls.some((t) => t.id === S.tpl)) S.tpl = '';
        $('#lt', host).innerHTML = '<option value="">' + esc(BAWAAN.nama) + '</option>' + S.tpls.map((t) => '<option value="' + esc(t.id) + '"' + (t.id === S.tpl ? ' selected' : '') + '>' + esc(t.nama) + '</option>').join('');
      }
      async function muat() {
        const t = ++S.tok; aktif(false); lv.innerHTML = UI.skel(6, 18);
        try {
          const L = await API.call('laporan.data', { periode: S.p, template: S.tpl || undefined }); if (t !== S.tok) return;
          S.L = L;
          if (!L.kpi || !L.kpi.sekarang) { lv.innerHTML = UI.kosong('Belum ada data produksi untuk ' + L.label + '.', 'file'); return; }
          lv.innerHTML = htmlPratinjau(L); const g = $('#lpg', lv); if (g) Charts.render(g, spekTren(L));
          aktif(true);
        } catch (e) { if (t === S.tok) lv.innerHTML = UI.kosong(UI.galatTxt(e), 'alert'); }
      }
      $('#lp', host).onchange = (e) => { S.p = e.target.value; Ctx.filter.periode = S.p; Ctx.simpanFilter(); muat(); };
      $('#lt', host).onchange = (e) => { S.tpl = e.target.value; muat(); };
      const jalan = async (b, fn) => { const h = b.innerHTML; b.disabled = true; try { await fn(); } catch (e) { UI.toastErr(e); } finally { b.innerHTML = h; b.disabled = !S.L || !S.L.kpi || !S.L.kpi.sekarang; } };
      $('#ld', host).onclick = function () { jalan(this, async () => { this.textContent = 'Membuat PDF…'; const r = await API.call('laporan.pdf', { periode: S.p, template: S.tpl || undefined }); UI.unduh(r.nama, b64Blob(r.base64, r.mime || 'application/pdf')); UI.toast('PDF dibuat (' + fmt.n(r.ukuran / 1024, 0) + ' KB).'); }); };
      $('#lx', host).onclick = function () { jalan(this, () => eksporExcel(S.L)); };
      $('#lw', host).onclick = function () { jalan(this, async () => { this.textContent = 'Menyusun…'; await eksporPptx(S.L); }); };
      $('#lpp', host).onclick = function () { jalan(this, async () => { const g = await gambarTren(S.L); UI.unduh('tren-' + S.p + '.png', g.blob); }); };
      $('#lpr', host).onclick = () => presentasi(S.L);

      // Editor template
      const te = $('#te', host);
      if (te) { te.onclick = () => editor(false); $('#tb2', host).onclick = () => editor(true); }
      function editor(baru) {
        const cur = baru ? null : (S.tpls.filter((t) => t.id === S.tpl)[0] || null);
        const dasar = cur || { nama: '', judul: 'Laporan Produksi', bagian: BAWAAN.bagian.slice() };
        const body = '<label class="f">Nama template<input class="inp" id="tn" maxlength="60" value="' + esc(cur ? cur.nama : '') + '" placeholder="mis. Laporan bulanan manager"></label><label class="f" style="margin-top:8px">Judul laporan<input class="inp" id="tj" maxlength="80" value="' + esc(dasar.judul) + '"></label><div style="margin-top:10px"><b>Bagian yang dimuat</b></div><div class="col" style="gap:4px;margin-top:4px">' + BAGIAN.map((b) => '<label class="row" style="gap:8px"><input type="checkbox" data-b="' + b[0] + '"' + (dasar.bagian.indexOf(b[0]) >= 0 ? ' checked' : '') + '> ' + esc(b[1]) + '</label>').join('') + '</div>' + (cur ? '' : '<div class="hint" style="margin-top:8px">Template baru dimulai dari bagian standar.</div>');
        UI.modal({ title: cur ? 'Atur template: ' + cur.nama : 'Template baru', body: body, foot: [{ label: 'Batal', val: false }].concat(cur ? [{ label: 'Hapus', cls: 'dng', ic: 'trash', fn: async () => { if (!(await UI.konfirmasi('Hapus template "' + cur.nama + '"?', { ya: 'Hapus', bahaya: true }))) return false; await API.call('laporan.templateHapus', { id: cur.id }); S.tpl = ''; UI.toast('Template dihapus.'); await muatTemplate(); muat(); return true; } }] : []).concat([{ label: cur ? 'Simpan perubahan' : 'Simpan template', cls: 'pri', fn: async (ov) => {
          const nama = $('#tn', ov).value.trim(), judul = $('#tj', ov).value.trim(), bag = $$('[data-b]', ov).filter((c) => c.checked).map((c) => c.dataset.b);
          if (!nama) { UI.toast('Nama template wajib diisi.', 'warn'); return false; } if (!bag.length) { UI.toast('Pilih minimal satu bagian.', 'warn'); return false; }
          const r = await API.call('laporan.templateSimpan', { id: cur ? cur.id : undefined, nama: nama, definisi: { judul: judul || 'Laporan Produksi', bagian: bag } });
          S.tpl = r.id; UI.toast('Template disimpan.'); await muatTemplate(); muat(); return true;
        } }]) });
      }

      siap().then(muat).catch((e) => { lv.innerHTML = UI.kosong(UI.galatTxt(e), 'alert'); });
      return { refresh() { muat(); }, destroy() { S.tok++; } };
    }
  };
})();
