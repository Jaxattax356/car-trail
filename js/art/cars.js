/* The Car Trail - procedural pixel cars (side view facing left = heading west,
 * plus top-down views for the Columbia Gorge mini-game). Geometry is defined in
 * design units and rasterized at any scale with 1px outlines, so cars look
 * equally crisp in the travel strip and on the big title screen.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const { Bitmap, Mask, dith } = CT.gfx;
  const P = CT.art.P;

  const OUT = '#141018';

  const DESIGNS = {
    wagon: {
      len: 48,
      body: [[1, 16.5], [0.3, 13.2], [0.8, 10.6], [3, 9.6], [13.5, 8.6], [17.2, 4.2], [19, 3.6], [44.6, 3.6], [46.3, 4.6], [47.4, 9], [47.7, 13.2], [47.2, 16.5]],
      glass: [[14.4, 8.4], [17.8, 4.8], [44, 4.8], [45.3, 8.4]],
      pillars: [24.5, 32.5, 40],
      belt: 8.5,
      wheels: [[10, 16, 3.9], [38, 16, 3.9]],
      col: { body: '#e8d8a0', dark: '#b09c64', light: '#fff4c8', deep: '#80703c' },
      wood: [15.4, 46.4, 10.2, 14.2],
      doors: [24.5, 32.5],
      handles: [[21.2, 9.9], [29.6, 9.9]],
      head: [0.6, 10.9, 2.4, 12.3],
      tail: [46.5, 9.2, 47.6, 12.6],
      bumpers: [[0, 13.4, 4.2, 14.6], [43.8, 13.6, 48, 14.8]],
      roof: 'luggage',
    },
    hatch: {
      len: 42,
      body: [[1, 16.5], [0.3, 13.2], [0.8, 11], [3, 10.2], [11.5, 9.2], [16.5, 4.6], [18.5, 4.1], [31.5, 4.3], [33.5, 5], [38.8, 8.6], [40.8, 10], [41.4, 13.2], [40.8, 16.5]],
      glass: [[12.4, 9], [16.9, 5.1], [31.2, 5.1], [36.2, 8.8]],
      pillars: [24.5, 31.4],
      belt: 9.0,
      wheels: [[9.2, 16, 3.7], [33.2, 16, 3.7]],
      col: { body: '#20a0b8', dark: '#0c6a80', light: '#70d4e8', deep: '#084858' },
      doors: [24.5],
      handles: [[21.4, 10.4], [29.5, 10.4]],
      head: [0.6, 11.2, 2.6, 12.4],
      tail: [40.2, 10.3, 41.2, 12.6],
      bumpers: [[0, 13.4, 3.8, 14.6], [38.4, 13.6, 42, 14.8]],
      stripe: 12.6,
      roof: 'kayak',
    },
    minivan: {
      len: 48,
      body: [[1, 16.5], [0.3, 13], [0.8, 10.8], [2.6, 10], [9.5, 8.9], [15.4, 2.6], [17.5, 2.1], [44.8, 2.1], [46.6, 3.2], [47.5, 8], [47.7, 13.2], [47.2, 16.5]],
      glass: [[10.4, 8.6], [15.8, 3.1], [44.3, 3.1], [45.4, 8.6]],
      pillars: [20.5, 31.5, 40.5],
      belt: 8.7,
      wheels: [[10.2, 16, 3.9], [37.8, 16, 3.9]],
      col: { body: '#9c2438', dark: '#641424', light: '#d45c6c', deep: '#3c0814' },
      doors: [20.5, 31.5],
      handles: [[18, 10.2], [29.4, 10.2]],
      head: [0.6, 10.9, 2.4, 12.2],
      tail: [46.5, 8.6, 47.6, 12.2],
      bumpers: [[0, 13.3, 4, 14.6], [44, 13.5, 48, 14.8]],
      track: [21, 31.5, 9.4],
      roof: 'box',
    },
    suv: {
      len: 48,
      body: [[1, 15.2], [0.4, 11.6], [0.8, 8.9], [2.4, 8.3], [12.8, 7.9], [16.2, 2.8], [17.8, 2.3], [45.2, 2.3], [46.6, 3], [47.4, 7], [47.7, 12.6], [47.2, 15.2]],
      glass: [[13.6, 7.7], [16.6, 3.3], [44.6, 3.3], [45.9, 7.7]],
      pillars: [23, 32, 40.5],
      belt: 7.9,
      wheels: [[10, 15.6, 4.3], [38, 15.6, 4.3]],
      col: { body: '#2e7040', dark: '#1a4a28', light: '#5ca66c', deep: '#0c2c14' },
      doors: [23, 32],
      handles: [[20.4, 9.3], [29.4, 9.3]],
      head: [0.6, 9.4, 2.4, 10.8],
      tail: [46.6, 7.6, 47.6, 11],
      bumpers: [[0, 11.8, 3.6, 13.4], [44.4, 12, 48, 13.6]],
      flares: true,
      spare: [48.2, 9.2, 3.1],
      roof: 'basket',
    },
    // ---------------- real-world models (low sedans / coupes / a wagon) ----------------
    // Details: [x0, y0, x1, y1, colour] rectangles in design units (grilles, vents, exhausts...).
    q50: {
      trim: '#dde1e8', arch: 0.6,
      len: 48,
      body: [[1, 16.3], [0.4, 14.2], [0.5, 12.4], [1.8, 11.3], [8, 10.7], [13.5, 10.1], [16.2, 9.7], [20.4, 6.3], [23.4, 5.3], [30.6, 5.2], [34.2, 5.9], [39.2, 9.1], [46.4, 9.5], [47.6, 10.4], [47.7, 14.2], [47.1, 16.3]],
      glass: [[17.2, 9.6], [20.9, 6.6], [23.5, 5.9], [30.6, 5.8], [33.7, 6.5], [37.6, 9.3]],
      pillars: [27],
      belt: 9.6,
      wheels: [[9.6, 15.8, 4.1], [38.6, 15.8, 4.1]],
      col: { body: '#e6e8ec', dark: '#aeb2ba', light: '#ffffff', deep: '#6c7078' },
      doors: [27],
      handles: [[23.8, 10.8], [32.2, 10.8]],
      head: [0.7, 11.7, 4.2, 12.4],
      tail: [44.6, 9.9, 47.5, 11],
      bumpers: [],
      details: [[0.2, 12.9, 1.4, 14.4, '#2a2a30'], [0.2, 13.4, 1.4, 13.8, '#9aa0a8'], [44.5, 15.2, 46.8, 15.9, '#2a2a30'], [42.4, 15.3, 44, 15.8, '#c0c4cc']],
      rim: { color: '#c4c8d0', spokes: 5, caliper: '#34343c' },
      sideLine: 11.9,
    },
    g37: {
      trim: '#dde1e8', arch: 0.6,
      len: 47,
      body: [[1, 16.3], [0.4, 14.2], [0.5, 12.4], [1.8, 11.4], [9, 10.8], [14, 10.2], [17, 9.7], [21.6, 6.2], [24.8, 5.3], [30.4, 5.4], [33.8, 6.5], [39.4, 9.3], [45.6, 9.7], [46.6, 10.6], [46.7, 14.2], [46.1, 16.3]],
      glass: [[18, 9.6], [22.2, 6.5], [24.9, 5.9], [30.3, 6], [33, 6.9], [36.6, 9.4]],
      pillars: [31.4],
      belt: 9.6,
      wheels: [[9.4, 15.8, 4.1], [37.8, 15.8, 4.1]],
      col: { body: '#26262e', dark: '#141418', light: '#6c7080', deep: '#0a0a0e' },
      doors: [30.2],
      handles: [[27, 10.8]],
      head: [0.7, 11.8, 4.4, 12.5],
      tail: [44, 10, 46.5, 11.1],
      bumpers: [],
      details: [[0.2, 13, 1.3, 14.4, '#101014'], [43.5, 15.2, 45, 15.9, '#c0c4cc'], [45.2, 15.2, 46.2, 15.9, '#c0c4cc']],
      rim: { color: '#b8bcc4', spokes: 6, caliper: '#34343c' },
      sideLine: 12,
    },
    m3: {
      trim: '#101014', blackPillars: true, arch: 0.5,
      len: 48,
      body: [[1, 16.3], [0.3, 13.9], [0.4, 11.9], [1.6, 11], [8, 10.5], [13.8, 10], [17.2, 9.6], [21.2, 6.2], [24, 5.3], [32, 5.3], [35.4, 6.3], [39.6, 9.1], [46.4, 9.4], [47.6, 10.3], [47.7, 14.2], [47.1, 16.3]],
      glass: [[18.1, 9.5], [21.7, 6.5], [24.1, 5.9], [32, 5.9], [34.8, 6.6], [36.1, 7.6], [36.3, 8.6], [37.9, 9.3]],
      pillars: [28.6],
      belt: 9.5,
      wheels: [[9.4, 15.8, 4.2], [38.4, 15.8, 4.2]],
      col: { body: '#2c6fd0', dark: '#1a4a94', light: '#78aaf0', deep: '#0e2c60' },
      doors: [28.6],
      handles: [[25.4, 10.7], [33.6, 10.7]],
      head: [0.5, 11.4, 3.6, 12.3],
      tail: [44.8, 9.8, 47.5, 10.9],
      bumpers: [],
      details: [[0.1, 12.4, 1.1, 13.4, '#141418'], [14.4, 11.3, 16.4, 12, '#141418'], [14.6, 11.5, 16.2, 11.8, '#c0c4cc'], [41.8, 15.2, 43.2, 15.9, '#c8ccd4'], [43.6, 15.2, 45, 15.9, '#c8ccd4'], [45.4, 15.1, 47.4, 16.1, '#1c1c22'], [44.2, 9.1, 47, 9.5, '#1a4a94']],
      rim: { color: '#3a3c44', spokes: 5, caliper: '#2050c8', dark: true },
      sideLine: 12.2,
    },
    m5: {
      trim: '#101014', blackPillars: true, arch: 0.5,
      len: 50,
      body: [[1, 16.3], [0.3, 13.9], [0.4, 11.8], [1.6, 10.8], [9, 10.3], [14.6, 9.8], [18.2, 9.4], [22.4, 6], [25.2, 5.1], [34.2, 5.1], [37.6, 6.1], [42, 8.9], [48.4, 9.2], [49.6, 10.1], [49.7, 14.2], [49.1, 16.3]],
      glass: [[19.1, 9.3], [22.9, 6.3], [25.3, 5.7], [34.2, 5.7], [37, 6.4], [38.4, 7.4], [38.6, 8.4], [40.3, 9.1]],
      pillars: [30],
      belt: 9.3,
      wheels: [[10, 15.8, 4.3], [40.6, 15.8, 4.3]],
      col: { body: '#6c7078', dark: '#484c54', light: '#a4a8b0', deep: '#2c2e34' },
      doors: [30],
      handles: [[26.8, 10.5], [35.8, 10.5]],
      head: [0.5, 11.3, 3.8, 12.1],
      tail: [46.6, 9.6, 49.5, 10.7],
      bumpers: [],
      details: [[0.1, 12.2, 1.1, 13.4, '#141418'], [15.2, 11.1, 17.2, 11.8, '#141418'], [15.4, 11.3, 17, 11.6, '#c0c4cc'], [43.6, 15.2, 45, 15.9, '#c8ccd4'], [45.4, 15.2, 46.8, 15.9, '#c8ccd4'], [47.2, 15.1, 49.4, 16.1, '#1c1c22']],
      rim: { color: '#2a2c32', spokes: 5, caliper: '#2050c8', dark: true },
      sideLine: 12,
    },
    s4: {
      trim: '#c8ccd4', blackPillars: true, arch: 0.6,
      len: 47,
      body: [[1, 16.3], [0.4, 14.1], [0.4, 12.1], [1.8, 11], [8, 10.6], [12.8, 10.1], [16, 9.6], [20.4, 6.1], [23.5, 5.2], [31.4, 5.3], [34.8, 6.2], [38.8, 9.2], [45.4, 9.5], [46.6, 10.4], [46.7, 14.2], [46.1, 16.3]],
      glass: [[17, 9.5], [21, 6.4], [23.6, 5.8], [31.4, 5.9], [34.2, 6.6], [37.3, 9.3]],
      pillars: [27.2],
      belt: 9.5,
      wheels: [[9.4, 15.8, 4.1], [37.6, 15.8, 4.1]],
      col: { body: '#b8161c', dark: '#7c0c10', light: '#e85054', deep: '#4c0608' },
      doors: [27.2],
      handles: [[23.6, 10.7], [31.8, 10.7]],
      head: [0.6, 11.4, 3.8, 12.2],
      tail: [43.8, 9.8, 46.5, 10.9],
      bumpers: [],
      details: [[0.1, 12.3, 1.2, 14.8, '#18181c'], [0.2, 12.4, 1.0, 12.7, '#9aa0a8'], [3.2, 11.8, 5.2, 12, '#e8eef4'], [41.6, 15.2, 42.9, 15.9, '#c8ccd4'], [43.2, 15.2, 44.5, 15.9, '#c8ccd4'], [3, 16, 44, 16.3, '#bcc0c8']],
      rim: { color: '#c8ccd4', spokes: 5, caliper: '#c01818' },
      sideLine: 11.6,
      mirrorColor: '#c8ccd4',
    },
    rs6: {
      trim: '#101014', blackPillars: true, arch: 0.45,
      len: 50,
      body: [[1, 16.3], [0.3, 13.9], [0.4, 11.7], [1.8, 10.6], [9, 10.1], [14.2, 9.7], [17.6, 9.2], [22, 5.9], [25, 5], [42.2, 5.2], [46.4, 6.5], [48.9, 9.2], [49.6, 10.2], [49.7, 14.2], [49.1, 16.3]],
      glass: [[18.6, 9.1], [22.6, 6.2], [25.1, 5.6], [41.8, 5.8], [44.8, 6.9], [46.6, 9.1]],
      pillars: [29.6, 38.4],
      belt: 9.1,
      wheels: [[10.2, 15.8, 4.4], [40.4, 15.8, 4.4]],
      col: { body: '#8c9094', dark: '#62666a', light: '#bcc0c4', deep: '#3c4044' },
      doors: [29.6, 38.4],
      handles: [[26.2, 10.4], [35.2, 10.4]],
      head: [0.5, 11.2, 4, 12],
      tail: [46.8, 9.6, 49.5, 10.6],
      bumpers: [],
      details: [[0.1, 12.2, 1.3, 14.8, '#101014'], [0.2, 12.4, 1.1, 12.6, '#3c3c44'], [44.4, 15.1, 46.4, 16, '#1a1a1e'], [44.7, 15.3, 46.1, 15.8, '#9aa0a8'], [46.8, 15.1, 48.8, 16, '#1a1a1e'], [47.1, 15.3, 48.5, 15.8, '#9aa0a8'], [3, 16, 46, 16.3, '#2a2a30']],
      rails: [24, 44, 4.8],
      rim: { color: '#1e1e24', spokes: 10, caliper: '#c01818', dark: true },
      sideLine: 11.4,
      mirrorColor: '#2a2a30',
    },
  };

  function scalePts(pts, s, ox, oy) {
    return pts.map((p) => [ox + p[0] * s, oy + p[1] * s]);
  }

  // Render a car body (no wheels). Returns {bmp, ox, oy, wheels, ground}.
  function renderBody(id, s, colorOverride) {
    const d = DESIGNS[id];
    const col = Object.assign({}, d.col, colorOverride || {});
    const top = 1.5; // room for roof cargo above y=0 and the outline
    const W = Math.ceil((d.len + 4) * s) + 4;
    const groundD = Math.max(...d.wheels.map((w) => w[1] + w[2]));
    const H = Math.ceil((groundD + top + 1) * s) + 3;
    const ox = 2, oy = Math.round(top * s) + 1;
    const b = new Bitmap(W, H);
    const union = new Mask(W, H);
    const X = (v) => ox + v * s;
    const Y = (v) => oy + v * s;

    // --- body ---
    const body = new Mask(W, H);
    body.poly(scalePts(d.body, s, ox, oy));
    const well = new Mask(W, H);
    d.wheels.forEach((w) => {
      const cx = X(w[0]), cy = Y(w[1]), r = (w[2] + (d.arch == null ? 1.1 : d.arch)) * s;
      well.disc(cx, cy, r);
      body.disc(cx, cy, r, 0);
    });
    // wheel well shadow = part of the arch that was cut from the body poly
    const poly = new Mask(W, H);
    poly.poly(scalePts(d.body, s, ox, oy));
    const wellShadow = new Mask(W, H);
    for (let y = well.y0; y <= well.y1; y++) for (let x = well.x0; x <= well.x1; x++) if (well.has(x, y) && poly.has(x, y)) wellShadow.set(x, y);

    const beltY = Y(d.belt);
    const bottom = body.y1;
    b.paint(body, (x, y) => {
      if (!body.has(x, y - 1)) return col.light; // top highlight
      if (y >= bottom - Math.max(1, Math.round(1.4 * s))) return col.deep;
      if (y >= bottom - Math.max(2, Math.round(3 * s))) return dith(x, y, 0.5) ? col.dark : col.body;
      if (Math.abs(y - (beltY + Math.max(1, s))) < 0.5 * Math.max(1, s)) return col.light;
      return col.body;
    });
    for (let y = body.y0; y <= body.y1; y++) for (let x = body.x0; x <= body.x1; x++) if (body.has(x, y)) union.set(x, y);
    b.paint(wellShadow, '#0c0c10');
    for (let y = wellShadow.y0; y <= wellShadow.y1; y++) for (let x = wellShadow.x0; x <= wellShadow.x1; x++) if (wellShadow.has(x, y)) union.set(x, y);

    // --- wood panel (station wagon) ---
    if (d.wood) {
      const [x0, x1, y0, y1] = d.wood;
      const wm = new Mask(W, H);
      wm.rect(X(x0), Y(y0), (x1 - x0) * s, (y1 - y0) * s);
      const grain = CT.art.A.noise(CT.U.rng(7), 64, [[6, 1], [2, 0.5]]);
      b.paint(wm, (x, y) => {
        if (!body.has(x, y)) return 0;
        if (!wm.has(x, y - 1) || !wm.has(x, y + 1) || !wm.has(x - 1, y) || !wm.has(x + 1, y)) return '#e8d49c';
        const g = grain[(y * 7 + (x >> 2)) % 64];
        return g > 0.45 ? P.wood1 : g < -0.5 ? P.wood3 : P.wood2;
      });
    }
    if (d.stripe) {
      const y = Math.round(Y(d.stripe));
      for (let x = Math.round(X(4)); x < Math.round(X(d.len - 3)); x++) if (body.has(x, y)) b.pset(x, y, col.light);
    }

    // --- glass ---
    const glass = new Mask(W, H);
    glass.poly(scalePts(d.glass, s, ox, oy));
    const gy0 = glass.y0, gy1 = glass.y1;
    b.paint(glass, (x, y) => {
      const t = (y - gy0) / Math.max(1, gy1 - gy0);
      const band = (x + (y - gy0) * 1.2) % Math.round(14 * s);
      if (band < Math.max(1, 1.2 * s) || (band > 3 * s && band < 3 * s + Math.max(1, 0.7 * s))) return P.glass3;
      if (t > 0.7) return P.glass0;
      return dith(x, y, t) ? P.glass1 : P.glass2;
    });
    for (let y = glass.y0; y <= glass.y1; y++) for (let x = glass.x0; x <= glass.x1; x++) if (glass.has(x, y)) union.set(x, y);
    // window frame line
    for (let y = glass.y0; y <= glass.y1; y++) for (let x = glass.x0; x <= glass.x1; x++) {
      if (glass.has(x, y) && (!glass.has(x, y - 1) || !glass.has(x - 1, y) || !glass.has(x + 1, y))) b.pset(x, y, d.trim || col.deep);
    }
    // pillars
    const pw = Math.max(1, Math.round(0.9 * s));
    d.pillars.forEach((px) => {
      const x = Math.round(X(px));
      for (let y = glass.y0; y <= glass.y1; y++) for (let k = 0; k < pw; k++) if (glass.has(x + k, y)) b.pset(x + k, y, d.blackPillars ? '#141418' : k === pw - 1 && pw > 1 ? col.dark : col.body);
    });

    // --- doors, handles, trim ---
    (d.doors || []).forEach((dx) => {
      const x = Math.round(X(dx));
      for (let y = Math.round(beltY) + 1; y < bottom - Math.max(1, s); y++) if (body.has(x, y)) b.pset(x, y, col.deep);
    });
    if (d.track) {
      const y = Math.round(Y(d.track[2]));
      for (let x = Math.round(X(d.track[0])); x <= Math.round(X(d.track[1])); x++) if (body.has(x, y)) b.pset(x, y, col.dark);
    }
    (d.handles || []).forEach((h) => {
      b.rect(Math.round(X(h[0])), Math.round(Y(h[1])), Math.max(2, Math.round(1.8 * s)), Math.max(1, Math.round(0.6 * s)), '#d8d8e0');
    });
    const rectD = (r, c) => b.rect(Math.round(X(r[0])), Math.round(Y(r[1])), Math.max(1, Math.round((r[2] - r[0]) * s)), Math.max(1, Math.round((r[3] - r[1]) * s)), c);
    if (d.flares) {
      d.wheels.forEach((w) => {
        const cx = X(w[0]), cy = Y(w[1]), r = (w[2] + 1.1) * s;
        for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.02) {
          for (let k = 0; k < Math.max(1, Math.round(0.9 * s)); k++) b.pset(Math.round(cx + Math.cos(a) * (r + k)), Math.round(cy + Math.sin(a) * (r + k)), '#2a2a30');
        }
      });
    }
    d.bumpers.forEach((r) => {
      rectD(r, '#c8c8d0');
      b.rect(Math.round(X(r[0])), Math.round(Y(r[3])) - 1, Math.max(1, Math.round((r[2] - r[0]) * s)), 1, '#78787f');
      const bm = new Mask(W, H);
      bm.rect(Math.round(X(r[0])), Math.round(Y(r[1])), Math.max(1, Math.round((r[2] - r[0]) * s)), Math.max(1, Math.round((r[3] - r[1]) * s)));
      for (let y = bm.y0; y <= bm.y1; y++) for (let x = bm.x0; x <= bm.x1; x++) if (bm.has(x, y)) union.set(x, y);
    });
    // sculpted shoulder/character line
    if (d.sideLine) {
      const y = Math.round(Y(d.sideLine));
      for (let x = Math.round(X(3)); x < Math.round(X(d.len - 2)); x++) if (body.has(x, y) && !wellShadow.has(x, y)) b.pset(x, y, col.light);
    }
    (d.details || []).forEach((r) => {
      rectD(r, r[4]);
      const dm = new Mask(W, H);
      dm.rect(Math.round(X(r[0])), Math.round(Y(r[1])), Math.max(1, Math.round((r[2] - r[0]) * s)), Math.max(1, Math.round((r[3] - r[1]) * s)));
      for (let y = dm.y0; y <= dm.y1; y++) for (let x = dm.x0; x <= dm.x1; x++) if (dm.has(x, y)) union.set(x, y);
    });
    if (d.rails) {
      const ry = Math.round(Y(d.rails[2]));
      b.hline(Math.round(X(d.rails[0])), Math.round(X(d.rails[1])), ry, '#1c1c22');
      for (let x = Math.round(X(d.rails[0])); x <= Math.round(X(d.rails[1])); x++) union.set(x, ry);
    }
    rectD(d.head, '#fff8b0');
    b.pset(Math.round(X(d.head[0])), Math.round(Y(d.head[1])), P.white);
    rectD(d.tail, '#e02828');
    // mirror
    const mx = Math.round(X(d.glass[0][0] + 0.2)), my = Math.round(Y(d.belt - 1.2));
    b.rect(mx - Math.max(1, Math.round(s)), my, Math.max(2, Math.round(1.6 * s)), Math.max(1, Math.round(1.1 * s)), d.mirrorColor || col.deep);

    // --- roof cargo ---
    const cargo = new Mask(W, H);
    const roofY = Math.min(...d.body.map((p) => p[1]));
    const R = (x0, y0, x1, y1) => { const m = new Mask(W, H); m.rect(X(x0), Y(y0), (x1 - x0) * s, (y1 - y0) * s); return m; };
    const addCargo = (m, fill) => {
      b.paint(m, fill);
      for (let y = m.y0; y <= m.y1; y++) for (let x = m.x0; x <= m.x1; x++) if (m.has(x, y)) { cargo.set(x, y); union.set(x, y); }
    };
    if (d.roof === 'luggage') {
      const rail = Math.round(Y(roofY - 0.3));
      b.hline(Math.round(X(19)), Math.round(X(43.5)), rail, '#303038');
      for (const lx of [20, 43]) b.vline(Math.round(X(lx)), rail, Math.round(Y(roofY)), '#303038');
      addCargo(R(19.5, 0.7, 26.5, roofY - 0.4), (x, y) => (y === Math.round(Y(0.7)) ? '#b8743c' : dith(x, y, 0.2) ? '#7c441c' : '#9c5c2c'));
      b.hline(Math.round(X(20)), Math.round(X(26)), Math.round(Y(1.9)), '#e8c870');
      const duffel = new Mask(W, H);
      duffel.ellipse(X(29.8), Y(2.3), 3.2 * s, 1.35 * s);
      addCargo(duffel, (x, y) => (y < Y(1.9) ? '#5c8ce0' : '#2c5cb0'));
      const tarp = new Mask(W, H);
      tarp.ellipse(X(37.6), Y(2.1), 4.9 * s, 1.9 * s);
      for (let y = Math.ceil(Y(roofY - 0.4)); y <= tarp.y1; y++) tarp.span(0, W - 1, y, 0);
      addCargo(tarp, (x, y) => (y < Y(1.2) ? '#e0c890' : dith(x, y, 0.35) ? '#a88c50' : '#c8ac70'));
      for (const rx of [35, 39.5]) b.vline(Math.round(X(rx)), Math.round(Y(0.4)), Math.round(Y(roofY - 0.4)), '#6c4c24');
    } else if (d.roof === 'kayak') {
      const k = new Mask(W, H);
      k.ellipse(X(24), Y(2.5), 15 * s, 1.35 * s);
      addCargo(k, (x, y) => (y < Y(2.1) ? '#ffb040' : '#e07010'));
      b.hline(Math.round(X(20)), Math.round(X(28)), Math.round(Y(2.3)), '#303038');
      for (const lx of [17.5, 30.5]) b.vline(Math.round(X(lx)), Math.round(Y(3.4)), Math.round(Y(roofY)), '#303038');
    } else if (d.roof === 'box') {
      const k = new Mask(W, H);
      k.rect(X(21), Y(0.2), 19 * s, (roofY - 0.5) * s);
      k.ellipse(X(21), Y(1.05), 1.2 * s, 0.9 * s);
      k.ellipse(X(40), Y(1.05), 1.2 * s, 0.9 * s);
      addCargo(k, (x, y) => (y === k.y0 ? '#50505c' : '#24242c'));
      for (const lx of [23, 38]) b.vline(Math.round(X(lx)), Math.round(Y(roofY - 0.4)), Math.round(Y(roofY)), '#303038');
    } else if (d.roof === 'basket') {
      const y1 = Math.round(Y(roofY - 0.3));
      b.hline(Math.round(X(20)), Math.round(X(43)), y1, '#303038');
      b.hline(Math.round(X(20)), Math.round(X(43)), Math.round(Y(0.4)), '#303038');
      for (let lx = 20; lx <= 43; lx += 4.6) b.vline(Math.round(X(lx)), Math.round(Y(0.4)), y1, '#303038');
      addCargo(R(22, 0.2, 25.6, roofY - 0.4), '#d02020');
      addCargo(R(26.4, 0.2, 30, roofY - 0.4), '#2c8c30');
      const t = new Mask(W, H);
      t.rect(X(31.5), Y(0.9), 9.5 * s, (roofY - 1.3) * s);
      addCargo(t, (x, y) => (y === t.y0 ? '#404048' : '#1c1c20'));
    }
    if (d.spare) {
      const sm = new Mask(W, H);
      sm.rect(X(d.spare[0] - 0.8), Y(d.spare[1] - d.spare[2]), 1.6 * s, d.spare[2] * 2 * s);
      addCargo(sm, (x, y) => (x > X(d.spare[0]) ? '#1c1c20' : '#34343c'));
    }
    b.outline(union, OUT);
    // ground shadow drawn separately by scenes
    return {
      bmp: b,
      ox, oy, s,
      wheels: d.wheels.map((w) => ({ x: X(w[0]), y: Y(w[1]), r: w[2] * s })),
      rim: d.rim || null,
      ground: Y(groundD),
      len: d.len,
    };
  }

  // Big alloy wheel: thin tire sidewall, spoked rim, brake caliper peeking through.
  function renderSportWheel(r, frame, rim) {
    const size = Math.ceil(r * 2) + 3;
    const b = new Bitmap(size, size);
    const c = size / 2;
    const m = new Mask(size, size);
    m.disc(c, c, r + 0.4);
    b.paint(m, '#16161a');
    b.outline(m, OUT);
    const rr = Math.max(1.6, r * 0.72);
    const face = new Mask(size, size);
    face.disc(c, c, rr);
    const light = rim.dark ? '#5c5e68' : '#eef0f4';
    b.paint(face, (x, y) => (Math.hypot(x - c + 0.5, y - c + 0.5) > rr - 0.9 ? (x + y < c * 2 ? light : rim.color) : '#202026'));
    if (rim.caliper && rr >= 3) b.rect(Math.round(c - rr * 0.75), Math.round(c - rr * 0.55), Math.max(1, Math.round(rr * 0.4)), Math.max(2, Math.round(rr * 0.8)), rim.caliper);
    const n = rim.spokes || 5;
    const a0 = (frame % 4) * ((Math.PI * 2) / n / 4);
    for (let k = 0; k < n; k++) {
      const a = a0 + (k * Math.PI * 2) / n;
      for (let t = 0.2; t <= 1; t += 0.12) {
        const x = Math.floor(c + Math.cos(a) * rr * t * 0.92), y = Math.floor(c + Math.sin(a) * rr * t * 0.92);
        b.pset(x, y, Math.sin(a) < -0.2 ? light : rim.color);
      }
    }
    b.disc(c, c, Math.max(0.8, rr * 0.28), rim.color);
    b.pset(Math.floor(c), Math.floor(c), '#9aa0a8');
    return b;
  }

  // Wheel sprite (tire + hub) with a rotation frame 0..3.
  function renderWheel(r, frame) {
    const size = Math.ceil(r * 2) + 3;
    const b = new Bitmap(size, size);
    const c = size / 2;
    const m = new Mask(size, size);
    m.disc(c, c, r + 0.4);
    b.paint(m, '#1a1a1e');
    b.outline(m, OUT);
    const hubR = Math.max(1.2, r * 0.5);
    const hub = new Mask(size, size);
    hub.disc(c, c, hubR);
    b.paint(hub, (x, y) => (x + y < c * 2 - 1 ? '#d8d8e0' : '#9898a4'));
    if (r >= 3) {
      const tr = new Mask(size, size);
      tr.disc(c, c, r - 0.4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m.has(x, y) && !tr.has(x, y) && !hub.has(x, y)) b.pset(x, y, '#2c2c32');
    }
    const a0 = (frame % 4) * (Math.PI / 8);
    for (let k = 0; k < 4; k++) {
      const a = a0 + (k * Math.PI) / 2;
      const hr = Math.max(0.8, hubR * 0.55);
      b.pset(Math.floor(c + Math.cos(a) * hr), Math.floor(c + Math.sin(a) * hr), '#50505c');
      if (k % 2 === 0) b.pset(Math.floor(c + Math.cos(a) * (r - 0.6)), Math.floor(c + Math.sin(a) * (r - 0.6)), '#46464e');
    }
    b.pset(Math.floor(c), Math.floor(c), '#34343c');
    return b;
  }

  const cache = new Map();
  function body(id, s, colors) {
    const k = id + '|' + s + '|' + (colors ? JSON.stringify(colors) : '');
    let v = cache.get(k);
    if (!v) { v = renderBody(id, s, colors); cache.set(k, v); }
    return v;
  }
  function wheel(r, frame, rim) {
    const k = 'w|' + r + '|' + frame + '|' + (rim ? JSON.stringify(rim) : '');
    let v = cache.get(k);
    if (!v) { v = rim ? renderSportWheel(r, frame, rim) : renderWheel(r, frame); cache.set(k, v); }
    return v;
  }

  // Composite a car onto a Bitmap. (x = left edge of the sprite, gy = ground line.)
  function drawTo(bmp, id, x, gy, s, opts) {
    const o = opts || {};
    const c = body(id, s || 1, o.colors);
    const dx = Math.round(x), dy = Math.round(gy - c.ground);
    if (o.shadow !== false) {
      const sw = Math.round(c.len * c.s * 0.9);
      const sx = dx + c.ox + Math.round(c.len * c.s * 0.05);
      for (let i = 0; i < sw; i++) {
        bmp.pset(sx + i, Math.round(gy), o.shadowColor || '#1c2a14');
        if (i > 1 && i < sw - 2) bmp.pset(sx + i, Math.round(gy) - 1, o.shadowColor || '#1c2a14');
      }
    }
    bmp.draw(c.bmp, dx, dy, o.flip);
    c.wheels.forEach((w) => {
      const wb = wheel(w.r, o.frame || 0, c.rim);
      let wx = dx + w.x - wb.w / 2;
      if (o.flip) wx = dx + (c.bmp.w - w.x) - wb.w / 2;
      bmp.draw(wb, Math.round(wx), Math.round(dy + w.y - wb.h / 2));
    });
    return { w: c.bmp.w, h: c.bmp.h, top: dy };
  }

  // Canvas versions for per-frame drawing.
  const canvasCache = new Map();
  function toCanvas(key, bmpFn) {
    let cv = canvasCache.get(key);
    if (!cv) { cv = bmpFn().toCanvas(); canvasCache.set(key, cv); }
    return cv;
  }
  function drawCtx(ctx, id, x, gy, s, frame, opts) {
    const o = opts || {};
    const c = body(id, s || 1, o.colors);
    const bodyCv = toCanvas('b|' + id + '|' + s + '|' + (o.colors ? JSON.stringify(o.colors) : ''), () => c.bmp);
    const dy = Math.round(gy - c.ground + (o.bounce || 0));
    ctx.drawImage(bodyCv, Math.round(x), dy);
    c.wheels.forEach((w) => {
      const wcv = toCanvas('w|' + w.r + '|' + (frame % 4) + '|' + id, () => wheel(w.r, frame % 4, c.rim));
      ctx.drawImage(wcv, Math.round(x + w.x - wcv.width / 2), Math.round(gy - c.ground + w.y - wcv.height / 2));
    });
    return { w: c.bmp.w, h: c.bmp.h };
  }
  function size(id, s) {
    const c = body(id, s || 1);
    return { w: c.bmp.w, h: c.bmp.h, ground: c.ground };
  }

  // ---------------- top-down cars (Columbia Gorge run) ----------------
  // Facing up. type: 'wagon'|'hatch'|'minivan'|'suv'|'sedan'|'truck'|'rv'
  const TOP = {
    wagon: { w: 11, h: 22, roof: [5, 16], rack: true },
    hatch: { w: 10, h: 17, roof: [5, 12] },
    minivan: { w: 11, h: 21, roof: [4, 17] },
    suv: { w: 12, h: 21, roof: [5, 16], rack: true },
    sedan: { w: 10, h: 19, roof: [6, 13] },
    truck: { w: 14, h: 34, roof: [0, 6], trailer: true },
    rv: { w: 14, h: 30, roof: [0, 26] },
    q50: { w: 10, h: 20, roof: [7, 14] },
    g37: { w: 10, h: 19, roof: [7, 13] },
    m3: { w: 10, h: 20, roof: [7, 14] },
    m5: { w: 11, h: 21, roof: [7, 15] },
    s4: { w: 10, h: 20, roof: [7, 14] },
    rs6: { w: 11, h: 21, roof: [6, 18], rack: true },
  };
  function renderTop(type, color, dark, light, flipY) {
    const t = TOP[type] || TOP.sedan;
    const b = new Bitmap(t.w + 2, t.h + 2);
    const m = new Mask(b.w, b.h);
    m.rect(1, 2, t.w, t.h - 2);
    m.rect(2, 1, t.w - 2, t.h);
    b.paint(m, (x, y) => (x === 1 || x === t.w ? dark : color));
    if (t.trailer) {
      b.rect(2, 9, t.w - 2, t.h - 9, '#e0e0e8');
      b.vline(t.w, 9, t.h, '#a0a0ac');
      b.rect(2, 1, t.w - 2, 7, color);
      b.rect(3, 2, t.w - 4, 2, P.glass1);
    } else if (type === 'rv') {
      b.rect(2, 1, t.w - 2, t.h, '#ecead8');
      b.rect(3, 3, t.w - 4, 2, P.glass1);
      b.rect(2, 10, t.w - 2, 2, color);
      b.rect(2, 18, t.w - 2, 2, color);
      b.vline(t.w, 1, t.h, '#b4b0a0');
    } else {
      const [r0, r1] = t.roof;
      b.rect(2, r0 - 2, t.w - 2, 2, P.glass1); // windshield
      b.rect(2, r0, t.w - 2, r1 - r0, light);
      b.rect(2, r1, t.w - 2, 2, P.glass0); // rear window
      if (t.rack) { b.vline(3, r0 + 1, r1 - 1, '#303038'); b.vline(t.w - 2, r0 + 1, r1 - 1, '#303038'); }
      if (type === 'wagon') { b.rect(4, r0 + 1, t.w - 6, 4, '#9c5c2c'); b.rect(4, r0 + 6, t.w - 6, 3, '#c8ac70'); }
      if (type === 'hatch') b.rect(4, r0, t.w - 6, r1 - r0, '#f08018');
      if (type === 'minivan') b.rect(4, r0 + 3, t.w - 6, 7, '#24242c');
    }
    b.pset(2, 1, '#fff8b0'); b.pset(t.w - 1, 1, '#fff8b0');
    b.pset(2, t.h, '#e02828'); b.pset(t.w - 1, t.h, '#e02828');
    b.pset(0, 6, dark); b.pset(t.w + 1, 6, dark);
    b.outline(m, OUT);
    if (flipY) {
      const f = new Bitmap(b.w, b.h);
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) f.data[(b.h - 1 - y) * b.w + x] = b.data[y * b.w + x];
      return f;
    }
    return b;
  }
  function topCanvas(type, color, flipY) {
    const shade = (hex, f) => {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.min(255, Math.round(((n >> 16) & 255) * f)), g = Math.min(255, Math.round(((n >> 8) & 255) * f)), b = Math.min(255, Math.round((n & 255) * f));
      return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    };
    return toCanvas('top|' + type + '|' + color + '|' + !!flipY, () => renderTop(type, color, shade(color, 0.6), shade(color, 1.25), flipY));
  }
  function topSize(type) { const t = TOP[type] || TOP.sedan; return { w: t.w + 2, h: t.h + 2 }; }

  CT.art.cars = { DESIGNS, drawTo, drawCtx, size, body, wheel, topCanvas, topSize, colorOf: (id) => DESIGNS[id].col.body };
})(typeof window !== 'undefined' ? window : globalThis);
