/* Data Produksi v2 — Analisa Pucuk: ringkasan bulanan + tren, daftar pengamatan, input (per tanggal/sub/blok × parameter). Parameter bisa diatur di Pengaturan. */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;
  const natur = (a, b) => String(a).localeCompare(String(b), 'id', { numeric: true });
  const kunci = (t, s, b, p) => t + '|' + s + '|' + (b || '') + '|' + p;
  const n2 = (v) => (v === null || v === undefined || isNaN(v) ? '–' : fmt.n(v, 2));
  const tglValid = (t) => /^\d{4}-\d{2}-\d{2}$/.test(t) && !isNaN(new Date(t + 'T00:00:00').getTime());
  const hariIni = (p) => { const d = new Date(), s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return s.slice(0, 7) === p ? s : p + '-01'; };

  Pages.pucuk = {
    judul: 'Analisa Pucuk', scopes: ['data', 'pucuk', 'master', 'periode', 'set'],
    mount(host, params) {
      const S = { tab: (params && params.tab) || 'ringkas', p: (params && params.p) || Ctx.filter.periode || UI.periodeNow(), sub: '', par: '', M: null, subs: [], pars: [], pl: [], baris: [], terpotong: false, ring: null, tok: 0, baru: [], hapus: new Set(), edit: {}, kp: '' };
      const tulis = Ctx.can('harian.tulis');
      host.innerHTML = '<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="f">Periode<select class="sel" id="pp"></select></label><label class="f">Sub-wilayah<select class="sel" id="ps"></select></label><label class="f" id="fpar">Parameter<select class="sel" id="pr"></select></label><span style="flex:1"></span><button class="btn" id="xl">' + ic('download') + 'Excel</button></div></div>' +
        '<div class="seg" id="tb" style="margin-top:12px"><button data-t="ringkas">Ringkasan</button><button data-t="data">Pengamatan' + (tulis ? ' &amp; input' : '') + '</button></div><div id="tc" style="margin-top:12px"></div>';
      const tc = $('#tc', host);
      const adaPerubahan = () => S.baru.length || S.hapus.size || Object.keys(S.edit).length;
      async function lepas() { if (!adaPerubahan()) return true; return UI.konfirmasi('Ada perubahan yang belum disimpan. Tinggalkan tanpa menyimpan?', { ya: 'Buang perubahan', bahaya: true }); }
      const bersih = () => { S.baru = []; S.hapus = new Set(); S.edit = {}; };

      async function siap() {
        try { const b = await Ctx.boot(); S.M = b.master || {}; S.pl = b.periodeList || []; } catch (e) { tc.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; return false; }
        const sc = Ctx.cakupan; S.subs = (S.M.sub_wilayah || []).filter((s) => s.jenis === 'sub' && (!sc || sc.indexOf(s.divisi) >= 0)).sort((a, b) => natur(a.kode, b.kode));
        if (!S.pl.some((x) => x.p === S.p)) S.pl = S.pl.concat([{ p: S.p, status: 'Draf' }]);
        $('#pp', host).innerHTML = K.opsiPeriode(S.pl, S.p);
        $('#ps', host).innerHTML = '<option value="">Semua sub</option>' + S.subs.map((s) => '<option value="' + esc(s.kode) + '"' + (s.kode === S.sub ? ' selected' : '') + '>' + esc(s.kode + (s.nama ? ' — ' + s.nama : '')) + '</option>').join('');
        return true;
      }
      function isiParameter() { $('#pr', host).innerHTML = '<option value="">Semua parameter</option>' + S.pars.map((p) => '<option value="' + esc(p) + '"' + (p === S.par ? ' selected' : '') + '>' + esc(p) + '</option>').join(''); }

      $('#pp', host).onchange = async (e) => { if (!(await lepas())) { e.target.value = S.p; return; } bersih(); S.p = e.target.value; Ctx.filter.periode = S.p; Ctx.simpanFilter(); muat(); };
      $('#ps', host).onchange = async (e) => { if (!(await lepas())) { e.target.value = S.sub; return; } bersih(); S.sub = e.target.value; muat(); };
      $('#pr', host).onchange = (e) => { S.par = e.target.value; if (S.tab === 'data') data(); };
      $$('#tb button', host).forEach((b) => { b.onclick = async () => { if (!(await lepas())) return; bersih(); S.tab = b.dataset.t; muat(); }; });
      $('#xl', host).onclick = async () => {
        try {
          if (S.tab === 'ringkas' && S.ring) { await UI.unduhXLSX('analisa-pucuk-ringkasan-' + S.p + '.xlsx', [{ nama: 'Ringkasan', head: ['Parameter', 'Jumlah', 'Rata-rata', 'Min', 'Maks'], rows: (S.ring.statistik || []).map((x) => [x.parameter, x.n, x.rata, x.min, x.maks]) }]); }
          else { await UI.unduhXLSX('analisa-pucuk-' + S.p + '.xlsx', [{ nama: 'Pengamatan', head: ['Tanggal', 'Sub', 'Blok', 'Parameter', 'Nilai', 'Catatan', 'Oleh'], rows: S.baris.map((x) => [x.t, x.s, x.b, x.par, x.v, x.cat, x.oleh]) }]); }
        } catch (e) { UI.toastErr(e); }
      };

      async function muat() {
        $$('#tb button', host).forEach((b) => b.classList.toggle('on', b.dataset.t === S.tab));
        $('#fpar', host).style.display = S.tab === 'data' ? '' : 'none';
        const t = ++S.tok; tc.innerHTML = '<div class="card">' + UI.skel(5, 18) + '</div>';
        try {
          const [d, r] = await Promise.all([API.call('pucuk.daftar', { periode: S.p, sub: S.sub || undefined }), API.call('pucuk.ringkas', { periode: S.p })]);
          if (t !== S.tok) return;
          S.baris = d.baris || []; S.terpotong = !!d.terpotong; S.ring = r; S.pars = (d.parameter && d.parameter.length ? d.parameter : (r.parameter || [])).slice();
          S.baris.forEach((x) => { if (S.pars.indexOf(x.par) < 0) S.pars.push(x.par); });
          if (S.par && S.pars.indexOf(S.par) < 0) S.par = '';
          isiParameter();
          if (S.tab === 'data') data(); else ringkas();
        } catch (e) { if (t === S.tok) tc.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; }
      }

      // ---- Ringkasan ----
      function ringkas() {
        const R = S.ring || {}, st = R.statistik || [];
        if (!st.length) { tc.innerHTML = '<div class="card">' + UI.kosong('Belum ada pengamatan analisa pucuk pada ' + fmt.bulan(S.p) + '.' + (tulis ? ' Tambahkan lewat tab Pengamatan & input.' : ''), 'leaf') + '</div>'; return; }
        const subKode = UI.unik([].concat.apply([], st.map((x) => x.perSub.map((q) => q.sub)))).sort(natur);
        const adaSub = (x, s) => (x.perSub.filter((q) => q.sub === s)[0] || {}).rata;
        const totalN = st.reduce((a, x) => a + x.n, 0);
        if (!S.kp || !st.some((x) => x.parameter === S.kp)) S.kp = st[0].parameter;
        tc.innerHTML = '<div class="g g3" style="margin-bottom:12px"><div class="card kpi"><div class="l">Jumlah pengamatan</div><div class="v">' + fmt.n(totalN) + '</div></div><div class="card kpi"><div class="l">Parameter terisi</div><div class="v">' + fmt.n(st.length) + '</div></div><div class="card kpi"><div class="l">Sub-wilayah teramati</div><div class="v">' + fmt.n(subKode.length) + '</div></div></div>' +
          '<div class="card"><h3 style="margin-top:0">Ringkasan ' + esc(fmt.bulan(S.p)) + '</h3><div class="tw"><table class="tbl"><thead><tr><th>Parameter</th><th class="num">Jumlah</th><th class="num">Rata-rata</th><th class="num">Min</th><th class="num">Maks</th>' + subKode.map((s) => '<th class="num">' + esc(s) + '</th>').join('') + '</tr></thead><tbody>' +
          st.map((x) => '<tr><td>' + esc(x.parameter) + '</td><td class="num">' + fmt.n(x.n) + '</td><td class="num"><b>' + n2(x.rata) + '</b></td><td class="num">' + n2(x.min) + '</td><td class="num">' + n2(x.maks) + '</td>' + subKode.map((s) => '<td class="num">' + n2(adaSub(x, s)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div><div class="hint" style="margin-top:6px">Kolom sub-wilayah menampilkan rata-rata per sub.</div></div>' +
          '<div class="g g2" style="margin-top:12px"><div class="card"><h3 style="margin-top:0">Tren 12 bulan</h3><div id="g1"></div></div><div class="card"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><h3 style="margin:0">Dibanding Yield/Ha</h3><select class="sel" id="kp">' + st.map((x) => '<option value="' + esc(x.parameter) + '"' + (x.parameter === S.kp ? ' selected' : '') + '>' + esc(x.parameter) + '</option>').join('') + '</select></div><div id="g2"></div></div></div>';
        gambarGrafik();
        $('#kp', tc).onchange = (e) => { S.kp = e.target.value; gambarGrafik(); };
      }
      function gambarGrafik() {
        const T = (S.ring && S.ring.tren) || { periode: [], seri: [], yield: [] }, x = T.periode.map((p) => fmt.bulan(p, true));
        const g1 = $('#g1', tc), g2 = $('#g2', tc); if (!g1 || !g2) return;
        const seri = T.seri.filter((q) => q.nilai.some((v) => v !== null)).map((q) => ({ nama: q.parameter, v: q.nilai }));
        if (seri.length) Charts.render(g1, K.adaptasi('garis', { x: x, seri: seri }, { h: 240, fmt: (v) => fmt.n(v, 1) })); else g1.innerHTML = UI.kosong('Belum ada data tren.', 'trend');
        const q = T.seri.filter((z) => z.parameter === S.kp)[0];
        if (q && T.yield.some((v) => v !== null)) Charts.render(g2, K.adaptasi('kombo', { x: x, seri: [{ nama: 'Yield/Ha (Kg)', v: T.yield }, { nama: S.kp, v: q.nilai }] }, { h: 240, fmt: (v) => fmt.n(v, 0), fmt2: (v) => fmt.n(v, 1) })); else g2.innerHTML = UI.kosong('Yield/Ha belum tersedia untuk periode ini (butuh data teh kering).', 'trend');
      }

      // ---- Pengamatan & input ----
      function data() {
        const tampil = S.baris.filter((x) => !S.par || x.par === S.par);
        let h = '';
        if (tulis) h += formInput();
        h += '<div class="card" style="margin-top:12px"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><h3 style="margin:0;flex:1">Pengamatan tersimpan <span class="muted">(' + fmt.n(tampil.length) + ')</span></h3>' + (tulis ? '<button class="btn pri" id="sm" disabled>' + ic('save') + 'Simpan perubahan</button>' : '') + '</div>';
        if (S.terpotong) h += '<div class="banner warn" style="margin-top:8px">' + ic('alert') + '<div>Daftar dipotong 3.000 baris pertama. Persempit dengan filter sub-wilayah atau parameter.</div></div>';
        h += tampil.length ? '<div class="tw" style="margin-top:8px"><table class="tbl" id="dt"><thead><tr><th>Tanggal</th><th>Sub</th><th>Blok</th><th>Parameter</th><th class="num">Nilai</th><th>Catatan</th><th>Oleh</th>' + (tulis ? '<th></th>' : '') + '</tr></thead><tbody>' +
          tampil.map((x) => '<tr data-id="' + esc(x.id) + '">' + '<td>' + esc(x.t) + '</td><td>' + esc(x.s) + '</td><td>' + esc(x.b || '–') + '</td><td>' + esc(x.par) + '</td><td class="num">' + (tulis ? '<input class="inp" data-e="v" type="text" inputmode="decimal" value="' + esc(x.v === null ? '' : String(x.v).replace('.', ',')) + '" style="width:90px;text-align:right">' : n2(x.v)) + '</td><td>' + (tulis ? '<input class="inp" data-e="cat" type="text" maxlength="200" value="' + esc(x.cat) + '">' : esc(x.cat)) + '</td><td>' + esc(x.oleh) + '</td>' + (tulis ? '<td><button class="btn sm ghost" data-del="' + esc(x.id) + '" aria-label="Hapus">' + ic('trash') + '</button></td>' : '') + '</tr>').join('') + '</tbody></table></div>' : '<div style="margin-top:8px">' + UI.kosong('Belum ada pengamatan' + (S.par || S.sub ? ' untuk filter ini' : '') + '.', 'leaf') + '</div>';
        h += '</div>';
        tc.innerHTML = h;
        if (tulis) pasangForm();
        pasangTabel(tampil);
        segarkanSimpan();
      }
      function formInput() {
        const blok = (S.M.blok || []).filter((x) => x.aktif !== false);
        const subOpts = S.subs.map((s) => '<option value="' + esc(s.kode) + '">' + esc(s.kode + (s.nama ? ' — ' + s.nama : '')) + '</option>').join('');
        return '<div class="card"><h3 style="margin-top:0">Tambah pengamatan</h3><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="f">Tanggal<input class="inp" id="ft" type="date" value="' + hariIni(S.p) + '" min="' + S.p + '-01" max="' + S.p + '-31"></label><label class="f">Sub-wilayah<select class="sel" id="fs">' + subOpts + '</select></label><label class="f">Blok (opsional)<select class="sel" id="fb"><option value="">— seluruh sub —</option></select></label></div>' +
          '<div class="g g3" style="margin-top:10px">' + S.pars.map((p, i) => '<label class="f">' + esc(p) + '<input class="inp" data-p="' + i + '" type="text" inputmode="decimal" placeholder="nilai" autocomplete="off"></label>').join('') + '</div>' +
          '<label class="f" style="margin-top:10px">Catatan (opsional)<input class="inp" id="fc" type="text" maxlength="200"></label>' +
          '<div class="row" style="gap:8px;margin-top:12px"><button class="btn" id="fa">' + ic('plus') + 'Tambahkan ke daftar</button><span class="hint">Isi parameter yang diamati saja; yang kosong dilewati. Nilai baru belum tersimpan sampai "Simpan perubahan".</span></div>' +
          '<div id="bw">' + (S.baru.length ? '' : '') + '</div></div>';
      }
      function pasangForm() {
        const fs = $('#fs', tc), fb = $('#fb', tc), ft = $('#ft', tc);
        if (S.sub) fs.value = S.sub;
        const isiBlok = () => { const l = (S.M.blok || []).filter((x) => x.aktif !== false && String(x.sub) === fs.value).sort((a, b) => natur(a.kode, b.kode)); fb.innerHTML = '<option value="">— seluruh sub —</option>' + l.map((x) => '<option value="' + esc(x.kode) + '">Blok ' + esc(x.kode) + '</option>').join(''); };
        isiBlok(); fs.onchange = isiBlok;
        $('#fa', tc).onclick = () => {
          const t = ft.value; if (!tglValid(t) || t.slice(0, 7) !== S.p) { UI.toast('Tanggal harus berada pada ' + fmt.bulan(S.p) + '.', 'warn'); return; }
          let n = 0, salah = 0;
          $$('[data-p]', tc).forEach((inp) => {
            const raw = inp.value.trim(); if (!raw) return;
            const v = UI.num(raw); if (v === null) { salah++; inp.style.outline = '2px solid var(--dng)'; return; }
            inp.style.outline = '';
            const x = { tanggal: t, sub: fs.value, blok: fb.value, parameter: S.pars[Number(inp.dataset.p)], nilai: v, catatan: $('#fc', tc).value.trim() };
            const k = kunci(x.tanggal, x.sub, x.blok, x.parameter), i = S.baru.findIndex((q) => kunci(q.tanggal, q.sub, q.blok, q.parameter) === k);
            if (i >= 0) S.baru[i] = x; else S.baru.push(x); n++; inp.value = '';
          });
          if (salah) { UI.toast(salah + ' nilai bukan angka.', 'warn'); }
          if (!n && !salah) UI.toast('Isi minimal satu parameter.', 'warn');
          if (n) { UI.toast(n + ' nilai ditambahkan ke daftar.'); gambarBaru(); }
        };
        gambarBaru();
      }
      function gambarBaru() {
        const w = $('#bw', tc); if (!w) { segarkanSimpan(); return; }
        w.innerHTML = S.baru.length ? '<h4 style="margin:14px 0 6px">Baru — belum disimpan (' + S.baru.length + ')</h4><div class="tw"><table class="tbl"><thead><tr><th>Tanggal</th><th>Sub</th><th>Blok</th><th>Parameter</th><th class="num">Nilai</th><th></th></tr></thead><tbody>' + S.baru.map((x, i) => '<tr><td>' + esc(x.tanggal) + '</td><td>' + esc(x.sub) + '</td><td>' + esc(x.blok || '–') + '</td><td>' + esc(x.parameter) + '</td><td class="num">' + n2(x.nilai) + '</td><td><button class="btn sm ghost" data-rm="' + i + '" aria-label="Buang">' + ic('x') + '</button></td></tr>').join('') + '</tbody></table></div>' : '';
        $$('[data-rm]', w).forEach((b) => { b.onclick = () => { S.baru.splice(Number(b.dataset.rm), 1); gambarBaru(); }; });
        segarkanSimpan();
      }
      function pasangTabel(tampil) {
        const dt = $('#dt', tc); if (!dt) return;
        const byId = {}; tampil.forEach((x) => { byId[x.id] = x; });
        $$('input[data-e]', dt).forEach((inp) => { inp.oninput = () => {
          const tr = inp.closest('tr'), id = tr.dataset.id, x = byId[id], ed = S.edit[id] || (S.edit[id] = {});
          const vIn = $('[data-e="v"]', tr).value.trim(), cIn = $('[data-e="cat"]', tr).value.trim();
          const v = vIn === '' ? null : UI.num(vIn);
          if (vIn !== '' && v === null) { $('[data-e="v"]', tr).style.outline = '2px solid var(--dng)'; ed.salah = true; } else { $('[data-e="v"]', tr).style.outline = ''; delete ed.salah; }
          ed.v = v; ed.cat = cIn;
          if (!ed.salah && v === x.v && cIn === (x.cat || '')) delete S.edit[id];
          tr.style.background = S.edit[id] ? 'var(--sel, #fffbe6)' : ''; segarkanSimpan();
        }; });
        $$('[data-del]', dt).forEach((b) => { b.onclick = () => { const id = b.dataset.del, tr = b.closest('tr'); if (S.hapus.has(id)) { S.hapus.delete(id); tr.style.opacity = ''; tr.style.textDecoration = ''; } else { S.hapus.add(id); tr.style.opacity = '.45'; tr.style.textDecoration = 'line-through'; } segarkanSimpan(); }; });
      }
      function segarkanSimpan() {
        const b = $('#sm', tc); if (!b) return;
        const salah = Object.keys(S.edit).some((k) => S.edit[k].salah);
        const n = S.baru.length + S.hapus.size + Object.keys(S.edit).length;
        b.disabled = !n || salah; b.innerHTML = ic('save') + 'Simpan perubahan' + (n ? ' (' + n + ')' : '');
        b.onclick = simpan;
      }
      async function simpan() {
        const b = $('#sm', tc); const byId = {}; S.baris.forEach((x) => { byId[x.id] = x; });
        const rows = S.baru.slice();
        Object.keys(S.edit).forEach((id) => { if (S.hapus.has(id)) return; const x = byId[id], e = S.edit[id]; if (!x || e.v === null || e.v === undefined) return; rows.push({ tanggal: x.t, sub: x.s, blok: x.b, parameter: x.par, nilai: e.v, catatan: e.cat }); });
        const kosongNilai = Object.keys(S.edit).filter((id) => !S.hapus.has(id) && (S.edit[id].v === null || S.edit[id].v === undefined)).length;
        if (kosongNilai) { UI.toast(kosongNilai + ' baris dikosongkan nilainya — hapus barisnya bila memang tidak diperlukan.', 'warn'); return; }
        const hapus = Array.from(S.hapus);
        if (hapus.length && !(await UI.konfirmasi('Hapus ' + hapus.length + ' pengamatan terpilih?', { ya: 'Hapus', bahaya: true }))) return;
        b.disabled = true;
        try {
          let baru = 0, diubah = 0, dihapus = 0, tolak = [];
          for (let i = 0; i < Math.max(1, Math.ceil(rows.length / 500), Math.ceil(hapus.length / 500)); i++) {
            const r = await API.call('pucuk.simpan', { rows: rows.slice(i * 500, (i + 1) * 500), hapus: hapus.slice(i * 500, (i + 1) * 500) });
            baru += r.baru; diubah += r.diubah; dihapus += r.dihapus; tolak = tolak.concat(r.ditolak || []);
          }
          bersih();
          UI.toast('Tersimpan: ' + baru + ' baru, ' + diubah + ' diubah, ' + dihapus + ' dihapus.' + (tolak.length ? ' ' + tolak.length + ' ditolak.' : ''), tolak.length ? 'warn' : 'ok');
          if (tolak.length) UI.modal({ title: 'Baris ditolak', body: '<ul>' + tolak.slice(0, 30).map((t) => '<li>Baris ' + t.no + ': ' + esc(t.alasan) + '</li>').join('') + '</ul>' });
          muat();
        } catch (e) { b.disabled = false; UI.toastErr(e); }
      }

      window.addEventListener('beforeunload', peringatan);
      function peringatan(e) { if (adaPerubahan()) { e.preventDefault(); e.returnValue = ''; } }
      (async () => { if (await siap()) muat(); })();
      return { refresh() { if (!adaPerubahan()) muat(); }, destroy() { window.removeEventListener('beforeunload', peringatan); } };
    }
  };
})();
