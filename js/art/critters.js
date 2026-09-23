/* The Car Trail - animals (hunting), fish (fishing) and small sprites.
 * Animals are built from shaded ellipses with swinging legs so they can gallop
 * at several depth scales. All face left; draw flipped to run right.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const { Bitmap, Mask, dith } = CT.gfx;
  const OUT = '#141018';

  // Units are pixels at scale 1. Body centre is the origin; ground is at y = legLen + body.ry*0.6.
  const SPECIES = {
    rabbit: {
      name: 'rabbit', meat: [2, 4], speed: 70, hop: true, w: 12, h: 10,
      col: { main: '#9c8468', dark: '#6c5840', light: '#c8b498', belly: '#e8dcc8' },
      body: [0, 0, 4, 2.8], head: [-3.8, -2.2, 2, 1.8], ears: [[-3.6, -3.6, -3.2, -7.5], [-4.6, -3.6, -5, -7.2]],
      tail: [4.2, -0.8, 1.3, '#f0f0f0'], legs: [[-2.4, 0.8, 2.5, 1], [2.4, 0.8, 2.8, 1.4]], eye: [-4.6, -2.6],
    },
    turkey: {
      name: 'wild turkey', meat: [12, 20], speed: 34, w: 16, h: 16,
      col: { main: '#4c3420', dark: '#2c1c10', light: '#8c6c44', belly: '#6c4c2c' },
      body: [0, 0, 4.6, 3.8], neck: [-2.6, -2, -4.6, -6.5, 1.1], head: [-5, -7, 1.3, 1.2], wattle: [-5.6, -5.6, '#d02828'],
      fan: [3.6, -2.6, 5.2], legs: [[-1, 3, 4, 0.8], [1.2, 3, 4, 0.8]], legColor: '#c89048', eye: [-5.4, -7.3], beak: [-6.4, -6.8],
    },
    deer: {
      name: 'deer', meat: [80, 120], speed: 62, w: 30, h: 26,
      col: { main: '#a86c38', dark: '#704420', light: '#cc9460', belly: '#e8c898' },
      body: [0, 0, 8, 3.8], neck: [-5.5, -1.6, -8.6, -7.6, 1.8], head: [-9.8, -8.4, 2.6, 1.7], snout: [-12.2, -7.8],
      ears: [[-8.6, -9.6, -7.4, -11.6]], antlers: [[-8.8, -10, -9.6, -14], [-9.4, -12.4, -11.4, -13.6], [-8.8, -10, -6.8, -13.2]],
      tail: [7.8, -2.6, 1.6, '#f4f0e8'], legs: [[-5.4, 2.2, 8.4, 1.2], [-3.8, 2.2, 8.4, 1.2], [4.2, 2, 8.6, 1.3], [5.8, 2, 8.6, 1.3]], eye: [-10.3, -8.9],
    },
    pronghorn: {
      name: 'pronghorn', meat: [50, 70], speed: 80, w: 28, h: 24,
      col: { main: '#c88c48', dark: '#8c5c28', light: '#e0b070', belly: '#f8f0e0' },
      body: [0, 0, 7.4, 3.6], neck: [-5, -1.4, -7.6, -7, 1.7], head: [-8.8, -7.6, 2.3, 1.6], snout: [-11, -7.1],
      horns: [[-8.2, -9, -8.4, -12.6]], stripe: true,
      tail: [7.2, -2.2, 1.4, '#ffffff'], legs: [[-5, 2, 8, 1.1], [-3.5, 2, 8, 1.1], [3.8, 2, 8, 1.2], [5.3, 2, 8, 1.2]], eye: [-9.2, -8.1],
    },
    elk: {
      name: 'elk', meat: [250, 350], speed: 50, w: 38, h: 34,
      col: { main: '#946030', dark: '#5c3818', light: '#b88450', belly: '#c8a070', mane: '#4c2c14' },
      body: [0, 0, 10, 5], neck: [-7, -2.4, -10.6, -9.4, 2.6], head: [-12, -10.2, 3.2, 2], snout: [-15, -9.6],
      ears: [[-10.6, -11.6, -9.2, -13.4]], antlers: [[-10.8, -12, -9, -19], [-9.6, -16, -12.8, -17.8], [-9.4, -18, -6.4, -20], [-10.2, -14, -6.8, -15.8], [-10.8, -12, -14, -13.2]],
      tail: [9.8, -3, 1.4, '#e8d8b0'], legs: [[-7, 3, 10, 1.6], [-5, 3, 10, 1.6], [5.4, 3, 10.4, 1.7], [7.4, 3, 10.4, 1.7]], eye: [-12.6, -10.8],
    },
    bison: {
      name: 'bison', meat: [500, 800], speed: 36, w: 40, h: 28,
      col: { main: '#5c3818', dark: '#34200c', light: '#7c5028', belly: '#4c2c10', mane: '#2c1808' },
      body: [1.5, 0, 10, 5.4], hump: [-4, -3.2, 7, 6], head: [-11.6, 1.6, 3.8, 3.6], horns: [[-11, -1.6, -10, -3.8]], beard: [-12.6, 5.6],
      tail: [11.2, -1.6, 1.2, '#2c1808'], legs: [[-6.4, 4, 6.6, 2], [-4.2, 4, 6.6, 2], [6.8, 3.4, 7, 1.9], [9, 3.4, 7, 1.9]], eye: [-13, 0.8],
    },
    bear: {
      name: 'black bear', meat: [200, 300], speed: 30, w: 32, h: 22,
      col: { main: '#2c2420', dark: '#141010', light: '#4c4038', belly: '#241c18' },
      body: [0, 0, 9, 5], hump: [-3, -2.6, 5, 4], head: [-9.6, -1.6, 3.6, 3], snout: [-12.6, -0.6],
      ears: [[-9, -4.4, -8.4, -5.4], [-10.8, -4.2, -11.2, -5.2]], snoutColor: '#8c6c50',
      legs: [[-5.4, 3.4, 5.8, 2.2], [-3.4, 3.4, 5.8, 2.2], [4.6, 3.4, 5.8, 2.2], [6.6, 3.4, 5.8, 2.2]], eye: [-10.6, -2.4],
    },
  };

  function renderAnimal(type, s, frame, dead) {
    const sp = SPECIES[type];
    const W = Math.ceil(sp.w * s * 1.3) + 6;
    const H = Math.ceil(sp.h * s * 1.3) + 6;
    const b = new Bitmap(W, H);
    const union = new Mask(W, H);
    const cx = W * 0.55;
    const maxLeg = Math.max(...sp.legs.map((l) => l[1] + l[2]));
    const gy = H - 3;
    let cy = gy - maxLeg * s;
    if (sp.hop) cy -= [0, 2.5, 3.5, 1.5][frame % 4] * s;
    const X = (v) => cx + v * s, Y = (v) => cy + v * s;
    const col = sp.col;
    const add = (m, fill) => {
      b.paint(m, fill);
      for (let y = m.y0; y <= m.y1; y++) for (let x = m.x0; x <= m.x1; x++) if (m.has(x, y)) union.set(x, y);
    };
    const shade = (mask, ccx, ccy, r) => (x, y) => {
      const l = (-(x - ccx) * 0.4 - (y - ccy)) / Math.max(1, r);
      if (l > 0.5) return col.light;
      if (l < -0.45) return dith(x, y, 0.5) ? col.dark : col.main;
      return col.main;
    };
    // legs (behind the body)
    sp.legs.forEach((l, i) => {
      const phase = (i % 2 === 0 ? 0 : Math.PI) + (i >= 2 ? Math.PI / 2 : 0);
      const swing = sp.hop ? [0.9, -0.5, -0.9, 0.3][frame % 4] * (i === 1 ? -1 : 1) : Math.sin((frame * Math.PI) / 2 + phase) * 0.55;
      const x0 = X(l[0]), y0 = Y(l[1]);
      const len = l[2] * s;
      const x1 = x0 + Math.sin(swing) * len, y1 = y0 + Math.cos(swing) * len;
      const m = new Mask(W, H);
      m.thickLine(x0, y0, x1, y1, Math.max(0.5, (l[3] * s) / 2));
      const far = i === 1 || i === 3;
      add(m, far ? col.dark : sp.legColor || col.main);
      if (!sp.legColor) b.pset(Math.round(x1), Math.round(y1), OUT);
    });
    // body
    const [bx, by, brx, bry] = sp.body;
    const bm = new Mask(W, H);
    bm.ellipse(X(bx), Y(by), brx * s, bry * s);
    if (sp.hump) bm.ellipse(X(sp.hump[0]), Y(sp.hump[1]), sp.hump[2] * s, sp.hump[3] * s);
    add(bm, (x, y) => {
      if (y > Y(by) + bry * s * 0.45 && sp.col.belly) return dith(x, y, 0.5) ? col.belly : col.main;
      if (sp.col.mane && sp.hump && x < X(sp.hump[0]) + sp.hump[2] * s * 0.6) return dith(x, y, 0.3) ? col.mane : col.dark;
      return shade(bm, X(bx), Y(by), bry * s * 1.4)(x, y);
    });
    if (sp.stripe) for (let x = Math.round(X(-3)); x < Math.round(X(5)); x++) b.pset(x, Math.round(Y(1.5)), col.belly);
    // tail / fan
    if (sp.tail) {
      const m = new Mask(W, H);
      m.disc(X(sp.tail[0]), Y(sp.tail[1]), Math.max(0.8, sp.tail[2] * s));
      add(m, sp.tail[3]);
    }
    if (sp.fan) {
      const m = new Mask(W, H);
      const fx = X(sp.fan[0]), fy = Y(sp.fan[1]), fr = sp.fan[2] * s;
      m.ellipse(fx, fy, fr * 0.7, fr);
      add(m, (x, y) => {
        const a = Math.atan2(y - fy, x - fx);
        const band = Math.floor((a + Math.PI) / 0.35) % 2;
        const d = Math.hypot(x - fx, y - fy) / fr;
        if (d > 0.8) return '#e8d8b8';
        return band ? '#6c4424' : '#3c2410';
      });
    }
    // neck & head
    if (sp.neck) {
      const [x0, y0, x1, y1, w] = sp.neck;
      const m = new Mask(W, H);
      m.thickLine(X(x0), Y(y0), X(x1), Y(y1), Math.max(0.7, w * s));
      add(m, col.mane || col.main);
    }
    if (sp.head) {
      const [hx, hy, hrx, hry] = sp.head;
      const m = new Mask(W, H);
      m.ellipse(X(hx), Y(hy), hrx * s, hry * s);
      if (sp.snout) m.thickLine(X(hx), Y(hy), X(sp.snout[0]), Y(sp.snout[1]), Math.max(0.6, hry * s * 0.6));
      add(m, (x, y) => (sp.snoutColor && x < X(hx) - hrx * s * 0.4 ? sp.snoutColor : y < Y(hy) - hry * s * 0.3 ? col.light : col.main));
    }
    if (sp.hump && col.mane && sp.head) {
      const m = new Mask(W, H);
      m.ellipse(X(sp.head[0] + 1.5), Y(sp.head[1] - 1), sp.head[2] * s * 0.9, sp.head[3] * s * 0.9);
      add(m, (x, y) => (dith(x, y, 0.4) ? col.mane : col.dark));
    }
    (sp.ears || []).forEach((e) => {
      const m = new Mask(W, H);
      m.thickLine(X(e[0]), Y(e[1]), X(e[2]), Y(e[3]), Math.max(0.5, 0.7 * s));
      add(m, col.main);
    });
    if (sp.wattle) { const m = new Mask(W, H); m.disc(X(sp.wattle[0]), Y(sp.wattle[1]), Math.max(0.7, 0.9 * s)); add(m, sp.wattle[2]); }
    if (sp.beak) b.pset(Math.round(X(sp.beak[0])), Math.round(Y(sp.beak[1])), '#e8c060');
    if (sp.beard) { const m = new Mask(W, H); m.ellipse(X(sp.beard[0]), Y(sp.beard[1]), 1.2 * s, 2 * s); add(m, col.mane); }
    b.outline(union, OUT);
    // antlers & horns drawn after the outline, as thin dark/bone lines
    (sp.antlers || []).forEach((a) => b.line(X(a[0]), Y(a[1]), X(a[2]), Y(a[3]), '#e8dcc0'));
    (sp.horns || []).forEach((a) => b.line(X(a[0]), Y(a[1]), X(a[2]), Y(a[3]), '#201810'));
    if (sp.eye) b.pset(Math.round(X(sp.eye[0])), Math.round(Y(sp.eye[1])), '#000000');
    if (dead) {
      // upside down, legs in the air
      let tmin = 0;
      while (tmin < H && !b.data.subarray(tmin * W, tmin * W + W).some((v) => v)) tmin++;
      const shift = gy - (H - 1 - tmin);
      const f = new Bitmap(W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = b.data[y * W + x];
        if (!v) continue;
        const ny = H - 1 - y + shift;
        if (ny >= 0 && ny < H) f.data[ny * W + x] = v;
      }
      return { bmp: f, gy };
    }
    return { bmp: b, gy };
  }

  // ---------------- fish ----------------
  const FISH = {
    catfish: { name: 'channel catfish', lbs: [3, 14], len: 22, h: 6, col: ['#6c7c84', '#3c4850', '#c8d0c8'], whisk: true, diff: 0.55 },
    bass: { name: 'largemouth bass', lbs: [1, 6], len: 16, h: 6, col: ['#5c8c3c', '#2c5420', '#d8e0a8'], stripe: '#243c18', diff: 0.5 },
    carp: { name: 'carp', lbs: [4, 18], len: 20, h: 7, col: ['#b88c34', '#7c5c1c', '#e8d090'], scales: true, diff: 0.6 },
    trout: { name: 'rainbow trout', lbs: [1, 6], len: 16, h: 5, col: ['#8ca4a0', '#4c6460', '#e8ece0'], stripe: '#e05c6c', spots: true, diff: 0.55 },
    salmon: { name: 'chinook salmon', lbs: [10, 28], len: 26, h: 7, col: ['#9cacb8', '#4c5c70', '#e8ecf0'], spots: true, diff: 0.75 },
    sturgeon: { name: 'white sturgeon', lbs: [40, 90], len: 34, h: 7, col: ['#7c7c74', '#44443c', '#d0d0c4'], plates: true, diff: 0.9 },
    whitefish: { name: 'mountain whitefish', lbs: [1, 3], len: 13, h: 4, col: ['#b4bcc0', '#6c7478', '#f0f0f0'], diff: 0.4 },
  };
  const WATERS = {
    kansas: ['catfish', 'catfish', 'bass', 'carp', 'bass'],
    green: ['trout', 'trout', 'whitefish', 'trout', 'carp'],
    snake: ['trout', 'bass', 'catfish', 'sturgeon', 'whitefish'],
    columbia: ['salmon', 'salmon', 'sturgeon', 'bass', 'trout'],
  };

  function renderFish(type, s) {
    const f = FISH[type];
    const L = f.len * s, Hh = f.h * s;
    const W = Math.ceil(L + 8), H = Math.ceil(Hh * 2 + 6);
    const b = new Bitmap(W, H);
    const m = new Mask(W, H);
    const cx = W / 2 - 1, cy = H / 2;
    m.ellipse(cx, cy, L / 2 - 2 * s, Hh / 2 + 0.5);
    const tx = cx + L / 2 - 2 * s;
    m.poly([[tx - 1, cy], [tx + 4 * s, cy - Hh * 0.6], [tx + 3 * s, cy], [tx + 4 * s, cy + Hh * 0.6]]);
    m.poly([[cx - 2 * s, cy - Hh / 2 + 0.5], [cx + 2 * s, cy - Hh / 2 - 2 * s], [cx + 4 * s, cy - Hh / 2 + 0.5]]);
    const [main, dark, belly] = f.col;
    b.paint(m, (x, y) => {
      if (y > cy + Hh * 0.12) return dith(x, y, 0.4) ? main : belly;
      if (y < cy - Hh * 0.2) return dark;
      if (f.stripe && Math.abs(y - cy) < 0.8) return f.stripe;
      return main;
    });
    if (f.spots) for (let i = 0; i < L / 2; i++) b.pset(Math.round(cx - L / 3 + ((i * 7) % (L * 0.8))), Math.round(cy - Hh * 0.3 + ((i * 3) % Math.max(1, Hh * 0.4))), dark);
    if (f.plates) for (let x = Math.round(cx - L / 3); x < cx + L / 3; x += 3) b.pset(x, Math.round(cy - Hh * 0.15), '#e0e0d0');
    b.outline(m, OUT);
    b.pset(Math.round(cx - L / 2 + 3 * s), Math.round(cy - 1), '#000000');
    if (f.whisk) { b.line(cx - L / 2 + 1, cy, cx - L / 2 - 2, cy + 3, OUT); b.line(cx - L / 2 + 1, cy - 1, cx - L / 2 - 2, cy - 3, OUT); }
    return b;
  }

  // ---------------- misc ----------------
  function tombstone(name, lines) {
    const b = new Bitmap(90, 84);
    const m = new Mask(90, 84);
    m.rect(8, 22, 74, 62);
    m.ellipse(45, 24, 37, 20);
    b.paint(m, (x, y) => (x < 14 ? '#c8c8d0' : x > 76 ? '#686874' : dith(x, y, 0.15) ? '#8c8c98' : '#a4a4b0'));
    b.outline(m, OUT);
    b.textCenter('Here lies', 45, 16, '#2c2c34');
    b.textCenter(name.slice(0, 13), 45, 28, '#2c2c34');
    (lines || []).slice(0, 4).forEach((l, i) => b.textCenter(l.slice(0, 13), 45, 44 + i * 9, '#3c3c48'));
    return b;
  }

  const cache = new Map();
  function animalCanvas(type, s, frame, dead, flip) {
    const k = [type, s, frame, dead ? 1 : 0, flip ? 1 : 0].join('|');
    let v = cache.get(k);
    if (!v) {
      const r = renderAnimal(type, s, frame, dead);
      let bmp = r.bmp;
      if (flip) {
        const f = new Bitmap(bmp.w, bmp.h);
        for (let y = 0; y < bmp.h; y++) for (let x = 0; x < bmp.w; x++) f.data[y * bmp.w + x] = bmp.data[y * bmp.w + (bmp.w - 1 - x)];
        bmp = f;
      }
      v = { cv: bmp.toCanvas(), bmp, gy: r.gy };
      cache.set(k, v);
    }
    return v;
  }
  function fishCanvas(type, s, flip) {
    const k = 'fish|' + type + '|' + s + '|' + (flip ? 1 : 0);
    let v = cache.get(k);
    if (!v) {
      let bmp = renderFish(type, s);
      if (flip) {
        const f = new Bitmap(bmp.w, bmp.h);
        for (let y = 0; y < bmp.h; y++) for (let x = 0; x < bmp.w; x++) f.data[y * bmp.w + x] = bmp.data[y * bmp.w + (bmp.w - 1 - x)];
        bmp = f;
      }
      v = { cv: bmp.toCanvas(), bmp };
      cache.set(k, v);
    }
    return v;
  }

  CT.art.critters = { SPECIES, FISH, WATERS, renderAnimal, renderFish, animalCanvas, fishCanvas, tombstone };
})(typeof window !== 'undefined' ? window : globalThis);
