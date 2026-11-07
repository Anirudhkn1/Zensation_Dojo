/* ZENSATION DOJO — "What we do" backdrop: a code-drawn anime dojo interior.
   One-point perspective, golden-hour light, flat cels with one hard shadow tone (html-anime-cel),
   a locked wide establishing frame with a single 100 → 106 % push-in (html-anime-camera),
   transform/opacity-only motion, index-derived values only — no Math.random (hyperframes-animation rules). */
(function () {
  'use strict';
  const host = document.getElementById('dojoWorld');
  const sec = document.getElementById('what');
  if (!host || !sec) return;

  /* ───────── projection ───────── */
  const F = 1300, CX = 960, CY = 470;            // focal length, vanishing point
  const YC = -2.2, YF = 1.5, WX = 4;             // ceiling, floor, half-width (world units)
  const ZB = 10, ZN = 5.3;                       // back wall, near clip
  const P = (X, Y, Z) => [CX + X * F / Z, CY + Y * F / Z];
  const f1 = (n) => n.toFixed(1);
  const pts = (a) => a.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' ');
  const poly = (a, at) => '<polygon points="' + pts(a) + '" ' + (at || '') + '/>';
  const line = (a, b, at) => '<line x1="' + f1(a[0]) + '" y1="' + f1(a[1]) + '" x2="' + f1(b[0]) + '" y2="' + f1(b[1]) + '" ' + (at || '') + '/>';
  const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  /* wall plane: side −1 = left, +1 = right */
  const W = (s, Y, Z) => P(s * WX, Y, Z);
  const wq = (s, Y0, Y1, Za, Zb) => [W(s, Y0, Za), W(s, Y0, Zb), W(s, Y1, Zb), W(s, Y1, Za)];
  const wgrid = (s, Y0, Y1, Za, Zb, cols, rows, at) => {
    let o = '';
    for (let i = 1; i < cols; i++) { const Z = Za + (Zb - Za) * i / cols; o += line(W(s, Y0, Z), W(s, Y1, Z), at); }
    for (let j = 1; j < rows; j++) { const Y = Y0 + (Y1 - Y0) * j / rows; o += line(W(s, Y, Za), W(s, Y, Zb), at); }
    return o;
  };
  /* sun: a ray leaves the left window and lands on the floor — gives the lattice-shadow patches */
  const landT = (Y) => YF - Y;
  const land = (Z, Y) => { const t = landT(Y); return P(-WX + 2.3 * t, YF, Z + 0.7 * t); };
  const hull = (ps) => {                          // monotone-chain convex hull
    const p = ps.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    p.forEach((q) => { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    p.slice().reverse().forEach((q) => { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); });
    lo.pop(); up.pop(); return lo.concat(up);
  };

  const ZS = [10, 9.1, 8.2, 7.3, 6.4, 5.3];       // pillar depths
  const WIN = [-0.3, 0.9], CLE = [-1.75, -0.75];  // window / clerestory heights

  /* ───────── defs ───────── */
  const lg = (id, x1, y1, x2, y2, stops, units) =>
    '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (units ? ' gradientUnits="userSpaceOnUse"' : '') + '>' +
    stops.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>').join('') + '</linearGradient>';
  const rg = (id, stops) =>
    '<radialGradient id="' + id + '">' + stops.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '" stop-opacity="' + s[2] + '"/>').join('') + '</radialGradient>';

  const defs = '<defs>' +
    lg('gCeil', 0, 0, 0, 1, [[0, '#2a1228'], [1, '#9a4a38']]) +
    lg('gBack', 0, 0, 0, 1, [[0, '#7a3848'], [1, '#4a2430']]) +
    lg('gFloor', 0, 665, 0, 1080, [[0, '#86404c'], [0.3, '#d6804a'], [1, '#f4b46a']], 1) +
    lg('gWallL', 0, 0, 440, 0, [[0, '#4a2230'], [1, '#8e4c3c']], 1) +
    lg('gWallR', 1480, 0, 1920, 0, [[0, '#7e3e5c'], [1, '#3c1c32']], 1) +
    lg('gGlowL', 0, 0, 0, 1, [[0, '#fff3c4'], [0.5, '#ffcf72'], [1, '#ff9b48']]) +
    lg('gGlowR', 0, 0, 0, 1, [[0, '#ffe9f0'], [0.55, '#e9b4cf'], [1, '#b98bbb']]) +
    lg('gCleL', 0, 0, 0, 1, [[0, '#f6c778'], [1, '#d4824a']]) +
    lg('gCleR', 0, 0, 0, 1, [[0, '#edc4d8'], [1, '#a77db0']]) +
    lg('gDoor', 0, 0, 0, 1, [[0, '#fff0b8'], [0.55, '#ffc062'], [1, '#ff8f3f']]) +
    lg('gSky', 0, 0, 0, 1, [[0, '#fde0ea'], [1, '#eeb2d0']]) +
    lg('gWood', 0, 0, 0, 1, [[0, '#7a3f2a'], [1, '#3a1a18']]) +
    lg('gBeam', 0, 0, 1, 1, [[0, '#ffe2a0', 0.28], [1, '#ffb25a', 0.04]]) +
    lg('gRefl', 0, 0, 0, 1, [[0, '#ffc870', 0.5], [1, '#ffc870', 0]]) +
    rg('gLamp', [[0, '#fff0b0', 0.95], [0.25, '#ffb445', 0.55], [1, '#ff7a2a', 0]]) +
    rg('gHot', [[0, '#fff6d0', 0.9], [1, '#ffc05a', 0]]) +
    '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>' +
    '<filter id="soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>' +
    '</defs>';

  /* ───────── back wall (z = 10) ───────── */
  const B = (X, Y) => P(X, Y, ZB);
  let back = '<g class="back">';
  back += '<rect x="300" y="110" width="1320" height="620" fill="url(#gBack)"/>';
  // wainscot
  back += poly([B(-WX, 1.0), B(WX, 1.0), B(WX, YF), B(-WX, YF)], 'fill="#4c2424"');
  back += line(B(-WX, 1.0), B(WX, 1.0), 'stroke="#8a4a2e" stroke-width="2.5" opacity=".7"');
  for (let i = -3; i <= 3; i++) back += poly([B(i + .08, 1.1), B(i + .92, 1.1), B(i + .92, 1.42), B(i + .08, 1.42)], 'fill="none" stroke="#1d0d12" stroke-width="2" opacity=".55"');
  // wing shoji (dimmer)
  [-1, 1].forEach((s) => {
    const x0 = s * 1.75, x1 = s * 3.65, q = [B(x0, -0.6), B(x1, -0.6), B(x1, 0.75), B(x0, 0.75)];
    back += poly(q, 'fill="url(#gCleL)" opacity=".9"');
    for (let i = 1; i < 4; i++) { const X = x0 + (x1 - x0) * i / 4; back += line(B(X, -0.6), B(X, 0.75), 'stroke="#5a2c1e" stroke-width="2"'); }
    for (let j = 1; j < 5; j++) { const Y = -0.6 + 1.35 * j / 5; back += line(B(x0, Y), B(x1, Y), 'stroke="#5a2c1e" stroke-width="2"'); }
    back += poly(q, 'fill="none" stroke="#2a120f" stroke-width="6"');
  });
  // centre double doors — the brightest shape in frame
  const dq = [B(-1.3, -0.7), B(1.3, -0.7), B(1.3, 1.0), B(-1.3, 1.0)];
  back += poly(dq, 'fill="url(#gDoor)"');
  for (let i = 1; i < 8; i++) { const X = -1.3 + 2.6 * i / 8; back += line(B(X, -0.7), B(X, 1.0), 'stroke="#6b3a22" stroke-width="' + (i === 4 ? 5 : 2.2) + '"'); }
  for (let j = 1; j < 7; j++) { const Y = -0.7 + 1.7 * j / 7; back += line(B(-1.3, Y), B(1.3, Y), 'stroke="#6b3a22" stroke-width="2.2"'); }
  back += poly(dq, 'fill="none" stroke="#2a120f" stroke-width="8"');
  back += '<ellipse cx="960" cy="470" rx="200" ry="120" fill="url(#gHot)" style="mix-blend-mode:screen"/>';
  // posts either side of the doors
  [-1.45, 1.45].forEach((X) => { back += poly([B(X - .09, YC), B(X + .09, -2.2), B(X + .09, YF), B(X - .09, YF)], 'fill="#2a1214"'); });
  back += poly([B(-WX, -0.78), B(WX, -0.78), B(WX, -0.66), B(-WX, -0.66)], 'fill="#26110f"');
  // plaque 道場
  const pq = [B(-0.95, -1.5), B(0.95, -1.5), B(0.95, -0.9), B(-0.95, -0.9)];
  back += poly([B(-1.02, -1.56), B(1.02, -1.56), B(1.02, -0.84), B(-1.02, -0.84)], 'fill="#2a1210"');
  back += poly(pq, 'fill="#f1e1bc"');
  back += poly(pq, 'fill="none" stroke="#c9a24a" stroke-width="2.5"');
  const pc = B(0, -1.2);
  back += '<text x="' + f1(pc[0]) + '" y="' + f1(pc[1] + 21) + '" text-anchor="middle" font-size="64" font-weight="800" fill="#1b0f0c" font-family="\'Shippori Mincho\',\'Yu Mincho\',serif" letter-spacing="10">道場</text>';
  // hanging scrolls 心 / 技
  [[-3.05, '心'], [3.05, '技']].forEach((c) => {
    const x0 = c[0] - .28, x1 = c[0] + .28, q = [B(x0, -1.25), B(x1, -1.25), B(x1, 0.45), B(x0, 0.45)];
    back += poly([B(x0 - .06, -1.3), B(x1 + .06, -1.3), B(x1 + .06, 0.5), B(x0 - .06, 0.5)], 'fill="#6a2a2c"');
    back += poly(q, 'fill="#ecd9b0"');
    const tc = B(c[0], -0.45);
    back += '<text x="' + f1(tc[0]) + '" y="' + f1(tc[1]) + '" text-anchor="middle" font-size="58" font-weight="800" fill="#2a1410" font-family="\'Shippori Mincho\',serif">' + c[1] + '</text>';
  });
  // bokken racks
  [-2.25, 2.25].forEach((cx, k) => {
    const a = B(cx - .45, 0.1), b = B(cx + .45, 0.1), c = B(cx - .45, 0.55), d = B(cx + .45, 0.55);
    for (let i = 0; i < 4; i++) {
      const bx = a[0] + (b[0] - a[0]) * (0.15 + i * 0.23), tilt = (i - 1.5) * 4 + (k ? -3 : 3);
      back += line([bx, c[1] + 6], [bx + tilt, a[1] - 62], 'stroke="#2a1410" stroke-width="7" stroke-linecap="round" opacity=".6"');
      back += line([bx, c[1] + 6], [bx + tilt, a[1] - 62], 'stroke="#d29a5e" stroke-width="3.6" stroke-linecap="round"');
    }
    back += line(a, b, 'stroke="#2a1410" stroke-width="7"') + line(c, d, 'stroke="#2a1410" stroke-width="7"');
  });
  back += '</g>';

  /* ───────── ceiling ───────── */
  let ceil = '<g class="ceil">' + poly([[0, 0], [1920, 0], P(WX, YC, ZB), P(-WX, YC, ZB)], 'fill="url(#gCeil)"');
  for (let i = -4; i <= 4; i++) ceil += line(P(i, YC, ZB), P(i * 3.2, YC, 3.2), 'stroke="#12060f" stroke-width="3" opacity=".5"');
  [9.5, 8.3, 7.1, 5.9].forEach((Z) => {
    const a = P(-WX, YC, Z), b = P(WX, YC, Z), c = P(WX, YC + 0.26, Z), d = P(-WX, YC + 0.26, Z);
    ceil += poly([a, b, c, d], 'fill="#2a1216"');
    ceil += line(d, c, 'stroke="#9a5a36" stroke-width="3" opacity=".75"');
  });
  ceil += '</g>';

  /* ───────── floor ───────── */
  let floor = '<g class="floor">' + poly([[440, 665], [1480, 665], P(WX, YF, ZN), [1940, 1080], [-20, 1080], P(-WX, YF, ZN)], 'fill="url(#gFloor)"');
  for (let i = -5; i <= 5; i++) {                   // planks converge on the vanishing point
    const X = i * 0.8;
    floor += line(P(X, YF, ZB), P(X, YF, 3.4), 'stroke="#2a0f18" stroke-width="2.5" opacity=".42"');
    for (let k = 0; k < 7; k++) {                   // staggered board ends
      const Z = 9.4 - ((k * 1.27 + (i & 1) * 0.63 + 3) % 5.6) * 0.95;
      if (Z < 3.6) continue;
      floor += line(P(X, YF, Z), P(X + 0.8, YF, Z), 'stroke="#2a0f18" stroke-width="2" opacity=".32"');
    }
  }
  // raised tatami stage under the back doors
  const T = [P(-2.1, YF, 9.8), P(2.1, YF, 9.8), P(2.1, YF, 6.6), P(-2.1, YF, 6.6)];
  floor += poly(T, 'fill="#cf9f62"') + poly(T, 'fill="none" stroke="#2a1a22" stroke-width="5"');
  [-0.7, 0.7].forEach((X) => { floor += line(P(X, YF, 9.8), P(X, YF, 6.6), 'stroke="#2a1a22" stroke-width="3" opacity=".8"'); });
  floor += line(P(-2.1, YF, 8.2), P(2.1, YF, 8.2), 'stroke="#2a1a22" stroke-width="3" opacity=".8"');
  floor += poly([P(-2.1, YF, 9.8), P(2.1, YF, 9.8), P(2.1, YF, 9.6), P(-2.1, YF, 9.6)], 'fill="#6a3a2a" opacity=".5"');
  // reflection of the doors on the polished boards
  floor += '<polygon points="' + pts([[800, 668], [1120, 668], [1330, 900], [590, 900]]) + '" fill="url(#gRefl)" style="mix-blend-mode:screen"/>';
  floor += '</g>';

  /* ───────── side walls ───────── */
  let walls = '<g class="walls">';
  [-1, 1].forEach((s) => {
    const L = s < 0;
    walls += poly(wq(s, YC, YF, ZB, ZN), 'fill="url(#' + (L ? 'gWallL' : 'gWallR') + ')"');
    for (let b = 0; b < ZS.length - 1; b++) {
      const Za = ZS[b], Zb = ZS[b + 1];
      // wainscot
      walls += poly(wq(s, 0.9, YF, Za, Zb), 'fill="#4c2424"');
      walls += poly(wq(s, 1.0, 1.42, Za - .12, Zb + .12), 'fill="none" stroke="#1b0b10" stroke-width="2" opacity=".6"');
      const door = !L && (b === 2 || b === 3);
      if (door) continue;                            // the open doorway is drawn below
      const wa = Za - .12, wb = Zb + .12;
      // window
      walls += poly(wq(s, WIN[0], WIN[1], wa, wb), 'fill="url(#' + (L ? 'gGlowL' : 'gGlowR') + ')"');
      walls += wgrid(s, WIN[0], WIN[1], wa, wb, 3, 4, 'stroke="#6b3a22" stroke-width="2.2" opacity=".85"');
      walls += poly(wq(s, WIN[0], WIN[1], wa, wb), 'fill="none" stroke="#2a120f" stroke-width="5"');
      // clerestory
      walls += poly(wq(s, CLE[0], CLE[1], wa, wb), 'fill="url(#' + (L ? 'gCleL' : 'gCleR') + ')"');
      walls += wgrid(s, CLE[0], CLE[1], wa, wb, 3, 2, 'stroke="#5a2c1e" stroke-width="2" opacity=".85"');
      walls += poly(wq(s, CLE[0], CLE[1], wa, wb), 'fill="none" stroke="#2a120f" stroke-width="4"');
    }
    // rails and pillars
    [[-0.3, .08], [-0.75, .06], [0.9, .08]].forEach((r) => { walls += poly(wq(s, r[0] - r[1], r[0] + r[1], ZB, ZN), 'fill="#2a1214"'); });
    ZS.forEach((Z, i) => {
      const a = Z + .09, b = Math.max(Z - .09, 5.2);
      walls += poly(wq(s, YC, YF, Math.min(a, ZB), b), 'fill="#3a1a1c"');
      if (i < ZS.length - 1) walls += line(W(s, YC, b), W(s, YF, b), 'stroke="#a8643a" stroke-width="2.5" opacity="' + (L ? '.8' : '.35') + '"');
    });
  });
  // sakura doorway on the right wall (bays 2–3)
  const dz = [8.2, 6.4], DQ = wq(1, -0.8, YF, dz[0], dz[1]);
  walls += '<clipPath id="doorClip"><polygon points="' + pts(DQ) + '"/></clipPath>';
  walls += '<g clip-path="url(#doorClip)">' +
    '<rect x="1560" y="280" width="260" height="520" fill="url(#gSky)"/>' +
    '<polygon points="1560,640 1620,590 1690,625 1760,580 1820,620 1820,800 1560,800" fill="#b78fc0" opacity=".8"/>' +
    '<rect x="1560" y="690" width="260" height="120" fill="#33503f"/>' +
    '<polygon points="1560,720 1640,700 1720,716 1820,700 1820,810 1560,810" fill="#26402f"/>' +
    '<path d="M1675 700 C1672 640 1684 590 1700 540 L1708 540 C1698 590 1692 640 1696 700Z" fill="#2c1a1e"/>';
  for (let i = 0; i < 40; i++) {
    const an = rnd(i, 21) * 6.283, rr = Math.sqrt(rnd(i, 22)), cx = 1690 + Math.cos(an) * rr * 68, cy = 478 + Math.sin(an) * rr * 52, r = 10 + rnd(i, 23) * 13;
    walls += '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '" fill="' + ['#f48fb2', '#f7a6c4', '#ee7fa6', '#f9b6cf'][i % 4] + '"/>';
    if (i % 3 === 0) walls += '<circle cx="' + f1(cx - r * .3) + '" cy="' + f1(cy - r * .32) + '" r="' + f1(r * .42) + '" fill="#ffe0ea" opacity=".9"/>';
  }
  walls += '<rect x="1640" y="665" width="22" height="30" fill="#6e5d6a"/><polygon points="1632,665 1670,665 1651,645" fill="#5a4a58"/>' +
    '</g>';
  walls += poly(DQ, 'fill="none" stroke="#2a120f" stroke-width="6"');
  walls += poly(wq(1, -0.95, -0.7, dz[0] + .1, dz[1] - .1), 'fill="#26110f"');       // lintel
  walls += '</g>';

  /* ───────── light: sun patches on the floor + volumetric beams ───────── */
  let sun = '<g class="sunset">', beams = '<g class="beams" style="mix-blend-mode:screen">';
  for (let b = 0; b < ZS.length - 1; b++) {
    const wa = ZS[b] - .12, wb = ZS[b + 1] + .12;
    const p = [land(wa, WIN[0]), land(wb, WIN[0]), land(wb, WIN[1]), land(wa, WIN[1])];
    const win = wq(-1, WIN[0], WIN[1], wa, wb);
    let g = '<g class="sun" style="transition-delay:' + (b * 0.22).toFixed(2) + 's">';
    g += poly(p, 'fill="#fff0b4" opacity=".78"');
    g += '<g filter="url(#soft)">' + poly(p, 'fill="#ffc85c" opacity=".6" style="mix-blend-mode:screen"') + '</g>';
    for (let i = 1; i < 3; i++) { const Z = wa + (wb - wa) * i / 3; g += line(land(Z, WIN[0]), land(Z, WIN[1]), 'stroke="#c2582a" stroke-width="7" opacity=".38"'); }
    for (let j = 1; j < 4; j++) { const Y = WIN[0] + (WIN[1] - WIN[0]) * j / 4; g += line(land(wa, Y), land(wb, Y), 'stroke="#c2582a" stroke-width="6" opacity=".38"'); }
    g += '</g>';
    sun += g;
    beams += '<polygon class="beam" style="animation-delay:' + (-b * 1.7).toFixed(1) + 's" points="' + pts(hull(win.concat(p))) + '" fill="url(#gBeam)"/>';
  }
  sun += '</g>'; beams += '</g>';
  // pink spill from the garden door
  const spill = '<polygon points="' + pts([P(WX, YF, 8.2), P(WX, YF, 6.4), P(1.4, YF, 5.8), P(1.4, YF, 7.6)]) + '" fill="#ff9fc2" opacity=".32" style="mix-blend-mode:screen"/>';

  /* ───────── mid-ground: bench + tea, lanterns ───────── */
  let mid = '<g class="mid">';
  const bz = 9.3, bt = P(-1.05, 1.1, bz), bt2 = P(1.05, 1.1, bz), bf = P(-1.05, YF, bz), bf2 = P(1.05, YF, bz);
  mid += '<ellipse cx="960" cy="' + f1(bf[1] + 4) + '" rx="' + f1((bt2[0] - bt[0]) / 2 + 22) + '" ry="9" fill="#1a0810" opacity=".55"/>';
  mid += '<rect x="' + f1(bf[0] + 4) + '" y="' + f1(bt[1]) + '" width="9" height="' + f1(bf[1] - bt[1]) + '" fill="#2a1214"/>';
  mid += '<rect x="' + f1(bf2[0] - 13) + '" y="' + f1(bt[1]) + '" width="9" height="' + f1(bf[1] - bt[1]) + '" fill="#2a1214"/>';
  mid += '<rect x="' + f1(bt[0]) + '" y="' + f1(bt[1]) + '" width="' + f1(bt2[0] - bt[0]) + '" height="12" fill="#6a3a24"/>';
  mid += '<rect x="' + f1(bt[0]) + '" y="' + f1(bt[1]) + '" width="' + f1(bt2[0] - bt[0]) + '" height="3.5" fill="#e0a45e"/>';
  const ty = bt[1];
  mid += '<ellipse cx="946" cy="' + f1(ty - 9) + '" rx="15" ry="10" fill="#26161c"/><rect x="940" y="' + f1(ty - 22) + '" width="12" height="5" rx="2" fill="#26161c"/>' +
    '<path d="M960 ' + f1(ty - 12) + ' L976 ' + f1(ty - 20) + '" stroke="#26161c" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M931 ' + f1(ty - 12) + ' q-12 2 -3 12" fill="none" stroke="#26161c" stroke-width="3"/>' +
    '<ellipse cx="1004" cy="' + f1(ty - 5) + '" rx="8" ry="5" fill="#d8c08a"/><ellipse cx="1026" cy="' + f1(ty - 5) + '" rx="8" ry="5" fill="#d8c08a"/>' +
    '<ellipse cx="946" cy="' + f1(ty - 15) + '" rx="9" ry="3" fill="#7a5a62" opacity=".7"/>';
  [-1.3, 1.3].forEach((X, i) => {
    const p = P(X, -1.15, 8.8), top = P(X, YC, 8.8), r = 34, ry = 44;
    mid += '<g class="lantern" style="transform-origin:' + f1(top[0]) + 'px ' + f1(top[1]) + 'px;animation-delay:' + (-i * 2.3) + 's">' +
      line(top, [p[0], p[1] - ry - 8], 'stroke="#1a0810" stroke-width="3"') +
      '<circle class="lamp" style="animation-delay:' + (-i * 1.1) + 's" cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="150" fill="url(#gLamp)"/>' +
      '<rect x="' + f1(p[0] - 17) + '" y="' + f1(p[1] - ry - 8) + '" width="34" height="9" fill="#1a0c10"/>' +
      '<ellipse cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" rx="' + r + '" ry="' + ry + '" fill="#ffae3d"/>' +
      '<ellipse cx="' + f1(p[0] - 9) + '" cy="' + f1(p[1] - 6) + '" rx="' + (r * .55) + '" ry="' + (ry * .72) + '" fill="#ffe08a"/>' +
      [-.62, 0, .62].map((k) => '<ellipse cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" rx="' + f1(r * Math.abs(k)) + '" ry="' + ry + '" fill="none" stroke="#b5521c" stroke-width="2.4" opacity="' + (k === 0 ? 0 : .9) + '"/>').join('') +
      '<ellipse cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" rx="' + r + '" ry="' + ry + '" fill="none" stroke="#7a2a12" stroke-width="2.6"/>' +
      '<rect x="' + f1(p[0] - 17) + '" y="' + f1(p[1] + ry - 1) + '" width="34" height="8" fill="#1a0c10"/>' +
      '<rect x="' + f1(p[0] - 2) + '" y="' + f1(p[1] + ry + 7) + '" width="4" height="22" fill="#c8202c"/>' +
      '</g>';
  });
  mid += '</g>';

  /* ───────── atmosphere: dust in the beams, petals on the wind ───────── */
  let dust = '<g class="dust">';
  for (let i = 0; i < 34; i++) {
    const x = 260 + rnd(i, 1) * 1100, y = 360 + rnd(i, 2) * 560, r = 1.4 + rnd(i, 3) * 2.6;
    dust += '<circle class="mote" cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="#fff0c0" style="--dx:' + f1((rnd(i, 4) - .3) * 90) + 'px;--dy:' + f1(-70 - rnd(i, 5) * 140) + 'px;animation-duration:' + f1(9 + rnd(i, 6) * 9) + 's;animation-delay:-' + f1(rnd(i, 7) * 14) + 's"/>';
  }
  dust += '</g>';
  let petals = '<g class="petals">';
  for (let i = 0; i < 16; i++) {
    const x = 380 + rnd(i, 11) * 1260, sz = 7 + rnd(i, 12) * 8, near = i % 5 === 0;
    petals += '<g class="petal' + (near ? ' petal--near' : '') + '" style="--sx:' + f1(x) + 'px;--dx:' + f1(-260 + rnd(i, 13) * 120) + 'px;--r:' + f1(300 + rnd(i, 14) * 420) + 'deg;animation-duration:' + f1(15 + rnd(i, 15) * 12) + 's;animation-delay:-' + f1(rnd(i, 16) * 26) + 's">' +
      '<path d="M0 0 C' + f1(sz * .9) + ' ' + f1(-sz * .5) + ' ' + f1(sz * 1.5) + ' ' + f1(sz * .5) + ' 0 ' + f1(sz * 1.5) + ' C' + f1(-sz * .45) + ' ' + f1(sz * .7) + ' ' + f1(-sz * .2) + ' ' + f1(sz * .1) + ' 0 0Z" fill="' + (i % 3 ? '#f9b4cc' : '#ffd6e4') + '"/></g>';
  }
  petals += '</g>';

  host.innerHTML = '<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" focusable="false">' +
    defs + back + ceil + floor + walls + sun + spill + mid + beams + dust + petals + '</svg>';

  /* ───────── camera + lifecycle ───────── */
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;
  const vh = () => window.innerHeight || 800;
  function frame() {
    ticking = false;
    const r = sec.getBoundingClientRect(), h = vh();
    const p = Math.min(1, Math.max(0, (h - r.top) / (r.height + h)));
    host.style.transform = 'scale(' + (1 + 0.06 * p).toFixed(4) + ')';     // the only zoom: 100 → 106 %
  }
  if (!reduce) {
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => sec.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '80px 0px' }).observe(sec);
    new IntersectionObserver((es, io) => es.forEach((e) => { if (e.isIntersecting) { sec.classList.add('is-lit'); io.disconnect(); } }), { threshold: 0.18 }).observe(sec);
  } else { sec.classList.add('is-live', 'is-lit'); }
})();
