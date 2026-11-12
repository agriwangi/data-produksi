/* Data Produksi v1 — Kendali: Kesehatan Data, Persetujuan Periode, Riwayat perubahan (audit). */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;
  const wkt = (s) => String(s || '').slice(0, 16).replace('T', ' ');
  const JENIS = { periode_belum_lengkap: 'Periode belum lengkap', rendemen_luar_batas: 'Rendemen di luar batas', selisih_basah: 'Selisih basah timbangan', duplikat_antar_periode: 'Isi sama dengan periode lain', anomali: 'Nilai tidak wajar', blok_tidak_terdaftar: 'Blok tidak terdaftar', hari_kosong: 'Hari tanpa data', hk_pecahan: 'HK pecahan', kg_tanpa_hk: 'Kg tanpa HK', luas_berbeda: 'Selisih luas', tanpa_mandor: 'Blok tanpa mandor', blok_dua_sub: 'Blok dipakai dua sub', konsistensi: 'Konsistensi rekap', cadangan: 'Cadangan' };
  const jenisTxt = (j) => JENIS[j] || String(j || '').replace(/_/g, ' ');
  const TINGKAT = { tinggi: 3, sedang: 2, rendah: 1 };
  function detailTxt(x) { // detail 'konsistensi' berupa JSON → ringkas jadi teks
    const d = String(x.detail || ''); if (x.jenis !== 'konsistensi' || d[0] !== '{') return d;
    try { const o = JSON.parse(d); return Object.keys(o).map((k) => k + ': ' + (typeof o[k] === 'object' ? JSON.stringify(o[k]) : o[k])).join('; '); } catch (e) { return d; }
  }
  const periodeTxt = (p) => (/^\d{4}-\d{2}$/.test(String(p)) ? fmt.bulan(p) : String(p || '–'));

  // ======================= Kesehatan Data =======================
  Pages.kesehatan = {
    judul: 'Kesehatan Data', scopes: ['data', 'rekap', 'master', 'periode'],
    mount(host) {
      const S = { p: '', mendalam: false, st: 'belum', tk: '', jn: '', q: '', data: null, tok: 0 };
      host.innerHTML = '<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="f">Periode<select class="sel" id="kp"></select></label><label class="f">Status<select class="sel" id="ks"><option value="belum">Belum ditinjau</option><option value="ditinjau">Sudah ditinjau</option><option value="semua">Semua</option></select></label><label class="f">Tingkat<select class="sel" id="kt"><option value="">Semua</option><option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option></select></label><label class="f">Jenis<select class="sel" id="kj"><option value="">Semua</option></select></label><label class="f">Cari<input class="inp" id="kq" placeholder="kode blok, sub…" style="width:170px"></label><label class="row" style="gap:6px;align-items:center"><input type="checkbox" id="kd"> Pindai mendalam</label><span style="flex:1"></span><button class="btn" id="kr">' + ic('refresh') + 'Pindai ulang</button></div><div class="hint" style="margin-top:6px">Pemeriksaan otomatis atas data, master, dan konsistensi rekap. Pindai mendalam memeriksa baris harian periode terpilih (lebih lambat).</div></div><div id="kb" style="margin-top:12px"></div>';
      const kb = $('#kb', host);
      (async () => { try { const b = await Ctx.boot(); const pl = (b.periodeList || []).slice().reverse(); $('#kp', host).innerHTML = '<option value="">Semua periode</option>' + pl.map((x) => '<option value="' + x.p + '">' + esc(fmt.bulan(x.p)) + '</option>').join(''); } catch (e) {} muat(); })();
      $('#kp', host).onchange = (e) => { S.p = e.target.value; muat(); };
      $('#kd', host).onchange = (e) => { S.mendalam = e.target.checked; muat(); };
      $('#ks', host).onchange = (e) => { S.st = e.target.value; gambar(); };
      $('#kt', host).onchange = (e) => { S.tk = e.target.value; gambar(); };
      $('#kj', host).onchange = (e) => { S.jn = e.target.value; gambar(); };
      $('#kq', host).oninput = UI.debounce((e) => { S.q = e.target.value.trim().toLowerCase(); gambar(); }, 200);
      $('#kr', host).onclick = () => { API.invalidasi(); muat(); };
      async function muat() {
        const t = ++S.tok; kb.innerHTML = '<div class="card">' + UI.skel(5, 18) + '</div>';
        try {
          const d = await API.call('kesehatan.pindai', { periode: S.p || undefined, mendalam: S.mendalam || undefined }); if (t !== S.tok) return;
          S.data = d;
          const kj = $('#kj', host); kj.innerHTML = '<option value="">Semua</option>' + Object.keys(d.perJenis || {}).sort().map((j) => '<option value="' + esc(j) + '"' + (j === S.jn ? ' selected' : '') + '>' + esc(jenisTxt(j)) + ' (' + d.perJenis[j] + ')</option>').join('');
          gambar();
        } catch (e) { if (t === S.tok) kb.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; }
      }
      function gambar() {
        const D = S.data; if (!D) return;
        let it = (D.items || []).filter((x) => (S.st === 'semua' || (S.st === 'belum' ? x.status !== 'ditinjau' : x.status === 'ditinjau')) && (!S.tk || x.tingkat === S.tk) && (!S.jn || x.jenis === S.jn) && (!S.q || (x.lokasi + ' ' + x.periode + ' ' + detailTxt(x) + ' ' + jenisTxt(x.jenis)).toLowerCase().indexOf(S.q) >= 0));
        it.sort((a, b) => (TINGKAT[b.tingkat] || 0) - (TINGKAT[a.tingkat] || 0) || String(b.periode).localeCompare(String(a.periode)));
        const hit = (t) => (D.items || []).filter((x) => x.tingkat === t && x.status !== 'ditinjau').length;
        const tampil = it.slice(0, 400);
        let h = '<div class="g g4" style="margin-bottom:12px"><div class="card kpi"><div class="l">Total temuan</div><div class="v">' + fmt.n(D.total) + '</div></div><div class="card kpi"><div class="l">Belum ditinjau</div><div class="v">' + fmt.n(D.belumDitinjau) + '</div></div><div class="card kpi"><div class="l">Tingkat tinggi (belum)</div><div class="v" style="color:var(--dng)">' + fmt.n(hit('tinggi')) + '</div></div><div class="card kpi"><div class="l">Tingkat sedang (belum)</div><div class="v">' + fmt.n(hit('sedang')) + '</div></div></div>';
        if (!tampil.length) { kb.innerHTML = h + '<div class="card">' + UI.kosong((D.items || []).length ? 'Tidak ada temuan untuk filter ini.' : 'Tidak ada temuan. Data tampak sehat.', 'ok') + '</div>'; return; }
        h += '<div class="card"><div class="tw"><table class="tbl"><thead><tr><th>Tingkat</th><th>Jenis</th><th>Periode</th><th>Lokasi</th><th>Rincian</th><th>Status</th><th></th></tr></thead><tbody>' +
          tampil.map((x) => '<tr data-id="' + esc(x.id) + '"><td>' + UI.badge(x.tingkat, x.tingkat) + '</td><td>' + esc(jenisTxt(x.jenis)) + '</td><td>' + esc(periodeTxt(x.periode)) + '</td><td>' + esc(x.lokasi) + '</td><td class="wrap">' + esc(detailTxt(x)) + (x.catatan ? '<div class="hint">Catatan: ' + esc(x.catatan) + (x.oleh ? ' — ' + esc(x.oleh) : '') + '</div>' : '') + '</td><td>' + (x.status === 'ditinjau' ? UI.badge('Ditinjau', 'ok') : UI.badge('Baru', 'warn')) + '</td><td style="white-space:nowrap">' + (x.status === 'ditinjau' ? '<button class="btn sm" data-bk="' + esc(x.id) + '">Buka kembali</button>' : '<button class="btn sm pri" data-tj="' + esc(x.id) + '">' + ic('check') + 'Tandai ditinjau</button>') + '</td></tr>').join('') + '</tbody></table></div>' + (it.length > tampil.length ? '<div class="hint" style="margin-top:6px">Menampilkan ' + tampil.length + ' dari ' + fmt.n(it.length) + ' temuan; persempit dengan filter.</div>' : '') + '</div>';
        kb.innerHTML = h;
        $$('[data-tj]', kb).forEach((b) => { b.onclick = async () => { const c = await UI.tanya('Catatan tinjauan (opsional)', { judul: 'Tandai ditinjau', wajib: false, baris: true, ok: 'Tandai' }); if (c === undefined) return; await simpanTinjau(b.dataset.tj, 'ditinjau', c); }; });
        $$('[data-bk]', kb).forEach((b) => { b.onclick = () => simpanTinjau(b.dataset.bk, 'baru', ''); });
      }
      async function simpanTinjau(id, st, c) {
        try { await API.call('kesehatan.tinjau', { id: id, status: st, catatan: c || '' }); const x = (S.data.items || []).filter((q) => q.id === id)[0]; if (x) { x.status = st; x.catatan = c || ''; } S.data.belumDitinjau = (S.data.items || []).filter((q) => q.status !== 'ditinjau').length; gambar(); UI.toast(st === 'ditinjau' ? 'Ditandai sudah ditinjau.' : 'Dibuka kembali.'); } catch (e) { UI.toastErr(e); }
      }
      return { refresh() { muat(); }, destroy() { S.tok++; } };
    }
  };

  // ======================= Persetujuan Periode =======================
  Pages.persetujuan = {
    judul: 'Persetujuan Periode', scopes: ['periode', 'data', 'rekap', 'set'],
    mount(host) {
      const S = { f: 'perlu', d: null, tok: 0 };
      host.innerHTML = '<div id="pb"></div><div class="seg" id="pf" style="margin:12px 0"><button data-f="perlu">Perlu tindakan</button><button data-f="semua">Semua periode</button></div><div id="pt"></div>';
      const pt = $('#pt', host), pb = $('#pb', host);
      $$('#pf button', host).forEach((b) => { b.onclick = () => { S.f = b.dataset.f; gambar(); }; });
      async function muat() {
        const t = ++S.tok; if (!S.d) pt.innerHTML = '<div class="card">' + UI.skel(5, 18) + '</div>';
        try { const d = await API.call('periode.daftar', {}); if (t !== S.tok) return; S.d = d; gambar(); } catch (e) { if (t === S.tok) pt.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; }
      }
      const bisa = { ajukan: Ctx.can('periode.ajukan'), setujui: Ctx.can('periode.setujui'), kunci: Ctx.can('periode.kunci'), buka: Ctx.can('periode.buka') };
      function aksi(x) {
        const a = [];
        if (x.status === 'Draf' && bisa.ajukan && x.gl > 0) a.push('<button class="btn sm pri" data-a="ajukan" data-p="' + x.p + '">Ajukan</button>');
        if (x.status === 'Diajukan' && bisa.setujui) a.push('<button class="btn sm pri" data-a="setujui" data-p="' + x.p + '">' + ic('check') + 'Setujui</button><button class="btn sm dng" data-a="tolak" data-p="' + x.p + '">Tolak</button>');
        if (x.status === 'Disetujui' && bisa.kunci) a.push('<button class="btn sm pri" data-a="kunci" data-p="' + x.p + '">' + ic('lock') + 'Kunci</button>');
        if (x.status === 'Terkunci' && bisa.buka) a.push('<button class="btn sm" data-a="buka" data-p="' + x.p + '">' + ic('unlock') + 'Buka kunci</button>');
        return a.join(' ');
      }
      function gambar() {
        const D = S.d; if (!D) return;
        $$('#pf button', host).forEach((b) => b.classList.toggle('on', b.dataset.f === S.f));
        pb.innerHTML = '<div class="banner info">' + ic('info') + '<div>Alur: <b>Draf → Diajukan → Disetujui → Terkunci</b>. Persetujuan ' + (D.persetujuan_wajib ? '<b>wajib</b>' : 'tidak wajib') + '; penyetuju: ' + esc((D.peran_penyetuju || []).join(', ') || '–') + '; kunci otomatis setelah disetujui: ' + (D.kunci_otomatis ? 'ya' : 'tidak') + '. Mengubah data pada periode Diajukan/Disetujui mengembalikannya ke Draf; periode Terkunci menolak perubahan. Pengaturan ada di Pengaturan › Persetujuan.</div></div>';
        let rows = (D.rows || []).filter((x) => x.gl > 0 || x.status !== 'Draf');
        if (S.f === 'perlu') rows = rows.filter((x) => x.status === 'Diajukan' || x.status === 'Disetujui' || (x.status === 'Draf' && bisa.ajukan));
        if (!rows.length) { pt.innerHTML = '<div class="card">' + UI.kosong(S.f === 'perlu' ? 'Tidak ada periode yang menunggu tindakan.' : 'Belum ada periode.', 'ok') + '</div>'; return; }
        pt.innerHTML = '<div class="card"><div class="tw"><table class="tbl"><thead><tr><th>Periode</th><th>Status</th><th class="num">GL (Kg)</th><th class="num">MT (Kg)</th><th class="num">Rendemen</th><th>Diajukan</th><th>Disetujui</th><th>Dikunci</th><th>Catatan</th><th></th></tr></thead><tbody>' +
          rows.map((x) => '<tr><td><b>' + esc(fmt.bulan(x.p)) + '</b></td><td>' + K.statusBadge(x.status) + '</td><td class="num">' + fmt.n(x.gl) + '</td><td class="num">' + (x.mt === null || x.mt === undefined ? '–' : fmt.n(x.mt)) + '</td><td class="num">' + (x.rend === null || x.rend === undefined ? '–' : fmt.pct(x.rend)) + '</td><td>' + esc(x.diajukan_oleh || '') + '</td><td>' + esc(x.disetujui_oleh || '') + '</td><td>' + esc(x.dikunci_oleh || '') + '</td><td class="wrap">' + esc(x.catatan || '') + '</td><td style="white-space:nowrap">' + aksi(x) + '</td></tr>').join('') + '</tbody></table></div></div>';
        $$('[data-a]', pt).forEach((b) => { b.onclick = () => lakukan(b, b.dataset.a, b.dataset.p); });
      }
      async function lakukan(b, a, p) {
        const x = (S.d.rows || []).filter((q) => q.p === p)[0] || {}, nm = fmt.bulan(p);
        try {
          let d = { periode: p }, ak = 'periode.' + a;
          if (a === 'ajukan') {
            const tk = x.rend === null || x.rend === undefined;
            const r = await UI.modal({ title: 'Ajukan ' + nm, body: '<label class="f">Catatan (opsional)<textarea class="inp" id="pc" rows="3" maxlength="300"></textarea></label>' + (tk ? '<div class="banner warn" style="margin-top:10px">' + ic('alert') + '<div>Data teh kering periode ini belum diisi, sehingga rendemen belum dapat dihitung.</div></div><label class="row" style="gap:8px;margin-top:8px"><input type="checkbox" id="tkr"> Ajukan tanpa data kering</label>' : ''), foot: [{ label: 'Batal', val: false }, { label: 'Ajukan', cls: 'pri', fn: (ov) => ({ cat: $('#pc', ov).value.trim(), tk: !!($('#tkr', ov) && $('#tkr', ov).checked) }) }] });
            if (!r) return; d.catatan = r.cat || undefined; if (r.tk) d.tanpaKering = true;
          } else if (a === 'setujui') {
            const c = await UI.tanya('Catatan persetujuan (opsional)', { judul: 'Setujui ' + nm, wajib: false, baris: true, ok: 'Setujui' }); if (c === undefined) return; d.catatan = c || undefined;
          } else if (a === 'tolak') {
            const c = await UI.tanya('Alasan penolakan', { judul: 'Tolak ' + nm, baris: true, min: 3, ok: 'Tolak', hint: 'Periode kembali ke Draf agar bisa diperbaiki.' }); if (c === undefined) return; d.catatan = c;
          } else if (a === 'kunci') {
            if (!(await UI.konfirmasi('Kunci ' + nm + '? Data periode ini tidak bisa diubah sampai kuncinya dibuka.', { ya: 'Kunci periode' }))) return;
          } else if (a === 'buka') {
            const c = await UI.tanya('Alasan membuka kunci (min. 5 karakter)', { judul: 'Buka kunci ' + nm, baris: true, min: 5, ok: 'Buka kunci' }); if (c === undefined) return; ak = 'periode.bukaKunci'; d.alasan = c;
          }
          b.disabled = true; const r = await API.call(ak, d); UI.toast(nm + ' → ' + r.status + '.'); muat();
        } catch (e) { b.disabled = false; UI.toastErr(e); }
      }
      muat();
      return { refresh() { muat(); }, destroy() { S.tok++; } };
    }
  };

  // ======================= Riwayat perubahan =======================
  Pages.riwayat = {
    judul: 'Riwayat Perubahan', scopes: ['data', 'periode', 'master', 'set', 'akses'],
    mount(host) {
      const penuh = Ctx.can('audit.baca'), LIM = 200;
      const S = { q: '', aksi: '', user: '', dari: '', sampai: '', off: 0, rows: [], total: 0, tok: 0, sibuk: false };
      host.innerHTML = '<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="f">Cari<input class="inp" id="rq" placeholder="teks bebas" style="width:170px"></label><label class="f">Aksi / entitas<input class="inp" id="ra" placeholder="mis. PERIODE" style="width:150px"></label>' + (penuh ? '<label class="f">Pengguna<input class="inp" id="ru" placeholder="username" style="width:130px"></label>' : '') + '<label class="f">Dari<input class="inp" id="rd" type="date"></label><label class="f">Sampai<input class="inp" id="rs" type="date"></label><span style="flex:1"></span><button class="btn" id="rx">' + ic('download') + 'Excel</button></div>' + (penuh ? '' : '<div class="hint" style="margin-top:6px">Anda hanya melihat catatan perubahan milik Anda sendiri.</div>') + '</div><div id="rt" style="margin-top:12px"></div>';
      const rt = $('#rt', host);
      const baca = () => { S.q = $('#rq', host).value.trim(); S.aksi = $('#ra', host).value.trim(); S.user = $('#ru', host) ? $('#ru', host).value.trim() : ''; S.dari = $('#rd', host).value; S.sampai = $('#rs', host).value; };
      const tunda = UI.debounce(() => { baca(); S.off = 0; S.rows = []; muat(); }, 350);
      ['#rq', '#ra', '#ru', '#rd', '#rs'].forEach((id) => { const e = $(id, host); if (e) e.oninput = tunda; });
      $('#rx', host).onclick = async () => { try { await UI.unduhXLSX('riwayat-perubahan.xlsx', [{ nama: 'Riwayat', head: ['Waktu', 'Pengguna', 'Peran', 'Aksi', 'Entitas', 'ID', 'Lama', 'Baru', 'Keterangan'], rows: S.rows.map((x) => [wkt(x.waktu), x.user, x.peran, x.aksi, x.entitas, x.id, x.lama, x.baru, x.ket]) }]); } catch (e) { UI.toastErr(e); } };
      async function muat(tambah) {
        const t = ++S.tok; S.sibuk = true; if (!tambah) rt.innerHTML = '<div class="card">' + UI.skel(6, 18) + '</div>';
        try {
          const d = await API.call('audit.daftar', { q: S.q || undefined, aksi: S.aksi || undefined, user: S.user || undefined, dari: S.dari || undefined, sampai: S.sampai || undefined, batas: LIM, offset: S.off }); if (t !== S.tok) return;
          S.total = d.total; S.rows = tambah ? S.rows.concat(d.rows) : d.rows; gambar();
        } catch (e) { if (t === S.tok) rt.innerHTML = '<div class="card">' + UI.kosong(UI.galatTxt(e), 'alert') + '</div>'; } finally { S.sibuk = false; }
      }
      const singkat = (v) => { const s = v === null || v === undefined ? '' : String(v); return s.length > 80 ? s.slice(0, 77) + '…' : s; };
      function gambar() {
        if (!S.rows.length) { rt.innerHTML = '<div class="card">' + UI.kosong('Tidak ada catatan untuk filter ini.', 'hist') + '</div>'; return; }
        rt.innerHTML = '<div class="card"><div class="hint" style="margin-bottom:6px">Menampilkan ' + fmt.n(S.rows.length) + ' dari ' + fmt.n(S.total) + ' catatan terbaru (maks. 4.000 terakhir).</div><div class="tw"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Entitas</th><th>ID</th><th>Perubahan</th><th>Keterangan</th></tr></thead><tbody>' +
          S.rows.map((x) => '<tr><td style="white-space:nowrap">' + esc(wkt(x.waktu)) + '</td><td>' + esc(x.user) + (x.peran ? ' <span class="muted">(' + esc(x.peran) + ')</span>' : '') + '</td><td>' + esc(x.aksi) + '</td><td>' + esc(x.entitas) + '</td><td>' + esc(x.id) + '</td><td class="wrap">' + (x.lama || x.baru ? '<span class="muted">' + esc(singkat(x.lama)) + '</span> → ' + esc(singkat(x.baru)) : '') + '</td><td class="wrap">' + esc(singkat(x.ket)) + '</td></tr>').join('') + '</tbody></table></div>' + (S.rows.length < S.total ? '<div style="margin-top:10px"><button class="btn" id="rm">Muat lebih banyak</button></div>' : '') + '</div>';
        const rm = $('#rm', rt); if (rm) rm.onclick = () => { S.off = S.rows.length; muat(true); };
      }
      muat();
      return { refresh() { if (!S.sibuk && S.off === 0) muat(); }, destroy() { S.tok++; } };
    }
  };
})();
