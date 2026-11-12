/* Data Produksi v2 — Data Master: divisi, sub-wilayah, wilayah, blok (luas berjenjang waktu), mandor, alias blok, blok–mandor. Perubahan tercatat di Riwayat. */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;
  const natur = (a, b) => String(a).localeCompare(String(b), 'id', { numeric: true });
  const aktif = (v) => !(v === false || v === 0 || /^(false|tidak|0|n)$/i.test(String(v === null || v === undefined ? '' : v)));
  const ym = (v) => String(v || '').slice(0, 7);
  const ha = (v) => (v === null || v === undefined || v === '' ? '–' : fmt.n(v, 2));

  const TAB = [['blok', 'Blok'], ['sub', 'Sub-wilayah'], ['divisi', 'Divisi'], ['wilayah', 'Wilayah'], ['mandor', 'Mandor'], ['alias', 'Alias blok'], ['blokMandor', 'Blok–Mandor (rinci)']];
  const subDari = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

  Pages.master = {
    judul: 'Data Master', scopes: ['master', 'data'],
    mount(host, params) {
      const tulis = Ctx.can('master.tulis');
      const S = { tab: (params && params.tab) || 'blok', q: '', M: null, tok: 0 };
      if (!TAB.some((t) => t[0] === S.tab)) S.tab = 'blok';
      host.innerHTML = '<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:center"><div class="seg" id="mt"></div><span style="flex:1"></span><input class="inp" id="mq" placeholder="Cari…" style="width:190px">' + (tulis ? '<button class="btn pri" id="ma">' + ic('plus') + 'Tambah</button>' : '') + '</div></div><div id="mc" style="margin-top:12px"></div>';
      const mc = $('#mc', host);
      $('#mt', host).innerHTML = TAB.map((t) => '<button data-t="' + t[0] + '">' + esc(t[1]) + '</button>').join('');
      $$('#mt button', host).forEach((b) => { b.onclick = () => { S.tab = b.dataset.t; S.q = ''; $('#mq', host).value = ''; gambar(); }; });
      $('#mq', host).oninput = UI.debounce((e) => { S.q = e.target.value.trim().toLowerCase(); gambar(); }, 150);
      const tambah = $('#ma', host); if (tambah) tambah.onclick = () => form(null);

      async function muat() {
        const t = ++S.tok; if (!S.M) mc.innerHTML = '<div class="card">' + UI.skel(6, 18) + '</div>';
        try { const M = await API.call('master.semua', {}); if (t !== S.tok) return; S.M = M; gambar(); } catch (e) { if (t === S.tok) mc.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; }
      }
      const cocok = (o) => !S.q || JSON.stringify(o).toLowerCase().indexOf(S.q) >= 0;
      const sw = (v, tabel, kunci) => '<label class="row" style="gap:6px;align-items:center;cursor:pointer"><input type="checkbox" data-st="' + tabel + '" data-k=\'' + esc(JSON.stringify(kunci)) + '\'' + (aktif(v) ? ' checked' : '') + (tulis ? '' : ' disabled') + '> <span class="small muted">' + (aktif(v) ? 'aktif' : 'nonaktif') + '</span></label>';

      // Definisi tiap tab: kolom + sumber baris
      function defisi() {
        const M = S.M; const divNama = {}; (M.divisi || []).forEach((d) => { divNama[d.kode] = d.nama; });
        if (S.tab === 'blok') return { cols: ['Kode', 'Kelompok', 'Divisi', 'Sub', 'Luas (Ha)', 'Wilayah', 'Mandor', 'Status'], num: [4], rows: (M.blok || []).slice().sort((a, b) => natur(a.kode, b.kode)).filter(cocok), cell: (b) => [esc(b.kode), esc(b.kelompok), esc(b.divisi), esc(b.sub), ha(b.luas), esc(b.wilayah || '–'), esc(b.mandor || '–'), sw(b.aktif, 'blok', { kode: b.kode })], tabel: 'blok' };
        if (S.tab === 'sub') return { cols: ['Kode', 'Nama', 'Divisi', 'Status'], rows: (M.sub_wilayah || []).filter((s) => s.jenis === 'sub').sort((a, b) => natur(a.kode, b.kode)).filter(cocok), cell: (s) => [esc(s.kode), esc(s.nama), esc(s.divisi), sw(s.aktif, 'sub', { jenis: 'sub', kode: s.kode })], tabel: 'sub' };
        if (S.tab === 'wilayah') return { cols: ['Kode', 'Nama', 'Status'], rows: (M.sub_wilayah || []).filter((s) => s.jenis === 'wilayah').sort((a, b) => natur(a.kode, b.kode)).filter(cocok), cell: (s) => [esc(s.kode), esc(s.nama), sw(s.aktif, 'wilayah', { jenis: 'wilayah', kode: s.kode })], tabel: 'wilayah' };
        if (S.tab === 'divisi') return { cols: ['Kode', 'Nama', 'Status'], rows: (M.divisi || []).filter(cocok), cell: (d) => [esc(d.kode), esc(d.nama), sw(d.aktif, 'divisi', { kode: d.kode })], tabel: 'divisi' };
        if (S.tab === 'mandor') return { cols: ['Nama', 'Blok', 'Status'], rows: (M.mandor || []).slice().sort((a, b) => natur(a.nama, b.nama)).filter(cocok), cell: (m) => [esc(m.nama), esc((M.blok || []).filter((b) => b.mandor === m.nama).map((b) => b.kode).sort(natur).join(', ') || '–'), sw(m.aktif, 'mandor', { id: m.id })], tabel: 'mandor' };
        if (S.tab === 'alias') return { cols: ['Alias (nama di Excel)', 'Blok resmi', 'Sumber'], rows: (M.alias || []).slice().sort((a, b) => natur(a.alias, b.alias)).filter(cocok), cell: (a) => [esc(a.alias), esc(a.blok), esc(a.sumber || '')], tabel: 'alias' };
        return { cols: ['Blok rinci', 'Blok', 'Wilayah', 'Divisi', 'Luas (Ha)', 'Mandor'], num: [4], rows: (M.blok_mandor || []).slice().sort((a, b) => natur(a.blok_rinci, b.blok_rinci)).filter(cocok), cell: (r) => [esc(r.blok_rinci), esc(r.blok), esc(r.wilayah || '–'), esc(r.divisi || ''), ha(r.luas), esc(r.mandor || '–')], tabel: 'blokMandor' };
      }
      function gambar() {
        if (!S.M) return;
        $$('#mt button', host).forEach((b) => b.classList.toggle('on', b.dataset.t === S.tab));
        const D = defisi(), num = D.num || [];
        if (!D.rows.length) { mc.innerHTML = '<div class="card">' + UI.kosong(S.q ? 'Tidak ada yang cocok.' : 'Belum ada data.', 'db') + '</div>'; return; }
        mc.innerHTML = '<div class="card"><div class="hint" style="margin-bottom:6px">' + fmt.n(D.rows.length) + ' baris' + (S.tab === 'blok' ? ' · total luas ' + ha(D.rows.reduce((a, b) => a + (Number(b.luas) || 0), 0)) + ' Ha' : '') + '</div><div class="tw"><table class="tbl"><thead><tr>' + D.cols.map((c, i) => '<th' + (num.indexOf(i) >= 0 ? ' class="num"' : '') + '>' + esc(c) + '</th>').join('') + (tulis ? '<th></th>' : '') + '</tr></thead><tbody>' +
          D.rows.map((r, i) => '<tr>' + D.cell(r).map((c, j) => '<td' + (num.indexOf(j) >= 0 ? ' class="num"' : '') + '>' + c + '</td>').join('') + (tulis ? '<td style="white-space:nowrap"><button class="btn sm" data-e="' + i + '">' + ic('edit') + 'Ubah</button></td>' : '') + '</tr>').join('') + '</tbody></table></div></div>';
        $$('[data-e]', mc).forEach((b) => { b.onclick = () => form(D.rows[Number(b.dataset.e)]); });
        $$('[data-st]', mc).forEach((c) => { c.onchange = async () => {
          const nilai = c.checked;
          try { await API.call('master.status', { tabel: c.dataset.st, kunci: JSON.parse(c.dataset.k), aktif: nilai }); UI.toast(nilai ? 'Diaktifkan.' : 'Dinonaktifkan.'); } catch (e) { c.checked = !nilai; UI.toastErr(e); }
        }; });
      }

      // ---- Formulir tambah/ubah ----
      const fld = (id, label, val, o) => { o = o || {}; return '<label class="f">' + esc(label) + (o.w ? ' *' : '') + '<input class="inp" id="' + id + '" value="' + esc(val === null || val === undefined ? '' : val) + '"' + (o.ro ? ' disabled' : '') + (o.type ? ' type="' + o.type + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.list ? ' list="' + o.list + '"' : '') + '></label>'; };
      const sel = (id, label, opts, val, o) => { o = o || {}; return '<label class="f">' + esc(label) + (o.w ? ' *' : '') + '<select class="sel" id="' + id + '"' + (o.ro ? ' disabled' : '') + '>' + (o.kosong ? '<option value="">' + esc(o.kosong) + '</option>' : '') + opts.map((x) => '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(val) ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select></label>'; };
      function form(r) {
        const M = S.M, t = S.tab, edit = !!r, judul = (edit ? 'Ubah ' : 'Tambah ') + (TAB.filter((x) => x[0] === t)[0] || [])[1];
        const divOpt = (M.divisi || []).map((d) => [d.kode, d.kode + ' — ' + d.nama]);
        let body = '', ambil;
        if (t === 'divisi') { body = fld('f1', 'Kode', r && r.kode, { w: 1, ro: edit }) + fld('f2', 'Nama', r && r.nama, { w: 1 }); ambil = (ov) => ({ tabel: 'divisi', data: { kode: $('#f1', ov).value.trim(), nama: $('#f2', ov).value.trim() } }); }
        else if (t === 'sub') { body = fld('f1', 'Kode', r && r.kode, { w: 1, ro: edit }) + fld('f2', 'Nama', r && r.nama, { w: 1 }) + sel('f3', 'Divisi', divOpt, (r && r.divisi) || (divOpt[0] || [])[0], { w: 1 }); ambil = (ov) => ({ tabel: 'sub', data: { kode: $('#f1', ov).value.trim(), nama: $('#f2', ov).value.trim(), divisi: $('#f3', ov).value } }); }
        else if (t === 'wilayah') { body = fld('f1', 'Kode', r && r.kode, { w: 1, ro: edit }) + fld('f2', 'Nama', r && r.nama, { w: 1 }); ambil = (ov) => ({ tabel: 'wilayah', data: { kode: $('#f1', ov).value.trim(), nama: $('#f2', ov).value.trim() } }); }
        else if (t === 'mandor') { body = fld('f2', 'Nama mandor', r && r.nama, { w: 1 }); ambil = (ov) => ({ tabel: 'mandor', data: { id: r ? r.id : undefined, nama: $('#f2', ov).value.trim() } }); }
        else if (t === 'alias') { body = fld('f1', 'Alias (nama di Excel)', r && r.alias, { w: 1, ro: edit }) + sel('f2', 'Blok resmi', (M.blok || []).slice().sort((a, b) => natur(a.kode, b.kode)).map((b) => [b.kode, 'Blok ' + b.kode]), (r && r.blok) || '', { w: 1 }); ambil = (ov) => ({ tabel: 'alias', data: { alias: $('#f1', ov).value.trim(), blok: $('#f2', ov).value, sumber: 'manual' } }); }
        else if (t === 'blokMandor') { body = fld('f1', 'Blok rinci', r && r.blok_rinci, { w: 1, ro: edit }) + sel('f2', 'Blok', (M.blok || []).slice().sort((a, b) => natur(a.kode, b.kode)).map((b) => [b.kode, 'Blok ' + b.kode]), (r && r.blok) || '', { w: 1 }) + fld('f3', 'Mandor', r && r.mandor, { w: 1, list: 'dlm' }) + '<datalist id="dlm">' + (M.mandor || []).map((m) => '<option value="' + esc(m.nama) + '">').join('') + '</datalist>' + sel('f4', 'Divisi', divOpt, (r && r.divisi) || (divOpt[0] || [])[0]) + fld('f5', 'Wilayah', r && r.wilayah) + fld('f6', 'Luas (Ha)', r && r.luas, { type: 'number' }); ambil = (ov) => ({ tabel: 'blokMandor', data: { blok_rinci: $('#f1', ov).value.trim(), blok: $('#f2', ov).value, mandor: $('#f3', ov).value.trim(), divisi: $('#f4', ov).value, wilayah: $('#f5', ov).value.trim(), luas: $('#f6', ov).value === '' ? '' : Number($('#f6', ov).value) } }); }
        else { // blok
          const subAll = (M.sub_wilayah || []).filter((s) => s.jenis === 'sub').sort((a, b) => natur(a.kode, b.kode)), pilihSub = r ? subDari(r.sub) : [];
          const lh = {}; if (r) (M.blok_luas || []).filter((x) => String(x.blok) === String(r.kode)).forEach((x) => { const k = x.sub; if (!lh[k] || ym(x.berlaku_dari) > lh[k].dari) lh[k] = { dari: ym(x.berlaku_dari), luas: x.luas }; });
          const dariTerakhir = (lh['*'] && lh['*'].dari) || Object.keys(lh).map((k) => lh[k].dari).sort().pop() || '2025-01';
          body = '<div class="g g2">' + fld('f1', 'Kode blok', r && r.kode, { w: 1, ro: edit }) + fld('f2', 'Kelompok produksi', r && r.kelompok, { ph: 'mis. 36 untuk 36A & 36B' }) + sel('f3', 'Divisi', divOpt, (r && r.divisi) || (divOpt[0] || [])[0], { w: 1 }) + fld('f4', 'Luas resmi (Ha)', r && r.luas, { w: 1, type: 'number' }) + fld('f5', 'Wilayah', r && r.wilayah, { list: 'dlw' }) + sel('f6', 'Mandor', (M.mandor || []).filter((m) => aktif(m.aktif)).sort((a, b) => natur(a.nama, b.nama)).map((m) => [m.nama, m.nama]), (r && r.mandor) || '', { kosong: '— tanpa mandor —' }) + '</div><datalist id="dlw">' + (M.sub_wilayah || []).filter((s) => s.jenis === 'wilayah').map((s) => '<option value="' + esc(s.nama) + '">').join('') + '</datalist>' +
            '<div style="margin-top:10px"><b>Sub-wilayah *</b> <span class="hint">(blok yang dipakai dua sub: centang keduanya)</span></div><div class="row" style="gap:12px;flex-wrap:wrap;margin-top:4px" id="fsub">' + subAll.map((s) => '<label class="row" style="gap:5px"><input type="checkbox" data-sb="' + esc(s.kode) + '"' + (pilihSub.indexOf(s.kode) >= 0 ? ' checked' : '') + '> ' + esc(s.kode) + '</label>').join('') + '</div><div id="fls" style="margin-top:8px"></div>' + fld('f7', 'Catatan', r && r.catatan) +
            '<div class="banner info" style="margin-top:10px">' + ic('info') + '<div>Luas disimpan berjenjang waktu: perubahan luas berlaku mulai periode di bawah dan <b>tidak mengubah</b> rekap periode sebelumnya.</div></div><div class="g g2" style="margin-top:8px">' + fld('f8', 'Luas berlaku mulai (yyyy-mm)', edit ? '' : '2025-01', { ph: edit ? dariTerakhir : '2025-01' }) + '</div><div class="hint">' + (edit ? 'Kosongkan bila luas tidak berubah (rekap tetap memakai riwayat yang ada).' : 'Luas awal berlaku sejak periode ini.') + '</div>';
          ambil = (ov) => {
            const subs = $$('[data-sb]', ov).filter((c) => c.checked).map((c) => c.dataset.sb); if (!subs.length) throw new Error('Pilih minimal satu sub-wilayah.');
            const luas = Number($('#f4', ov).value), dRaw = $('#f8', ov).value.trim();
            const berubah = !r || luas !== Number(r.luas) || subs.join(',') !== subDari(r.sub).join(',') || $$('[data-ls]', ov).some((i) => Number(i.value) !== Number(i.dataset.lama));
            if (berubah && dRaw && !/^\d{4}-\d{2}$/.test(dRaw)) throw new Error('Format "berlaku mulai" harus yyyy-mm.');
            if (berubah && edit && !dRaw) throw new Error('Luas/sub berubah: isi "Luas berlaku mulai (yyyy-mm)".');
            const data = { kode: $('#f1', ov).value.trim(), kelompok: $('#f2', ov).value.trim(), divisi: $('#f3', ov).value, luas: luas, wilayah: $('#f5', ov).value.trim(), mandor: $('#f6', ov).value, sub: subs.join(','), catatan: $('#f7', ov).value.trim() };
            const ls = {}; $$('[data-ls]', ov).forEach((i) => { if (i.value !== '') ls[i.dataset.ls] = Number(i.value); }); if (subs.length > 1 && Object.keys(ls).length) data.luas_sub = ls;
            return { tabel: 'blok', data: data, berlaku_dari: berubah ? (dRaw || '2025-01') : dariTerakhir };
          };
        }
        UI.modal({ title: judul, size: t === 'blok' ? 'lg' : '', body: '<div class="col" style="gap:10px">' + body + '</div>', foot: [{ label: 'Batal', val: false }, { label: 'Simpan', cls: 'pri', fn: async (ov) => {
          let p; try { p = ambil(ov); } catch (e) { UI.toast(e.message, 'warn'); return false; }
          await API.call('master.simpan', p); UI.toast('Tersimpan.'); return true;
        } }], onOpen: (ov) => {
          if (t !== 'blok') return;
          const fls = $('#fls', ov), pk = () => $$('[data-sb]', ov).filter((c) => c.checked).map((c) => c.dataset.sb);
          const lhLama = {}; if (r) (M.blok_luas || []).filter((x) => String(x.blok) === String(r.kode)).forEach((x) => { if (!lhLama[x.sub] || ym(x.berlaku_dari) > lhLama[x.sub].dari) lhLama[x.sub] = { dari: ym(x.berlaku_dari), luas: x.luas }; });
          const render = () => { const s = pk(); fls.innerHTML = s.length > 1 ? '<div class="hint">Luas per sub (opsional; kosong = pakai luas resmi):</div><div class="row" style="gap:10px;flex-wrap:wrap">' + s.map((k) => '<label class="f" style="width:120px">' + esc(k) + '<input class="inp" type="number" step="0.01" data-ls="' + esc(k) + '" data-lama="' + esc(lhLama[k] ? lhLama[k].luas : '') + '" value="' + esc(lhLama[k] ? lhLama[k].luas : '') + '"></label>').join('') + '</div>' : ''; };
          $$('[data-sb]', ov).forEach((c) => { c.onchange = render; }); render();
        } });
      }
      muat();
      return { refresh() { muat(); }, destroy() { S.tok++; } };
    }
  };
})();
