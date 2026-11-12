/* Data Produksi v1 — pustaka UI: DOM, ikon SVG inline, format id-ID, modal, toast, tabel (virtual), tema, ekspor. Tanpa CDN. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (x) => String(x === null || x === undefined ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = String(html).trim(); return t.content.firstElementChild; };
  const debounce = (fn, ms) => { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms || 250); }; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Ikon ----------
  const IK = {
    menu: 'M3 6h18M3 12h18M3 18h18', x: 'M18 6 6 18M6 6l12 12', plus: 'M12 5v14M5 12h14', check: 'M20 6 9 17l-5-5', minus: 'M5 12h14',
    down: 'm6 9 6 6 6-6', right: 'm9 18 6-6-6-6', left: 'm15 18-6-6 6-6', up: 'm18 15-6-6-6 6',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    dash: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
    edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    scale: 'M12 3v18M5 7l7-4 7 4M5 7l-3 8a4 4 0 0 0 6 0zM19 7l-3 8a4 4 0 0 0 6 0zM8 21h8',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    layers: 'm12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5',
    leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5-6.5 2.5-.9 4.7-1.5 8-3.5',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
    ok: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3',
    db: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
    out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
    lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
    unlock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 9.9-1',
    refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15',
    bar: 'M12 20V10M18 20V4M6 20v-4', play: 'M5 3l14 9-14 9z',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
    copy: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    cal: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    trash: 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
    arrup: 'M12 19V5M5 12l7-7 7 7', arrdn: 'M12 5v14M19 12l-7 7-7-7', trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
    wand: 'M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z',
    filter: 'M22 3H2l8 9.5V19l4 2v-8.5z', ext: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
    pie: 'M21.2 15.9A10 10 0 1 1 8 2.8M22 12A10 10 0 0 0 12 2v10z',
    img: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM20 22H6.5a2.5 2.5 0 0 1 0-5H20z',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
    key: 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4',
    zap: 'M13 2 3 14h9l-1 8 10-12h-9z', more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    max: 'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3',
    pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8', table: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18', hist: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2'
  };
  function ic(n, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function pasangIkon() {
    if ($('#sprite')) return;
    const s = '<svg id="sprite" xmlns="http://www.w3.org/2000/svg" style="display:none">' + Object.keys(IK).map((k) => '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + IK[k].split(/(?=M)/).map((d) => '<path d="' + d + '"/>').join('') + '</symbol>').join('') + '</svg>';
    document.body.insertAdjacentHTML('afterbegin', s);
  }

  // ---------- Format ----------
  const NF = {}; const nf = (d) => NF[d] || (NF[d] = new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const ok = (x) => x !== null && x !== undefined && x !== '' && isFinite(Number(x));
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const fmt = {
    n(x, d) { return ok(x) ? nf(d || 0).format(Number(x)) : '–'; },
    pct(x, d) { return ok(x) ? nf(d === undefined ? 2 : d).format(Number(x) * 100) + '%' : '–'; },
    ringkas(x) { if (!ok(x)) return '–'; const a = Math.abs(x); return a >= 1e9 ? nf(2).format(x / 1e9) + ' M' : a >= 1e6 ? nf(2).format(x / 1e6) + ' jt' : a >= 1e3 ? nf(1).format(x / 1e3) + ' rb' : nf(0).format(x); },
    bulan(p, pendek) { if (!p) return ''; const m = String(p).split('-'); const n = BLN[Number(m[1]) - 1] || ''; return (pendek ? n.slice(0, 3) : n) + ' ' + m[0]; },
    tgl(s) { if (!s) return ''; const m = String(s).slice(0, 10).split('-'); return Number(m[2]) + ' ' + (BLN[Number(m[1]) - 1] || '').slice(0, 3) + ' ' + m[0]; },
    waktu(s) { if (!s) return ''; const d = new Date(s); if (isNaN(d)) return String(s); return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); },
    delta(a, b, bal) { if (!ok(a) || !ok(b) || Number(b) === 0) return null; const v = (a - b) / Math.abs(b); return { v: v, txt: (v > 0 ? '+' : '') + nf(1).format(v * 100) + '%', arah: Math.abs(v) < 0.0005 ? 'nu' : ((v > 0) !== !!bal ? 'up' : 'dn') }; },
    ukuran(b) { return b > 1048576 ? nf(1).format(b / 1048576) + ' MB' : b > 1024 ? nf(0).format(b / 1024) + ' KB' : b + ' B'; }
  };
  function deltaHtml(a, b, bal) { const d = fmt.delta(a, b, bal); return d ? '<span class="delta ' + d.arah + '">' + ic(d.v >= 0 ? 'arrup' : 'arrdn') + d.txt + '</span>' : ''; }
  const periodeNow = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const geser = (p, n) => { const m = String(p).split('-'); const d = new Date(Number(m[0]), Number(m[1]) - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const hariDalamBulan = (p) => { const m = String(p).split('-'); return new Date(Number(m[0]), Number(m[1]), 0).getDate(); };
  const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const hariNama = (s) => NAMA_HARI[new Date(s + 'T00:00:00').getDay()];

  // ---------- Toast ----------
  function toast(msg, tipe, ms) {
    let w = $('.toasts'); if (!w) { w = el('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(w); }
    const t = el('<div class="toast ' + (tipe || 'ok') + '">' + ic(tipe === 'err' ? 'alert' : tipe === 'warn' ? 'alert' : 'check') + '<div>' + esc(msg) + '</div></div>');
    w.appendChild(t); setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .25s'; setTimeout(() => t.remove(), 260); }, ms || (tipe === 'err' ? 6000 : 3200));
  }
  const galatTxt = (e) => (e && e.message) || 'Terjadi kesalahan.';
  const toastErr = (e) => toast(galatTxt(e), 'err');

  // ---------- Modal ----------
  function modal(o) {
    o = o || {};
    return new Promise((resolve) => {
      const ov = el('<div class="ov" role="dialog" aria-modal="true"><div class="modal ' + (o.size || '') + '"><div class="mh"><h3>' + esc(o.title || '') + '</h3><button class="btn ghost sm ic-only" data-x aria-label="Tutup">' + ic('x') + '</button></div><div class="mb"></div><div class="mf"></div></div></div>');
      const mb = $('.mb', ov), mf = $('.mf', ov);
      if (typeof o.body === 'string') mb.innerHTML = o.body; else if (o.body) mb.appendChild(o.body);
      const foot = o.foot === undefined ? [{ label: 'Tutup', val: false }] : o.foot;
      if (!foot.length) mf.remove();
      foot.forEach((b) => { const x = el('<button class="btn ' + (b.cls || '') + '">' + (b.ic ? ic(b.ic) : '') + esc(b.label) + '</button>'); x.onclick = async () => { if (b.fn) { try { x.disabled = true; const r = await b.fn(ov); if (r === false) { x.disabled = false; return; } if (r !== undefined && r !== true) b.val = r; } catch (e) { x.disabled = false; toastErr(e); return; } } tutup(b.val === undefined ? true : b.val); }; mf.appendChild(x); });
      function tutup(v) { document.removeEventListener('keydown', kb); ov.remove(); resolve(v); }
      function kb(e) { if (e.key === 'Escape' && o.esc !== false && !o.tanpaX) tutup(undefined); }
      document.addEventListener('keydown', kb);
      if (o.tanpaX) { $('[data-x]', ov).remove(); } else $('[data-x]', ov).onclick = () => tutup(undefined);
      if (o.esc !== false && !o.tanpaX) ov.addEventListener('mousedown', (e) => { if (e.target === ov) tutup(undefined); });
      document.body.appendChild(ov);
      if (o.onOpen) o.onOpen(ov, tutup);
      const f = $('input,select,textarea', mb); if (f && !o.noFocus) setTimeout(() => f.focus(), 30);
    });
  }
  const konfirmasi = (msg, o) => { o = o || {}; return modal({ title: o.judul || 'Konfirmasi', body: '<p style="margin:0">' + esc(msg) + '</p>' + (o.html || ''), size: o.size, foot: [{ label: o.tidak || 'Batal', val: false }, { label: o.ya || 'Ya, lanjutkan', cls: o.bahaya ? 'dng' : 'pri', val: true }] }).then((v) => v === true); };
  const tanya = (label, o) => { o = o || {}; return modal({ title: o.judul || label, body: '<label class="f">' + esc(label) + (o.baris ? '<textarea class="inp" id="tq" rows="3">' : '<input class="inp" id="tq" type="' + (o.type || 'text') + '"') + (o.baris ? esc(o.def || '') + '</textarea>' : ' value="' + esc(o.def || '') + '" autocomplete="off">') + '</label>' + (o.hint ? '<div class="hint">' + esc(o.hint) + '</div>' : ''),
    foot: [{ label: 'Batal', val: undefined }, { label: o.ok || 'Simpan', cls: 'pri', fn: (ov) => { const v = $('#tq', ov).value.trim(); if (o.wajib !== false && !v) { toast('Wajib diisi.', 'warn'); return false; } if (o.min && v.length < o.min) { toast('Minimal ' + o.min + ' karakter.', 'warn'); return false; } return v; } }] }); };

  // ---------- Popover ----------
  function menu(anchor, items) {
    $$('.pop').forEach((p) => p.remove());
    const r = anchor.getBoundingClientRect();
    const p = el('<div class="pop"></div>'); items.forEach((it) => { if (it === '-') { p.appendChild(el('<hr style="border:0;border-top:1px solid var(--line);margin:4px 0">')); return; } const b = el('<button>' + (it.ic ? ic(it.ic) : '') + esc(it.label) + '</button>'); b.onclick = () => { p.remove(); it.fn && it.fn(); }; p.appendChild(b); });
    p.style.top = Math.min(window.scrollY + r.bottom + 4, window.scrollY + window.innerHeight - 20) + 'px'; p.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.innerWidth - 220)) + 'px';
    document.body.appendChild(p); setTimeout(() => document.addEventListener('click', function f(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('click', f); } }), 0);
  }

  // ---------- Tabel ----------
  // cols: [{k, h, num, fmt(v,row), cls, sort, html}]
  function tabelHtml(cols, rows, o) {
    o = o || {};
    const th = cols.map((c, i) => '<th class="' + (c.num ? 'num ' : '') + (c.sort === false ? '' : 'srt') + '" data-i="' + i + '">' + esc(c.h) + (o.sortI === i ? (o.sortDir > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('');
    const tr = rows.map((r, ri) => '<tr data-r="' + ri + '"' + (o.rowCls ? ' class="' + o.rowCls(r) + '"' : '') + '>' + cols.map((c) => { const v = c.v ? c.v(r) : r[c.k]; const t = c.fmt ? c.fmt(v, r) : (c.html ? v : esc(v)); return '<td class="' + (c.num ? 'num ' : '') + (c.cls || '') + (o.click && c.click ? ' cl' : '') + '"' + (c.click ? ' data-c="' + esc(c.k) + '"' : '') + '>' + (c.html ? v : t) + '</td>'; }).join('') + '</tr>').join('');
    const foot = o.foot ? '<tfoot><tr>' + cols.map((c, i) => '<td class="' + (c.num ? 'num' : '') + '">' + (o.foot[i] === undefined ? '' : o.foot[i]) + '</td>').join('') + '</tr></tfoot>' : '';
    return '<div class="tw" ' + (o.maxH ? 'style="max-height:' + o.maxH + 'px"' : '') + '><table class="tbl ' + (o.zebra ? 'zebra ' : '') + (o.cls || '') + '"><thead><tr>' + th + '</tr></thead><tbody>' + (tr || '<tr><td colspan="' + cols.length + '" class="empty">Belum ada data.</td></tr>') + '</tbody>' + foot + '</table></div>';
  }
  // Tabel interaktif: urut klik header + klik sel. Mengembalikan {set(rows)}. Untuk >400 baris memakai jendela virtual.
  function tabel(host, cols, rows, o) {
    o = o || {}; let data = rows || [], si = o.sortI === undefined ? -1 : o.sortI, sd = o.sortDir || 1;
    const RH = o.rowH || 34;
    function urut() { if (si < 0) return data; const c = cols[si], g = c.v || ((r) => r[c.k]); return data.slice().sort((a, b) => { let x = g(a), y = g(b); if (x === y) return 0; if (x === null || x === undefined || x === '') return 1; if (y === null || y === undefined || y === '') return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'id', { numeric: true })) * sd; }); }
    function gambar() {
      const d = urut();
      if (d.length <= 400) { host.innerHTML = tabelHtml(cols, d, { sortI: si, sortDir: sd, zebra: o.zebra, foot: o.foot ? o.foot(d) : null, rowCls: o.rowCls, click: !!o.onCell, maxH: o.maxH, cls: o.cls }); pasang(d); return; }
      const H = o.maxH || 520; host.innerHTML = '<div class="tw" style="max-height:' + H + 'px"><table class="tbl ' + (o.zebra ? 'zebra' : '') + '"><thead><tr>' + cols.map((c, i) => '<th class="' + (c.num ? 'num ' : '') + 'srt" data-i="' + i + '">' + esc(c.h) + (si === i ? (sd > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr></thead><tbody></tbody></table></div>';
      const tw = $('.tw', host), tb = $('tbody', host);
      const isi = () => { const st = tw.scrollTop, a = Math.max(0, Math.floor(st / RH) - 8), b = Math.min(d.length, a + Math.ceil(H / RH) + 16);
        tb.innerHTML = (a ? '<tr style="height:' + a * RH + 'px"><td colspan="' + cols.length + '" style="padding:0;border:0"></td></tr>' : '') + d.slice(a, b).map((r, i) => '<tr data-r="' + (a + i) + '" style="height:' + RH + 'px">' + cols.map((c) => { const v = c.v ? c.v(r) : r[c.k]; return '<td class="' + (c.num ? 'num ' : '') + (o.onCell && c.click ? 'cl ' : '') + (c.cls || '') + '"' + (c.click ? ' data-c="' + esc(c.k) + '"' : '') + '>' + (c.html ? v : (c.fmt ? c.fmt(v, r) : esc(v))) + '</td>'; }).join('') + '</tr>').join('') + (b < d.length ? '<tr style="height:' + (d.length - b) * RH + 'px"><td colspan="' + cols.length + '" style="padding:0;border:0"></td></tr>' : ''); };
      tw.addEventListener('scroll', () => requestAnimationFrame(isi)); isi(); pasang(d);
    }
    function pasang(d) {
      $$('th.srt', host).forEach((t) => { t.onclick = () => { const i = Number(t.dataset.i); if (cols[i].sort === false) return; if (si === i) sd = -sd; else { si = i; sd = cols[i].num ? -1 : 1; } gambar(); }; });
      host.onclick = (e) => { const td = e.target.closest('td[data-c]'); const tr = e.target.closest('tr[data-r]'); if (!tr) return; const r = d[Number(tr.dataset.r)]; if (td && o.onCell) o.onCell(td.dataset.c, r, td); else if (o.onRow) o.onRow(r, tr); };
    }
    gambar();
    return { set(r) { data = r || []; gambar(); }, rows() { return data; } };
  }
  const skel = (n, h) => Array.from({ length: n || 3 }, () => '<div class="skel" style="height:' + (h || 16) + 'px;margin:8px 0"></div>').join('');
  const kosong = (msg, ikon) => '<div class="empty">' + ic(ikon || 'info') + '<div style="margin-top:8px">' + esc(msg || 'Belum ada data.') + '</div></div>';
  const badge = (t, c) => '<span class="badge ' + (c || t) + '">' + esc(t) + '</span>';

  // ---------- Muat skrip ----------
  const muatan = {};
  function muat(src) { return muatan[src] || (muatan[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete muatan[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); })); }
  const muatXLSX = () => window.XLSX ? Promise.resolve() : muat('vendor/xlsx.full.min.js');
  const muatPPTX = () => window.PptxGenJS ? Promise.resolve() : muat('vendor/pptxgen.bundle.js');

  // ---------- Unduh ----------
  function unduh(nama, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function csvSel(v) { v = v === null || v === undefined ? '' : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function unduhCSV(nama, head, rows) { unduh(nama, new Blob(['﻿' + [head].concat(rows).map((r) => r.map(csvSel).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })); }
  async function unduhXLSX(nama, lembar) { await muatXLSX(); const wb = XLSX.utils.book_new(); lembar.forEach((l) => { const ws = XLSX.utils.aoa_to_sheet([l.head].concat(l.rows)); ws['!cols'] = l.head.map((h, i) => ({ wch: Math.min(40, Math.max(String(h).length + 2, 10)) })); XLSX.utils.book_append_sheet(wb, ws, String(l.nama).slice(0, 31)); }); XLSX.writeFile(wb, nama); }

  // ---------- Tema ----------
  function warnaGelap(h, f) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return h; const n = parseInt(m[1], 16); const c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f))); return '#' + [16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join(''); }
  function tema(p) {
    p = p || {}; const r = document.documentElement;
    r.dataset.gaya = p.gaya || 'modern'; r.dataset.rapat = p.kerapatan || 'normal';
    let mode = p.mode_gelap || 'terang'; const pref = localStorage.getItem('dp_mode'); if (pref) mode = pref;
    const gelap = mode === 'gelap' || (mode === 'otomatis' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    r.dataset.tema = gelap ? 'gelap' : 'terang';
    if (/^#[0-9a-f]{6}$/i.test(p.warna_utama || '')) { r.style.setProperty('--pri', p.warna_utama); r.style.setProperty('--pri-h', warnaGelap(p.warna_utama, 1.25)); r.style.setProperty('--leaf-forest', p.warna_utama); }
    if (/^#[0-9a-f]{6}$/i.test(p.warna_aksen || '')) { r.style.setProperty('--acc', p.warna_aksen); r.style.setProperty('--shoot', p.warna_aksen); }
    const f = String(p.font || '').replace(/[^A-Za-z0-9 \-]/g, '').trim(); if (f && f !== 'Plus Jakarta Sans') r.style.setProperty('--f-head', "'" + f + "',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif");
    const nm = $('meta[name="theme-color"]'); if (nm) nm.content = p.warna_utama || '#1B4332';
  }
  function modeGelap(m) { try { localStorage.setItem('dp_mode', m); } catch (e) {} const r = document.documentElement; r.dataset.tema = m === 'gelap' ? 'gelap' : 'terang'; }

  // ---------- Lain ----------
  const unik = (a) => Array.from(new Set(a));
  const sum = (a, f) => a.reduce((s, x) => s + (Number(f ? f(x) : x) || 0), 0);
  const num = (v) => { if (v === '' || v === null || v === undefined) return null; const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  const salin = (t) => navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast('Disalin.')) : Promise.reject();

  window.UI = { $, $$, esc, el, ic, pasangIkon, fmt, deltaHtml, periodeNow, geser, hariDalamBulan, hariNama, toast, toastErr, galatTxt, modal, konfirmasi, tanya, menu, tabel, tabelHtml, skel, kosong, badge, muat, muatXLSX, muatPPTX, unduh, unduhCSV, unduhXLSX, tema, modeGelap, debounce, sleep, unik, sum, num, salin, BLN };
})();
