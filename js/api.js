/* Data Produksi v1 — klien API: POST text/plain, cache SWR, polling versi (delta), invalidasi per cakupan. */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const KS = 'dp_sesi_v1';
  const Sesi = {
    baca() { try { return JSON.parse(localStorage.getItem(KS) || 'null'); } catch (e) { return null; } },
    simpan(s) { try { localStorage.setItem(KS, JSON.stringify(s)); } catch (e) {} },
    hapus() { try { localStorage.removeItem(KS); } catch (e) {} }
  };
  // Cakupan versi per awalan aksi (untuk invalidasi cache)
  const CAKUPAN = { harian: ['data', 'rekap'], timbangan: ['data', 'rekap'], kering: ['data', 'rekap'], impor: ['data', 'rekap', 'periode'], rekap: ['data', 'rekap', 'master', 'periode'],
    pucuk: ['pucuk'], narasi: ['rekap', 'set'], isu: ['set'], rumus: ['set', 'rekap'], laporan: ['rekap', 'set'], periode: ['periode', 'rekap'], pengaturan: ['set'],
    hakakses: ['akses'], pengguna: ['akses'], master: ['master', 'rekap'], kesehatan: ['data', 'master'], sistem: ['data', 'rekap', 'set'], notif: ['set'], grafik: ['set'], dashboard: ['set'], audit: ['data'] };
  const TULIS = new Set(['simpan', 'hapus', 'ajukan', 'setujui', 'tolak', 'kunci', 'bukaKunci', 'mulai', 'kirim', 'terapkan', 'batal', 'rollback', 'resetSandi', 'simpanPeran', 'hapusPeran', 'simpanIzin',
    'tinjau', 'rotasi', 'kembalikanArsip', 'hitungUlang', 'cadangan', 'jadwal', 'gantiSandi', 'keluar', 'reset', 'presetSimpan', 'presetHapus', 'profilSimpan', 'profilHapus', 'templateSimpan', 'templateHapus', 'berkas', 'pdf', 'status']);
  const cache = new Map(), inflight = new Map(), pendengar = {};
  let versi = null, timer = null, tersedia = true, lastV = null;
  function url() { const u = CFG.GAS_URL || ''; return /GANTI|XXXX/.test(u) || !/^https:\/\//.test(u) ? '' : u; }
  function galat(code, message, extra) { const e = new Error(message || code); e.code = code; if (extra) Object.assign(e, extra); return e; }
  function on(ev, fn) { (pendengar[ev] = pendengar[ev] || []).push(fn); return () => { pendengar[ev] = (pendengar[ev] || []).filter((f) => f !== fn); }; }
  function emit(ev, d) { (pendengar[ev] || []).forEach((f) => { try { f(d); } catch (e) { console.error(e); } }); }
  function adalahTulis(a) { return TULIS.has(String(a).split('.')[1]); }
  function tagOf(a) { return CAKUPAN[String(a).split('.')[0]] || []; }

  async function panggil(action, data, opt) {
    opt = opt || {};
    const u = url();
    if (!u) throw galat('KONFIG', 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL Web App (/exec).');
    const s = Sesi.baca();
    const ctl = new AbortController(), tmo = setTimeout(() => ctl.abort(), opt.timeout || 90000);
    let r, j;
    try {
      r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, token: s && s.token, data: data || {} }), signal: ctl.signal, redirect: 'follow' });
      j = await r.json();
    } catch (e) {
      clearTimeout(tmo);
      throw galat('NETWORK', e && e.name === 'AbortError' ? 'Server terlalu lama menjawab. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet.');
    }
    clearTimeout(tmo);
    if (!j || typeof j !== 'object') throw galat('SERVER', 'Jawaban server tidak dikenali.');
    if (j.v) { const beda = versi && j.v !== versi.str; lastV = j.v; if (beda && !opt.diam) setTimeout(cekVersi, 50); }
    if (!j.success) {
      if (j.code === 'AUTH_REQUIRED' || j.code === 'TOKEN_EXPIRED') { if (action !== 'auth.masuk') { Sesi.hapus(); cache.clear(); emit('sesi:habis', j); } }
      if (j.code === 'PASSWORD_CHANGE_REQUIRED') emit('sesi:ganti', j);
      throw galat(j.code || 'SERVER', j.message || 'Terjadi kesalahan.', { ms: j.ms });
    }
    return j.data;
  }
  function kunci(a, d) { return a + '|' + JSON.stringify(d || {}); }
  function invalidasi(tags) {
    cache.forEach((v, k) => { if (!tags || v.tags.some((t) => tags.indexOf(t) >= 0)) cache.delete(k); });
  }
  async function call(action, data, opt) {
    opt = opt || {};
    if (adalahTulis(action)) {
      try { return await panggil(action, data, opt); }
      finally { invalidasi(tagOf(action)); if (!opt.diam) setTimeout(cekVersi, 30); emit('tulis', { action: action }); }
    }
    const k = kunci(action, data);
    if (inflight.has(k) && !opt.force) return inflight.get(k);
    const p = panggil(action, data, opt).then((d) => { cache.set(k, { t: Date.now(), d: d, tags: tagOf(action), action: action }); return d; }).finally(() => inflight.delete(k));
    inflight.set(k, p); return p;
  }
  // SWR: berikan cache lebih dulu (cb(data, {basi:true})), lalu segarkan bila lewat TTL.
  function swr(action, data, cb, opt) {
    opt = opt || {};
    const ttl = opt.ttl === undefined ? 60000 : opt.ttl, k = kunci(action, data), c = cache.get(k);
    let batal = false;
    if (c) { try { cb(c.d, { basi: Date.now() - c.t > ttl, cache: true }); } catch (e) { console.error(e); } }
    const segar = c && Date.now() - c.t <= ttl && !opt.force;
    const p = segar ? Promise.resolve(c.d) : call(action, data, { diam: opt.diam, force: !!c }).then((d) => { if (!batal) { try { cb(d, { basi: false, cache: false }); } catch (e) { console.error(e); } } return d; });
    p.batal = () => { batal = true; };
    return p;
  }
  function cekVersi() {
    if (!Sesi.baca() || !url()) return Promise.resolve();
    return panggil('sistem.versi', {}, { diam: true, timeout: 20000 }).then((v) => {
      tersedia = true;
      const lama = versi && versi.map;
      const map = { data: v.data, rekap: v.rekap, master: v.master, set: v.set, akses: v.akses, periode: v.periode, pucuk: v.pucuk };
      versi = { map: map, str: lastV, versiApp: v.versi };
      if (lama) {
        const ubah = Object.keys(map).filter((k) => map[k] !== lama[k]);
        if (ubah.length) { invalidasi(ubah); emit('versi', { ubah: ubah, map: map }); }
      }
      emit('online', true);
    }).catch((e) => { if (e.code === 'NETWORK') { tersedia = false; emit('online', false); } });
  }
  function mulaiPolling(detik) {
    berhentiPolling();
    const tick = () => { if (document.visibilityState === 'visible') cekVersi(); };
    timer = setInterval(tick, (detik || 25) * 1000);
    document.addEventListener('visibilitychange', tick);
    cekVersi();
  }
  function berhentiPolling() { if (timer) clearInterval(timer); timer = null; }

  const API = { call, swr, on, emit, Sesi, url, galat, invalidasi, cekVersi, mulaiPolling, berhentiPolling,
    get online() { return tersedia; }, get versi() { return versi; },
    bersihkan() { cache.clear(); versi = null; } };
  window.API = API;
})();
