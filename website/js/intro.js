/* ZENSATION DOJO — intro film v3 (Canvas2D)
 *
 * 10.0 s @ 24 fps. Every frame is a pure function of time: render(t). No Math.random / Date.now —
 * all variation comes from a seeded PRNG.
 *
 * Performance: the scenery is painted ONCE into bitmaps (canvas layers); playback only slides / scales those
 * bitmaps (cheap GPU transforms) and redraws two small canvases (petals/effects, fan). Frames are de-duplicated
 * to 24 fps. Nothing re-rasterises vector art while the camera moves.
 *
 *  SHOT 1  establish  0.00 – 2.20  dusk, WIDE: the whole sakura tree, the torii, the pagoda, Fuji — then a push-in to the root
 *  cut     ink dip at 2.20
 *  SHOT 2  sakuga     2.20 – 5.50  root close-up -> 4f anticipation -> rush up the trunk (twos, speed lines) -> crown hold
 *                                  -> wind blows the petals away -> whip-pan right
 *  cut     petal-flash dip at 5.50
 *  SHOT 3  button     5.50 – 10.0  night: the closed fan appears, unfolds like a real fan (pleated paper slices swing out
 *                                  from the pivot), wordmark + hanko land. The scene STAYS as the site's hero backdrop.
 */
(function () {
  'use strict';

  const FPS = 24, RUNTIME = 10, CUT = 5.5, T1 = 2.2, TAU = Math.PI * 2;
  const rad = d => d * Math.PI / 180;

  const C = {
    ink: '#130f0d', night: '#14123a', indigo: '#1d1b4a', ember: '#f3a874', rose: '#c4586e',
    moon: '#fbeaf0', moonGlow: '#f6b8cf', lantern: '#ffb347', line: '#0e0a0a',
    red: '#c8202c', redDeep: '#8f1620', redHi: '#e3434b', cream: '#efe3c4', gold: '#c9a24a',
    bark: '#3a2230', stone: '#4c4f7c', stoneDark: '#2a2d52', snow: '#f4e8f2', grass: '#2e5560',
    lacquer: '#1a100d'
  };

  /* ───────── helpers ───────── */
  function rngOf(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => cl((t - a) / (b - a));
  const q = (p, n) => (p >= 1 ? 1 : Math.floor(p * n) / n);
  const eIO4 = p => (p < 0.5 ? 8 * p ** 4 : 1 - Math.pow(-2 * p + 2, 4) / 2);
  const eIO2 = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const eOut3 = p => 1 - Math.pow(1 - p, 3);
  const eOut2 = p => 1 - (1 - p) * (1 - p);
  const eIn3 = p => p * p * p;
  const eIn2 = p => p * p;
  const f1 = n => Math.round(n * 10) / 10;
  const frameT = t => Math.floor(t * FPS + 1e-6) / FPS;
  const wait = () => new Promise(r => setTimeout(r, 0));
  const loadImg = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(i); i.src = src; });
  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; }

  function poly(g, pts, fill, stroke, lw) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.lineJoin = 'miter'; g.stroke(); }
  }
  function sparkle(g, x, y, r, col) {
    poly(g, [[x, y - r], [x + r * 0.2, y - r * 0.2], [x + r, y], [x + r * 0.2, y + r * 0.2], [x, y + r], [x - r * 0.2, y + r * 0.2], [x - r, y], [x - r * 0.2, y - r * 0.2]], col);
  }

  /* ───────── sharp sakura: notched-kite petals, pre-baked flower sprites ───────── */
  const TONES = {
    white: ['#fff6f9', '#f3b0c8', '#b8305c'], light: ['#fbc4d9', '#e68db2', '#a62c58'],
    mid: ['#ef86b6', '#c8508c', '#8e1f50'], shade: ['#c2488c', '#8a2f70', '#5a1a48'], deep: ['#a23c7a', '#6a2658', '#44123a']
  };
  const SPR = {};
  function petalPath(R) {
    const p = new Path2D();
    p.moveTo(0, 0); p.lineTo(-0.5 * R, -0.52 * R); p.lineTo(-0.24 * R, -R); p.lineTo(0, -0.8 * R);
    p.lineTo(0.24 * R, -R); p.lineTo(0.5 * R, -0.52 * R); p.closePath();
    return p;
  }
  const PETAL_UNIT = petalPath(10);
  function buildSprites() {
    if (SPR.white) return;
    for (const name in TONES) {
      SPR[name] = [];
      for (let v = 0; v < 4; v++) {
        const c = document.createElement('canvas'); c.width = c.height = 96;
        const g = c.getContext('2d'); g.translate(48, 48);
        const [fill, edge, cen] = TONES[name], R = 44;
        for (let k = 0; k < 5; k++) {
          g.save(); g.rotate(rad(v * 19 + k * 72));
          const p = petalPath(R);
          g.fillStyle = fill; g.fill(p);
          g.lineWidth = 2.2; g.strokeStyle = edge; g.lineJoin = 'miter'; g.stroke(p);
          g.globalAlpha = 0.55; g.beginPath(); g.moveTo(0, -R * 0.14); g.lineTo(0, -R * 0.76); g.stroke();
          g.restore();
        }
        g.strokeStyle = cen; g.lineWidth = 2;
        for (let k = 0; k < 5; k++) {
          const a = rad(v * 19 + 36 + k * 72), sx = Math.sin(a) * R * 0.3, sy = -Math.cos(a) * R * 0.3;
          g.beginPath(); g.moveTo(0, 0); g.lineTo(sx, sy); g.stroke();
          poly(g, [[sx - 2.4, sy - 2.4], [sx + 2.4, sy - 2.4], [sx, sy + 3]], cen);
        }
        SPR[name].push(c);
      }
    }
  }
  const flower = (g, name, x, y, r, v) => g.drawImage(SPR[name][v & 3], x - r, y - r, r * 2, r * 2);
  const toneAt = (t, back) => back ? (t < 0.1 ? 'deep' : t < 0.55 ? 'shade' : 'mid') : (t < -0.45 ? 'shade' : t < 0.05 ? 'mid' : t < 0.5 ? 'light' : 'white');

  // a clump of blossom: a spiky hard shadow, then flowers lit from the upper right (shade -> white)
  function clump(g, rng, x, y, R, fr, back) {
    const n = 18;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, r = R * (i % 2 ? 0.62 + rng() * 0.12 : 0.9 + rng() * 0.14);
      const px = x - 0.1 * R + Math.cos(a) * r, py = y + 0.14 * R + Math.sin(a) * r * 0.9;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fillStyle = back ? '#6a2658' : '#8a2f70'; g.fill();
    const N = Math.max(6, Math.round(2.6 * R * R / (fr * fr))), pts = [];
    for (let i = 0; i < N; i++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * R * 0.92;
      pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.88, rng(), rng()]);
    }
    pts.sort((a, b) => (a[0] - a[1]) - (b[0] - b[1]));
    for (const p of pts) {
      const t = ((p[0] - x) * 0.62 - (p[1] - y) * 0.78) / R + (p[2] - 0.5) * 0.5;
      flower(g, toneAt(t, back), p[0], p[1], fr * (0.85 + p[3] * 0.4), (p[2] * 4) | 0);
    }
  }

  /* ───────── branches: angular, straight segments, hard shade + rim light ───────── */
  function grow(rng, out, x, y, ang, len, w, depth) {
    const a = rad(ang), x1 = x + Math.sin(a) * len, y1 = y - Math.cos(a) * len;
    out.segs.push({ x, y, x1, y1, w, w1: w * 0.6 });
    if (depth <= 0) { out.tips.push([x1, y1]); return; }
    out.mids.push([x1, y1, depth]);
    const n = depth >= 3 ? 2 : (rng() < 0.4 ? 3 : 2);
    for (let i = 0; i < n; i++) {
      const da = (i - (n - 1) / 2) * (24 + rng() * 18) + (rng() - 0.5) * 20;
      grow(rng, out, x1, y1, ang + da, len * (0.66 + rng() * 0.14), w * 0.6, depth - 1);
    }
  }
  function drawSeg(g, s) {
    const dx = s.x1 - s.x, dy = s.y1 - s.y, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (nx < 0) { nx = -nx; ny = -ny; }                       // normal pointing right (the moon is upper right)
    const h0 = s.w / 2, h1 = s.w1 / 2;
    const R0 = [s.x + nx * h0, s.y + ny * h0], R1 = [s.x1 + nx * h1, s.y1 + ny * h1];
    const L1 = [s.x1 - nx * h1, s.y1 - ny * h1], L0 = [s.x - nx * h0, s.y - ny * h0];
    poly(g, [R0, R1, L1, L0], C.bark, C.line, Math.max(1.5, s.w * 0.05));
    poly(g, [L0, L1, [s.x1, s.y1], [s.x, s.y]], 'rgba(15,8,12,.55)');
    poly(g, [R0, R1, [s.x1 + nx * h1 * 0.6, s.y1 + ny * h1 * 0.6], [s.x + nx * h0 * 0.6, s.y + ny * h0 * 0.6]], 'rgba(160,110,130,.5)');
    if (s.w > 10) {                                            // joint plate so thick limbs meet without a gap
      const r = s.w * 0.5;
      poly(g, [[s.x - r, s.y], [s.x - r * 0.5, s.y - r * 0.87], [s.x + r * 0.5, s.y - r * 0.87], [s.x + r, s.y], [s.x + r * 0.5, s.y + r * 0.87], [s.x - r * 0.5, s.y + r * 0.87]], C.bark);
    }
  }
  function twigs(g, rng, tips, fr, len) {
    for (const t of tips) {
      for (let j = 0; j < 2; j++) {
        const a = rng() * TAU, ln = len * (0.4 + rng() * 0.55);
        const ex = t[0] + Math.cos(a) * ln, ey = t[1] + Math.sin(a) * ln;
        const nx = -Math.sin(a) * 1.8, ny = Math.cos(a) * 1.8;
        poly(g, [[t[0] + nx, t[1] + ny], [ex, ey], [t[0] - nx, t[1] - ny]], C.bark);
        flower(g, rng() < 0.5 ? 'light' : 'mid', ex, ey, fr * (1.1 + rng() * 0.5), (rng() * 4) | 0);
      }
    }
  }
  // sacred rope (shimenawa) with paper shide around a trunk — a goshinboku detail
  function shimenawa(g, rng, xl, xr, y, thick) {
    const n = 22;
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? '#d8c690' : '#a8935a'; g.lineWidth = thick; g.lineCap = 'butt'; g.beginPath();
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = lerp(xl, xr, u), yy = y + Math.sin(u * Math.PI) * thick * 1.6 + Math.sin(u * TAU * 5 + pass * Math.PI) * thick * 0.4;
        i ? g.lineTo(x, yy) : g.moveTo(x, yy);
      }
      g.stroke();
    }
    for (let k = 0; k < 4; k++) {                              // zig-zag paper streamers
      const u = 0.16 + k * 0.22, x = lerp(xl, xr, u), y0 = y + Math.sin(u * Math.PI) * thick * 1.6 + thick * 0.4, h = thick * 6.5, w = thick * 1.7;
      poly(g, [[x - w / 2, y0], [x + w / 2, y0], [x + w * 0.2, y0 + h * 0.3], [x + w / 2, y0 + h * 0.5], [x, y0 + h], [x - w / 2, y0 + h * 0.5], [x - w * 0.2, y0 + h * 0.3]], '#f7f2e8', 'rgba(60,40,30,.6)', 1);
    }
  }

  /* ───────── Japanese scenery (all sharp polygons) ───────── */
  function torii(g, x, yb, w) {
    const h = w * 0.92, pw = w * 0.07, span = w * 0.6, yTop = yb - h, R = C.red, SH = C.redDeep, HI = C.redHi, BK = C.line;
    for (const d of [-1, 1]) {
      const cx = x + d * span / 2, bx = cx + d * w * 0.012, tx = cx - d * w * 0.006, yT = yTop + w * 0.05;
      poly(g, [[tx - pw * 0.4, yT], [bx - pw * 0.5, yb], [bx + pw * 0.5, yb], [tx + pw * 0.4, yT]], R, BK, 2.5);
      poly(g, [[tx - pw * 0.4, yT], [bx - pw * 0.5, yb], [bx - pw * 0.1, yb], [tx - pw * 0.08, yT]], SH);
      g.strokeStyle = HI; g.lineWidth = pw * 0.1; g.beginPath(); g.moveTo(tx + pw * 0.3, yT + w * 0.02); g.lineTo(bx + pw * 0.4, yb - w * 0.07); g.stroke();
      poly(g, [[bx - pw * 0.68, yb - w * 0.07], [bx + pw * 0.68, yb - w * 0.07], [bx + pw * 0.76, yb], [bx - pw * 0.76, yb]], BK);
      poly(g, [[bx - pw * 0.95, yb], [bx + pw * 0.95, yb], [bx + pw * 1.08, yb + w * 0.03], [bx - pw * 1.08, yb + w * 0.03]], C.stone, BK, 1.5);
    }
    const ny = yTop + h * 0.37, nh = w * 0.042, nw = span + w * 0.1;
    poly(g, [[x - nw / 2, ny], [x + nw / 2, ny], [x + nw / 2 - w * 0.012, ny + nh], [x - nw / 2 + w * 0.012, ny + nh]], R, BK, 2);
    poly(g, [[x - nw / 2 + w * 0.012, ny + nh * 0.55], [x + nw / 2 - w * 0.012, ny + nh * 0.55], [x + nw / 2 - w * 0.012, ny + nh], [x - nw / 2 + w * 0.012, ny + nh]], SH);
    g.fillStyle = BK;
    for (const d of [-1, 1]) g.fillRect(x + d * span / 2 - w * 0.013, ny - nh * 0.5, w * 0.026, nh * 2);
    const kt = w * 0.052, sag = w * 0.075, kyC = yTop + w * 0.045, top = [], bot = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, e = (2 * u - 1) ** 2, px = x - w / 2 + w * u;
      top.push([px, kyC - sag * e]);
      bot.push([px, kyC - sag * e + kt * (1 - 0.6 * e)]);
    }
    const shy = kyC + kt + w * 0.012;
    g.fillStyle = R; g.fillRect(x - w * 0.43, shy, w * 0.86, w * 0.034);
    g.strokeStyle = BK; g.lineWidth = 2; g.strokeRect(x - w * 0.43, shy, w * 0.86, w * 0.034);
    const pty = shy + w * 0.034 + w * 0.006, pth = ny - pty - w * 0.006, ptw = w * 0.085;
    g.fillStyle = BK; g.fillRect(x - ptw / 2, pty, ptw, pth);
    g.strokeStyle = C.gold; g.lineWidth = 2; g.strokeRect(x - ptw / 2 + 3, pty + 3, ptw - 6, pth - 6);
    g.fillStyle = C.gold; for (let i = 0; i < 3; i++) g.fillRect(x - ptw * 0.22, pty + pth * (0.22 + i * 0.26), ptw * 0.44, Math.max(2, pth * 0.07));
    poly(g, top.concat(bot.slice().reverse()), R, BK, 2.5);
    poly(g, top.concat(top.map(p => [p[0], p[1] + w * 0.026]).reverse()), BK);
  }
  function toro(g, x, yb, s) {                                  // stone lantern
    const w = s * 0.5;
    poly(g, [[x - w * 0.62, yb], [x + w * 0.62, yb], [x + w * 0.5, yb - s * 0.1], [x - w * 0.5, yb - s * 0.1]], C.stoneDark, C.line, 1.2);
    poly(g, [[x - w * 0.15, yb - s * 0.1], [x + w * 0.15, yb - s * 0.1], [x + w * 0.12, yb - s * 0.52], [x - w * 0.12, yb - s * 0.52]], C.stone, C.line, 1.2);
    poly(g, [[x - w * 0.24, yb - s * 0.3], [x + w * 0.24, yb - s * 0.3], [x + w * 0.2, yb - s * 0.35], [x - w * 0.2, yb - s * 0.35]], C.stoneDark);
    poly(g, [[x - w * 0.62, yb - s * 0.52], [x + w * 0.62, yb - s * 0.52], [x + w * 0.5, yb - s * 0.6], [x - w * 0.5, yb - s * 0.6]], C.stone, C.line, 1.2);
    g.fillStyle = C.stoneDark; g.fillRect(x - w * 0.34, yb - s * 0.8, w * 0.68, s * 0.2);
    g.fillStyle = C.lantern; g.fillRect(x - w * 0.17, yb - s * 0.76, w * 0.34, s * 0.12);
    poly(g, [[x - w * 0.98, yb - s * 0.86], [x - w * 0.86, yb - s * 0.78], [x + w * 0.86, yb - s * 0.78], [x + w * 0.98, yb - s * 0.86], [x + w * 0.45, yb - s * 0.93], [x + w * 0.14, yb - s * 1.04], [x, yb - s * 1.12], [x - w * 0.14, yb - s * 1.04], [x - w * 0.45, yb - s * 0.93]], C.stone, C.line, 1.5);
    poly(g, [[x - w * 0.98, yb - s * 0.86], [x - w * 0.86, yb - s * 0.78], [x - w * 0.1, yb - s * 0.78], [x - w * 0.14, yb - s * 1.04], [x - w * 0.45, yb - s * 0.93]], 'rgba(10,8,30,.4)');
  }
  function pine(g, x, yb, h, col) {
    g.fillStyle = col; g.fillRect(x - h * 0.02, yb - h * 0.25, h * 0.04, h * 0.25);
    for (let i = 0; i < 4; i++) {
      const w = h * (0.3 - i * 0.055), y = yb - h * (0.18 + i * 0.2);
      poly(g, [[x - w, y], [x, y - h * 0.3], [x + w, y]], col);
    }
  }
  function pagoda(g, x, yb, h, col, windows) {
    const u = h / 5.4;
    let y = yb;
    poly(g, [[x - u * 1.5, y], [x + u * 1.5, y], [x + u * 1.35, y - u * 0.18], [x - u * 1.35, y - u * 0.18]], col); y -= u * 0.18;
    for (let t = 0; t < 5; t++) {
      const w = u * (1.5 - t * 0.2), bh = u * 0.5;
      g.fillStyle = col; g.fillRect(x - w * 0.42, y - bh, w * 0.84, bh);
      if (windows) { g.fillStyle = C.lantern; g.globalAlpha = 0.85; g.fillRect(x - w * 0.09, y - bh * 0.8, w * 0.18, bh * 0.5); g.globalAlpha = 1; }
      y -= bh;
      poly(g, [[x - w * 1.1, y - u * 0.2], [x - w * 0.8, y + u * 0.02], [x + w * 0.8, y + u * 0.02], [x + w * 1.1, y - u * 0.2], [x + w * 0.6, y - u * 0.1], [x + w * 0.38, y - u * 0.34], [x - w * 0.38, y - u * 0.34], [x - w * 0.6, y - u * 0.1]], col);
      y -= u * 0.3;
    }
    g.fillStyle = col; g.fillRect(x - u * 0.04, y - u * 1.1, u * 0.08, u * 1.1);
    for (let k = 0; k < 4; k++) g.fillRect(x - u * (0.16 - k * 0.025), y - u * (0.3 + k * 0.2), u * (0.32 - k * 0.05), u * 0.05);
  }
  function shrine(g, x, yb, w, col) {
    const bodyTop = yb - w * 0.3;
    g.fillStyle = col; g.fillRect(x - w * 0.34, bodyTop, w * 0.68, w * 0.3);
    g.fillStyle = C.lantern; g.globalAlpha = 0.8; g.fillRect(x - w * 0.07, bodyTop + w * 0.08, w * 0.14, w * 0.22); g.globalAlpha = 1;
    poly(g, [[x - w * 0.66, bodyTop - w * 0.03], [x - w * 0.5, bodyTop + w * 0.05], [x + w * 0.5, bodyTop + w * 0.05], [x + w * 0.66, bodyTop - w * 0.03], [x + w * 0.4, bodyTop - w * 0.14], [x + w * 0.14, bodyTop - w * 0.3], [x, bodyTop - w * 0.34], [x - w * 0.14, bodyTop - w * 0.3], [x - w * 0.4, bodyTop - w * 0.14]], col);
    poly(g, [[x - w * 0.5, yb], [x + w * 0.5, yb], [x + w * 0.44, yb - w * 0.04], [x - w * 0.44, yb - w * 0.04]], col);
  }
  function chochin(g, x, y, s) {                                // paper lantern
    const w = s * 0.62;
    const gl = g.createRadialGradient(x, y + s * 0.5, 0, x, y + s * 0.5, s * 1.3);
    gl.addColorStop(0, 'rgba(255,179,71,.4)'); gl.addColorStop(1, 'rgba(255,179,71,0)');
    g.fillStyle = gl; g.fillRect(x - s * 1.4, y - s * 0.8, s * 2.8, s * 2.6);
    poly(g, [[x - w * 0.18, y], [x + w * 0.18, y], [x + w * 0.5, y + s * 0.18], [x + w * 0.5, y + s * 0.78], [x + w * 0.18, y + s], [x - w * 0.18, y + s], [x - w * 0.5, y + s * 0.78], [x - w * 0.5, y + s * 0.18]], C.red, C.line, 1.2);
    poly(g, [[x - w * 0.5, y + s * 0.18], [x - w * 0.18, y], [x - w * 0.1, y], [x - w * 0.14, y + s], [x - w * 0.18, y + s], [x - w * 0.5, y + s * 0.78]], 'rgba(60,5,10,.4)');
    g.strokeStyle = 'rgba(40,5,10,.55)'; g.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * w * 0.25, y + s * 0.08); g.lineTo(x + i * w * 0.38, y + s * 0.5); g.lineTo(x + i * w * 0.25, y + s * 0.92); g.stroke(); }
    g.fillStyle = C.line; g.fillRect(x - w * 0.2, y - s * 0.07, w * 0.4, s * 0.08); g.fillRect(x - w * 0.2, y + s * 0.98, w * 0.4, s * 0.07);
  }
  function mistBand(g, x, y, w, h, col, a) {                    // ukiyo-e kasumi band: flat, pointed ends
    g.globalAlpha = a;
    poly(g, [[x, y], [x + w * 0.12, y - h * 0.5], [x + w * 0.88, y - h * 0.5], [x + w, y], [x + w * 0.9, y + h * 0.5], [x + w * 0.1, y + h * 0.5]], col);
    g.globalAlpha = 1;
  }
  function ridgePts(rng, W, topY, amp, rough, detail) {
    let pts = [[-40, topY + (rng() - 0.5) * amp], [W + 40, topY + (rng() - 0.5) * amp]], a = amp;
    for (let l = 0; l < detail; l++) {
      const np = [];
      for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], r = pts[i + 1]; np.push(p); np.push([(p[0] + r[0]) / 2, (p[1] + r[1]) / 2 + (rng() - 0.5) * a]); }
      np.push(pts[pts.length - 1]); pts = np; a *= rough;
    }
    return pts;
  }
  function ridge(g, rng, W, baseY, topY, amp, colTop, colBot, rim) {   // jagged, faceted, rim-lit
    const pts = ridgePts(rng, W, topY, amp, 0.56, 7);
    const grad = g.createLinearGradient(0, topY - amp, 0, baseY); grad.addColorStop(0, colTop); grad.addColorStop(1, colBot);
    g.beginPath(); g.moveTo(-40, baseY); for (const p of pts) g.lineTo(p[0], p[1]); g.lineTo(W + 40, baseY); g.closePath(); g.fillStyle = grad; g.fill();
    for (let i = 3; i < pts.length - 4; i++) {
      const y = pts[i][1]; let peak = true;
      for (let j = -3; j <= 3; j++) if (j && pts[i + j][1] < y) peak = false;
      if (!peak || rng() < 0.35) continue;
      let k = i + 1; while (k < pts.length - 1 && pts[k + 1][1] >= pts[k][1]) k++;
      const fh = (baseY - y) * 0.5, fg = g.createLinearGradient(0, y, 0, y + fh);
      fg.addColorStop(0, 'rgba(10,6,30,.3)'); fg.addColorStop(1, 'rgba(10,6,30,0)');
      g.beginPath(); g.moveTo(pts[i][0], y); for (let m = i; m <= k; m++) g.lineTo(pts[m][0], pts[m][1]);
      g.lineTo(pts[k][0], y + fh); g.lineTo(pts[i][0], y + fh); g.closePath(); g.fillStyle = fg; g.fill();
    }
    g.strokeStyle = rim; g.lineWidth = 2; g.lineJoin = 'miter'; g.beginPath();
    for (let i = 0; i < pts.length; i++) i ? g.lineTo(pts[i][0], pts[i][1]) : g.moveTo(pts[i][0], pts[i][1]);
    g.stroke();
    return pts;
  }
  const yAt = (pts, x) => { let b = pts[0]; for (const p of pts) if (Math.abs(p[0] - x) < Math.abs(b[0] - x)) b = p; return b[1]; };
  function fuji(g, rng, fx, baseY, h, hw, n) {
    const apexY = baseY - h, Lp = [], Rp = [], steps = 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, half = hw * (0.03 + 0.97 * Math.pow(t, 0.78)), j = (rng() - 0.5) * h * 0.012;
      Lp.push([fx - half - j, apexY + t * h]); Rp.push([fx + half + j, apexY + t * h]);
    }
    const grad = g.createLinearGradient(0, apexY, 0, baseY); grad.addColorStop(0, mix('#8a5a92', '#34306a', n)); grad.addColorStop(1, mix('#b8688a', '#241f50', n));
    poly(g, Lp.concat(Rp.slice().reverse()), grad);
    poly(g, [[fx + hw * 0.03, apexY], ...Rp.slice(0, 15), [fx + hw * 0.4, baseY], [fx + hw * 0.1, baseY]], 'rgba(12,8,40,.28)');
    const capT = 0.3, capPts = [], half0 = hw * (0.03 + 0.97 * Math.pow(capT, 0.78));
    for (let i = 0; i <= 9; i++) capPts.push([fx - half0 + 2 * half0 * i / 9, apexY + h * (capT + (i % 2 ? 0.045 : -0.02))]);
    poly(g, [...Lp.slice(0, 6), ...capPts, ...Rp.slice(0, 6).reverse()], mix(C.snow, '#b9b4e0', n));
    poly(g, [[fx + hw * 0.03, apexY], ...Rp.slice(0, 6), ...capPts.slice(5).reverse()], 'rgba(120,110,190,.35)');
    g.strokeStyle = 'rgba(30,20,60,.22)'; g.lineWidth = 2;
    for (let i = 1; i < 9; i++) { const p = capPts[i]; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + (i - 4.5) * hw * 0.05, apexY + h * 0.8); g.stroke(); }
  }
  function steps(g, x, y0, y1, w) {                             // stone steps up to the torii
    const total = y1 - y0, wts = Array.from({ length: 9 }, (_, i) => 1 + i * 0.4), ws = wts.reduce((a, b) => a + b, 0);
    let yy = y0;
    for (let i = 0; i < 9; i++) {
      const dy = total * wts[i] / ws, wi = w * (0.46 + i * 0.12);
      poly(g, [[x - wi / 2, yy], [x + wi / 2, yy], [x + wi / 2 + 3, yy + dy * 0.62], [x - wi / 2 - 3, yy + dy * 0.62]], '#3a3f6a', C.line, 1.5);
      g.fillStyle = '#232650'; g.fillRect(x - wi / 2 - 3, yy + dy * 0.62, wi + 6, dy * 0.38);
      g.fillStyle = 'rgba(190,190,255,.18)'; g.fillRect(x - wi / 2, yy, wi, 2);
      yy += dy;
    }
  }
  function petalAt(g, x, y, rot, s, col) { g.save(); g.translate(x, y); g.rotate(rad(rot)); g.scale(s, s); g.fillStyle = col; g.fill(PETAL_UNIT); g.restore(); }
  function tufts(g, rng, x0, x1, y0, y1, n, col) {
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, rng()), y = lerp(y0, y1, rng()), h = 10 + rng() * 24, w = 2 + rng() * 2.5;
      for (let b = -1; b <= 1; b++) poly(g, [[x + b * w * 1.3 - w, y], [x + b * w * 2.4 + (rng() - 0.5) * 4, y - h * (b ? 0.75 : 1)], [x + b * w * 1.3 + w, y]], col);
    }
  }

  /* ═══════════════════════════ the film ═══════════════════════════ */
  async function createIntro(opts) {
    const root = opts.root, mode = opts.mode || 'full';
    buildSprites();
    const [fanImg, wmImg, hkImg] = await Promise.all([loadImg(opts.fanSrc), loadImg(opts.wordmarkSrc), loadImg(opts.hankoSrc)]);

    const rw = Math.max(1, root.clientWidth || window.innerWidth), rh = Math.max(1, root.clientHeight || window.innerHeight);
    const portrait = rw < rh;
    const W = portrait ? 1080 : Math.round(1080 * rw / rh), H = portrait ? Math.round(1080 * rh / rw) : 1080;
    const Hs = Math.min(H, 1500);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ps = cl(Math.max(rw / W, rh / H) * dpr, 0.6, 1.6), psW = Math.min(ps, 1) * 0.9;
    const D = 1.5 * H, PAD = 0.1 * H, WW = Math.round(1.5 * W), FW = Math.round(1.5 * W), PAN = 0.45 * W;

    root.querySelectorAll('.zi-stage').forEach(e => e.remove());
    const stage = document.createElement('div');
    stage.className = 'zi-stage';
    stage.style.cssText = `position:absolute;left:50%;top:50%;width:${W}px;height:${H}px;overflow:hidden;background:${C.night};transform-origin:50% 50%;contain:strict;`;
    root.appendChild(stage);
    function fit() {
      const w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
      stage.style.transform = `translate(-50%,-50%) scale(${Math.max(w / W, h / H)})`;
    }
    fit();

    const mkOff = (wl, hl, sc) => { const c = document.createElement('canvas'); c.width = Math.ceil(wl * sc); c.height = Math.ceil(hl * sc); const g = c.getContext('2d'); g.scale(sc, sc); return { c, g }; };
    function mkLayer(wl, hl, sc, z, parent) {
      const o = mkOff(wl, hl, sc);
      o.c.style.cssText = `position:absolute;left:0;top:0;width:${wl}px;height:${hl}px;z-index:${z};transform-origin:0 0;will-change:transform;`;
      (parent || stage).appendChild(o.c);
      return o;
    }

    /* layout shared by the vista and shot 3 */
    const sL = Math.min((W / 2 - 30) / 1020, 0.66 * H / 1625);
    const fanW = 1900 * sL, k = fanW / 2760, fanL = W / 2 - 950 * sL;
    const blockTop = portrait ? (H - 1625 * sL) / 2 - 0.04 * H : 0.045 * H;
    const LX = x => fanL + (x - 250) * sL, LY = y => blockTop + (y - 90) * sL;
    const piv = { x: fanL + 1380 * k, y: blockTop + 1600 * k };
    const Lr = 1555 * k;

    const rx = portrait ? 0.335 * W : 0.125 * W, ry = portrait ? 0.19 * H : 0.225 * H;
    const tXv = W * (portrait ? 0.41 : 0.26), cyv = H * (portrait ? 0.375 : 0.44);
    const toW = portrait ? 0.30 * W : 0.14 * W;
    const V = { gY: H * 0.8, rx, ry, tX: tXv, cx: tXv, cy: cyv, forkY: cyv + ry * 0.62, rr: Math.min(rx, ry) * 0.17, trW: Math.min(rx, ry) * 0.2,
      toX: W * (portrait ? 0.74 : 0.835), toW, toY: H * 0.812 };

    /* ── the wide tree (shared bitmap, drawn into both vistas) ── */
    function paintVistaTree(g) {
      const rng = rngOf(77), rr = V.rr, fr = Math.max(8, rr * 0.22), tg = V.gY + 0.02 * H, tl = tg - V.forkY, trW = V.trW;
      const step = rr * 1.1;
      for (let gy = V.cy - V.ry; gy <= V.cy + V.ry; gy += step) {
        for (let gx = V.cx - V.rx; gx <= V.cx + V.rx; gx += step) {
          const nx = (gx - V.cx) / V.rx, ny = (gy - V.cy) / V.ry;
          if (nx * nx + ny * ny > 1 + (rng() - 0.5) * 0.28 || rng() < 0.12) continue;
          clump(g, rng, gx + (rng() - 0.5) * step * 0.6, gy + (rng() - 0.5) * step * 0.6, rr * (0.95 + rng() * 0.5), fr, true);
        }
      }
      const tr = [
        { x: V.tX, y: tg, x1: V.tX + 0.012 * W, y1: tg - tl * 0.4, w: trW, w1: trW * 0.78 },
        { x: V.tX + 0.012 * W, y: tg - tl * 0.4, x1: V.tX - 0.008 * W, y1: tg - tl * 0.75, w: trW * 0.78, w1: trW * 0.62 },
        { x: V.tX - 0.008 * W, y: tg - tl * 0.75, x1: V.cx, y1: V.forkY, w: trW * 0.62, w1: trW * 0.5 }
      ];
      for (const sg of tr) drawSeg(g, sg);
      for (const d of [-1, 1]) poly(g, [[V.tX + d * trW * 0.4, tg - tl * 0.12], [V.tX + d * trW * 0.8, tg - 0.01 * H], [V.tX + d * trW * 1.55, tg + 0.006 * H], [V.tX + d * trW * 0.2, tg + 0.014 * H]], C.bark, C.line, 2.5);
      g.strokeStyle = 'rgba(8,4,8,.65)'; g.lineWidth = 1.8; g.lineCap = 'round';
      for (let i = 0; i < 46; i++) {                             // zig-zag bark cracks
        const t0 = rng(), yy = lerp(V.forkY + 14, tg - 10, t0), cx = lerp(V.cx, V.tX, t0), ww = lerp(trW * 0.5, trW, t0), ox = (rng() - 0.5) * ww * 0.7, ln = 14 + rng() * 36;
        g.beginPath(); g.moveTo(cx + ox, yy); g.lineTo(cx + ox + 3, yy + ln * 0.33); g.lineTo(cx + ox - 2, yy + ln * 0.66); g.lineTo(cx + ox + 2, yy + ln); g.stroke();
      }
      for (let i = 0; i < 7; i++) {                              // moss on the lower trunk (angular patches)
        const mx = V.tX + (rng() - 0.5) * trW * 0.7, my = tg - rng() * tl * 0.22;
        poly(g, [[mx, my], [mx + 9, my - 5], [mx + 16, my + 2], [mx + 8, my + 9], [mx - 4, my + 6]], 'rgba(46,85,96,.7)');
      }
      for (let i = 0; i < 3; i++) {                              // knots (almond shaped)
        const t0 = 0.2 + rng() * 0.6, kx = lerp(V.cx, V.tX, t0), ky = lerp(V.forkY, tg, t0);
        poly(g, [[kx, ky - trW * 0.14], [kx + trW * 0.07, ky], [kx, ky + trW * 0.14], [kx - trW * 0.07, ky]], C.line);
      }
      shimenawa(g, rng, V.tX - trW * 0.52, V.tX + trW * 0.52, tg - tl * 0.42, Math.max(3, trW * 0.07));
      const out = { segs: [], tips: [], mids: [] }, L0 = Math.min(V.ry, V.rx) * 0.55;
      [-64, -40, -16, 6, 28, 50, 70].forEach((a, i) => grow(rng, out, V.cx, V.forkY, a, L0 * (0.86 + (i % 3) * 0.1), trW * 0.36, 4));
      for (const sg of out.segs) drawSeg(g, sg);
      twigs(g, rng, out.tips, fr, rr * 0.9);
      for (const m of out.mids) if (rng() < 0.55) clump(g, rng, m[0], m[1], rr * (0.8 + m[2] * 0.12), fr, false);
      for (const t of out.tips) clump(g, rng, t[0], t[1], rr * (0.95 + rng() * 0.5), fr, false);
      for (let i = 0; i < 80; i++) {
        const a = rng() * TAU, d = Math.sqrt(rng()) * 0.95;
        flower(g, 'white', V.cx + Math.cos(a) * V.rx * d + V.rx * 0.08, V.cy + Math.sin(a) * V.ry * d - V.ry * 0.06, fr * (0.7 + rng() * 0.6), (rng() * 4) | 0);
      }
      for (let i = 0; i < 46; i++) petalAt(g, V.cx + (rng() - 0.5) * V.rx * 2.3, V.cy + V.ry * 0.7 + rng() * (V.gY - V.cy - V.ry * 0.6), rng() * 360, 0.7 + rng() * 0.6, ['#fbc4d9', '#ef86b6', '#fff6f9'][i % 3]);
      for (let i = 0; i < 120; i++) petalAt(g, V.cx + (rng() - 0.5) * V.rx * 2.0, V.gY + 0.006 * H + rng() * 0.07 * H, rng() * 360, 0.6 + rng() * 0.6, ['#fbc4d9', '#ef86b6', '#fff6f9', '#c2488c'][i % 4]);
    }

    /* ── a full-frame vista: dusk (shot 1) or night (shot 3 backdrop / hero) ── */
    function paintVista(g, n, treeBmp, logoVignette) {
      const rng = rngOf(n ? 9 : 8), gY = V.gY;
      const stops = n ? [[0, '#0d0b22'], [0.45, C.night], [0.8, '#1d1738'], [1, '#1d1738']]
        : [[0, C.night], [0.26, '#241f52'], [0.46, '#5b3569'], [0.64, C.rose], [0.78, '#ea8a6f'], [0.86, C.ember], [1, C.ember]];
      const sg = g.createLinearGradient(0, 0, 0, H); stops.forEach(s => sg.addColorStop(s[0], s[1])); g.fillStyle = sg; g.fillRect(0, 0, W, H);
      for (let i = 0; i < (n ? 110 : 30); i++) {
        const sx = rng() * W, sy = rng() * H * (n ? 0.62 : 0.34), r = 1 + rng() * 2.4;
        g.globalAlpha = 0.3 + rng() * 0.6;
        if (r > 2.2) sparkle(g, sx, sy, r * 2.2, C.moon); else { g.fillStyle = C.moon; g.fillRect(sx, sy, r, r); }
        g.globalAlpha = 1;
      }
      const mr = 0.1 * Math.min(W, H), mx = portrait ? 0.76 * W : 0.9 * W, my = portrait ? 0.14 * H : 0.2 * H;
      const mgr = g.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 2.6); mgr.addColorStop(0, `rgba(246,184,207,${n ? 0.4 : 0.3})`); mgr.addColorStop(1, 'rgba(246,184,207,0)');
      g.fillStyle = mgr; g.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
      g.fillStyle = C.moon; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
      poly(g, [[mx - mr * 0.5, my - mr * 0.3], [mx - mr * 0.2, my - mr * 0.45], [mx - mr * 0.12, my - mr * 0.1], [mx - mr * 0.4, my]], 'rgba(246,184,207,.5)');
      poly(g, [[mx + mr * 0.2, my + mr * 0.2], [mx + mr * 0.5, my + mr * 0.1], [mx + mr * 0.45, my + mr * 0.42], [mx + mr * 0.15, my + mr * 0.5]], 'rgba(246,184,207,.45)');
      const warm = n ? 'rgb(140,120,210)' : 'rgb(255,196,160)';          // ukiyo-e cloud bands
      for (let i = 0; i < 7; i++) mistBand(g, rng() * W * 0.9 - W * 0.1, H * (0.1 + i * 0.065) + rng() * 20, W * (0.28 + rng() * 0.3), 10 + rng() * 14, warm, n ? 0.2 : 0.42);
      g.strokeStyle = C.line; g.lineWidth = 2.4; g.lineCap = 'round'; g.globalAlpha = 0.7;   // birds: sharp V's
      for (let i = 0; i < 5; i++) { const bx = W * (0.5 + i * 0.045) + (portrait ? 0 : W * 0.1), by = H * (0.2 + (i % 3) * 0.02) + i * 6; g.beginPath(); g.moveTo(bx - 12, by); g.lineTo(bx - 4, by - 8); g.lineTo(bx, by); g.lineTo(bx + 4, by - 8); g.lineTo(bx + 12, by); g.stroke(); }
      g.globalAlpha = 1;
      const fx = portrait ? W * 0.80 : W * 0.60;                         // mountains
      ridge(g, rngOf(1), W, gY, gY - 0.17 * Hs, 0.1 * Hs, mix('#8a5a92', '#2e2860', n), mix('#c0708a', '#1f1a45', n), n ? 'rgba(170,160,255,.4)' : 'rgba(255,210,170,.55)');
      fuji(g, rngOf(5), fx, gY - 0.03 * Hs, 0.32 * Hs, W * 0.2, n);
      mistBand(g, -W * 0.05, gY - 0.07 * Hs, W * 1.1, 0.03 * Hs, n ? 'rgb(120,105,200)' : 'rgb(255,190,160)', n ? 0.2 : 0.4);
      const near = ridge(g, rngOf(2), W, gY, gY - 0.07 * Hs, 0.07 * Hs, mix('#4a3470', '#241d52', n), mix('#2a2250', '#15112f', n), n ? 'rgba(150,140,240,.3)' : 'rgba(255,200,160,.45)');
      const pgX = W * (portrait ? 0.6 : 0.52);
      pagoda(g, pgX, yAt(near, pgX) + 6, 0.2 * Hs, mix('#2a2250', '#120f2a', n), true);
      mistBand(g, W * 0.1, gY - 0.035 * Hs, W * 0.9, 0.02 * Hs, n ? 'rgb(120,105,200)' : 'rgb(255,190,160)', n ? 0.18 : 0.3);
      const lr = rngOf(3);
      for (let i = 0; i < 26; i++) { g.fillStyle = C.lantern; g.globalAlpha = 0.45 + lr() * 0.5; g.fillRect(lr() * W, gY - 0.05 * Hs + lr() * 0.045 * Hs, 5, 4); }
      g.globalAlpha = 1;
      const pr = rngOf(4);
      for (let i = 0; i < 22; i++) pine(g, pr() * W, gY - 0.008 * H + pr() * 0.01 * H, (0.06 + pr() * 0.06) * Hs, mix('#1d1b4a', '#0c0a22', n));
      g.beginPath(); g.moveTo(-30, H + 10); g.lineTo(-30, gY); g.bezierCurveTo(W * 0.2, gY - 0.012 * H, W * 0.45, gY + 0.008 * H, W * 0.7, gY - 0.006 * H); g.bezierCurveTo(W * 0.82, gY - 0.01 * H, W * 0.95, gY + 0.004 * H, W + 30, gY - 0.004 * H); g.lineTo(W + 30, H + 10); g.closePath();
      g.fillStyle = mix('#151f2e', '#0e1522', n); g.fill(); g.strokeStyle = C.line; g.lineWidth = 3; g.stroke();
      shrine(g, V.toX, V.toY - 0.012 * H, V.toW * 0.46, mix('#241d4a', '#120f2a', n));
      steps(g, V.toX, V.toY, H, V.toW);
      torii(g, V.toX, V.toY, V.toW);
      const ls = V.toW * 0.55, lanternAt = [];
      for (const sd of [-1, 1]) { const lx = V.toX + sd * V.toW * 0.64, ly = V.toY + 0.075 * H; toro(g, lx, ly, ls); lanternAt.push([lx, ly - ls * 0.7, ls]); }
      const p0 = [V.toX - V.toW * 0.5, V.toY - V.toW * 0.92 + V.toW * 0.02], p2 = [V.tX + V.trW * 0.5, V.gY - (V.gY + 0.02 * H - V.forkY) * 0.5], p1 = [(p0[0] + p2[0]) / 2, Math.max(p0[1], p2[1]) + 0.07 * H];
      g.strokeStyle = 'rgba(10,8,20,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); g.stroke();
      for (let i = 1; i <= 7; i++) {                                       // a string of paper lanterns from the torii to the tree
        const t = i / 8, x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
        chochin(g, x, y, 0.034 * Hs);
      }
      g.drawImage(treeBmp, 0, 0, W, H);
      tufts(g, rngOf(6), 0, W, gY + 0.02 * H, H, 90, C.grass);
      g.fillStyle = n ? C.indigo : '#231f5a'; g.globalAlpha = n ? 0.3 : 0.08; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
      for (const l of lanternAt) {
        const gr = g.createRadialGradient(l[0], l[1], 0, l[0], l[1], l[2] * 0.8); gr.addColorStop(0, `rgba(255,179,71,${n ? 0.55 : 0.4})`); gr.addColorStop(1, 'rgba(255,179,71,0)');
        g.fillStyle = gr; g.fillRect(l[0] - l[2], l[1] - l[2], l[2] * 2, l[2] * 2);
      }
      if (logoVignette) {
        for (const [cy2, rxx, ryy, glow] of [[blockTop + 0.3 * fanW, fanW * 0.8, fanW * 0.6, true], [blockTop + 0.5 * fanW, fanW * 0.85, fanW * 0.62, false]]) {
          g.save(); g.translate(W / 2, cy2); g.scale(rxx, ryy);
          const vg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
          if (glow) { vg.addColorStop(0, 'rgba(246,184,207,.4)'); vg.addColorStop(0.55, 'rgba(246,184,207,.1)'); vg.addColorStop(1, 'rgba(246,184,207,0)'); }
          else { vg.addColorStop(0, 'rgba(19,15,13,.62)'); vg.addColorStop(0.6, 'rgba(19,15,13,.36)'); vg.addColorStop(1, 'rgba(19,15,13,0)'); }
          g.fillStyle = vg; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
        }
      }
    }

    /* build vista layers */
    const world = document.createElement('div');
    world.style.cssText = 'position:absolute;inset:0;transform-origin:50% 100%;z-index:1;';
    stage.appendChild(world);
    let vistaDusk = null, vistaNight = null;
    {
      const tb = mkOff(W, H, ps); paintVistaTree(tb.g); await wait();
      if (mode === 'full') {
        const d = mkLayer(W, H, ps, 7); paintVista(d.g, 0, tb.c, false); vistaDusk = d.c;
        vistaDusk.style.transformOrigin = `${f1(V.tX)}px ${f1(V.gY - 0.03 * H)}px`; await wait();
      }
      const nn = mkLayer(W, H, ps, 8); paintVista(nn.g, 1, tb.c, true); vistaNight = nn.c; vistaNight.style.visibility = 'hidden'; await wait();
    }

    /* ── close-up world layers (shot 2): painted once, then only translated ── */
    const LAYERS = [];
    if (mode === 'full') {
      const LHf = f => H + f * D + PAD, Yb = (f, hb) => LHf(f) - PAD - hb;
      const addLayer = (f, gx, wl, z, paint) => { const hl = LHf(f), o = mkLayer(wl, hl, psW, z, world); paint(o.g, hl); LAYERS.push({ el: o.c, f, gx }); };

      addLayer(0.15, 0.1, W, 1, (g, hl) => {                     // sky (tall, dusk gradient) + moon + clouds + stars
        const sg = g.createLinearGradient(0, 0, 0, hl);
        [[0, C.night], [0.22, C.indigo], [0.42, '#3a2766'], [0.62, '#7b4073'], [0.8, C.rose], [0.92, '#ea8a6f'], [1, C.ember]].forEach(s => sg.addColorStop(s[0], s[1]));
        g.fillStyle = sg; g.fillRect(0, 0, W, hl);
        const r = rngOf(11);
        for (let i = 0; i < 70; i++) { g.globalAlpha = 0.3 + r() * 0.6; sparkle(g, r() * W, r() * hl * 0.55, 2 + r() * 3.5, C.moon); }
        g.globalAlpha = 1;
        const mx = W * (portrait ? 0.74 : 0.7), my = Yb(0.15, 0.46 * Hs), mr = 0.17 * Hs;
        const mgr = g.createRadialGradient(mx, my, mr, mx, my, mr * 2.2); mgr.addColorStop(0, 'rgba(246,184,207,.35)'); mgr.addColorStop(1, 'rgba(246,184,207,0)');
        g.fillStyle = mgr; g.fillRect(mx - mr * 2.4, my - mr * 2.4, mr * 4.8, mr * 4.8);
        g.fillStyle = C.moon; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
        poly(g, [[mx - mr * 0.5, my - mr * 0.3], [mx - mr * 0.2, my - mr * 0.45], [mx - mr * 0.12, my - mr * 0.1], [mx - mr * 0.4, my]], 'rgba(246,184,207,.5)');
        for (let i = 0; i < 9; i++) mistBand(g, r() * W * 0.8 - W * 0.1, hl * (0.2 + r() * 0.7), W * (0.3 + r() * 0.3), 12 + r() * 16, 'rgb(255,196,160)', 0.3);
      });
      addLayer(0.25, 0.2, W, 2, (g) => {                          // Fuji + far ridge
        const base = Yb(0.25, 0);
        ridge(g, rngOf(21), W, base, Yb(0.25, 0.2 * Hs), 0.1 * Hs, '#8a5a92', '#c0708a', 'rgba(255,210,170,.55)');
        fuji(g, rngOf(23), W * (portrait ? 0.24 : 0.16), base - 0.02 * Hs, 0.3 * Hs, W * 0.22, 0);
      });
      addLayer(0.4, 0.3, W, 3, (g) => {                           // near ridge, pagoda, lights
        const base = Yb(0.4, 0);
        const near = ridge(g, rngOf(31), W, base, Yb(0.4, 0.12 * Hs), 0.07 * Hs, '#4a3470', '#2a2250', 'rgba(255,200,160,.45)');
        const px = W * (portrait ? 0.78 : 0.86);
        pagoda(g, px, yAt(near, px) + 6, 0.19 * Hs, '#241d4a', true);
        const r = rngOf(32);
        for (let i = 0; i < 14; i++) { g.fillStyle = C.lantern; g.globalAlpha = 0.5 + r() * 0.5; g.fillRect(r() * W, Yb(0.4, 0.12 * Hs) + 10 + r() * 0.07 * Hs, 5, 4); }
        g.globalAlpha = 1;
      });
      addLayer(0.6, 0.5, W, 4, (g) => {                           // hill, small torii, lantern, pines
        const base = Yb(0.6, 0), hy = Yb(0.6, 0.1 * Hs);
        g.beginPath(); g.moveTo(-20, base); g.lineTo(-20, hy); g.bezierCurveTo(W * 0.2, hy - 0.06 * Hs, W * 0.35, hy + 0.01 * Hs, W * 0.55, hy - 0.03 * Hs); g.bezierCurveTo(W * 0.7, hy - 0.05 * Hs, W * 0.9, hy - 0.07 * Hs, W + 20, hy - 0.02 * Hs); g.lineTo(W + 20, base); g.closePath();
        g.fillStyle = C.indigo; g.fill();
        pine(g, W * (portrait ? 0.08 : 0.12), Yb(0.6, 0.1 * Hs), 0.2 * Hs, C.night); pine(g, W * 0.34, Yb(0.6, 0.09 * Hs), 0.15 * Hs, C.night); pine(g, W * (portrait ? 0.95 : 0.9), Yb(0.6, 0.095 * Hs), 0.21 * Hs, C.night);
        torii(g, W * (portrait ? 0.2 : 0.26), Yb(0.6, 0.126 * Hs), 0.125 * Hs);
        const lx = W * (portrait ? 0.8 : 0.78);
        toro(g, lx, Yb(0.6, 0.16 * Hs), 0.12 * Hs);
        const lg = g.createRadialGradient(lx, Yb(0.6, 0.23 * Hs), 0, lx, Yb(0.6, 0.23 * Hs), 0.1 * Hs); lg.addColorStop(0, 'rgba(255,179,71,.45)'); lg.addColorStop(1, 'rgba(255,179,71,0)');
        g.fillStyle = lg; g.fillRect(lx - 0.1 * Hs, Yb(0.6, 0.23 * Hs) - 0.1 * Hs, 0.2 * Hs, 0.2 * Hs);
      });
      addLayer(1, 1.0, WW, 5, (g, LHt) => {                       // the tree, close: ground, trunk, limbs, crown
        const rng = rngOf(41), xT = W * (portrait ? 0.46 : 0.40), baseY = LHt - PAD + 0.05 * H, forkY = 1.05 * H, xFork = xT + 0.02 * W, trunkW0 = Math.min(0.22 * W, 0.2 * Hs);
        const fr = 26, sx = portrait ? 190 : 215, sy = portrait ? 185 : 200;
        for (let gy = -0.12 * H; gy < 0.98 * H; gy += sy) for (let gx = -0.12 * W; gx < WW; gx += sx) {
          if (rng() < 0.3) continue;
          clump(g, rng, gx + (rng() - 0.5) * sx * 0.7, gy + (rng() - 0.5) * sy * 0.7, 105 + rng() * 45, fr, true);
        }
        const tr = [
          { x: xT, y: baseY, x1: xT + 0.012 * W, y1: 2.0 * H, w: trunkW0, w1: trunkW0 * 0.72 },
          { x: xT + 0.012 * W, y: 2.0 * H, x1: xT - 0.012 * W, y1: 1.5 * H, w: trunkW0 * 0.72, w1: trunkW0 * 0.55 },
          { x: xT - 0.012 * W, y: 1.5 * H, x1: xFork, y1: forkY, w: trunkW0 * 0.55, w1: trunkW0 * 0.46 }
        ];
        for (const sg of tr) drawSeg(g, sg);
        g.strokeStyle = 'rgba(8,4,8,.65)'; g.lineWidth = 2.5; g.lineCap = 'round';
        for (let i = 0; i < 90; i++) {
          const yy = lerp(forkY + 60, baseY - 80, rng()), pr = (yy - forkY) / (baseY - forkY), cx = lerp(xFork, xT, pr), ww = lerp(trunkW0 * 0.46, trunkW0, pr), ox = (rng() - 0.5) * ww * 0.72, ln = 40 + rng() * 120;
          g.beginPath(); g.moveTo(cx + ox, yy); g.lineTo(cx + ox + 5, yy + ln * 0.3); g.lineTo(cx + ox - 4, yy + ln * 0.62); g.lineTo(cx + ox + 3, yy + ln); g.stroke();
        }
        for (let i = 0; i < 12; i++) { const mx = xT + (rng() - 0.5) * trunkW0 * 0.8, my = baseY - 0.05 * H - rng() * 0.4 * H; poly(g, [[mx, my], [mx + 22, my - 12], [mx + 40, my + 5], [mx + 20, my + 22], [mx - 10, my + 14]], 'rgba(46,85,96,.7)'); }
        for (let i = 0; i < 4; i++) { const t0 = 0.2 + rng() * 0.6, kx = lerp(xFork, xT, t0), ky = lerp(forkY, baseY, t0); poly(g, [[kx, ky - trunkW0 * 0.16], [kx + trunkW0 * 0.08, ky], [kx, ky + trunkW0 * 0.16], [kx - trunkW0 * 0.08, ky]], C.line); }
        for (const d of [-1, 1]) poly(g, [[xT + d * trunkW0 * 0.45, baseY - 0.16 * H], [xT + d * trunkW0 * 0.8, baseY - 0.04 * H], [xT + d * trunkW0 * 1.5, baseY - 0.015 * H], [xT + d * trunkW0 * 0.3, baseY]], C.bark, C.line, 3);
        shimenawa(g, rng, xT - trunkW0 * 0.5, xT + trunkW0 * 0.5, lerp(forkY, baseY, 0.5), 10);
        const xAt = y => lerp(xFork, xT, cl((y - forkY) / (baseY - forkY)));
        const out = { segs: [], tips: [], mids: [] }, lb = Math.max(0.2 * W, 0.17 * H);
        [[-1, 2.0, 64, 1], [1, 1.9, 60, 1.1], [-1, 1.62, 56, 1], [1, 1.5, 62, 1.1], [-1, 1.34, 52, 1], [1, 1.22, 50, 1]].forEach(([sd, yf, ang, lf]) => grow(rng, out, xAt(yf * H), yf * H, sd * ang, lb * lf, trunkW0 * 0.3, 2));
        const L0 = Math.max(0.3 * H, 0.17 * W);
        [-58, -30, -8, 14, 36, 60].forEach((a, i) => grow(rng, out, xFork, forkY, a, L0 * (0.9 + (i % 3) * 0.12), trunkW0 * 0.34, 4));
        [34, 52, 66].forEach(a => grow(rng, out, xFork + W * 0.45, forkY - 0.1 * H, a, L0 * 0.9, trunkW0 * 0.24, 4));
        for (const sg of out.segs) drawSeg(g, sg);
        twigs(g, rng, out.tips, fr, 90);
        for (const m of out.mids) clump(g, rng, m[0], m[1], 62 + m[2] * 20 + rng() * 30, fr, false);
        for (const t of out.tips) clump(g, rng, t[0], t[1], 90 + rng() * 50, fr, false);
        const gy0 = LHt - PAD - 0.16 * Hs;
        g.beginPath(); g.moveTo(-40, LHt + 20); g.lineTo(-40, gy0); g.bezierCurveTo(W * 0.25, gy0 - 0.04 * Hs, W * 0.5, gy0 + 0.02 * Hs, W * 0.9, gy0 - 0.03 * Hs); g.bezierCurveTo(WW * 0.7, gy0 + 0.01 * Hs, WW * 0.9, gy0 - 0.02 * Hs, WW + 40, gy0 - 0.02 * Hs); g.lineTo(WW + 40, LHt + 20); g.closePath();
        g.fillStyle = '#151f2e'; g.fill(); g.strokeStyle = C.line; g.lineWidth = 3; g.stroke();
        const gr = rngOf(43);
        tufts(g, gr, 0, WW * 0.7, gy0 + 10, gy0 + 0.14 * Hs, 120, C.grass);
        for (let i = 0; i < 90; i++) petalAt(g, gr() * W * 1.1, gy0 + 12 + gr() * 0.14 * Hs, gr() * 360, 0.7 + gr() * 0.7, ['#fbc4d9', '#ef86b6', '#fff6f9'][i % 3]);
      });
      addLayer(1.3, 1.0, FW, 6, (g) => {                           // foreground twigs, big and deep-toned, whooshing past
        const rng = rngOf(51);
        [[-1, 2.05, 70, 0.34], [1, 2.45, 74, 0.32], [-1, 2.8, 66, 0.3], [1, 1.6, 72, 0.32], [-1, 1.25, 68, 0.3], [1, 0.95, 70, 0.3], [-1, 0.6, 72, 0.32], [1, 0.3, 66, 0.3], [-1, 0.2, 68, 0.3]].forEach(([sd, yf, ang, lf]) => {
          const x0 = sd < 0 ? -40 : W + 40, out = { segs: [], tips: [], mids: [] };
          grow(rng, out, x0, yf * H, -sd * ang, lf * W * 1.35, 24, 1);
          for (const sg of out.segs) drawSeg(g, sg);
          for (const m of out.mids) clump(g, rng, m[0], m[1], 85 + rng() * 40, 30, true);
          for (const t of out.tips) clump(g, rng, t[0], t[1], 105 + rng() * 55, 32, true);
        });
      });
      await wait();
    }

    /* ── shot 3: fan canvas (fan + wordmark + hanko) and the fx canvas (petals, lines, tint, dips) ── */
    const fan = mkLayer(W, H, ps, 9);
    const fx = mkLayer(W, H, Math.min(ps, 1.25), 10);
    fx.c.style.willChange = 'auto';
    const fg = fan.g, xg = fx.g;
    const FANN = 19, FA = 72;
    const ax = -1536 * k, ay = -1880 * k, aw = 3072 * k, ah = 2048 * k;

    // the fan: pleated paper slices rotate out from the pivot, exactly like a real fan unfolding
    function drawFan(g, s, tilt, sc, dy, alpha) {
      g.save(); g.globalAlpha = alpha;
      g.translate(piv.x, piv.y + dy); g.rotate(rad(tilt)); g.scale(sc, sc);
      const tas = 1 - prog(s, 0.5, 0.9);
      if (tas > 0.01) {                                           // tassel
        g.globalAlpha = alpha * tas; g.strokeStyle = C.red; g.lineWidth = Math.max(3, 9 * k); g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(6 * k, 70 * k); g.lineTo(-4 * k, 110 * k); g.stroke();
        poly(g, [[-14 * k, 118 * k], [14 * k, 118 * k], [22 * k, 200 * k], [-22 * k, 200 * k]], C.red, C.line, 2);
        poly(g, [[0, 100 * k], [9 * k, 112 * k], [0, 124 * k], [-9 * k, 112 * k]], C.gold);
        g.globalAlpha = alpha;
      }
      g.save(); g.beginPath(); g.rect(-aw, 0, aw * 2, ah); g.clip(); g.drawImage(fanImg, ax, ay, aw, ah); g.restore();   // heel + diamond stay in place
      if (s >= 0.999) g.drawImage(fanImg, ax, ay, aw, ah);
      else {
        const span = 2 * FA / FANN;
        const idx = Array.from({ length: FANN }, (_, i) => i).sort((a, b) => Math.abs(b + 0.5 - FANN / 2) - Math.abs(a + 0.5 - FANN / 2));
        const pl = (1 - s) * 0.5 + 0.05, RR = 2100 * k;
        for (const i of idx) {
          const a0 = -FA + i * span, a1 = a0 + span, ac = (a0 + a1) / 2, rot = (s - 1) * ac;
          g.save(); g.rotate(rad(rot));
          g.beginPath(); g.moveTo(0, 0);
          g.lineTo(Math.sin(rad(a0 - 0.12)) * RR, -Math.cos(rad(a0 - 0.12)) * RR); g.lineTo(Math.sin(rad(a1 + 0.12)) * RR, -Math.cos(rad(a1 + 0.12)) * RR); g.closePath(); g.clip();
          g.drawImage(fanImg, ax, ay, aw, ah);
          const gr = g.createLinearGradient(Math.sin(rad(a0)) * Lr, -Math.cos(rad(a0)) * Lr, Math.sin(rad(a1)) * Lr, -Math.cos(rad(a1)) * Lr), even = i % 2 === 0;
          gr.addColorStop(0, `rgba(0,0,0,${even ? pl : 0})`); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${even ? 0 : pl})`);
          g.fillStyle = gr; g.fillRect(-RR, -RR, RR * 2, RR * 2);
          g.restore();
          g.save(); g.rotate(rad(rot + a0)); g.strokeStyle = C.gold; g.globalAlpha = alpha * 0.6 * (1 - s * s); g.lineWidth = Math.max(1, 2 * k);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -Lr * 0.99); g.stroke(); g.restore();
        }
        const ga = alpha * (1 - prog(s, 0.88, 0.99));              // the two guard sticks fold away as the paper flattens
        if (ga > 0.01) for (const sd of [-1, 1]) {
          const edge = sd * FA + (s - 1) * (sd * (FA - span / 2));
          g.save(); g.globalAlpha = ga; g.rotate(rad(edge)); g.translate(sd * 18 * k, 0);
          const wb = 38 * k, wt = 66 * k;
          poly(g, [[-wb / 2, 0], [-wt / 2, -Lr], [0, -Lr - wt * 0.5], [wt / 2, -Lr], [wb / 2, 0]], C.lacquer, C.gold, Math.max(1.5, 4 * k));
          g.fillStyle = C.cream; g.fillRect(-wt / 2, -Lr * 0.8, wt, 14 * k);
          g.restore();
        }
      }
      g.restore();
    }

    const WM = { x: 290, y: 1130, w: 1600, h: 540 }, HK = { x: 1990, y: 1285, w: 230, h: 430 };
    // the wordmark's soft drop shadow is baked once (a per-frame canvas blur was the only real hitch in playback)
    const wmPad = 24 * sL, wmBake = mkOff(WM.w * sL + wmPad * 2, WM.h * sL + wmPad * 2, Math.min(ps, 1.25));
    wmBake.g.shadowColor = 'rgba(0,0,0,.6)'; wmBake.g.shadowBlur = 8 * sL; wmBake.g.shadowOffsetY = 6 * sL;
    wmBake.g.drawImage(wmImg, wmPad, wmPad, WM.w * sL, WM.h * sL);
    function drawShot3(t) {
      fg.clearRect(0, 0, W, H);
      const OPEN0 = 6.57, OPEN1 = 7.4, SET1 = 7.75;
      let s, tilt, sc, dy = 0;
      if (t < 6.4) { s = 0.02; tilt = -12; sc = 1; dy = Math.round(Math.sin((t - CUT) * 5) * 6 / 2) * 2; }
      else if (t < OPEN0) { s = 0.0; tilt = -16; sc = 0.95; dy = 6; }               // 4f anticipation, the other way
      else if (t < OPEN1) { const e = eOut3(q(prog(t, OPEN0, OPEN1), 10)); s = lerp(0.02, 1, e); tilt = lerp(-16, 3, e); sc = lerp(0.95, 1.025, e); }
      else if (t < SET1) { const e = eOut2(q(prog(t, OPEN1, SET1), 3)); s = 1; tilt = lerp(3, 0, e); sc = lerp(1.025, 1, e); }
      else { s = 1; tilt = 0; sc = 1; }
      if (t >= OPEN0 + 2 / FPS && t < OPEN0 + 6 / FPS) drawFan(fg, Math.max(0, s - 0.2), tilt - 4, sc, dy, 0.35);   // two smear frames: an echo of the previous drawing
      drawFan(fg, s, tilt, sc, dy, 1);
      const WM0 = 7.75, WM1 = 8.3, wp = q(prog(t, WM0, WM1), 14), rise = 24 * (1 - eOut3(prog(t, WM0, WM0 + 0.4))), wa = Math.min(1, prog(t, WM0, WM0 + 0.4) * 1.4);
      if (wp > 0) {                                                // jagged brush wipe left -> right
        const x0 = LX(WM.x), y0 = LY(WM.y) + rise, w0 = WM.w * sL, h0 = WM.h * sL, cutX = x0 + (w0 + 60 * sL) * wp;
        fg.save(); fg.globalAlpha = wa; fg.beginPath(); fg.moveTo(x0 - 5, y0 - 5);
        for (let i = 0; i <= 12; i++) fg.lineTo(cl(cutX + (i % 2 ? -26 : 8) * sL, x0 - 5, x0 + w0 + 10), y0 + (h0 + 10) * i / 12);
        fg.lineTo(x0 - 5, y0 + h0 + 10); fg.closePath(); fg.clip();
        fg.drawImage(wmBake.c, x0 - wmPad, y0 - wmPad, w0 + wmPad * 2, h0 + wmPad * 2); fg.restore();
      }
      if (t >= 8.3) {                                              // hanko stamps in
        const hp = q(prog(t, 8.3, 8.3 + 3 / FPS), 3), hx = LX(HK.x + HK.w / 2), hy = LY(HK.y + HK.h / 2);
        fg.save(); fg.translate(hx, hy); fg.rotate(rad(lerp(-8, 0, hp))); const hsc = lerp(1.45, 1, hp); fg.scale(hsc, hsc);
        fg.drawImage(hkImg, -HK.w * sL / 2, -HK.h * sL / 2, HK.w * sL, HK.h * sL); fg.restore();
      }
    }

    /* petals & fx */
    const PCOL = ['#fbc4d9', '#ef86b6', '#fff6f9', '#fbc4d9', '#c2488c'];
    const NA = 90, NC = 70, NB = 16, PA = [], PC = [], PB = [], AMB = [];
    {
      const r = rngOf(61);
      for (let i = 0; i < NA; i++) PA.push({ x0: r() * W, y0: r() * (H + 120), zn: r(), A: 20 + r() * 50, w: 1.2 + r() * 2, ph: r() * 6.28, fall: 40 + r() * 70, pf: 0.7 + r() * 0.9, s: 13 + r() * 18, rot: r() * 360, spin: (r() - 0.5) * 240, c: PCOL[i % 5] });
      const r2 = rngOf(62);
      for (let i = 0; i < NC; i++) PC.push({ x0: -1.4 * W + r2() * 1.5 * W, y0: r2() * H, zn: r2(), v: 1.2 + r2() * 1.4, ph: r2() * 6.28, A: 40 + r2() * 90, s: 13 + r2() * 19, c: PCOL[i % 5], rot: r2() * 360 });
      const r3 = rngOf(63);
      for (let i = 0; i < NB; i++) PB.push({ x0: r3() * W, t0: 6.7 + r3() * 1.6, vy: 55 + r3() * 70, A: 40 + r3() * 70, w: 0.9 + r3() * 1.4, ph: r3() * 6.28, s: 13 + r3() * 14, c: PCOL[i % 5], rot: r3() * 360, spin: (r3() - 0.5) * 120 });
      const r4 = rngOf(64);
      for (let i = 0; i < 26; i++) AMB.push({ x0: r4() * W, off: r4() * 40, per: 22 + r4() * 18, A: 30 + r4() * 60, w: 0.5 + r4(), ph: r4() * 6.28, s: 10 + r4() * 12, c: PCOL[i % 5], rot: r4() * 360, spin: (r4() - 0.5) * 80 });
    }
    const windE = t => eIn3(prog(t, 4.55, 5.5));
    function cRaw(t) { if (t < T1) return 0; if (t < T1 + 0.17) return -0.016; if (t < 4.05) return -0.016 + 1.016 * eIO4(prog(t, T1 + 0.17, 4.05)); return 1; }
    function cStep(t) { if (t < T1) return 0; if (t < T1 + 0.17) return -0.016; if (t < 4.05) return -0.016 + 1.016 * eIO4(q(prog(t, T1 + 0.17, 4.05), 20)); return 1; }
    const xStep = t => (t < 5.0 ? 0 : eIn3(q(prog(t, 5.0, 5.5), 12))), xRaw = t => (t < 5.0 ? 0 : eIn3(prog(t, 5.0, 5.5)));
    function petalAPos(P, t, stepped) {
      const tq = stepped ? Math.floor(t * 12 + 1e-6) / 12 : t, c = stepped ? cStep(t) : cRaw(t), e = windE(t);
      return [P.x0 + P.A * Math.sin(P.w * tq + P.ph) + e * 2.6 * W * (0.55 + 0.5 * P.zn),
        P.y0 + P.fall * tq + c * D * P.pf - e * 0.12 * H * P.zn + 60 * Math.sin(5 * tq + P.ph) * e * (1 - e * 0.3)];
    }
    const WINDS = [];
    {
      const r = rngOf(91);
      [0.14, 0.27, 0.4, 0.53, 0.64, 0.76, 0.88].forEach((yf, i) => {
        const y = yf * H + (r() - 0.5) * 0.04 * H, amp = 0.045 * H + r() * 0.03 * H, pts = [];
        for (let j = 0; j <= 48; j++) { const u = j / 48; pts.push([lerp(-0.25 * W, 1.15 * W, u), y + Math.sin(u * TAU * 1.1 + i) * amp - u * amp * 0.5 + (u > 0.9 ? -Math.sin((u - 0.9) * 31) * amp * 0.25 : 0)]); }
        WINDS.push({ pts, t0: 4.55 + i * 0.07 + r() * 0.05, w: 5 + r() * 6 });
      });
    }
    const speed = [rngOf(71), rngOf(78), rngOf(85)].map(r => Array.from({ length: 34 }, () => [r() * W, r() * H - 100, 0.22 * H * (0.4 + r() * 0.9), 2 + r() * 4, 0.45 + r() * 0.4]));
    const speedH = [rngOf(81), rngOf(88), rngOf(95)].map(r => Array.from({ length: 26 }, () => [r() * H, r() * W - 100, 0.35 * W * (0.4 + r() * 0.9), 2 + r() * 4, 0.4 + r() * 0.45]));
    const moonGlowGrad = xg.createRadialGradient(W * 0.74, H * 0.22, 0, W * 0.74, H * 0.22, Math.max(W, H) * 0.62);
    moonGlowGrad.addColorStop(0, 'rgba(246,184,207,.9)'); moonGlowGrad.addColorStop(1, 'rgba(246,184,207,0)');

    function drawFx(t, inVista) {
      xg.clearRect(0, 0, W, H);
      const fr = Math.round(t * FPS);
      if (!inVista && t < CUT) {                                   // dusk -> night tint over the close-up world
        xg.globalAlpha = 0.26 * eIO2(prog(t, 0, 4.2)); xg.fillStyle = '#231f5a'; xg.fillRect(0, 0, W, H);
        xg.globalAlpha = 0.45 * eIO2(prog(t, T1, 4.2)); xg.fillStyle = moonGlowGrad; xg.fillRect(0, 0, W, H); xg.globalAlpha = 1;
      }
      if (t < CUT) for (let i = 0; i < NA; i++) {                  // pool A: shots 1 + 2
        const P = PA[i], pa = petalAPos(P, t, true), x = pa[0], yu = pa[1], M = H + 120, y = (((yu % M) + M) % M) - 60;
        if (x < -80 || x > W + 80) continue;
        const p0 = petalAPos(P, t - 0.05, false), p1 = petalAPos(P, t + 0.05, false), vx = (p1[0] - p0[0]) / 0.1, vy = (p1[1] - p0[1]) / 0.1;
        const stretch = cl(Math.hypot(vx, vy) / (1.3 * H), 0, 1), idle = P.rot + P.spin * Math.floor(t * 12) / 12;
        const rot = lerp(idle, Math.atan2(vy, vx) * 180 / Math.PI + 90, cl(stretch * 1.8)), sc = (P.s / 10) * (0.8 + P.zn * 0.55) * (inVista ? 0.5 : 1);
        xg.save(); xg.translate(x, y); xg.rotate(rad(rot)); xg.scale(sc * (1 - 0.5 * stretch), sc * (1 + 2.6 * stretch)); xg.fillStyle = P.c; xg.fill(PETAL_UNIT); xg.restore();
      }
      if (t >= 4.75 && t <= 7.2) for (const P of PC) {            // pool C: the storm carries on across the night
        const d = t - 4.75, lam = 0.8, v0 = P.v * W * (0.7 + 0.6 * P.zn), x = P.x0 + v0 / lam * (1 - Math.exp(-lam * d)), vel = v0 * Math.exp(-lam * d), tq = Math.floor(t * 12 + 1e-6) / 12;
        if (x < -80 || x > W + 80) continue;
        const y = P.y0 + P.A * Math.sin(3 * tq + P.ph) * Math.min(1, d * 2), stretch = cl(vel / (2.2 * W), 0, 1), rot = lerp(P.rot, 90 + 12 * Math.sin(tq * 4 + P.ph), cl(stretch * 2)), sc = (P.s / 10) * (0.8 + P.zn * 0.55);
        xg.save(); xg.translate(x, y); xg.rotate(rad(rot)); xg.scale(sc * (1 - 0.5 * stretch), sc * (1 + 2.6 * stretch)); xg.fillStyle = P.c; xg.fill(PETAL_UNIT); xg.restore();
      }
      if (t >= 6.7) for (const P of PB) {                          // pool B: afterglow
        const d = t - P.t0; if (d < 0) continue;
        const tq = Math.floor(t * 12 + 1e-6) / 12, x = P.x0 + P.A * Math.sin(P.w * (tq - P.t0) + P.ph), y = -40 + P.vy * d;
        if (y > H + 40) continue;
        xg.save(); xg.translate(x, y); xg.rotate(rad(P.rot + P.spin * tq)); xg.scale(P.s / 10, (P.s / 10) * (0.55 + 0.45 * Math.abs(Math.cos(tq * 3 + P.ph)))); xg.fillStyle = P.c; xg.fill(PETAL_UNIT); xg.restore();
      }
      const v = Math.abs(cRaw(t + 0.04) - cRaw(t - 0.04)) / 0.08, va = cl((v - 0.6) / 1.2) * 0.85;   // speed lines (only while the camera really moves)
      if (va > 0.02) { for (const l of speed[fr % 3]) { xg.globalAlpha = va * l[4]; poly(xg, [[l[0], l[1]], [l[0] + l[3] / 2, l[1] + l[2] / 2], [l[0], l[1] + l[2]], [l[0] - l[3] / 2, l[1] + l[2] / 2]], '#fbc4d9'); } xg.globalAlpha = 1; }
      const hv = Math.abs(xRaw(t + 0.03) - xRaw(t - 0.03)) / 0.06, ha = cl((hv - 0.8) / 4) * 0.9;
      if (ha > 0.02) { for (const l of speedH[fr % 3]) { xg.globalAlpha = ha * l[4]; poly(xg, [[l[1], l[0]], [l[1] + l[2] / 2, l[0] - l[3] / 2], [l[1] + l[2], l[0]], [l[1] + l[2] / 2, l[0] + l[3] / 2]], '#fff6f9'); } xg.globalAlpha = 1; }
      if (t > 4.5 && t < CUT) for (const Wd of WINDS) {            // wind streaks: tapered to a point at both ends
        const p = prog(t, Wd.t0, Wd.t0 + 0.75); if (p <= 0 || p >= 1) continue;
        const pq = q(p, 18), a = Math.max(0, pq * 1.35 - 0.35), b = Math.min(1, pq * 1.35), n = Wd.pts.length - 1, top = [], bot = [];
        for (let j = Math.floor(a * n); j <= Math.ceil(b * n); j++) { const u = (j / n - a) / Math.max(0.001, b - a), w = Math.sin(cl(u) * Math.PI) * Wd.w, pt = Wd.pts[Math.min(n, j)]; top.push([pt[0], pt[1] - w / 2]); bot.push([pt[0], pt[1] + w / 2]); }
        if (top.length > 2) { xg.globalAlpha = 0.9; poly(xg, top.concat(bot.reverse()), '#fff6f9'); xg.globalAlpha = 1; }
      }
      const dip = (t0, col) => {                                   // cut dips
        let d = 0;
        if (t >= t0 - 0.25 && t < t0) d = eIn2(prog(t, t0 - 0.25, t0)); else if (t >= t0 && t < t0 + 0.05) d = 1; else if (t >= t0 + 0.05) d = 1 - eOut2(prog(t, t0 + 0.05, t0 + 0.4));
        if (d > 0.005) { xg.globalAlpha = d; xg.fillStyle = col; xg.fillRect(0, 0, W, H); xg.globalAlpha = 1; }
      };
      dip(T1, C.ink); dip(CUT, C.moonGlow);
    }
    function drawAmbient(time) {
      xg.clearRect(0, 0, W, H);
      for (const P of AMB) {
        const ph = ((time + P.off) % P.per) / P.per, y = -30 + ph * (H + 60), x = P.x0 + P.A * Math.sin(P.w * time + P.ph);
        xg.save(); xg.translate(x, y); xg.rotate(rad(P.rot + P.spin * time)); xg.scale(P.s / 10, (P.s / 10) * (0.55 + 0.45 * Math.abs(Math.cos(time * 1.7 + P.ph)))); xg.globalAlpha = 0.85; xg.fillStyle = P.c; xg.fill(PETAL_UNIT); xg.restore();
      }
    }

    /* the render */
    let lastFr = -1, lastShot3 = false;
    function render(tRaw, force) {
      const t = frameT(cl(tRaw, 0, RUNTIME)), fr = Math.round(t * FPS);
      if (!force && fr === lastFr) return;
      lastFr = fr;
      const inVista = t < T1;
      if (vistaDusk) {
        vistaDusk.style.visibility = inVista ? 'visible' : 'hidden';
        if (inVista) {
          const zv = t < 1.8 ? 1 + 0.07 * eIO2(t / 1.8) : lerp(1.07, 2.9, eIn2(q(prog(t, 1.8, T1), 10)));
          vistaDusk.style.transform = `scale(${zv.toFixed(3)})`;
        }
      }
      if (mode === 'full') {
        world.style.transform = 'scale(1.04)';
        world.style.visibility = t >= CUT + 0.3 ? 'hidden' : 'visible';
        const c = cStep(t), px = xStep(t), shake = (t > 4.6 && t < 5.4) ? Math.sin(fr * 1.9) * 11 * Math.sin(Math.PI * prog(t, 4.6, 5.4)) : 0;
        const smear = 1 + 0.14 * Math.min(1, Math.abs(xRaw(t + 0.04) - xRaw(t - 0.04)) * 7);
        for (const L of LAYERS) {
          const y = -L.f * D * (1 - c), x = -px * PAN * L.gx + (L.gx >= 1 ? shake : 0);
          L.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scaleX(${L.gx >= 1 ? smear.toFixed(3) : 1})`;
        }
      }
      vistaNight.style.visibility = t >= CUT ? 'visible' : 'hidden';
      fan.c.style.visibility = t >= CUT ? 'visible' : 'hidden';
      if (t >= CUT) drawShot3(t); else if (lastShot3) fg.clearRect(0, 0, W, H);
      lastShot3 = t >= CUT;
      drawFx(t, inVista);
    }

    /* playback */
    const P = { t: 0 };
    let done = false, amb = null, ambLast = 0;
    function ambient(on) {
      if (on && !amb) { amb = (time) => { if (time - ambLast < 1 / FPS) return; ambLast = time; drawAmbient(time); }; gsap.ticker.add(amb); }
      else if (!on && amb) { gsap.ticker.remove(amb); amb = null; }
    }
    function finish() { if (done) return; done = true; if (opts.onDone) opts.onDone(); ambient(true); }
    const tl = gsap.timeline({ paused: true, onComplete: finish });
    tl.to(P, { t: RUNTIME, duration: RUNTIME, ease: 'none', onUpdate: () => render(P.t) }, 0);
    render(0, true);
    // pre-warm: step through the key moments once while the loading veil is up, so the browser uploads every layer to the GPU now
    // and the first real frames don't hitch
    if (mode === 'full') {
      const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
      for (const t of [2.3, 3.4, 4.3, 5.1, 5.3, 5.8, 6.9, 8.1, 9.6]) { render(t, true); await nextFrame(); }
      render(0, true); lastFr = -1;
    }
    return {
      play() { tl.play(); },
      pause() { tl.pause(); },
      seek(t) { ambient(false); tl.pause(); tl.time(t, false); P.t = t; render(t, true); },
      skip() { tl.pause(); tl.time(RUNTIME, true); P.t = RUNTIME; render(RUNTIME, true); finish(); },
      showFinal() { done = true; tl.pause(); P.t = RUNTIME; render(RUNTIME, true); ambient(true); },
      ambient, fit, render, RUNTIME, dims: { W, H }, isDone: () => done
    };
  }

  window.ZensationIntro = { create: createIntro };
})();
