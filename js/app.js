/* Data Produksi v2 — kerangka aplikasi: landing, masuk, ganti sandi wajib, shell (menu per izin), router hash, polling versi, Profil & Bantuan. */
(function () {
  'use strict';
  const { $, $$, esc, ic, fmt } = UI;
  const root = document.getElementById('root');
  const VERSI = 'v2';

  // Menu: id halaman, label, ikon, izin (null = semua), kelompok
  const NAV = [
    { id: 'dashboard', l: 'Dashboard', i: 'dash', izin: 'dash.baca', g: 'Ringkasan' },
    { id: 'rekap', l: 'Rekap', i: 'table', izin: 'rekap.baca', g: 'Ringkasan' },
    { id: 'pucuk', l: 'Analisa Pucuk', i: 'leaf', izin: 'pucuk.baca', g: 'Ringkasan' },
    { id: 'laporan', l: 'Laporan & Presentasi', i: 'file', izin: 'laporan.baca', g: 'Ringkasan' },
    { id: 'input', l: 'Input Harian', i: 'edit', izin: 'harian.tulis', g: 'Data' },
    { id: 'timbangan', l: 'Timbangan & Kering', i: 'scale', izin: 'timbangan.tulis', g: 'Data' },
    { id: 'impor', l: 'Unggah Excel', i: 'upload', izin: 'impor.tulis', g: 'Data' },
    { id: 'master', l: 'Data Master', i: 'db', izin: 'master.baca', g: 'Data' },
    { id: 'persetujuan', l: 'Persetujuan Periode', i: 'ok', izin: ['periode.ajukan', 'periode.setujui', 'periode.kunci', 'periode.buka'], g: 'Kendali' },
    { id: 'kesehatan', l: 'Kesehatan Data', i: 'shield', izin: 'kesehatan.baca', g: 'Kendali' },
    { id: 'riwayat', l: 'Riwayat', i: 'hist', izin: ['audit.baca', 'audit.sendiri'], g: 'Kendali' },
    { id: 'pengaturan', l: 'Pengaturan', i: 'gear', izin: ['pengaturan.tulis', 'akun.tulis', 'sistem.baca'], g: 'Sistem' },
    { id: 'profil', l: 'Profil & Bantuan', i: 'help', izin: null, g: 'Sistem' }
  ];
  const PUBLIK = { '': 1, masuk: 1 };
  const state = { page: null, inst: null, params: {}, pub: null, offline: false, tmr: null };

  const tokenAda = () => { const s = API.Sesi.baca(); return !!(s && s.token); };
  const bolehHal = (id) => { const n = NAV.find((x) => x.id === id); return !!n && Ctx.can(n.izin); };
  const halAwal = () => (NAV.find((n) => Ctx.can(n.izin) && n.id !== 'profil') || NAV[NAV.length - 1]).id;
  const inisial = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  function parseHash() {
    const h = (location.hash || '#/').replace(/^#\/?/, ''), i = h.indexOf('?');
    const id = (i < 0 ? h : h.slice(0, i)).replace(/\/+$/, ''), p = {};
    if (i >= 0) new URLSearchParams(h.slice(i + 1)).forEach((v, k) => { p[k] = v; });
    return { id: id, params: p };
  }
  function bersih() { if (state.inst && state.inst.destroy) { try { state.inst.destroy(); } catch (e) { console.error(e); } } state.inst = null; }

  // ---------- Konfigurasi belum lengkap ----------
  function layarKonfigurasi() {
    root.innerHTML = '<div class="land"><div class="sec-l" style="max-width:640px;padding-top:12vh"><div class="card"><div class="row" style="gap:10px"><img src="img/logo.png" alt="AGRIWANGI" style="height:44px"><h2 style="margin:0">Konfigurasi belum lengkap</h2></div><p class="muted" style="margin-top:12px">Alamat server (URL <code>/exec</code> Google Apps Script) belum diisi di berkas <code>js/config.js</code>.</p><ol class="small" style="margin:12px 0 0 18px;line-height:1.8"><li>Deploy backend Apps Script sebagai Web App.</li><li>Salin URL yang berakhiran <code>/exec</code>.</li><li>Tempel ke <code>GAS_URL</code> di <code>js/config.js</code>, lalu deploy ulang frontend.</li></ol></div></div></div>';
    UI.pasangIkon();
  }

  // ---------- Landing + masuk ----------
  async function muatPub() {
    try { const d = await API.call('pub.config', {}, { ttl: 300000 }); state.pub = d; UI.tema(d.pengaturan || {}); Ctx.set = Object.assign({}, d.pengaturan || {}); return d; } catch (e) { state.pub = state.pub || { pengaturan: {} }; UI.tema({}); return state.pub; }
  }
  function layarLanding(fokusMasuk) {
    bersih(); const P = (state.pub && state.pub.pengaturan) || {};
    const nama = P.nama_app || 'Data Produksi', usaha = P.perusahaan || 'PT Perkebunan Teh Patuahwattee';
    const fitur = String(P.landing_fitur || 'Input harian cepat lewat keyboard|Unggah Excel dengan pemetaan kolom otomatis|Rekap berjenjang Blok → Sub → Divisi → Estate|Narasi dan isu otomatis yang dapat disunting|Laporan PDF, Excel, dan presentasi sekali klik|Persetujuan periode dan jejak audit').split('|').map((s) => s.trim()).filter(Boolean);
    const ik = ['edit', 'upload', 'layers', 'wand', 'file', 'shield', 'bar', 'clock'];
    const kontak = String(P.landing_kontak || '').trim();
    root.innerHTML = '<div class="land"><nav class="nv"><img src="img/logo.png" alt="AGRIWANGI"><div><b style="font-family:var(--f-head)">' + esc(nama) + '</b><div class="xs muted">' + esc(usaha) + '</div></div><span class="sp"></span><button class="btn ic-only ghost" data-gelap title="Ganti tema">' + ic('moon') + '</button><a class="btn pri" href="#/masuk">' + ic('user') + 'Masuk</a></nav>' +
      '<header class="hero-bg"><div class="hero"><div><span class="badge info">' + ic('leaf') + ' ' + esc(usaha) + '</span><h1>' + esc(P.sambutan || 'Data produksi teh yang rapi, akurat, dan siap dilaporkan.') + '</h1><p class="lead">Catat hasil petik harian, cocokkan dengan timbangan pabrik, hitung rendemen dan yield per hektare, lalu bagikan laporan — semua dari satu tempat, di komputer maupun ponsel.</p><div class="row" style="margin-top:18px;gap:10px"><a class="btn pri lg" href="#/masuk">Masuk ke aplikasi ' + ic('right') + '</a><a class="btn lg" href="#cara">Cara kerja</a></div></div>' +
      '<form class="login" id="fl" autocomplete="on" novalidate><div class="row" style="gap:10px"><img src="img/icon.png" alt="" style="height:36px"><div><h3 style="margin:0">Masuk</h3><div class="small muted">Gunakan akun yang diberikan administrator</div></div></div>' +
      '<div class="banner err hide" id="le">' + ic('alert') + '<div id="lm"></div></div>' +
      '<label class="f">Nama pengguna<input class="inp" id="lu" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>' +
      '<label class="f">Kata sandi<span class="row" style="gap:6px"><input class="inp grow" id="lp" name="password" type="password" autocomplete="current-password" required><button type="button" class="btn ic-only" data-mata title="Tampilkan sandi" aria-label="Tampilkan sandi">' + ic('eye') + '</button></span></label>' +
      '<button class="btn pri lg" id="lb" type="submit">Masuk</button><div class="xs muted">Lupa sandi? Hubungi administrator untuk mengatur ulang.</div></form></div></header>' +
      '<section class="sec-l"><h2>Yang bisa dilakukan</h2><p class="muted">Dirancang dari alur kerja pencatatan produksi yang sebenarnya.</p><div class="g g3" style="margin-top:16px">' + fitur.map((f, i) => '<div class="card feat"><div class="ib">' + ic(ik[i % ik.length]) + '</div><b>' + esc(f) + '</b></div>').join('') + '</div></section>' +
      '<section class="sec-l" id="cara"><h2>Cara kerja</h2><div class="g g3" style="margin-top:16px"><div class="card feat"><div class="ib">' + ic('edit') + '</div><b>1. Catat atau unggah</b><span class="small muted">Ketik hasil petik harian, atau unggah berkas Excel yang sudah ada. Kolom dikenali otomatis dan Anda cukup memeriksa pratinjau.</span></div><div class="card feat"><div class="ib">' + ic('ok') + '</div><b>2. Cek dan setujui</b><span class="small muted">Sistem menandai angka janggal. Periode diajukan, ditinjau, lalu dikunci agar angka final tidak berubah.</span></div><div class="card feat"><div class="ib">' + ic('file') + '</div><b>3. Laporkan</b><span class="small muted">Dashboard, narasi, dan grafik siap diunduh sebagai PDF, Excel, atau presentasi.</span></div></div></section>' +
      '<footer class="foot">' + esc(usaha) + ' · ' + esc(nama) + ' ' + esc(VERSI) + (kontak ? '<br>' + esc(kontak) : '') + '</footer></div>';
    UI.pasangIkon();
    const fm = $('#fl'), le = $('#le'), lm = $('#lm'), btn = $('#lb');
    $('[data-gelap]').onclick = () => UI.modeGelap(document.documentElement.dataset.tema === 'gelap' ? 'terang' : 'gelap');
    $('[data-mata]').onclick = () => { const p = $('#lp'); p.type = p.type === 'password' ? 'text' : 'password'; };
    const tampilGalat = (t) => { lm.textContent = t; le.classList.remove('hide'); };
    fm.onsubmit = async (e) => {
      e.preventDefault(); le.classList.add('hide');
      const u = $('#lu').value.trim(), p = $('#lp').value;
      if (!u || !p) return tampilGalat('Isi nama pengguna dan kata sandi.');
      btn.disabled = true; btn.textContent = 'Memeriksa…';
      try {
        const d = await API.call('auth.masuk', { username: u, password: p });
        API.Sesi.simpan({ token: d.token, user: d.user }); $('#lp').value = '';
        await masukApp(d.user, true);
      } catch (err) { tampilGalat(err.code === 'LOCKED' ? err.message : err.code === 'NETWORK' ? err.message : (err.message || 'Nama pengguna atau kata sandi salah.')); btn.disabled = false; btn.textContent = 'Masuk'; $('#lp').focus(); }
    };
    if (fokusMasuk) { const f = $('#fl'); f.scrollIntoView({ block: 'center' }); setTimeout(() => $('#lu').focus(), 150); }
  }

  // ---------- Ganti sandi wajib ----------
  function modalGantiSandi(wajib) {
    return UI.modal({
      title: wajib ? 'Ganti kata sandi Anda' : 'Ganti kata sandi', tanpaX: !!wajib, esc: !wajib, size: 'sm',
      body: (wajib ? '<div class="banner warn">' + ic('lock') + '<div>Demi keamanan, Anda harus mengganti kata sandi awal sebelum melanjutkan.</div></div>' : '') +
        '<label class="f">Kata sandi saat ini<input class="inp" id="gs0" type="password" autocomplete="current-password"></label>' +
        '<label class="f">Kata sandi baru<input class="inp" id="gs1" type="password" autocomplete="new-password"></label>' +
        '<label class="f">Ulangi kata sandi baru<input class="inp" id="gs2" type="password" autocomplete="new-password"></label>' +
        '<div class="small muted" id="gsk">Minimal ' + (Number(Ctx.set.sandi_min) || 8) + ' karakter, kombinasi huruf dan angka.</div>',
      onOpen: (ov) => { const b = $('#gs1', ov); b.oninput = () => { const min = Number(Ctx.set.sandi_min) || 8; $('#gsk', ov).textContent = (K.sandiKuat(b.value) && b.value.length >= min ? 'Sandi memenuhi syarat.' : 'Minimal ' + min + ' karakter, kombinasi huruf dan angka.'); }; $('#gs0', ov).focus(); },
      foot: (wajib ? [{ label: 'Keluar', cls: 'ghost', fn: async () => { await keluar(true); return true; } }] : [{ label: 'Batal', val: undefined }]).concat([{
        label: 'Simpan sandi', cls: 'pri', ic: 'save', fn: async (ov) => {
          const a = $('#gs0', ov).value, b = $('#gs1', ov).value, c = $('#gs2', ov).value, min = Number(Ctx.set.sandi_min) || 8;
          if (!a) { UI.toast('Isi kata sandi saat ini.', 'warn'); return false; }
          if (b.length < min || !/[A-Za-z]/.test(b) || !/\d/.test(b)) { UI.toast('Sandi baru minimal ' + min + ' karakter dan memuat huruf serta angka.', 'warn'); return false; }
          if (b !== c) { UI.toast('Pengulangan sandi tidak sama.', 'warn'); return false; }
          if (a === b) { UI.toast('Sandi baru harus berbeda dari yang lama.', 'warn'); return false; }
          try { const d = await API.call('auth.gantiSandi', { lama: a, baru: b }); API.Sesi.simpan({ token: d.token, user: d.user }); Ctx.user = d.user; UI.toast('Kata sandi diganti.'); return true; } catch (e) { UI.toastErr(e); return false; }
        }
      }])
    });
  }

  // ---------- Masuk ke aplikasi ----------
  async function muatSaya() {
    const u = await API.call('auth.saya', {});
    Ctx.user = u; Ctx.izin = u.izin || [];
    const s = API.Sesi.baca() || {}; API.Sesi.simpan({ token: s.token, user: u });
    return u;
  }
  async function masukApp(user, baru) {
    state.booting = true;
    try {
      const u = await muatSaya();
      if (u.wajib_ganti) { const ok = await modalGantiSandi(true); if (!ok || !tokenAda()) { state.booting = false; return keluar(true); } await muatSaya(); }
      await muatPub();
      gambarShell();
      API.mulaiPolling(25);
      state.booting = false; const t = parseHash();
      if (t.id && bolehHal(t.id)) route(); else location.hash = '#/' + halAwal();
    } catch (e) { state.booting = false; UI.toastErr(e); if (!tokenAda()) layarLanding(true); }
  }
  async function keluar(diam) {
    try { if (tokenAda()) await API.call('auth.keluar', {}); } catch (e) { /* abaikan */ }
    API.berhentiPolling(); API.Sesi.hapus(); API.invalidasi(); API.bersihkan(); Ctx.user = null; Ctx.izin = []; Ctx.filter = Ctx.filter || {};
    bersih(); location.hash = '#/'; await muatPub(); layarLanding(false);
    if (!diam) UI.toast('Anda telah keluar.');
  }

  // ---------- Shell ----------
  function gambarShell() {
    const u = Ctx.user || {}; const P = Ctx.set || {};
    const ada = NAV.filter((n) => Ctx.can(n.izin)); const grup = [];
    ada.forEach((n) => { let g = grup.find((x) => x.n === n.g); if (!g) { g = { n: n.g, a: [] }; grup.push(g); } g.a.push(n); });
    const nav = grup.map((g) => '<div class="grp">' + esc(g.n) + '</div>' + g.a.map((n) => '<a href="#/' + n.id + '" data-nav="' + n.id + '">' + ic(n.i) + '<span>' + esc(n.l) + '</span><span class="cnt hide" data-cnt="' + n.id + '"></span></a>').join('')).join('');
    const bn = ['dashboard', 'rekap', 'input', 'laporan', 'profil'].filter(bolehHal).map((id) => { const n = NAV.find((x) => x.id === id); return '<a href="#/' + id + '" data-nav="' + id + '">' + ic(n.i) + '<span>' + esc(n.l.split(' ')[0]) + '</span></a>'; }).join('');
    root.innerHTML = '<div class="app" id="app"><aside class="side"><div class="brand"><img src="img/logo.png" alt="AGRIWANGI"><div><div class="t1">' + esc(P.nama_app || 'Data Produksi') + '</div><div class="t2">' + esc(P.perusahaan || 'Patuahwattee') + '</div></div></div><nav class="nav" aria-label="Menu utama">' + nav + '</nav><div class="foot" style="padding:12px;font-size:.6875rem">' + esc(VERSI) + '</div></aside><div class="scrim" data-scrim></div>' +
      '<div class="main"><header class="top"><button class="btn ic-only ghost menu-btn" data-menu aria-label="Buka menu">' + ic('menu') + '</button><div class="title" id="ttl"></div><span class="sp"></span><span class="live" id="lv" title="Status sambungan"><i></i><span>Langsung</span></span><button class="btn ic-only ghost" data-gelap title="Ganti tema" aria-label="Ganti tema">' + ic('moon') + '</button><button class="btn ghost" data-user style="gap:8px"><span class="avatar">' + esc(inisial(u.nama || u.username)) + '</span><span class="hide-sm" style="text-align:left;line-height:1.15"><b class="small">' + esc(u.nama || u.username || '') + '</b><br><span class="xs muted">' + esc(u.role || '') + '</span></span></button></header><div id="ob" class="banner warn hide" style="margin:10px 20px 0">' + ic('alert') + '<div>Tidak terhubung ke server. Data yang tampil adalah salinan terakhir; perubahan belum tersimpan.</div></div><main class="page" id="page" tabindex="-1"></main></div><nav class="bnav" aria-label="Menu cepat">' + bn + '</nav></div>';
    UI.pasangIkon();
    const app = $('#app');
    $('[data-menu]').onclick = () => app.classList.toggle('open'); $('[data-scrim]').onclick = () => app.classList.remove('open');
    $$('.nav a', app).forEach((a) => a.addEventListener('click', () => app.classList.remove('open')));
    $('[data-gelap]').onclick = () => UI.modeGelap(document.documentElement.dataset.tema === 'gelap' ? 'terang' : 'gelap');
    $('[data-user]').onclick = (e) => UI.menu(e.currentTarget, [{ label: 'Profil & Bantuan', ic: 'user', fn: () => Ctx.go('profil') }, { label: 'Ganti kata sandi', ic: 'key', fn: () => modalGantiSandi(false) }, '-', { label: 'Keluar', ic: 'out', fn: () => keluar(false) }]);
    perbaruiLencana();
  }
  async function perbaruiLencana() {
    if (!Ctx.user) return;
    try {
      const b = await Ctx.boot(); const set = (id, n) => { const e = $('[data-cnt="' + id + '"]'); if (!e) return; e.textContent = n > 99 ? '99+' : n; e.classList.toggle('hide', !(n > 0)); };
      set('kesehatan', Ctx.can('kesehatan.baca') ? ((b.peringatan && b.peringatan.belumDitinjau) || 0) : 0);
      set('persetujuan', Ctx.can(['periode.setujui', 'periode.kunci']) ? (b.periodeList || []).filter((x) => x.status === 'Diajukan').length : 0);
    } catch (e) { /* lencana opsional */ }
  }
  function tandaiNav(id) { $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === id)); }

  // ---------- Router ----------
  function route() {
    if (state.booting) return;
    const t = parseHash();
    if (!API.url()) return layarKonfigurasi();
    if (!tokenAda() || !Ctx.user) { if (!PUBLIK[t.id] && t.id) { location.hash = '#/masuk'; return; } if (!$('#fl')) layarLanding(t.id === 'masuk'); else if (t.id === 'masuk') { $('#lu').focus(); } return; }
    if (PUBLIK[t.id]) { location.hash = '#/' + halAwal(); return; }
    if (!$('#app')) gambarShell();
    if (!bolehHal(t.id) || !Pages[t.id]) {
      const pg = $('#page'); bersih(); tandaiNav(null);
      if (bolehHal(t.id) && !Pages[t.id]) { $('#ttl').textContent = 'Halaman'; pg.innerHTML = '<div class="card">' + UI.kosong('Halaman ini belum tersedia.', 'alert') + '</div>'; return; }
      if (t.id && t.id !== halAwal()) UI.toast('Anda tidak memiliki izin untuk halaman itu.', 'warn');
      location.hash = '#/' + halAwal(); return;
    }
    const def = Pages[t.id], pg = $('#page');
    bersih(); state.page = t.id; state.params = t.params; tandaiNav(t.id);
    $('#ttl').textContent = def.judul || NAV.find((n) => n.id === t.id).l; document.title = (def.judul || '') + ' — ' + ((Ctx.set && Ctx.set.nama_app) || 'Data Produksi') + ' ' + VERSI;
    pg.innerHTML = ''; window.scrollTo(0, 0);
    try { state.inst = def.mount(pg, t.params) || null; } catch (e) { console.error(e); pg.innerHTML = '<div class="card">' + UI.kosong('Halaman gagal dimuat: ' + UI.galatTxt(e), 'alert') + '</div>'; }
    perbaruiLencana();
  }

  // ---------- Peristiwa global ----------
  let segarT = null;
  API.on('versi', (e) => {
    const ubah = e.ubah || [];
    if (ubah.indexOf('akses') >= 0 && Ctx.user) { muatSaya().then((u) => { const lama = $$('.nav a').map((a) => a.dataset.nav).join(); const baru = NAV.filter((n) => Ctx.can(n.izin)).map((n) => n.id).join(); if (lama !== baru) { gambarShell(); route(); UI.toast('Hak akses Anda diperbarui.', 'info'); } }).catch(() => {}); }
    if (ubah.indexOf('set') >= 0) { API.call('pub.config', {}, { force: true, diam: true }).then((d) => { state.pub = d; Ctx.set = Object.assign({}, d.pengaturan || {}); UI.tema(d.pengaturan || {}); }).catch(() => {}); }
    const def = Pages[state.page];
    if (def && state.inst && state.inst.refresh && ubah.some((k) => (def.scopes || ['data', 'rekap']).indexOf(k) >= 0)) {
      clearTimeout(segarT); segarT = setTimeout(() => { try { state.inst.refresh(); } catch (er) { console.error(er); } const lv = $('#lv'); if (lv) { lv.classList.add('ber'); lv.lastChild.textContent = 'Diperbarui'; setTimeout(() => { lv.classList.remove('ber'); lv.lastChild.textContent = 'Langsung'; }, 2500); } }, 300);
    }
    perbaruiLencana();
  });
  API.on('online', (ok) => { state.offline = !ok; const ob = $('#ob'), lv = $('#lv'); if (ob) ob.classList.toggle('hide', ok); if (lv) { lv.classList.toggle('off', !ok); lv.lastChild.textContent = ok ? 'Langsung' : 'Luring'; } });
  API.on('sesi:habis', () => { if (!Ctx.user && !$('#app')) return; API.berhentiPolling(); bersih(); Ctx.user = null; Ctx.izin = []; location.hash = '#/masuk'; muatPub().then(() => { layarLanding(true); UI.toast('Sesi berakhir. Silakan masuk lagi.', 'warn'); }); });
  API.on('sesi:ganti', () => { if (Ctx.user && !Ctx.pending) { Ctx.pending = modalGantiSandi(true).then((ok) => { Ctx.pending = null; if (ok) route(); else keluar(true); }); } });
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', (e) => { if (e.key === '?' && !/input|textarea|select/i.test((e.target.tagName || '')) && Ctx.user) { e.preventDefault(); Ctx.go('profil', { tab: 'bantuan' }); } });

  // ---------- Profil & Bantuan ----------
  const FAQ = [
    ['Apa beda GL dan MT?', 'GL adalah berat daun teh basah hasil petik (Kg). MT adalah berat teh kering hasil olah pabrik (Kg).'],
    ['Bagaimana Rendemen dihitung?', 'Rendemen = MT ÷ daun basah ditimbang pabrik, dihitung per bulan pada level estate. Angka per blok tidak memakai rendemen karena kering hanya ditimbang di pabrik.'],
    ['Yield/Ha itu apa?', 'Yield/Ha = MT ÷ luas areal (Ha). Klik tanda "i" di kartu angka untuk melihat rumus dan masukan yang dipakai.'],
    ['Kenapa ada "Selisih" pada Cek Silang Pabrik?', 'Selisih = jumlah GL di kebun dikurangi basah timbangan pabrik. Selisih kecil wajar; selisih besar ditandai di Kesehatan Data.'],
    ['Apa arti status periode?', 'Draf → Diajukan → Disetujui → Terkunci. Periode terkunci tidak bisa diubah kecuali dibuka kembali oleh pihak berwenang dengan alasan tercatat.'],
    ['Bagaimana mengunggah Excel?', 'Buka Unggah Excel, pilih berkas, periksa pemetaan kolom dan pratinjau, lalu terapkan. Setiap unggahan bisa dibatalkan (rollback) dari Riwayat unggahan.'],
    ['Narasi saya hilang setelah data berubah?', 'Tidak. Teks yang Anda sunting tetap tersimpan dan diberi tanda "Data berubah". Gunakan tombol kembalikan untuk memakai teks otomatis terbaru.']
  ];
  const PINTAS = [['?', 'Buka bantuan'], ['Tab / Enter / ↑ ↓ ← →', 'Pindah antar sel pada Input Harian'], ['Ctrl + S', 'Simpan pada Input Harian'], ['Esc', 'Tutup dialog / keluar presentasi'], ['← →', 'Pindah slide presentasi'], ['L', 'Penunjuk laser presentasi']];

  // Kartu "Pasang di HP" (PWA): tombol pasang bila peramban mendukung, langkah manual bila tidak.
  function pwaKartu(el) {
    if (!el) return;
    const gambar = () => {
      if (!document.body.contains(el)) { document.removeEventListener('pwa-state', gambar); return; }
      const P = window.PWA; let h = '<h3>Pasang di HP</h3>';
      if (!P) { h += '<p class="small muted">Fitur pemasangan tidak tersedia di peramban ini.</p>'; }
      else if (P.terpasang()) { h += '<p class="small">' + UI.badge('Sudah terpasang', 'ok') + ' Aplikasi ini sedang dibuka dari layar utama.</p>'; }
      else if (P.bisaPasang()) { h += '<p class="small muted">Pasang agar aplikasi muncul di layar utama seperti aplikasi biasa, dibuka tanpa kolom alamat peramban.</p><div class="row" style="margin-top:10px"><button class="btn pri" data-pasang>' + ic('upload') + 'Pasang aplikasi</button></div>'; }
      else if (P.ios()) { h += '<p class="small muted">Di iPhone/iPad, buka halaman ini lewat <b>Safari</b>, lalu:</p><ol class="small" style="margin:8px 0 0 18px;line-height:1.8"><li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas).</li><li>Pilih <b>Tambah ke Layar Utama</b>.</li><li>Ketuk <b>Tambah</b>.</li></ol>'; }
      else { h += '<p class="small muted">Di Android (Chrome): buka menu <b>⋮</b> di kanan atas, pilih <b>Pasang aplikasi</b> atau <b>Tambahkan ke layar utama</b>. Bila menu itu belum muncul, muat ulang halaman satu kali lalu coba lagi.</p>'; }
      el.innerHTML = h;
      const b = $('[data-pasang]', el); if (b) b.onclick = async () => { const r = await window.PWA.pasang(); if (r === 'diterima') UI.toast && UI.toast('Aplikasi dipasang.', 'ok'); };
    };
    document.addEventListener('pwa-state', gambar); gambar();
  }
  Pages.profil = {
    judul: 'Profil & Bantuan', scopes: ['akses', 'set'],
    mount(host, p) {
      const u = Ctx.user || {}; const cak = Ctx.cakupan; const mode = localStorage.getItem('dp_mode') || (Ctx.set.mode_gelap || 'terang');
      host.innerHTML = '<div class="seg" id="tb"><button data-t="profil">Profil</button><button data-t="bantuan">Bantuan</button><button data-t="tentang">Tentang</button></div><div id="tc"></div>';
      const tc = $('#tc', host);
      function tampil(t) {
        $$('#tb button', host).forEach((b) => b.classList.toggle('on', b.dataset.t === t));
        if (t === 'profil') {
          tc.innerHTML = '<div class="g g2"><div class="card"><div class="row" style="gap:12px"><span class="avatar" style="width:52px;height:52px;font-size:1.1rem">' + esc(inisial(u.nama || u.username)) + '</span><div><h3 style="margin:0">' + esc(u.nama || u.username) + '</h3><div class="muted small">@' + esc(u.username || '') + '</div></div></div><dl class="dl" style="margin-top:14px"><dt>Peran</dt><dd>' + UI.badge(u.role || '-', 'info') + '</dd><dt>Cakupan data</dt><dd>' + (cak ? 'Divisi ' + esc(cak.join(', ')) : 'Seluruh estate') + '</dd><dt>Jumlah izin</dt><dd>' + (Ctx.izin.indexOf('*') >= 0 ? 'Penuh (superadmin)' : Ctx.izin.length) + '</dd></dl><div class="row" style="margin-top:14px;gap:8px"><button class="btn" data-sandi>' + ic('key') + 'Ganti kata sandi</button><button class="btn" data-out>' + ic('out') + 'Keluar</button></div></div>' +
            '<div class="card"><h3>Tampilan</h3><p class="small muted">Pilihan ini hanya berlaku di perangkat ini.</p><div class="seg" id="sm"><button data-m="terang">Terang</button><button data-m="gelap">Gelap</button><button data-m="otomatis">Otomatis</button></div><div class="hint" style="margin-top:10px">Gaya, warna, dan kerapatan tampilan diatur administrator di Pengaturan.</div></div></div>'+
            '<div class="card" id="pwa" style="margin-top:16px"></div>';
          pwaKartu($('#pwa', tc));
          $('[data-sandi]', tc).onclick = () => modalGantiSandi(false); $('[data-out]', tc).onclick = () => keluar(false);
          const sm = $('#sm', tc); const setM = (m) => { $$('button', sm).forEach((b) => b.classList.toggle('on', b.dataset.m === m)); try { localStorage.setItem('dp_mode', m); } catch (e) {} UI.tema(Object.assign({}, Ctx.set, { mode_gelap: m })); }; $$('button', sm).forEach((b) => { b.onclick = () => setM(b.dataset.m); b.classList.toggle('on', b.dataset.m === mode); });
        } else if (t === 'bantuan') {
          tc.innerHTML = '<div class="g g2"><div class="card"><h3>Pertanyaan umum</h3><div class="col" style="margin-top:8px">' + FAQ.map((f) => '<details class="faq"><summary><b>' + esc(f[0]) + '</b></summary><p class="small" style="margin:6px 0 0">' + esc(f[1]) + '</p></details>').join('') + '</div></div><div class="card"><h3>Pintasan keyboard</h3><table class="tbl compact"><tbody>' + PINTAS.map((x) => '<tr><td><kbd>' + esc(x[0]) + '</kbd></td><td>' + esc(x[1]) + '</td></tr>').join('') + '</tbody></table><h3 style="margin-top:18px">Butuh bantuan?</h3><p class="small muted">Hubungi administrator aplikasi' + (Ctx.set.landing_kontak ? ': ' + esc(Ctx.set.landing_kontak) : '') + '.</p></div></div>';
        } else {
          const v = API.versi || {};
          tc.innerHTML = '<div class="card"><h3>' + esc(Ctx.set.nama_app || 'Data Produksi') + ' ' + esc(VERSI) + '</h3><dl class="dl"><dt>Perusahaan</dt><dd>' + esc(Ctx.set.perusahaan || '-') + '</dd><dt>Versi backend</dt><dd>' + esc((v.versiApp) || '-') + '</dd><dt>Sambungan</dt><dd>' + (state.offline ? 'Luring' : 'Tersambung') + '</dd></dl></div>';
        }
      }
      $$('#tb button', host).forEach((b) => { b.onclick = () => tampil(b.dataset.t); });
      tampil(p && p.tab === 'bantuan' ? 'bantuan' : p && p.tab === 'tentang' ? 'tentang' : 'profil');
      return { destroy() {} };
    }
  };

  // ---------- Mulai ----------
  async function mulai() {
    UI.pasangIkon(); UI.tema({});
    if (!API.url()) return layarKonfigurasi();
    await muatPub();
    if (tokenAda()) {
      try { await masukApp(null, false); return; } catch (e) { /* jatuh ke landing */ }
      if (tokenAda()) return;
    }
    route();
  }
  window.App = { NAV, route, keluar, modalGantiSandi };
  mulai();
})();
