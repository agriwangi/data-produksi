/* Data Produksi v2 — pustaka grafik SVG buatan sendiri (28 jenis), tanpa CDN. Warna, legenda, tooltip, ekspor PNG/SVG, tema terang/gelap. */
(function () {
  'use strict';
  const U = window.UI, esc = U.esc;
  const W = 640;
  const f2 = (x) => (Math.round(x * 100) / 100);
  function tc() {
    const cs = getComputedStyle(document.documentElement), g = (n) => cs.getPropertyValue(n).trim();
    return { ink: g('--ink'), ink2: g('--ink2'), ink3: g('--ink3'), line: g('--line'), line2: g('--line2'), card: g('--card'), bg: g('--bg'), pri: g('--pri'), acc: g('--acc'), crit: g('--crit'), warn: g('--warn'), safe: g('--safe'), pal: Array.from({ length: 10 }, (_, i) => g('--c' + (i + 1)) || '#40916C'), font: g('--f-body') || 'sans-serif' };
  }
  function nice(min, max, n) {
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; } if (min === max) { if (min === 0) max = 1; else { min = Math.min(0, min); max = Math.max(0, max); if (min === max) max = min + 1; } }
    const step0 = (max - min) / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(step0))), r = step0 / mag, step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
    const a = Math.floor(min / step + 1e-9) * step, b = Math.ceil(max / step - 1e-9) * step, out = []; for (let v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(10)); return out;
  }
  const fa = (v) => { const a = Math.abs(v); return a >= 1e6 ? U.fmt.n(v / 1e6, a >= 1e7 ? 0 : 1) + ' jt' : a >= 1e4 ? U.fmt.n(v / 1e3, 0) + ' rb' : U.fmt.n(v, a < 10 && v % 1 ? 1 : 0); };
  const tx = (x, y, s, o) => { o = o || {}; return '<text x="' + f2(x) + '" y="' + f2(y) + '" text-anchor="' + (o.a || 'middle') + '" fill="' + (o.c || T.ink3) + '" font-size="' + (o.s || 10.5) + '"' + (o.w ? ' font-weight="' + o.w + '"' : '') + (o.rot ? ' transform="rotate(' + o.rot + ' ' + f2(x) + ' ' + f2(y) + ')"' : '') + (o.dy ? ' dy="' + o.dy + '"' : '') + ' font-family="' + T.font + '">' + esc(s) + '</text>'; };
  const ln = (x1, y1, x2, y2, c, d) => '<line x1="' + f2(x1) + '" y1="' + f2(y1) + '" x2="' + f2(x2) + '" y2="' + f2(y2) + '" stroke="' + c + '"' + (d ? ' stroke-dasharray="' + d + '"' : '') + '/>';
  const tip = (h) => ' data-t="' + esc(h) + '"';
  const sw = (c) => '<i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + c + ';margin-right:5px"></i>';
  let T = tc();
  const trunc = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const lab = (s) => trunc(s, 12);

  // ---------- Kartesian ----------
  function kartesian(sp, hid) {
    const tipe = sp.tipe, H = sp.h || 280, horiz = tipe === 'batang_h', xs = sp.x || [], all = sp.seri || [];
    const seri = all.map((s, i) => Object.assign({ i: i }, s)).filter((s) => !hid.has(s.i));
    const col = (s) => s.warna || T.pal[s.i % 10];
    const kombo = tipe === 'kombo', pareto = tipe === 'pareto';
    const st = tipe === 'area_tumpuk' || tipe === 'batang_tumpuk' || tipe === 'batang_100';
    const bars = (s) => tipe.indexOf('batang') === 0 || pareto || (kombo && s.tipe !== 'garis');
    const n = xs.length; const fm = sp.fmt || fa;
    let lo = Infinity, hi = -Infinity, lo2 = Infinity, hi2 = -Infinity;
    const tot = xs.map((_, j) => seri.reduce((a, s) => a + Math.max(0, Number(s.v[j]) || 0), 0));
    if (tipe === 'batang_100') { lo = 0; hi = 100; }
    else if (st) { lo = 0; hi = Math.max.apply(null, tot.concat([1])); }
    else seri.forEach((s) => s.v.forEach((v) => { if (v === null || v === undefined || isNaN(v)) return; const two = (kombo && s.sumbu === 2); if (two) { lo2 = Math.min(lo2, v); hi2 = Math.max(hi2, v); } else { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
    if (pareto) { hi2 = 100; lo2 = 0; }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    const barDomain = seri.some(bars) || tipe.indexOf('area') === 0 || sp.nol;
    if (barDomain) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    const tk = nice(lo, hi, 5); lo = tk[0]; hi = tk[tk.length - 1];
    const dua = isFinite(lo2) || pareto; let tk2 = dua ? nice(Math.min(lo2, 0), hi2, 5) : []; if (dua) { lo2 = tk2[0]; hi2 = tk2[tk2.length - 1]; }
    const lw = Math.max.apply(null, tk.map((v) => (horiz ? 0 : fm(v).length * 6.2))) + 14, ml = horiz ? Math.min(120, Math.max.apply(null, xs.map((x) => lab(x).length * 5.6).concat([30])) + 12) : Math.max(34, lw);
    const mr = dua ? Math.max(34, Math.max.apply(null, tk2.map((v) => (pareto ? String(v).length + 1 : fm(v).length) * 6.2)) + 12) : 12, mt = 10, rot = !horiz && n > 12 && xs.some((x) => String(x).length > 3), mb = horiz ? 22 : (rot ? 46 : 26);
    const pw = W - ml - mr, ph = H - mt - mb;
    const X = (j) => ml + (horiz ? 0 : (n === 1 ? pw / 2 : (tipe.indexOf('batang') === 0 || pareto || kombo ? (j + .5) * pw / n : j * pw / (n - 1))));
    const Y = (v) => mt + ph - (v - lo) / (hi - lo || 1) * ph, Y2 = (v) => mt + ph - (v - lo2) / (hi2 - lo2 || 1) * ph;
    const VX = (v) => ml + (v - lo) / (hi - lo || 1) * pw, CY = (j) => mt + (j + .5) * ph / n;
    let o = '';
    // grid & sumbu
    if (horiz) { tk.forEach((v) => { o += ln(VX(v), mt, VX(v), mt + ph, T.line, '2 3') + tx(VX(v), H - 6, fm(v)); }); xs.forEach((x, j) => { o += tx(ml - 6, CY(j) + 3.5, lab(x), { a: 'end' }); }); }
    else {
      tk.forEach((v) => { o += ln(ml, Y(v), ml + pw, Y(v), v === 0 ? T.line2 : T.line, v === 0 ? '' : '2 3') + tx(ml - 6, Y(v) + 3.5, tipe === 'batang_100' ? v + '%' : fm(v), { a: 'end' }); });
      if (dua) tk2.forEach((v) => { o += tx(ml + pw + 6, Y2(v) + 3.5, pareto ? v + '%' : (sp.fmt2 || fa)(v), { a: 'start' }); });
      const every = Math.ceil(n / (rot ? 24 : 12));
      xs.forEach((x, j) => { if (j % every === 0) o += tx(X(j), H - (rot ? 6 : 8) - (rot ? 0 : 0) + (rot ? -14 : 0), lab(x), rot ? { rot: -40, a: 'end' } : {}); });
    }
    const bs = seri.filter(bars), nb = Math.max(1, bs.length);
    const baseV = lo > 0 ? lo : 0;
    // batang/area/garis
    if (pareto) {
      const cum = []; let c = 0; const sm = tot.length ? sp.seri[0].v.reduce((a, b) => a + b, 0) : 1; sp.seri[0].v.forEach((v) => { c += v; cum.push(c / (sm || 1) * 100); });
      seri.length && seri.slice(0, 1).forEach((s) => s.v.forEach((v, j) => { const bw = pw / n * .7; o += '<rect class="hov" x="' + f2(X(j) - bw / 2) + '" y="' + f2(Y(Math.max(v, 0))) + '" width="' + f2(bw) + '" height="' + f2(Math.abs(Y(0) - Y(v)))+ '" fill="' + col(s) + '" rx="2"' + tip(xs[j] + ': ' + fm(v) + ' (kumulatif ' + U.fmt.n(cum[j], 1) + '%)') + '/>'; }));
      o += '<path d="' + cum.map((v, j) => (j ? 'L' : 'M') + f2(X(j)) + ' ' + f2(Y2(v))).join('') + '" fill="none" stroke="' + T.acc + '" stroke-width="2"/>' + cum.map((v, j) => '<circle cx="' + f2(X(j)) + '" cy="' + f2(Y2(v)) + '" r="2.6" fill="' + T.acc + '"/>').join('');
      o += ln(ml, Y2(80), ml + pw, Y2(80), T.acc, '4 3');
    } else {
      const acc = new Array(n).fill(0);
      seri.forEach((s) => {
        const c = col(s), two = kombo && s.sumbu === 2, Yf = two ? Y2 : Y;
        if (bars(s)) {
          const idx = bs.indexOf(s);
          if (horiz) { s.v.forEach((v, j) => { if (v === null || v === undefined || isNaN(v)) return; const bh = ph / n * (st ? .66 : .72 / nb); const y = CY(j) - (st ? bh / 2 : (nb * bh) / 2 - idx * bh); let x0 = VX(0), x1 = VX(v); if (st) { const base = acc[j]; const val = tipe === 'batang_100' ? v / (tot[j] || 1) * 100 : v; x0 = VX(tipe === 'batang_100' ? base : base); x1 = VX(base + val); acc[j] = base + val; } o += '<rect class="hov" x="' + f2(Math.min(x0, x1)) + '" y="' + f2(y) + '" width="' + f2(Math.abs(x1 - x0)) + '" height="' + f2(bh - 1) + '" fill="' + c + '" rx="2"' + tip(xs[j] + ' — ' + s.nama + ': ' + fm(v)) + '/>'; }); }
          else s.v.forEach((v, j) => {
            if (v === null || v === undefined || isNaN(v)) return; const bw = pw / n * (st ? .66 : .74 / nb); const xc = X(j); const xx = st ? xc - bw / 2 : xc - (nb * bw) / 2 + idx * bw;
            let y0 = Yf(0), y1 = Yf(v);
            if (st) { const val = tipe === 'batang_100' ? (v / (tot[j] || 1) * 100) : v; y0 = Y(acc[j]); acc[j] += val; y1 = Y(acc[j]); }
            o += '<rect class="hov" x="' + f2(xx) + '" y="' + f2(Math.min(y0, y1)) + '" width="' + f2(Math.max(1, bw - 1)) + '" height="' + f2(Math.abs(y1 - y0)) + '" fill="' + c + '" rx="2"' + tip(xs[j] + ' — ' + s.nama + ': ' + fm(v) + (tipe === 'batang_100' ? ' (' + U.fmt.n(v / (tot[j] || 1) * 100, 1) + '%)' : '')) + '/>';
          });
        } else {
          const pts = s.v.map((v, j) => (v === null || v === undefined || isNaN(v) ? null : [X(j), Yf(v)]));
          let d = '', pen = false, prev = null;
          pts.forEach((p) => { if (!p) { pen = false; return; } if (!pen) d += 'M' + f2(p[0]) + ' ' + f2(p[1]); else if (tipe === 'step') d += 'H' + f2(p[0]) + 'V' + f2(p[1]); else d += 'L' + f2(p[0]) + ' ' + f2(p[1]); pen = true; prev = p; });
          if (tipe === 'area' || tipe === 'area_tumpuk') {
            let top, bot;
            if (tipe === 'area_tumpuk') { top = s.v.map((v, j) => { acc[j] += Math.max(0, v || 0); return [X(j), Y(acc[j])]; }); bot = s.v.map((v, j) => [X(j), Y(acc[j] - Math.max(0, v || 0))]); d = top.map((p, k) => (k ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1])).join(''); o += '<path d="' + d + bot.reverse().map((p) => 'L' + f2(p[0]) + ' ' + f2(p[1])).join('') + 'Z" fill="' + c + '" fill-opacity=".72" stroke="' + c + '" stroke-width="1"/>'; }
            else { const real = pts.filter(Boolean); if (real.length) o += '<path d="' + d + 'L' + f2(real[real.length - 1][0]) + ' ' + f2(Y(Math.max(lo, 0))) + 'L' + f2(real[0][0]) + ' ' + f2(Y(Math.max(lo, 0))) + 'Z" fill="' + c + '" fill-opacity=".16"/><path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>'; }
          } else {
            o += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"' + (s.putus ? ' stroke-dasharray="5 4"' : '') + '/>';
            if (n <= 40) pts.forEach((p) => { if (p) o += '<circle cx="' + f2(p[0]) + '" cy="' + f2(p[1]) + '" r="2.8" fill="' + T.card + '" stroke="' + c + '" stroke-width="1.8"/>'; });
          }
        }
      });
    }
    if (sp.target !== undefined && sp.target !== null) { const ty = horiz ? null : Y(sp.target); if (ty !== null) o += ln(ml, ty, ml + pw, ty, T.crit, '5 4') + tx(ml + pw - 2, ty - 4, sp.targetLabel || 'Target', { a: 'end', c: T.crit }); }
    // hit area tooltip kolom
    xs.forEach((x, j) => {
      const rows = seri.map((s) => { const v = s.v[j]; return v === null || v === undefined || isNaN(v) ? '' : sw(col(s)) + esc(s.nama) + ': <b>' + fm(v) + '</b>'; }).filter(Boolean).join('<br>');
      if (horiz || tipe.indexOf('batang') === 0 || pareto) return;
      const wcol = n > 1 ? pw / (n - 1) : pw; const xc = X(j);
      o += '<rect x="' + f2(xc - wcol / 2) + '" y="' + mt + '" width="' + f2(wcol) + '" height="' + ph + '" fill="transparent" class="hit"' + tip('<b>' + esc(x) + '</b><br>' + rows) + '/>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }

  // ---------- Bulat ----------
  const rad = (d) => d * Math.PI / 180;
  const arc = (cx, cy, r0, r1, a0, a1) => { const l = (a1 - a0) > 180 ? 1 : 0, p = (r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))]; const A = p(r1, a0), B = p(r1, a1), C = p(r0, a1), D = p(r0, a0); if (a1 - a0 >= 359.99) { return 'M' + (cx + r1) + ' ' + cy + 'A' + r1 + ' ' + r1 + ' 0 1 1 ' + (cx - r1) + ' ' + cy + 'A' + r1 + ' ' + r1 + ' 0 1 1 ' + (cx + r1) + ' ' + cy + (r0 ? 'M' + (cx + r0) + ' ' + cy + 'A' + r0 + ' ' + r0 + ' 0 1 0 ' + (cx - r0) + ' ' + cy + 'A' + r0 + ' ' + r0 + ' 0 1 0 ' + (cx + r0) + ' ' + cy : '') + 'Z'; } return 'M' + f2(A[0]) + ' ' + f2(A[1]) + 'A' + r1 + ' ' + r1 + ' 0 ' + l + ' 1 ' + f2(B[0]) + ' ' + f2(B[1]) + (r0 ? 'L' + f2(C[0]) + ' ' + f2(C[1]) + 'A' + r0 + ' ' + r0 + ' 0 ' + l + ' 0 ' + f2(D[0]) + ' ' + f2(D[1]) : 'L' + cx + ' ' + cy) + 'Z'; };
  function pie(sp, hid) {
    const H = sp.h || 280, items = (sp.item || []).map((x, i) => Object.assign({ i: i }, x)).filter((x) => !hid.has(x.i) && x.v > 0), tot = items.reduce((a, x) => a + x.v, 0), donat = sp.tipe === 'donat', cx = W / 2, cy = H / 2, R = Math.min(H / 2 - 14, 120), fm = sp.fmt || fa;
    let a = -90, o = '';
    items.forEach((x) => { const sw_ = x.v / tot * 360, c = x.warna || T.pal[x.i % 10]; o += '<path class="hov" d="' + arc(cx, cy, donat ? R * .58 : 0, R, a, a + sw_) + '" fill="' + c + '" stroke="' + T.card + '" stroke-width="1.5"' + tip(x.n + ': ' + fm(x.v) + ' (' + U.fmt.n(x.v / tot * 100, 1) + '%)') + '/>'; if (sw_ > 18) { const m = rad(a + sw_ / 2), rr = donat ? R * .79 : R * .66; o += tx(cx + rr * Math.cos(m), cy + rr * Math.sin(m) + 3.5, U.fmt.n(x.v / tot * 100, 0) + '%', { c: '#fff', w: 600 }); } a += sw_; });
    if (donat) o += tx(cx, cy - 2, sp.pusat || fm(tot), { s: 17, c: T.ink, w: 700 }) + tx(cx, cy + 15, sp.pusatLabel || 'Total', {});
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function scatter(sp, hid) {
    const H = sp.h || 300, pts = sp.titik || [], bub = sp.tipe === 'bubble', ml = 52, mr = 14, mt = 10, mb = 34, pw = W - ml - mr, ph = H - mt - mb;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), tx_ = nice(Math.min.apply(null, xs), Math.max.apply(null, xs), 6), ty = nice(Math.min.apply(null, ys), Math.max.apply(null, ys), 5);
    const X = (v) => ml + (v - tx_[0]) / (tx_[tx_.length - 1] - tx_[0] || 1) * pw, Y = (v) => mt + ph - (v - ty[0]) / (ty[ty.length - 1] - ty[0] || 1) * ph;
    const gs = U.unik(pts.map((p) => p.g || '')), rmax = Math.max.apply(null, pts.map((p) => p.r || 1).concat([1]));
    let o = ''; ty.forEach((v) => { o += ln(ml, Y(v), ml + pw, Y(v), T.line, '2 3') + tx(ml - 6, Y(v) + 3.5, fa(v), { a: 'end' }); }); tx_.forEach((v) => { o += ln(X(v), mt, X(v), mt + ph, T.line, '2 3') + tx(X(v), H - 16, fa(v)); });
    o += tx(ml + pw / 2, H - 3, sp.xLabel || '', {}) + tx(12, mt + ph / 2, sp.yLabel || '', { rot: -90 });
    pts.forEach((p) => { const gi = gs.indexOf(p.g || ''); if (hid.has(gi)) return; const c = T.pal[gi % 10], r = bub ? 5 + 20 * Math.sqrt((p.r || 1) / rmax) : 4.2; o += '<circle class="hov" cx="' + f2(X(p.x)) + '" cy="' + f2(Y(p.y)) + '" r="' + f2(r) + '" fill="' + c + '" fill-opacity="' + (bub ? .55 : .8) + '" stroke="' + c + '"' + tip((p.n ? '<b>' + esc(p.n) + '</b><br>' : '') + (sp.xLabel || 'X') + ': ' + fa(p.x) + '<br>' + (sp.yLabel || 'Y') + ': ' + fa(p.y) + (bub ? '<br>' + (sp.rLabel || 'Ukuran') + ': ' + fa(p.r || 0) : '')) + '/>'; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function radar(sp, hid) {
    const H = sp.h || 300, ax = sp.sumbu || [], n = ax.length, cx = W / 2, cy = H / 2 + 4, R = Math.min(H / 2 - 34, 110); let o = '';
    const mx = nice(0, Math.max.apply(null, (sp.seri || []).flatMap((s) => s.v).concat([1])), 4), top = mx[mx.length - 1];
    mx.slice(1).forEach((v) => { o += '<polygon points="' + ax.map((_, i) => { const a = rad(-90 + 360 * i / n), r = R * v / top; return f2(cx + r * Math.cos(a)) + ',' + f2(cy + r * Math.sin(a)); }).join(' ') + '" fill="none" stroke="' + T.line + '"/>' + tx(cx + 3, cy - R * v / top + 3, fa(v), { a: 'start', s: 9 }); });
    ax.forEach((s, i) => { const a = rad(-90 + 360 * i / n); o += ln(cx, cy, cx + R * Math.cos(a), cy + R * Math.sin(a), T.line) + tx(cx + (R + 14) * Math.cos(a), cy + (R + 14) * Math.sin(a) + 3.5, lab(s), { a: Math.cos(a) > .2 ? 'start' : Math.cos(a) < -.2 ? 'end' : 'middle' }); });
    (sp.seri || []).forEach((s, si) => { if (hid.has(si)) return; const c = s.warna || T.pal[si % 10]; o += '<polygon class="hov" points="' + s.v.map((v, i) => { const a = rad(-90 + 360 * i / n), r = R * v / top; return f2(cx + r * Math.cos(a)) + ',' + f2(cy + r * Math.sin(a)); }).join(' ') + '" fill="' + c + '" fill-opacity=".18" stroke="' + c + '" stroke-width="2"' + tip('<b>' + esc(s.nama) + '</b><br>' + s.v.map((v, i) => esc(ax[i]) + ': ' + fa(v)).join('<br>')) + '/>'; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const hex6 = (c, d) => /^#[0-9a-f]{6}$/i.test(c) ? c : d;
  function heatmap(sp) {
    const rows = sp.baris || [], cols = sp.kolom || [], v = sp.v || [], ml = Math.min(110, Math.max.apply(null, rows.map((r) => lab(r).length * 5.8).concat([30])) + 10), mt = 22, cw = (W - ml - 8) / Math.max(1, cols.length), rh = Math.min(30, Math.max(14, (sp.h ? sp.h - mt - 8 : 260) / Math.max(1, rows.length))), H = mt + rh * rows.length + 8;
    const flat = v.flat().filter((x) => x !== null && x !== undefined && !isNaN(x)), mn = Math.min.apply(null, flat), mx = Math.max.apply(null, flat); let o = '';
    const c0 = hex6(T.card, '#ffffff'), c1 = hex6(T.pri, '#1B4332'), show = rows.length * cols.length <= 160;
    cols.forEach((c, j) => { o += tx(ml + (j + .5) * cw, 14, trunc(c, 6)); });
    rows.forEach((r, i) => { o += tx(ml - 6, mt + (i + .5) * rh + 3.5, lab(r), { a: 'end' }); cols.forEach((c, j) => { const x = v[i] && v[i][j]; if (x === null || x === undefined || isNaN(x)) { o += '<rect x="' + f2(ml + j * cw) + '" y="' + f2(mt + i * rh) + '" width="' + f2(cw - 1) + '" height="' + f2(rh - 1) + '" fill="' + T.line + '" fill-opacity=".4"/>'; return; } const t = (x - mn) / (mx - mn || 1); o += '<rect class="hov" x="' + f2(ml + j * cw) + '" y="' + f2(mt + i * rh) + '" width="' + f2(cw - 1) + '" height="' + f2(rh - 1) + '" fill="' + mix(c0, c1, .08 + t * .92) + '" rx="2"' + tip(r + ' × ' + c + ': ' + (sp.fmt || fa)(x)) + '/>'; if (show && cw > 26) o += tx(ml + (j + .5) * cw, mt + (i + .5) * rh + 3.5, (sp.fmt || fa)(x), { c: t > .55 ? '#fff' : T.ink, s: 9 }); }); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function kalender(sp) {
    const hari = (sp.hari || []).slice().sort((a, b) => a.t < b.t ? -1 : 1); if (!hari.length) return '<svg viewBox="0 0 ' + W + ' 40"></svg>';
    const map = {}; hari.forEach((h) => { map[h.t] = h.v; }); const d0 = new Date(hari[0].t + 'T00:00:00'), d1 = new Date(hari[hari.length - 1].t + 'T00:00:00');
    const start = new Date(d0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); const nw = Math.ceil(((d1 - start) / 864e5 + 1) / 7), cs = Math.min(22, (W - 40) / nw), mt = 18, H = mt + cs * 7 + 8;
    const vs = hari.map((h) => h.v).filter((x) => x !== null && !isNaN(x)), mx = Math.max.apply(null, vs.concat([1])), c0 = hex6(T.line, '#E2E8F0'), c1 = hex6(T.pri, '#1B4332'); let o = '', lm = -1;
    ['Sen', 'Rab', 'Jum'].forEach((s, i) => { o += tx(28, mt + (i * 2 + .5) * cs + 3.5, s, { a: 'end', s: 9 }); });
    for (let w = 0; w < nw; w++) for (let k = 0; k < 7; k++) { const d = new Date(start); d.setDate(start.getDate() + w * 7 + k); if (d < d0 || d > d1) continue; const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const v = map[key]; if (d.getMonth() !== lm && k === 0 || (w === 0 && lm < 0)) { lm = d.getMonth(); o += tx(34 + w * cs, 11, U.BLN[lm].slice(0, 3), { a: 'start', s: 9.5 }); } o += '<rect class="hov" x="' + f2(34 + w * cs) + '" y="' + f2(mt + k * cs) + '" width="' + f2(cs - 2) + '" height="' + f2(cs - 2) + '" rx="2" fill="' + (v === undefined || v === null ? T.line : mix(c0, c1, .15 + .85 * (v / mx))) + '" fill-opacity="' + (v === undefined || v === null ? .35 : 1) + '"' + tip(U.fmt.tgl(key) + ': ' + (v === undefined || v === null ? 'tidak ada data' : (sp.fmt || fa)(v))) + '/>'; }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  // squarified treemap
  function squarify(items, x, y, w, h) {
    const tot = items.reduce((a, i) => a + i.v, 0), out = []; let rest = items.slice().sort((a, b) => b.v - a.v), area = w * h;
    const nrm = rest.map((i) => ({ i: i, a: i.v / tot * area }));
    function worst(row, side) { const s = row.reduce((a, r) => a + r.a, 0), mx = Math.max.apply(null, row.map((r) => r.a)), mn = Math.min.apply(null, row.map((r) => r.a)); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); }
    let q = nrm.slice(); while (q.length) { const side = Math.min(w, h); let row = [q[0]], k = 1; while (k < q.length && worst(row.concat([q[k]]), side) <= worst(row, side)) { row.push(q[k]); k++; } q = q.slice(row.length); const s = row.reduce((a, r) => a + r.a, 0); if (w >= h) { const rw = s / h; let yy = y; row.forEach((r) => { const rh = r.a / rw; out.push({ i: r.i, x: x, y: yy, w: rw, h: rh }); yy += rh; }); x += rw; w -= rw; } else { const rh = s / w; let xx = x; row.forEach((r) => { const rw = r.a / rh; out.push({ i: r.i, x: xx, y: y, w: rw, h: rh }); xx += rw; }); y += rh; h -= rh; } }
    return out;
  }
  function treemap(sp, hid) {
    const H = sp.h || 300, items = (sp.item || []).map((x, i) => Object.assign({ i: i }, x)).filter((x) => x.v > 0 && !hid.has(x.i)), tot = items.reduce((a, x) => a + x.v, 0); let o = '';
    squarify(items, 0, 0, W, H).forEach((r) => { const c = r.i.warna || T.pal[r.i.i % 10]; o += '<rect class="hov" x="' + f2(r.x + 1) + '" y="' + f2(r.y + 1) + '" width="' + f2(Math.max(0, r.w - 2)) + '" height="' + f2(Math.max(0, r.h - 2)) + '" fill="' + c + '" rx="3"' + tip(r.i.n + ': ' + (sp.fmt || fa)(r.i.v) + ' (' + U.fmt.n(r.i.v / tot * 100, 1) + '%)') + '/>'; if (r.w > 48 && r.h > 30) o += tx(r.x + 8, r.y + 18, trunc(r.i.n, Math.floor(r.w / 7)), { a: 'start', c: '#fff', w: 600, s: 11 }) + tx(r.x + 8, r.y + 33, (sp.fmt || fa)(r.i.v), { a: 'start', c: '#fff', s: 10 }); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function sunburst(sp) {
    const H = sp.h || 340, cx = W / 2, cy = H / 2, root = sp.pohon || { n: '', children: [] }; function val(n) { return n.children && n.children.length ? n.children.reduce((a, c) => a + val(c), 0) : (n.v || 0); }
    const tot = val(root) || 1, depth = (n) => 1 + (n.children && n.children.length ? Math.max.apply(null, n.children.map(depth)) : 0), D = Math.max(1, depth(root) - 1), Rm = Math.min(H / 2 - 8, 150), rw = Rm / (D + .4); let o = '', ci = 0;
    (function walk(n, a0, a1, d, c) { const kids = n.children || []; let a = a0; kids.forEach((k, i) => { const v = val(k), span = (a1 - a0) * v / (val(n) || 1), col = d === 1 ? T.pal[(ci++) % 10] : c, sh = d === 1 ? col : mix(col, hex6(T.card, '#ffffff'), Math.min(.55, .18 * (d - 1))); o += '<path class="hov" d="' + arc(cx, cy, rw * (d - .6) + 2, rw * (d + .4), a, a + span) + '" fill="' + sh + '" stroke="' + T.card + '" stroke-width="1"' + tip(k.n + ': ' + (sp.fmt || fa)(v) + ' (' + U.fmt.n(v / tot * 100, 1) + '%)') + '/>'; if (span > 14 && d <= 2) { const m = rad(a + span / 2), rr = rw * d - rw * .1; o += tx(cx + rr * Math.cos(m), cy + rr * Math.sin(m) + 3, trunc(k.n, 8), { c: '#fff', s: 9, w: 600 }); } walk(k, a, a + span, d + 1, col); a += span; }); })(root, -90, 270, 1, null);
    o += tx(cx, cy + 4, sp.pusat || '', { s: 13, c: T.ink, w: 700 });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function waterfall(sp) {
    const H = sp.h || 280, it = sp.item || [], ml = 52, mr = 12, mt = 12, mb = 28, pw = W - ml - mr, ph = H - mt - mb; let run = 0; const segs = it.map((x) => { const s = x.total ? { a: 0, b: x.v !== undefined ? x.v : run, tot: true } : { a: run, b: run + x.v }; run = s.b; return Object.assign({}, x, s); });
    const all = segs.flatMap((s) => [s.a, s.b]).concat([0]), tk = nice(Math.min.apply(null, all), Math.max.apply(null, all), 5), Y = (v) => mt + ph - (v - tk[0]) / (tk[tk.length - 1] - tk[0] || 1) * ph, bw = pw / segs.length * .66; let o = '';
    tk.forEach((v) => { o += ln(ml, Y(v), ml + pw, Y(v), v === 0 ? T.line2 : T.line, v === 0 ? '' : '2 3') + tx(ml - 6, Y(v) + 3.5, (sp.fmt || fa)(v), { a: 'end' }); });
    segs.forEach((s, j) => { const x = ml + (j + .5) * pw / segs.length, c = s.tot ? T.pri : (s.b >= s.a ? T.safe : T.crit); o += '<rect class="hov" x="' + f2(x - bw / 2) + '" y="' + f2(Math.min(Y(s.a), Y(s.b))) + '" width="' + f2(bw) + '" height="' + f2(Math.max(1, Math.abs(Y(s.a) - Y(s.b)))) + '" fill="' + c + '" rx="2"' + tip(s.n + ': ' + (s.tot ? '' : (s.b - s.a >= 0 ? '+' : '')) + (sp.fmt || fa)(s.tot ? s.b : s.b - s.a)) + '/>' + tx(x, H - 10, lab(s.n)); if (j < segs.length - 1) o += ln(x + bw / 2, Y(s.b), x + pw / segs.length - bw / 2, Y(s.b), T.line2, '2 2'); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function gauge(sp) {
    const H = sp.h || 210, cx = W / 2, cy = H - 36, R = Math.min(H - 56, 150), mn = sp.min || 0, mx = sp.max === undefined ? 100 : sp.max, v = Math.max(mn, Math.min(mx, sp.v || 0)), t = (x) => 180 + 180 * (x - mn) / (mx - mn || 1); let o = '';
    const z = sp.zona || [{ s: mn, e: mn + (mx - mn) * .5, c: T.crit }, { s: mn + (mx - mn) * .5, e: mn + (mx - mn) * .8, c: T.warn }, { s: mn + (mx - mn) * .8, e: mx, c: T.safe }];
    z.forEach((q) => { o += '<path d="' + arc(cx, cy, R * .72, R, t(q.s), t(q.e)) + '" fill="' + q.c + '" fill-opacity=".85"/>'; });
    const a = rad(t(v)); o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f2(cx + R * .86 * Math.cos(a)) + '" y2="' + f2(cy + R * .86 * Math.sin(a)) + '" stroke="' + T.ink + '" stroke-width="3" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + T.ink + '"/>';
    if (sp.target !== undefined) { const b = rad(t(sp.target)); o += ln(cx + R * .66 * Math.cos(b), cy + R * .66 * Math.sin(b), cx + R * 1.05 * Math.cos(b), cy + R * 1.05 * Math.sin(b), T.ink, '') ; }
    o += tx(cx, cy + 26, sp.teks || (sp.fmt || fa)(sp.v), { s: 20, c: T.ink, w: 700 }) + tx(cx - R + 14, cy + 14, (sp.fmt || fa)(mn), { s: 9.5 }) + tx(cx + R - 14, cy + 14, (sp.fmt || fa)(mx), { s: 9.5 });
    return '<svg viewBox="0 0 ' + W + ' ' + (H + 6) + '" role="img"' + tip(sp.label || '') + '>' + o + '</svg>';
  }
  function bullet(sp) {
    const it = sp.item || [{ n: sp.label || '', v: sp.v, target: sp.target, max: sp.max }], rh = 38, H = it.length * rh + 14, ml = 120, pw = W - ml - 20; let o = '';
    it.forEach((x, i) => { const y = 8 + i * rh, mx = x.max || Math.max(x.v, x.target || 0) * 1.25 || 1, X = (v) => ml + v / mx * pw; o += tx(ml - 8, y + 18, trunc(x.n, 20), { a: 'end', c: T.ink2 }); [.6, .85, 1].forEach((f, k) => { o += '<rect x="' + ml + '" y="' + y + '" width="' + f2(pw * f) + '" height="22" fill="' + T.line + '" fill-opacity="' + (.9 - k * .3) + '" rx="2"/>'; }); o += '<rect class="hov" x="' + ml + '" y="' + (y + 7) + '" width="' + f2(Math.max(2, X(x.v) - ml)) + '" height="8" fill="' + T.pri + '" rx="2"' + tip(x.n + ': ' + (sp.fmt || fa)(x.v) + (x.target !== undefined ? ' (target ' + (sp.fmt || fa)(x.target) + ')' : '')) + '/>'; if (x.target !== undefined) o += '<rect x="' + f2(X(x.target) - 1.5) + '" y="' + (y + 2) + '" width="3" height="18" fill="' + T.acc + '"/>'; o += tx(ml + pw + 4, y + 18, '', {}); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function histogram(sp) {
    const v = (sp.nilai || []).filter((x) => x !== null && !isNaN(x)), n = v.length; if (!n) return '<svg viewBox="0 0 ' + W + ' 40"></svg>';
    const mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), k = sp.bin || Math.max(5, Math.ceil(Math.log2(n) + 1)), bw = (mx - mn) / k || 1, cnt = new Array(k).fill(0); v.forEach((x) => { cnt[Math.min(k - 1, Math.floor((x - mn) / bw))]++; });
    return kartesian({ tipe: 'batang', h: sp.h || 260, x: cnt.map((_, i) => fa(mn + i * bw)), seri: [{ nama: sp.nama || 'Jumlah', v: cnt }], fmt: (x) => U.fmt.n(x, 0) }, new Set());
  }
  function boxplot(sp) {
    const H = sp.h || 300, g = sp.kelompok || [], ml = 52, mr = 12, mt = 12, mb = 30, pw = W - ml - mr, ph = H - mt - mb; const q = (a, p) => { const i = (a.length - 1) * p, l = Math.floor(i); return a[l] + (a[Math.min(a.length - 1, l + 1)] - a[l]) * (i - l); };
    const st = g.map((x) => { const a = x.nilai.filter((z) => !isNaN(z)).sort((p, r) => p - r); if (!a.length) return null; const q1 = q(a, .25), q2 = q(a, .5), q3 = q(a, .75), iq = q3 - q1, lo = a.find((z) => z >= q1 - 1.5 * iq), hi = a.slice().reverse().find((z) => z <= q3 + 1.5 * iq); return { n: x.n, q1, q2, q3, lo, hi, out: a.filter((z) => z < lo || z > hi) }; });
    const all = st.filter(Boolean).flatMap((s) => [s.lo, s.hi].concat(s.out)), tk = nice(Math.min.apply(null, all), Math.max.apply(null, all), 5), Y = (v) => mt + ph - (v - tk[0]) / (tk[tk.length - 1] - tk[0] || 1) * ph; let o = '';
    tk.forEach((v) => { o += ln(ml, Y(v), ml + pw, Y(v), T.line, '2 3') + tx(ml - 6, Y(v) + 3.5, (sp.fmt || fa)(v), { a: 'end' }); });
    st.forEach((s, j) => { if (!s) return; const x = ml + (j + .5) * pw / g.length, bw = Math.min(46, pw / g.length * .5), c = T.pal[j % 10]; o += ln(x, Y(s.lo), x, Y(s.hi), c) + ln(x - bw / 4, Y(s.lo), x + bw / 4, Y(s.lo), c) + ln(x - bw / 4, Y(s.hi), x + bw / 4, Y(s.hi), c) + '<rect class="hov" x="' + f2(x - bw / 2) + '" y="' + f2(Y(s.q3)) + '" width="' + f2(bw) + '" height="' + f2(Math.max(1, Y(s.q1) - Y(s.q3))) + '" fill="' + c + '" fill-opacity=".35" stroke="' + c + '" rx="2"' + tip('<b>' + esc(s.n) + '</b><br>Median ' + (sp.fmt || fa)(s.q2) + '<br>Q1–Q3 ' + (sp.fmt || fa)(s.q1) + ' – ' + (sp.fmt || fa)(s.q3) + '<br>Rentang ' + (sp.fmt || fa)(s.lo) + ' – ' + (sp.fmt || fa)(s.hi)) + '/>' + ln(x - bw / 2, Y(s.q2), x + bw / 2, Y(s.q2), c).replace('/>', ' stroke-width="2.5"/>') + s.out.map((z) => '<circle cx="' + f2(x) + '" cy="' + f2(Y(z)) + '" r="2.6" fill="none" stroke="' + c + '"/>').join('') + tx(x, H - 10, lab(s.n)); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function funnel(sp, hid) {
    const it = (sp.item || []).map((x, i) => Object.assign({ i: i }, x)).filter((x) => !hid.has(x.i)), H = sp.h || 40 + it.length * 44, mx = Math.max.apply(null, it.map((x) => x.v).concat([1])), rh = (H - 10) / Math.max(1, it.length); let o = '';
    it.forEach((x, k) => { const w1 = W * .86 * x.v / mx, w2 = W * .86 * (it[k + 1] ? it[k + 1].v : x.v * .8) / mx, y = 5 + k * rh, cx = W / 2; o += '<polygon class="hov" points="' + [cx - w1 / 2, y, cx + w1 / 2, y, cx + w2 / 2, y + rh - 3, cx - w2 / 2, y + rh - 3].map(f2).join(' ') + '" fill="' + (x.warna || T.pal[x.i % 10]) + '"' + tip(x.n + ': ' + (sp.fmt || fa)(x.v) + (k ? ' (' + U.fmt.n(x.v / it[0].v * 100, 1) + '% dari awal)' : '')) + '/>' + tx(cx, y + rh / 2 + 1, x.n + ' · ' + (sp.fmt || fa)(x.v), { c: '#fff', w: 600, s: 11.5 }); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function sankey(sp) {
    const H = sp.h || 300, nodes = (sp.node || []).map((n, i) => ({ n: n, i: i, in: 0, out: 0, L: 0 })), links = (sp.tautan || []).filter((l) => l.v > 0); links.forEach((l) => { nodes[l.s].out += l.v; nodes[l.t].in += l.v; });
    for (let it = 0; it < nodes.length; it++) links.forEach((l) => { nodes[l.t].L = Math.max(nodes[l.t].L, nodes[l.s].L + 1); }); const NL = Math.max.apply(null, nodes.map((n) => n.L)) + 1, nw = 12, mt = 6, ph = H - 12, px = (W - 140 - nw) / Math.max(1, NL - 1);
    const lay = []; nodes.forEach((n) => { (lay[n.L] = lay[n.L] || []).push(n); }); const mxs = Math.max.apply(null, lay.map((a) => a.reduce((s, n) => s + Math.max(n.in, n.out), 0))), sc = (ph - 14 * Math.max.apply(null, lay.map((a) => a.length))) / (mxs || 1);
    lay.forEach((a, L) => { let y = mt; a.forEach((n) => { n.h = Math.max(3, Math.max(n.in, n.out) * sc); n.x = 70 + L * px; n.y = y; n.oy = 0; n.iy = 0; y += n.h + 14; }); }); let o = '';
    links.forEach((l) => { const s = nodes[l.s], t = nodes[l.t], h = l.v * sc, y0 = s.y + s.oy, y1 = t.y + t.iy; s.oy += h; t.iy += h; const x0 = s.x + nw, x1 = t.x, m = (x0 + x1) / 2; o += '<path class="hov" d="M' + f2(x0) + ' ' + f2(y0 + h / 2) + 'C' + f2(m) + ' ' + f2(y0 + h / 2) + ' ' + f2(m) + ' ' + f2(y1 + h / 2) + ' ' + f2(x1) + ' ' + f2(y1 + h / 2) + '" fill="none" stroke="' + T.pal[s.i % 10] + '" stroke-opacity=".35" stroke-width="' + f2(Math.max(1, h)) + '"' + tip(s.n + ' → ' + t.n + ': ' + (sp.fmt || fa)(l.v)) + '/>'; });
    nodes.forEach((n) => { o += '<rect x="' + n.x + '" y="' + f2(n.y) + '" width="' + nw + '" height="' + f2(n.h) + '" fill="' + T.pal[n.i % 10] + '" rx="2"/>' + tx(n.L === NL - 1 ? n.x - 4 : n.x + nw + 4, n.y + n.h / 2 + 3.5, trunc(n.n, 16) + ' ' + (sp.fmt || fa)(Math.max(n.in, n.out)), { a: n.L === NL - 1 ? 'end' : 'start', c: T.ink2, s: 10 }); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + o + '</svg>';
  }
  function sparkline(sp) {
    const v = sp.v || [], w = sp.w || 120, h = sp.h || 32, ok = v.filter((x) => x !== null && !isNaN(x)); if (ok.length < 2) return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:' + w + 'px"></svg>';
    const mn = Math.min.apply(null, ok), mx = Math.max.apply(null, ok), X = (i) => 2 + i * (w - 4) / (v.length - 1), Y = (x) => h - 3 - (x - mn) / (mx - mn || 1) * (h - 6), c = sp.warna || T.pri; let d = '', last;
    v.forEach((x, i) => { if (x === null || isNaN(x)) return; d += (d ? 'L' : 'M') + f2(X(i)) + ' ' + f2(Y(x)); last = [X(i), Y(x)]; });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:' + w + 'px;height:' + h + 'px;display:inline-block;vertical-align:middle"><path d="' + d + 'L' + f2(last[0]) + ' ' + h + 'L2 ' + h + 'Z" fill="' + c + '" fill-opacity=".14"/><path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="1.8" stroke-linejoin="round"/><circle cx="' + f2(last[0]) + '" cy="' + f2(last[1]) + '" r="2.6" fill="' + c + '"/></svg>';
  }
  function tabelBar(sp) {
    const cols = sp.kolom || [], rows = sp.baris || [], mx = cols.map((c, j) => (c.bar ? Math.max.apply(null, rows.map((r) => Number(r[j]) || 0).concat([1])) : 0));
    return '<div class="tw"><table class="tbl"><thead><tr>' + cols.map((c) => '<th class="' + (c.num ? 'num' : '') + '">' + esc(c.h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + cols.map((c, j) => '<td class="' + (c.num ? 'num' : '') + '">' + esc(c.fmt ? c.fmt(r[j]) : r[j]) + (c.bar && Number(r[j]) > 0 ? '<span class="bar" style="width:' + Math.max(2, Math.round(80 * Number(r[j]) / mx[j])) + 'px"></span>' : '') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }

  const JENIS = { garis: kartesian, step: kartesian, area: kartesian, area_tumpuk: kartesian, batang: kartesian, batang_h: kartesian, batang_kelompok: kartesian, batang_tumpuk: kartesian, batang_100: kartesian, kombo: kartesian, pie: pie, donat: pie, scatter: scatter, bubble: scatter, radar: radar, heatmap: heatmap, kalender: kalender, treemap: treemap, sunburst: sunburst, waterfall: waterfall, gauge: gauge, bullet: bullet, pareto: kartesian, histogram: histogram, boxplot: boxplot, funnel: funnel, sankey: sankey, sparkline: sparkline, tabel: tabelBar };
  const NAMA = { garis: 'Garis', step: 'Garis tangga', area: 'Area', area_tumpuk: 'Area bertumpuk', batang: 'Batang tegak', batang_h: 'Batang mendatar', batang_kelompok: 'Batang berkelompok', batang_tumpuk: 'Batang bertumpuk', batang_100: 'Batang tumpuk 100%', kombo: 'Kombinasi 2 sumbu', pie: 'Pie', donat: 'Donat', scatter: 'Sebar (scatter)', bubble: 'Gelembung', radar: 'Radar', heatmap: 'Heatmap', kalender: 'Heatmap kalender', treemap: 'Treemap', sunburst: 'Sunburst', waterfall: 'Waterfall', gauge: 'Gauge', bullet: 'Bullet', pareto: 'Pareto', histogram: 'Histogram', boxplot: 'Box plot', funnel: 'Corong (funnel)', sankey: 'Sankey', sparkline: 'Sparkline', tabel: 'Tabel data-bar' };
  const LEGENDA = (sp) => { const t = sp.tipe; if (['pie', 'donat', 'treemap', 'funnel'].indexOf(t) >= 0) return (sp.item || []).map((x, i) => ({ i: i, n: x.n, c: x.warna || T.pal[i % 10] })); if (t === 'scatter' || t === 'bubble') { const g = U.unik((sp.titik || []).map((p) => p.g || '')); return g.length > 1 ? g.map((x, i) => ({ i: i, n: x || '—', c: T.pal[i % 10] })) : []; } if (t === 'radar' || sp.seri) return (sp.seri || []).length > 1 || t === 'kombo' ? (sp.seri || []).map((s, i) => ({ i: i, n: s.nama, c: s.warna || T.pal[i % 10] })) : []; return []; };

  function render(host, sp) {
    T = tc(); const fn = JENIS[sp.tipe]; if (!fn) { host.innerHTML = '<div class="empty">Jenis grafik tidak dikenal: ' + esc(sp.tipe) + '</div>'; return null; }
    const hid = new Set(); host.classList.add('chart');
    function gambar() {
      T = tc(); let svg;
      try { svg = fn(sp, hid); } catch (e) { console.error('grafik', sp.tipe, e); svg = '<div class="empty">Grafik tidak dapat digambar.</div>'; }
      const lg = LEGENDA(sp);
      host.innerHTML = svg + (sp.tipe === 'tabel' || sp.tipe === 'sparkline' ? '' : '<div class="tt"></div>') + (lg.length && sp.legenda !== false ? '<div class="legend">' + lg.map((l) => '<span data-i="' + l.i + '" class="' + (hid.has(l.i) ? 'off' : '') + '"><i style="background:' + l.c + '"></i>' + esc(trunc(l.n, 28)) + '</span>').join('') + '</div>' : '');
      $$('.legend span').forEach((s) => { s.onclick = () => { const i = Number(s.dataset.i); if (hid.has(i)) hid.delete(i); else if (lg.length - hid.size > 1) hid.add(i); gambar(); }; });
      const tt = host.querySelector('.tt'); if (!tt) return;
      host.onmousemove = (e) => { const t = e.target.closest('[data-t]'); if (!t) { tt.style.opacity = 0; return; } tt.innerHTML = t.getAttribute('data-t'); const r = host.getBoundingClientRect(); let x = e.clientX - r.left + 12, y = e.clientY - r.top + 12; if (x + tt.offsetWidth > r.width) x = e.clientX - r.left - tt.offsetWidth - 12; tt.style.left = Math.max(0, x) + 'px'; tt.style.top = Math.max(0, y) + 'px'; tt.style.opacity = 1; };
      host.onmouseleave = () => { tt.style.opacity = 0; };
    }
    const $$ = (s) => Array.from(host.querySelectorAll(s));
    gambar(); host._spec = sp; return { ulang: gambar };
  }
  function svgEl(host) { return host.querySelector('svg'); }
  function svgString(host) { const s = svgEl(host); if (!s) return ''; const c = s.cloneNode(true); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); const vb = s.viewBox.baseVal; c.setAttribute('width', vb.width); c.setAttribute('height', vb.height); return new XMLSerializer().serializeToString(c); }
  function png(host, skala, latar) {
    return new Promise((res, rej) => { const s = svgString(host); if (!s) return rej(new Error('Tidak ada grafik.')); const vb = svgEl(host).viewBox.baseVal, k = skala || 2, img = new Image(); img.onload = () => { const cv = document.createElement('canvas'); cv.width = vb.width * k; cv.height = vb.height * k; const g = cv.getContext('2d'); g.fillStyle = latar || '#ffffff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height); cv.toBlob((b) => res({ blob: b, url: cv.toDataURL('image/png'), w: cv.width, h: cv.height }), 'image/png'); }; img.onerror = () => rej(new Error('Gagal membuat gambar.')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
  }
  window.Charts = { render, png, svgString, JENIS: Object.keys(JENIS), NAMA, sparkline, nice, fa };
})();
