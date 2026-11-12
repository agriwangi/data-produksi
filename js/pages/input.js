/* Data Produksi v2 — Input Harian (matriks keyboard per sub) dan Timbangan & Kering (timbangan harian + kering bulanan). */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;
  const KS_SUB = 'dp_input_sub_v1', KS_TGL = 'dp_input_tgl_v1';
  const sg = (k) => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const ss = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };
  const hariIni = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const tglGeser = (t, n) => { const d = new Date(t + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const natur = (a, b) => String(a).localeCompare(String(b), 'id', { numeric: true });
  // Ubah teks sel menjadi angka: '' tetap kosong; koma/titik desimal diterima
  const baca = (s) => { s = String(s === null || s === undefined ? '' : s).trim(); if (s === '') return ''; const n = Number(s.replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : NaN; };
  const tampilAngka = (v) => (v === '' || v === null || v === undefined) ? '' : String(v);
  const ketKunci = { Terkunci: 'Periode ini terkunci; data tidak dapat diubah.', Diajukan: 'Periode ini sudah diajukan. Mengubah data akan mengembalikannya ke status Draf.', Disetujui: 'Periode ini sudah disetujui. Mengubah data akan mengembalikannya ke status Draf.' };
  const pesanStatus = (st) => st === 'Terkunci' ? '<div class="banner bad">' + ic('lock') + '<div>' + ketKunci.Terkunci + '</div></div>' : (ketKunci[st] ? '<div class="banner warn">' + ic('alert') + '<div>' + ketKunci[st] + '</div></div>' : '');
  function subDiizinkan(M) {
    const sc = Ctx.cakupan, subs = (M.sub_wilayah || []).filter((s) => s.jenis === 'sub');
    return subs.filter((s) => !sc || sc.indexOf(s.divisi) >= 0).sort((a, b) => natur(a.kode, b.kode));
  }
  // Navigasi keyboard dan tempel (paste) pada matriks input. cols = daftar kolom input bernama.
  function pasangNavigasi(tbl, onChange, onSave) {
    const dalam = () => $$('input[data-r]', tbl);
    tbl.addEventListener('focusin', (e) => { const t = e.target; if (t.matches('input') && t.type !== 'text') { t._pilih = true; try { t.select(); } catch (x) {} } });
    tbl.addEventListener('mouseup', (e) => { const t = e.target; if (t._pilih) { t._pilih = false; e.preventDefault(); } });
    tbl.addEventListener('keydown', (e) => {
      const t = e.target; if (!t.matches || !t.matches('input[data-r]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); onSave(); return; }
      const r = Number(t.dataset.r), c = Number(t.dataset.c);
      const pindah = (rr, cc) => { const n = $('input[data-r="' + rr + '"][data-c="' + cc + '"]', tbl); if (n && !n.disabled) { n.focus(); return true; } return false; };
      if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); pindah(r + (e.shiftKey && e.key === 'Enter' ? -1 : 1), c); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pindah(r - 1, c); }
      else if (e.key === 'ArrowRight' && (t.selectionStart === t.value.length || t.selectionStart === 0 && t.selectionEnd === t.value.length)) { if (pindah(r, c + 1)) e.preventDefault(); }
      else if (e.key === 'ArrowLeft' && (t.selectionStart === 0)) { if (pindah(r, c - 1)) e.preventDefault(); }
      else if (e.key === 'Escape') { t.value = t.dataset.orig || ''; onChange(t); }
    });
    tbl.addEventListener('input', (e) => { if (e.target.matches('input[data-r]')) onChange(e.target); });
    tbl.addEventListener('paste', (e) => {
      const t = e.target; if (!t.matches || !t.matches('input[data-r]')) return;
      const tx = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\t\n]/.test(tx.trim())) return;
      e.preventDefault();
      const baris = tx.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((l) => l.split('\t'));
      const r0 = Number(t.dataset.r), c0 = Number(t.dataset.c); let n = 0;
      baris.forEach((cells, i) => cells.forEach((v, j) => { const x = $('input[data-r="' + (r0 + i) + '"][data-c="' + (c0 + j) + '"]', tbl); if (x && !x.disabled) { x.value = v.trim().replace(/^"|"$/g, ''); onChange(x); n++; } }));
      UI.toast(n + ' sel ditempel.', 'info');
    });
    return dalam;
  }

  // =================== INPUT HARIAN ===================
  Pages.input = {
    judul: 'Input Harian', scopes: ['data', 'master', 'periode'],
    mount(host, params) {
      host.innerHTML = '<div class="card" id="hd"></div><div id="bn"></div><div id="rg" class="g g4 keep2"></div><div class="card nopad" id="mx"></div><div class="row no-print" id="aksi" style="justify-content:space-between"></div>';
      const S = { tgl: (params && params.tgl) || sg(KS_TGL) || hariIni(), sub: (params && params.sub) || sg(KS_SUB) || '', M: null, subs: [], blok: [], orig: {}, status: 'Draf', token: 0, ro: false, dirtyN: 0, simpan: false };
      let tbl = null;
      async function awal() {
        const b = await Ctx.boot(); S.M = b.master || {}; S.subs = subDiizinkan(S.M);
        if (!S.subs.length) { host.innerHTML = '<div class="card">' + UI.kosong('Tidak ada sub-wilayah yang dapat Anda isi. Hubungi administrator.', 'alert') + '</div>'; return; }
        if (!S.subs.some((s) => s.kode === S.sub)) S.sub = S.subs[0].kode;
        kepala(); await muat();
      }
      function kepala() {
        const sel = S.subs.map((s) => '<option value="' + esc(s.kode) + '"' + (s.kode === S.sub ? ' selected' : '') + '>' + esc(s.kode) + (s.nama ? ' — ' + esc(s.nama) : '') + '</option>').join('');
        $('#hd', host).innerHTML = '<div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="f">Tanggal<span class="row" style="gap:4px"><button class="btn ic-only" data-g="-1" title="Hari sebelumnya" aria-label="Hari sebelumnya">' + ic('left') + '</button><input class="inp" type="date" id="tg" value="' + S.tgl + '"><button class="btn ic-only" data-g="1" title="Hari berikutnya" aria-label="Hari berikutnya">' + ic('right') + '</button></span></label><label class="f">Sub-wilayah<select class="sel" id="sb">' + sel + '</select></label><button class="btn" data-hi>Hari ini</button><span class="sp"></span><span class="small muted" id="hr"></span></div>';
        const tg = $('#tg', host);
        const ganti = async (t) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return; if (!(await lepas())) { tg.value = S.tgl; return; } S.tgl = t; tg.value = t; ss(KS_TGL, t); kepalaHari(); muat(); };
        tg.onchange = () => ganti(tg.value);
        $$('[data-g]', host).forEach((b) => { b.onclick = () => ganti(tglGeser(S.tgl, Number(b.dataset.g))); });
        $('[data-hi]', host).onclick = () => ganti(hariIni());
        $('#sb', host).onchange = async (e) => { const v = e.target.value; if (!(await lepas())) { e.target.value = S.sub; return; } S.sub = v; ss(KS_SUB, v); muat(); };
        kepalaHari();
      }
      function kepalaHari() { const h = $('#hr', host); if (h) h.textContent = UI.hariNama(S.tgl) + ', ' + fmt.tgl(S.tgl); }
      async function lepas() { if (!S.dirtyN) return true; return UI.konfirmasi('Ada ' + S.dirtyN + ' baris yang belum disimpan. Tinggalkan tanpa menyimpan?', { ya: 'Buang perubahan', bahaya: true }); }
      async function muat(diam) {
        const tok = ++S.token; if (!diam) $('#mx', host).innerHTML = '<div style="padding:16px">' + UI.skel(6, 28) + '</div>';
        try {
          const d = await API.call('harian.daftar', { tanggal: S.tgl, sub: S.sub });
          if (tok !== S.token) return;
          S.status = d.status; S.orig = {}; d.rows.forEach((r) => { S.orig[r[2]] = { ha: r[3], hk: r[4], kg: r[5] }; });
          S.blok = (S.M.blok || []).filter((x) => x.aktif !== false && String(x.sub) === S.sub).sort((a, b) => natur(a.kode, b.kode));
          S.ro = d.status === 'Terkunci' || !Ctx.can('harian.tulis');
          gambar();
        } catch (e) { if (tok === S.token) $('#mx', host).innerHTML = '<div style="padding:16px">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; }
      }
      const mandorNama = (b) => b.mandor || '';
      function gambar() {
        $('#bn', host).innerHTML = pesanStatus(S.status);
        if (!S.blok.length) { $('#mx', host).innerHTML = '<div style="padding:16px">' + UI.kosong('Belum ada blok aktif pada sub ' + S.sub + '.', 'leaf') + '</div>'; $('#rg', host).innerHTML = ''; $('#aksi', host).innerHTML = ''; return; }
        const dis = S.ro ? ' disabled' : '';
        const rows = S.blok.map((b, i) => { const o = S.orig[b.kode] || {}; const cell = (c, k) => '<td data-k="' + k + '"><input inputmode="decimal" data-r="' + i + '" data-c="' + c + '" data-k="' + k + '" data-b="' + esc(b.kode) + '" data-orig="' + esc(tampilAngka(o[k])) + '" value="' + esc(tampilAngka(o[k])) + '" aria-label="' + esc(k.toUpperCase() + ' blok ' + b.kode) + '"' + dis + ' autocomplete="off"></td>'; return '<tr data-b="' + esc(b.kode) + '"><td class="stk b">' + esc(b.kode) + '</td><td class="ro small muted">' + esc(mandorNama(b)) + '</td><td class="num ro">' + (b.luas !== undefined && b.luas !== null && b.luas !== '' ? fmt.n(Number(b.luas), 2) : '') + '</td>' + cell(0, 'ha') + cell(1, 'hk') + cell(2, 'kg') + '<td class="num ro" data-o="kghk"></td><td class="num ro" data-o="kgha"></td><td class="ro" data-o="st" style="width:28px"></td></tr>'; }).join('');
        $('#mx', host).innerHTML = '<div class="tw" style="max-height:62vh"><table class="tbl grid-in" id="tb"><thead><tr><th class="stk">Blok</th><th>Mandor</th><th class="num">Luas (Ha)</th><th class="num">Ha dipetik</th><th class="num">HK</th><th class="num">Kg basah</th><th class="num">Kg/HK</th><th class="num">Kg/Ha</th><th></th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><td class="stk">Total</td><td></td><td class="num" id="t-luas"></td><td class="num" id="t-ha"></td><td class="num" id="t-hk"></td><td class="num" id="t-kg"></td><td class="num" id="t-kghk"></td><td class="num" id="t-kgha"></td><td></td></tr></tfoot></table></div>';
        tbl = $('#tb', host);
        pasangNavigasi(tbl, (inp) => hitung(inp.closest('tr'), true), simpan);
        $$('tbody tr', tbl).forEach((tr) => hitung(tr, false));
        total();
        $('#aksi', host).innerHTML = '<div class="row" style="gap:8px"><button class="btn" data-salin' + (S.ro ? ' disabled' : '') + '>' + ic('copy') + 'Salin Ha &amp; HK dari hari sebelumnya</button><button class="btn ghost" data-reset' + (S.ro ? ' disabled' : '') + '>' + ic('undo') + 'Batalkan perubahan</button></div><div class="row" style="gap:10px"><span class="small muted" id="dn"></span><button class="btn pri lg" data-simpan' + (S.ro ? ' disabled' : '') + '>' + ic('save') + 'Simpan <kbd class="xs">Ctrl+S</kbd></button></div>';
        $('[data-simpan]', host).onclick = simpan;
        $('[data-reset]', host).onclick = () => { $$('input[data-r]', tbl).forEach((i) => { i.value = i.dataset.orig; }); $$('tbody tr', tbl).forEach((tr) => hitung(tr, false)); total(); status(); };
        $('[data-salin]', host).onclick = salinKemarin;
        status();
        if (!S.ro) { const f = $('input[data-r="0"][data-c="0"]', tbl); if (f && !('ontouchstart' in window)) f.focus(); }
      }
      function nilaiBaris(tr) { const g = (k) => baca($('input[data-k="' + k + '"]', tr).value); return { ha: g('ha'), hk: g('hk'), kg: g('kg') }; }
      function hitung(tr, ubah) {
        const v = nilaiBaris(tr), b = tr.dataset.b, o = S.orig[b];
        const salah = isNaN(v.ha) || isNaN(v.hk) || isNaN(v.kg) || v.ha < 0 || v.hk < 0 || v.kg < 0 || (v.kg > 0 && !(v.ha > 0) && !(v.hk > 0));
        const kosong = v.ha === '' && v.hk === '' && v.kg === '';
        const sama = o ? (v.ha === o.ha || (v.ha === '' && !o.ha)) && (v.hk === o.hk || (v.hk === '' && !o.hk)) && (v.kg === o.kg || (v.kg === '' && !o.kg)) : kosong;
        tr.dataset.dirty = sama ? '' : '1'; tr.dataset.bad = salah ? '1' : '';
        $$('td[data-k]', tr).forEach((td) => { td.classList.toggle('dirty', !sama); td.classList.toggle('bad', salah); });
        const n = (x) => (typeof x === 'number' && isFinite(x) ? x : 0);
        $('[data-o="kghk"]', tr).textContent = n(v.hk) > 0 && n(v.kg) > 0 ? fmt.n(v.kg / v.hk, 1) : '';
        $('[data-o="kgha"]', tr).textContent = n(v.ha) > 0 && n(v.kg) > 0 ? fmt.n(v.kg / v.ha, 0) : '';
        $('[data-o="st"]', tr).innerHTML = salah ? '<span title="Kg terisi tetapi Ha dan HK kosong, atau nilai tidak valid" style="color:var(--crit)">' + ic('alert') + '</span>' : '';
        if (ubah) { total(); status(); }
      }
      function total() {
        let ha = 0, hk = 0, kg = 0, luas = 0;
        $$('tbody tr', tbl).forEach((tr) => { const v = nilaiBaris(tr); if (v.ha > 0) ha += v.ha; if (v.hk > 0) hk += v.hk; if (v.kg > 0) kg += v.kg; });
        S.blok.forEach((b) => { luas += Number(b.luas) || 0; });
        const set = (id, t) => { const e = $('#' + id, host); if (e) e.textContent = t; };
        set('t-luas', fmt.n(luas, 2)); set('t-ha', fmt.n(ha, 2)); set('t-hk', fmt.n(hk, 1)); set('t-kg', fmt.n(kg, 0)); set('t-kghk', hk > 0 ? fmt.n(kg / hk, 1) : ''); set('t-kgha', ha > 0 ? fmt.n(kg / ha, 0) : '');
        const terisi = $$('tbody tr', tbl).filter((tr) => { const v = nilaiBaris(tr); return v.ha !== '' || v.hk !== '' || v.kg !== ''; }).length;
        $('#rg', host).innerHTML = [['Kg basah (GL)', fmt.n(kg, 0), 'Kg'], ['Hari kerja', fmt.n(hk, 1), 'HK'], ['Kg/HK', hk > 0 ? fmt.n(kg / hk, 1) : '–', ''], ['Blok terisi', terisi + ' / ' + S.blok.length, '']].map((x) => '<div class="card kpi"><div class="l">' + x[0] + '</div><div class="v">' + x[1] + (x[2] ? '<span class="u">' + x[2] + '</span>' : '') + '</div></div>').join('');
      }
      function status() { const d = $$('tbody tr', tbl).filter((tr) => tr.dataset.dirty === '1'); S.dirtyN = d.length; const e = $('#dn', host); if (e) e.textContent = d.length ? d.length + ' baris belum disimpan' : 'Semua tersimpan'; }
      async function salinKemarin() {
        const prev = tglGeser(S.tgl, -1);
        try {
          const d = await API.call('harian.daftar', { tanggal: prev, sub: S.sub });
          if (!d.rows.length) return UI.toast('Tidak ada data pada ' + fmt.tgl(prev) + '.', 'warn');
          let n = 0; const m = {}; d.rows.forEach((r) => { m[r[2]] = r; });
          $$('tbody tr', tbl).forEach((tr) => { const r = m[tr.dataset.b]; if (!r) return; const v = nilaiBaris(tr); if (v.ha === '' && v.hk === '' && (r[3] || r[4])) { $('input[data-k="ha"]', tr).value = tampilAngka(r[3]); $('input[data-k="hk"]', tr).value = tampilAngka(r[4]); hitung(tr, false); n++; } });
          total(); status(); UI.toast(n ? 'Ha dan HK disalin untuk ' + n + ' blok. Isi Kg lalu simpan.' : 'Tidak ada baris kosong yang bisa disalin.', n ? 'ok' : 'info');
        } catch (e) { UI.toastErr(e); }
      }
      async function simpan() {
        if (S.simpan || S.ro) return;
        const trs = $$('tbody tr', tbl), sal = trs.filter((tr) => tr.dataset.bad === '1');
        if (sal.length) { UI.toast('Perbaiki ' + sal.length + ' baris bertanda merah dulu.', 'warn'); const f = $('input', sal[0]); if (f) f.focus(); return; }
        const ubah = trs.filter((tr) => tr.dataset.dirty === '1'); if (!ubah.length) return UI.toast('Tidak ada perubahan.', 'info');
        const simp = [], hapus = [];
        ubah.forEach((tr) => { const v = nilaiBaris(tr), b = tr.dataset.b; if (v.ha === '' && v.hk === '' && v.kg === '') { if (S.orig[b]) hapus.push(b); } else simp.push({ t: S.tgl, s: S.sub, b: b, ha: v.ha === '' ? 0 : v.ha, hk: v.hk === '' ? 0 : v.hk, kg: v.kg === '' ? 0 : v.kg }); });
        if (S.status === 'Diajukan' || S.status === 'Disetujui') { if (!(await UI.konfirmasi('Periode berstatus ' + S.status + '. Menyimpan akan mengembalikannya ke Draf. Lanjutkan?', { ya: 'Simpan' }))) return; }
        if (hapus.length && !(await UI.konfirmasi(hapus.length + ' baris dikosongkan dan akan dihapus dari data. Lanjutkan?', { ya: 'Hapus dan simpan', bahaya: true }))) return;
        S.simpan = true; const btn = $('[data-simpan]', host); if (btn) { btn.disabled = true; }
        try {
          let h = { baru: 0, diubah: 0, sama: 0, ditolak: [], terkunci: [] };
          if (simp.length) h = await API.call('harian.simpan', { rows: simp });
          for (let i = 0; i < hapus.length; i++) await API.call('harian.hapus', { t: S.tgl, s: S.sub, b: hapus[i] });
          const bagian = []; if (h.baru) bagian.push(h.baru + ' baru'); if (h.diubah) bagian.push(h.diubah + ' diubah'); if (hapus.length) bagian.push(hapus.length + ' dihapus');
          if (h.ditolak && h.ditolak.length) await UI.modal({ title: 'Sebagian baris ditolak', body: '<div class="banner warn">' + ic('alert') + '<div>' + h.ditolak.length + ' baris ditolak server.</div></div><ul class="small">' + h.ditolak.slice(0, 20).map((x) => '<li><b>' + esc(x.b) + '</b>: ' + esc(x.alasan) + '</li>').join('') + '</ul>', foot: [{ label: 'Tutup', cls: 'pri', val: true }] });
          else UI.toast('Tersimpan' + (bagian.length ? ': ' + bagian.join(', ') : '') + '.', 'ok');
        } catch (e) { UI.toastErr(e); }
        S.simpan = false; await muat(true);
      }
      awal().catch((e) => { host.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; });
      const peringatan = (e) => { if (S.dirtyN) { e.preventDefault(); e.returnValue = ''; } };
      window.addEventListener('beforeunload', peringatan);
      return {
        refresh() { if (S.dirtyN) { const b = $('#bn', host); if (b && !$('#rb', host)) b.insertAdjacentHTML('beforeend', '<div class="banner info" id="rb">' + ic('info') + '<div>Data di server berubah. Simpan atau batalkan perubahan Anda, lalu muat ulang.</div><button class="btn sm" data-rm>Muat ulang</button></div>'); const m = $('[data-rm]', host); if (m) m.onclick = () => { S.dirtyN = 0; muat(true); }; return; } muat(true); },
        destroy() { S.token++; window.removeEventListener('beforeunload', peringatan); }
      };
    }
  };

  // =================== TIMBANGAN & KERING ===================
  Pages.timbangan = {
    judul: 'Timbangan & Kering', scopes: ['data', 'periode', 'master'],
    mount(host, params) {
      const S = { tab: (params && params.tab) || 'timbangan', p: (params && params.p) || Ctx.filter.periode || UI.periodeNow(), th: '', M: null, subs: [], tok: 0, dirtyN: 0, sub: false };
      S.th = S.p.slice(0, 4);
      host.innerHTML = '<div class="seg" id="tb"><button data-t="timbangan">Timbangan harian</button><button data-t="kering">Kering bulanan</button></div><div id="tc"></div>';
      const tc = $('#tc', host);
      async function lepas() { if (!S.dirtyN) return true; return UI.konfirmasi('Ada perubahan yang belum disimpan. Tinggalkan tanpa menyimpan?', { ya: 'Buang perubahan', bahaya: true }); }
      $$('#tb button', host).forEach((b) => { b.onclick = async () => { if (!(await lepas())) return; S.dirtyN = 0; S.tab = b.dataset.t; tampil(); }; });
      async function tampil() { $$('#tb button', host).forEach((b) => b.classList.toggle('on', b.dataset.t === S.tab)); const t = ++S.tok; try { const b = await Ctx.boot(); S.M = b.master || {}; S.subs = subDiizinkan(S.M); } catch (e) { tc.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; return; } if (t !== S.tok) return; S.tab === 'kering' ? kering() : timbangan(); }

      // ---- Timbangan harian ----
      function timbangan() {
        const tulis = Ctx.can('timbangan.tulis');
        tc.innerHTML = '<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="f">Periode<span class="row" style="gap:4px"><button class="btn ic-only" data-g="-1" aria-label="Bulan sebelumnya">' + ic('left') + '</button><input class="inp" type="month" id="pp" value="' + S.p + '"><button class="btn ic-only" data-g="1" aria-label="Bulan berikutnya">' + ic('right') + '</button></span></label><label class="row small" style="gap:6px"><input type="checkbox" id="sbt"' + (S.sub ? ' checked' : '') + '> Tampilkan per sub-wilayah</label><span class="sp"></span><span id="st"></span></div></div><div id="bn"></div><div class="card nopad" id="mx"></div><div class="row no-print" id="aksi" style="justify-content:flex-end"></div>';
        const pp = $('#pp', tc); const ganti = async (v) => { if (!/^\d{4}-\d{2}$/.test(v)) return; if (!(await lepas())) { pp.value = S.p; return; } S.dirtyN = 0; S.p = v; S.th = v.slice(0, 4); pp.value = v; Ctx.filter.periode = v; Ctx.simpanFilter(); isiTimbangan(tulis); };
        pp.onchange = () => ganti(pp.value); $$('[data-g]', tc).forEach((b) => { b.onclick = () => ganti(UI.geser(S.p, Number(b.dataset.g))); });
        $('#sbt', tc).onchange = (e) => { S.sub = e.target.checked; isiTimbangan(tulis); };
        isiTimbangan(tulis);
      }
      async function isiTimbangan(tulis) {
        const mx = $('#mx', tc), tok = ++S.tok; mx.innerHTML = '<div style="padding:16px">' + UI.skel(6, 28) + '</div>';
        let T, H;
        try { [T, H] = await Promise.all([API.call('timbangan.daftar', { periode: S.p }), API.call('harian.daftar', { periode: S.p, batas: 5000 }).catch(() => ({ rows: [], total: 0 }))]); } catch (e) { if (tok === S.tok) mx.innerHTML = '<div style="padding:16px">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; return; }
        if (tok !== S.tok) return;
        const ro = !tulis || T.status === 'Terkunci';
        $('#bn', tc).innerHTML = pesanStatus(T.status);
        $('#st', tc).innerHTML = K.statusBadge(T.status);
        const n = UI.hariDalamBulan(S.p), orig = {}, ket = {};
        T.rows.forEach((r) => { orig[r.t + '|' + r.s] = r.basah; if (r.s === 'GT') ket[r.t] = r.ket || ''; });
        const adaSub = T.rows.some((r) => r.s !== 'GT'); if (adaSub && !S.sub) { S.sub = true; const c = $('#sbt', tc); if (c) c.checked = true; }
        const gl = {}; // GL kebun per tanggal (total) dan per sub, dari data harian
        H.rows.forEach((r) => { gl[r[0] + '|GT'] = (gl[r[0] + '|GT'] || 0) + (r[5] || 0); gl[r[0] + '|' + r[1]] = (gl[r[0] + '|' + r[1]] || 0) + (r[5] || 0); });
        const sbs = S.sub ? S.subs : [], kol = ['GT'].concat(sbs.map((s) => s.kode));
        const dis = ro ? ' disabled' : '';
        let rows = '';
        for (let d = 1; d <= n; d++) {
          const t = S.p + '-' + String(d).padStart(2, '0'), hr = UI.hariNama(t), mg = hr === 'Min' || hr === 'Minggu';
          rows += '<tr data-t="' + t + '"><td class="stk b">' + d + '</td><td class="ro small' + (mg ? ' muted' : '') + '">' + esc(hr) + '</td>' +
            kol.map((s, ci) => '<td data-k="' + esc(s) + '"><input inputmode="decimal" data-r="' + (d - 1) + '" data-c="' + ci + '" data-s="' + esc(s) + '" data-orig="' + esc(tampilAngka(orig[t + '|' + s])) + '" value="' + esc(tampilAngka(orig[t + '|' + s])) + '" aria-label="Basah ' + esc(s) + ' tanggal ' + d + '"' + dis + ' autocomplete="off"></td>').join('') +
            '<td class="num ro" data-o="gl">' + (gl[t + '|GT'] ? fmt.n(gl[t + '|GT'], 0) : '') + '</td><td class="num ro" data-o="sel"></td><td data-kt><input data-ket="' + t + '" type="text" style="text-align:left;min-width:140px" value="' + esc(ket[t] || '') + '" data-orig="' + esc(ket[t] || '') + '" aria-label="Keterangan tanggal ' + d + '"' + dis + ' autocomplete="off"></td></tr>';
        }
        mx.innerHTML = '<div class="tw" style="max-height:66vh"><table class="tbl grid-in" id="tb2"><thead><tr><th class="stk">Tgl</th><th>Hari</th>' + kol.map((s) => '<th class="num">' + (s === 'GT' ? 'Basah pabrik (GT)' : esc(s)) + '</th>').join('') + '<th class="num" title="Jumlah GL dari input harian">GL kebun</th><th class="num" title="GL kebun − basah pabrik">Selisih</th><th>Keterangan</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><td class="stk">Σ</td><td></td>' + kol.map((s) => '<td class="num" data-sum="' + esc(s) + '"></td>').join('') + '<td class="num" id="s-gl"></td><td class="num" id="s-sel"></td><td></td></tr></tfoot></table></div>';
        const tbl = $('#tb2', mx);
        const hit = () => {
          const sum = {}; let sgl = 0, ssel = 0;
          $$('tbody tr', tbl).forEach((tr) => {
            const t = tr.dataset.t; let dirty = false, salah = false;
            $$('input[data-s]', tr).forEach((i) => { const v = baca(i.value), o = orig[t + '|' + i.dataset.s]; const sm = v === '' ? (o === undefined) : (v === o); const bad = isNaN(v) || v < 0; if (!sm) dirty = true; i.parentElement.classList.toggle('dirty', !sm); i.parentElement.classList.toggle('bad', bad); if (bad) salah = true; if (typeof v === 'number' && v > 0) sum[i.dataset.s] = (sum[i.dataset.s] || 0) + v; });
            const ki = $('input[data-ket]', tr), kd = ki.value !== ki.dataset.orig; ki.parentElement.classList.toggle('dirty', kd); if (kd) dirty = true;
            tr.dataset.dirty = dirty ? '1' : ''; tr.dataset.bad = salah ? '1' : '';
            const g = $('input[data-s="GT"]', tr), bv = g ? baca(g.value) : '', glv = gl[t + '|GT'] || 0;
            const cs = $('[data-o="sel"]', tr); if (typeof bv === 'number' && bv > 0 && glv > 0) { const sel = glv - bv; cs.textContent = fmt.n(sel, 0); cs.style.color = Math.abs(sel) / bv > 0.02 ? 'var(--crit)' : ''; ssel += sel; sgl += glv; } else cs.textContent = '';
          });
          $$('[data-sum]', tbl).forEach((td) => { td.textContent = sum[td.dataset.sum] ? fmt.n(sum[td.dataset.sum], 0) : ''; });
          $('#s-gl', tbl).textContent = sgl ? fmt.n(sgl, 0) : ''; $('#s-sel', tbl).textContent = sgl ? fmt.n(ssel, 0) : '';
          S.dirtyN = $$('tbody tr', tbl).filter((tr) => tr.dataset.dirty === '1').length; const dn = $('#dn', tc); if (dn) dn.textContent = S.dirtyN ? S.dirtyN + ' baris belum disimpan' : 'Semua tersimpan';
        };
        const simpan = async () => {
          if (ro) return; const trs = $$('tbody tr', tbl), bad = trs.filter((tr) => tr.dataset.bad === '1'); if (bad.length) { UI.toast('Ada nilai tidak valid pada ' + bad.length + ' baris.', 'warn'); return; }
          const simp = [], hap = [];
          trs.filter((tr) => tr.dataset.dirty === '1').forEach((tr) => { const t = tr.dataset.t, k = $('input[data-ket]', tr).value.trim(); $$('input[data-s]', tr).forEach((i) => { const v = baca(i.value), o = orig[t + '|' + i.dataset.s], s = i.dataset.s; if (v === '') { if (o !== undefined) hap.push({ t: t, s: s }); } else if (v !== o || (s === 'GT' && k !== (ket[t] || ''))) simp.push({ t: t, s: s, basah: v, ket: s === 'GT' ? k : '' }); }); });
          if (!simp.length && !hap.length) return UI.toast('Tidak ada perubahan.', 'info');
          if (hap.length && !(await UI.konfirmasi(hap.length + ' sel dikosongkan dan akan dihapus. Lanjutkan?', { ya: 'Hapus dan simpan', bahaya: true }))) return;
          if ((T.status === 'Diajukan' || T.status === 'Disetujui') && !(await UI.konfirmasi('Periode berstatus ' + T.status + '. Menyimpan akan mengembalikannya ke Draf. Lanjutkan?', { ya: 'Simpan' }))) return;
          const b = $('[data-simpan]', tc); if (b) b.disabled = true;
          try { let h = { baru: 0, diubah: 0 }; if (simp.length) h = await API.call('timbangan.simpan', { rows: simp }); for (let i = 0; i < hap.length; i++) await API.call('timbangan.hapus', hap[i]); UI.toast('Tersimpan: ' + h.baru + ' baru, ' + h.diubah + ' diubah' + (hap.length ? ', ' + hap.length + ' dihapus' : '') + '.', 'ok'); S.dirtyN = 0; await isiTimbangan(tulis); } catch (e) { UI.toastErr(e); if (b) b.disabled = false; }
        };
        pasangNavigasi(tbl, hit, simpan);
        tbl.addEventListener('input', (e) => { if (e.target.matches('input[data-ket]')) hit(); });
        hit();
        $('#aksi', tc).innerHTML = '<span class="small muted" id="dn"></span><button class="btn pri lg" data-simpan' + (ro ? ' disabled' : '') + '>' + ic('save') + 'Simpan <kbd class="xs">Ctrl+S</kbd></button>';
        $('[data-simpan]', tc).onclick = simpan; hit();
      }

      // ---- Kering bulanan ----
      async function kering() {
        const tulis = Ctx.can('timbangan.tulis');
        tc.innerHTML = '<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="f">Tahun<span class="row" style="gap:4px"><button class="btn ic-only" data-g="-1" aria-label="Tahun sebelumnya">' + ic('left') + '</button><input class="inp" type="number" id="th" min="2015" max="2100" value="' + S.th + '" style="width:96px"><button class="btn ic-only" data-g="1" aria-label="Tahun berikutnya">' + ic('right') + '</button></span></label><span class="small muted">Basah = total daun basah ditimbang pabrik, Kering = teh kering hasil olah (Kg). Rendemen = Kering ÷ Basah.</span></div></div><div id="bn"></div><div class="card nopad" id="mx"></div><div class="row no-print" id="aksi" style="justify-content:flex-end"></div>';
        const th = $('#th', tc); const ganti = async (v) => { v = String(v); if (!/^\d{4}$/.test(v)) return; if (!(await lepas())) { th.value = S.th; return; } S.dirtyN = 0; S.th = v; th.value = v; kering(); };
        th.onchange = () => ganti(th.value); $$('[data-g]', tc).forEach((b) => { b.onclick = () => ganti(Number(S.th) + Number(b.dataset.g)); });
        const mx = $('#mx', tc), tok = ++S.tok; mx.innerHTML = '<div style="padding:16px">' + UI.skel(6, 28) + '</div>';
        let D, per = []; try { D = await API.call('kering.daftar', { tahun: S.th }); per = await Ctx.periodeList(); } catch (e) { if (tok === S.tok) mx.innerHTML = '<div style="padding:16px">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; return; }
        if (tok !== S.tok) return;
        const stat = {}; per.forEach((x) => { stat[x.p] = x.status; });
        const orig = {}; D.rows.filter((r) => r.s === 'GT').forEach((r) => { orig[r.p] = r; });
        $('#bn', tc).innerHTML = '';
        let rows = '';
        for (let m = 1; m <= 12; m++) {
          const p = S.th + '-' + String(m).padStart(2, '0'), o = orig[p] || {}, lock = stat[p] === 'Terkunci' || !tulis, dis = lock ? ' disabled' : '';
          const c = (k, ci) => '<td data-k="' + k + '"><input inputmode="decimal" data-r="' + (m - 1) + '" data-c="' + ci + '" data-k="' + k + '" data-orig="' + esc(tampilAngka(o[k] || '')) + '" value="' + esc(tampilAngka(o[k] || '')) + '" aria-label="' + k + ' ' + p + '"' + dis + ' autocomplete="off"></td>';
          rows += '<tr data-p="' + p + '"><td class="stk b">' + esc(fmt.bulan(p)) + '</td>' + c('basah', 0) + c('kering', 1) + c('hk', 2) + '<td class="num ro" data-o="rend"></td><td data-k="cat"><input type="text" data-cat style="text-align:left;min-width:160px" data-orig="' + esc(o.cat || '') + '" value="' + esc(o.cat || '') + '" aria-label="Catatan ' + p + '"' + dis + ' autocomplete="off"></td><td class="ro">' + (stat[p] ? K.statusBadge(stat[p]) : '') + '</td><td class="ro">' + (lock ? '' : '<button class="btn sm ghost" data-ambil="' + p + '" title="Isi Basah dari jumlah timbangan harian">' + ic('scale') + 'Σ timbangan</button>') + '</td></tr>';
        }
        mx.innerHTML = '<div class="tw"><table class="tbl grid-in" id="tb3"><thead><tr><th class="stk">Bulan</th><th class="num">Basah (Kg)</th><th class="num">Kering (Kg)</th><th class="num">HK</th><th class="num">Rendemen</th><th>Catatan</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><td class="stk">Total</td><td class="num" id="k-b"></td><td class="num" id="k-k"></td><td class="num" id="k-h"></td><td class="num" id="k-r"></td><td colspan="3"></td></tr></tfoot></table></div>';
        const tbl = $('#tb3', mx);
        const hit = () => {
          let sb = 0, sk = 0, sh = 0, bad = 0;
          $$('tbody tr', tbl).forEach((tr) => {
            const p = tr.dataset.p, o = orig[p] || {}; const g = (k) => baca($('input[data-k="' + k + '"]', tr).value);
            const v = { basah: g('basah'), kering: g('kering'), hk: g('hk') }, cat = $('input[data-cat]', tr);
            const salah = [v.basah, v.kering, v.hk].some((x) => isNaN(x) || x < 0) || (typeof v.basah === 'number' && typeof v.kering === 'number' && v.basah > 0 && v.kering > v.basah);
            const sama = ['basah', 'kering', 'hk'].every((k) => (v[k] === '' ? !o[k] : v[k] === o[k])) && cat.value === (o.cat || '');
            tr.dataset.dirty = sama ? '' : '1'; tr.dataset.bad = salah ? '1' : ''; if (salah) bad++;
            $$('td[data-k]', tr).forEach((td) => { td.classList.toggle('dirty', !sama); td.classList.toggle('bad', salah); });
            const rc = $('[data-o="rend"]', tr); rc.textContent = typeof v.basah === 'number' && v.basah > 0 && typeof v.kering === 'number' && v.kering > 0 ? fmt.pct(v.kering / v.basah) : '';
            if (typeof v.basah === 'number') sb += v.basah; if (typeof v.kering === 'number') sk += v.kering; if (typeof v.hk === 'number') sh += v.hk;
          });
          $('#k-b', tbl).textContent = fmt.n(sb, 0); $('#k-k', tbl).textContent = fmt.n(sk, 0); $('#k-h', tbl).textContent = fmt.n(sh, 0); $('#k-r', tbl).textContent = sb > 0 && sk > 0 ? fmt.pct(sk / sb) : '';
          S.dirtyN = $$('tbody tr', tbl).filter((tr) => tr.dataset.dirty === '1').length; const dn = $('#dn', tc); if (dn) dn.textContent = S.dirtyN ? S.dirtyN + ' bulan belum disimpan' : 'Semua tersimpan';
        };
        const simpan = async () => {
          if (!tulis) return; const trs = $$('tbody tr', tbl), bad = trs.filter((tr) => tr.dataset.bad === '1'); if (bad.length) { UI.toast('Perbaiki baris bertanda merah: nilai harus angka ≥ 0 dan Kering tidak boleh melebihi Basah.', 'warn'); return; }
          const rows = trs.filter((tr) => tr.dataset.dirty === '1').map((tr) => { const g = (k) => baca($('input[data-k="' + k + '"]', tr).value); return { p: tr.dataset.p, s: 'GT', hk: g('hk') === '' ? 0 : g('hk'), basah: g('basah') === '' ? 0 : g('basah'), kering: g('kering') === '' ? 0 : g('kering'), cat: $('input[data-cat]', tr).value.trim() }; });
          if (!rows.length) return UI.toast('Tidak ada perubahan.', 'info');
          const stt = rows.map((r) => stat[r.p]).filter((s) => s === 'Diajukan' || s === 'Disetujui'); if (stt.length && !(await UI.konfirmasi(stt.length + ' periode sudah diajukan/disetujui. Menyimpan akan mengembalikannya ke Draf. Lanjutkan?', { ya: 'Simpan' }))) return;
          const b = $('[data-simpan]', tc); if (b) b.disabled = true;
          try { const h = await API.call('kering.simpan', { rows: rows }); UI.toast('Tersimpan: ' + h.baru + ' baru, ' + h.diubah + ' diubah' + (h.ditolak && h.ditolak.length ? ', ' + h.ditolak.length + ' ditolak' : '') + '.', h.ditolak && h.ditolak.length ? 'warn' : 'ok'); S.dirtyN = 0; await kering(); } catch (e) { UI.toastErr(e); if (b) b.disabled = false; }
        };
        pasangNavigasi(tbl, hit, simpan);
        tbl.addEventListener('input', (e) => { if (e.target.matches('input[data-cat]')) hit(); });
        $$('[data-ambil]', tbl).forEach((b) => { b.onclick = async () => { const p = b.dataset.ambil; b.disabled = true; try { const t = await API.call('timbangan.daftar', { periode: p }); const gt = t.rows.filter((r) => r.s === 'GT'); if (!gt.length) { UI.toast('Belum ada timbangan harian untuk ' + fmt.bulan(p) + '.', 'warn'); } else { const j = gt.reduce((a, r) => a + (r.basah || 0), 0); const i = $('tr[data-p="' + p + '"] input[data-k="basah"]', tbl); i.value = String(Math.round(j * 100) / 100); hit(); UI.toast('Basah diisi ' + fmt.n(j, 0) + ' Kg dari ' + gt.length + ' hari timbangan.', 'ok'); } } catch (e) { UI.toastErr(e); } b.disabled = false; }; });
        $('#aksi', tc).innerHTML = '<span class="small muted" id="dn"></span><button class="btn pri lg" data-simpan' + (tulis ? '' : ' disabled') + '>' + ic('save') + 'Simpan <kbd class="xs">Ctrl+S</kbd></button>';
        $('[data-simpan]', tc).onclick = simpan; hit();
      }
      const peringatan = (e) => { if (S.dirtyN) { e.preventDefault(); e.returnValue = ''; } };
      window.addEventListener('beforeunload', peringatan);
      tampil();
      return {
        refresh() { if (S.dirtyN) { UI.toast('Data di server berubah. Simpan atau batalkan perubahan Anda lalu muat ulang halaman ini.', 'info'); return; } tampil(); },
        destroy() { S.tok++; window.removeEventListener('beforeunload', peringatan); }
      };
    }
  };
})();
