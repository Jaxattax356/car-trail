/* The Car Trail - procedural pixel-art toolkit.
 * Palette and painters for skies, dithered clouds, snow-capped mountains,
 * rolling hills, speckled grass, streaky water, trees, rocks, roads and buildings,
 * tuned to match the EGA/VGA look of the original game's scenes.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const { Mask, dith } = CT.gfx;

  const P = {
    black: '#000000', white: '#ffffff', ink: '#141018',
    sky0: '#4c9ce8', sky1: '#6cb8f4', sky2: '#8ccdfa', sky3: '#b4e0fc', haze: '#d4ecfc',
    cloud: '#ffffff', cloud1: '#dce8f8', cloud2: '#b4c8e4', cloud3: '#8ca4cc',
    mp0: '#4c2c7c', mp1: '#7440a8', mp2: '#9c5cc8', mp3: '#c088e0', mp4: '#dcb4f0',
    snow: '#f8f8ff', snow1: '#c8c4ec', snow2: '#a49cd8',
    mb0: '#2c4c8c', mb1: '#4468ac', mb2: '#6488c4', mb3: '#8cacdc',
    g0: '#14500c', g1: '#207018', g2: '#34961c', g3: '#50b828', g4: '#78d838', g5: '#b0f060',
    ol0: '#3c5418', ol1: '#5c7424', ol2: '#7c9434', ol3: '#a4b454',
    d0: '#402410', d1: '#643818', d2: '#8c5424', d3: '#b47c3c', d4: '#d8a864',
    s0: '#9c7438', s1: '#bc9450', s2: '#dab470', s3: '#ecd090', s4: '#f8ecbc',
    sg0: '#4c5c40', sg1: '#6c7c58', sg2: '#8c9c74', sg3: '#b0bc94',
    w0: '#0c3490', w1: '#1850c8', w2: '#3474ec', w3: '#6ca4fc', w4: '#b4d8ff',
    r0: '#4c2c1c', r1: '#7c4c2c', r2: '#a8704c', r3: '#cc9c70', r4: '#ecc8a0',
    gr0: '#34343c', gr1: '#585864', gr2: '#80808c', gr3: '#a8a8b4', gr4: '#d4d4dc',
    as0: '#2c2c34', as1: '#3c3c46', as2: '#50505c', line: '#f8d020', edge: '#e8e8e8',
    b0: '#5c1c14', b1: '#8c3020', b2: '#b44c30', b3: '#d07048',
    red: '#d42020', red1: '#8c1010', red2: '#f06060', blue: '#2040c0', blue1: '#102070',
    yel: '#f8e040', yel1: '#c8a018', orn: '#f09020', orn1: '#b85c10', grn: '#20a040',
    pine0: '#0c3414', pine1: '#18582a', pine2: '#2c8038', pine3: '#54a848', pine4: '#80c860',
    wood0: '#4c2c14', wood1: '#704020', wood2: '#94602c', wood3: '#bc8444',
    trunk0: '#3c2410', trunk1: '#5c3818', trunk2: '#7c5028',
    wall0: '#a8a090', wall1: '#c8c0ac', wall2: '#e8e0cc', wall3: '#f8f4e8',
    glass0: '#1c3050', glass1: '#3c5c84', glass2: '#6c9cc4', glass3: '#b4dcf4',
  };

  const A = { P };

  // ---- smooth 1D value noise (optionally periodic over n) ----
  A.noise = function (rng, n, octaves, loop) {
    const out = new Float32Array(n);
    (octaves || [[24, 1], [8, 0.5], [3, 0.25]]).forEach(([period, amp]) => {
      let per = period;
      if (loop) per = n / Math.max(1, Math.round(n / period));
      const cnt = Math.ceil(n / per) + 2;
      const vals = [];
      for (let i = 0; i < cnt; i++) vals.push(rng() * 2 - 1);
      const m = loop ? Math.round(n / per) : cnt;
      for (let x = 0; x < n; x++) {
        const f = x / per;
        const i = Math.floor(f);
        const t = f - i;
        const s = t * t * (3 - 2 * t);
        const a = vals[i % m], b = vals[(i + 1) % m];
        out[x] += amp * (a * (1 - s) + b * s);
      }
    });
    return out;
  };

  A.sky = function (b, y0, y1, stops) {
    b.vgrad(0, y0, b.w, y1 - y0, stops || [P.sky0, P.sky1, P.sky2]);
  };

  // Puffy cloud with a flat, dithered grey-blue underside.
  A.cloud = function (b, cx, cy, w, h, rng) {
    const m = new Mask(b.w, b.h);
    const n = Math.max(3, Math.round(w / (h * 0.8)));
    const base = cy + h * 0.3;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = cx - w / 2 + t * w;
      const bulge = Math.sin(t * Math.PI);
      const r = h * (0.32 + 0.42 * bulge) * (0.8 + rng() * 0.4);
      m.disc(x, base - r * 0.55, r);
    }
    for (let i = 0; i < n; i++) {
      const x = cx - w * 0.3 + rng() * w * 0.6;
      m.disc(x, base - h * 0.5 - rng() * h * 0.25, h * (0.22 + rng() * 0.28));
    }
    const cut = Math.ceil(base) + 1;
    for (let y = cut; y <= m.y1; y++) m.span(0, b.w - 1, y, 0);
    const top = m.y0;
    b.paint(m, (x, y) => {
      const t = (y - top) / Math.max(1, base - top);
      if (t > 0.8) return dith(x, y, Math.min(1, (t - 0.8) / 0.2) * 0.8) ? P.cloud2 : P.cloud1;
      if (t > 0.55) return dith(x, y, (t - 0.55) / 0.25 * 0.75) ? P.cloud1 : P.cloud;
      if (m.isEdge(x, y) && rng() < 0.45) return P.cloud1;
      return rng() < 0.04 ? P.cloud1 : P.cloud;
    });
  };

  A.clouds = function (b, list, rng) {
    list.forEach((c) => A.cloud(b, c[0], c[1], c[2], c[3], rng));
  };

  // Mountain range: peaks [{x,h,w,slant,shape}], lit on the left, shaded right, snow caps.
  A.PURPLE = { lit: P.mp2, mid: P.mp1, dark: P.mp0, hi: P.mp3, snow: P.snow, snowShade: P.snow1, line: P.mp0 };
  A.BLUE = { lit: P.mb2, mid: P.mb1, dark: P.mb0, hi: P.mb3, snow: P.snow, snowShade: P.snow1, line: P.mb0 };
  A.BROWN = { lit: P.r2, mid: P.r1, dark: P.r0, hi: P.r3, snow: P.snow, snowShade: P.snow1, line: P.r0 };
  A.SAGE = { lit: P.sg2, mid: P.sg1, dark: P.sg0, hi: P.sg3, snow: P.snow, snowShade: P.snow1, line: P.sg0 };
  A.mountains = function (b, o, rng) {
    const W = b.w;
    const pal = o.pal || A.PURPLE;
    const N = A.noise(rng, W + 4, [[20, 1], [7, 0.55], [3, 0.35]], o.loop);
    const N2 = A.noise(rng, W + 4, [[5, 1], [2, 0.6]], o.loop);
    const peaks = o.peaks;
    for (let x = 0; x < W; x++) {
      let best = 0, bi = -1;
      for (let i = 0; i < peaks.length; i++) {
        const p = peaks[i];
        let dx = Math.abs(x - p.x);
        if (o.loop) dx = Math.min(dx, W - dx);
        const u = dx / p.w;
        if (u < 1) {
          const v = p.h * (1 - Math.pow(u, p.shape || 0.85));
          if (v > best) { best = v; bi = i; }
        }
      }
      if (bi < 0) continue;
      const h = best + (o.jag == null ? 3 : o.jag) * N[x] * Math.min(1, best / 18);
      if (h <= 0.5) continue;
      const p = peaks[bi];
      const top = Math.round(o.baseY - h);
      const peakTop = o.baseY - p.h;
      const snowH = o.snowLine == null ? 9999 : o.snowLine;
      let snowDepth = h > snowH ? (h - snowH) * (o.snowFrac || 0.75) + N2[x] * 2.5 + 1 : 0;
      if (snowDepth > 0 && N2[x + 2] > 0.55) snowDepth += 4 + N2[x + 1] * 3;
      let px = p.x;
      if (o.loop) { const d = x - px; if (d > W / 2) px += W; else if (d < -W / 2) px -= W; }
      const slant = p.slant == null ? 0.45 : p.slant;
      for (let y = Math.max(0, top); y < o.baseY; y++) {
        const depth = y - top;
        const bx = px + (y - peakTop) * slant + N[(y * 3) % W] * 2;
        const lit = x < bx;
        let c;
        if (depth < snowDepth) c = lit ? pal.snow : pal.snowShade;
        else {
          const t = (y - top) / Math.max(1, o.baseY - top);
          if (lit) c = dith(x, y, Math.min(1, t * 1.1)) ? pal.mid : (depth < snowDepth + 2 && snowDepth > 0 ? pal.hi : pal.lit);
          else c = dith(x, y, Math.min(1, 0.35 + t * 0.6)) ? pal.dark : pal.mid;
          if (o.gullies && !lit && N2[(x + y) % W] > 0.7 && dith(x, y, 0.5)) c = pal.dark;
        }
        b.pset(x, y, c);
      }
      if (pal.line && o.outline !== false) b.pset(x, top, pal.line);
    }
  };

  // Rolling hills: fills from a wavy top edge down to `bottom`.
  A.hills = function (b, o, rng) {
    const W = b.w;
    const N = A.noise(rng, W, o.noise || [[30, 1], [9, 0.4]], o.loop);
    const top = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      let y = o.y;
      (o.waves || []).forEach(([per, amp, ph]) => { y += amp * Math.sin((2 * Math.PI * x) / per + (ph || 0)); });
      y += N[x] * (o.rough == null ? 2 : o.rough);
      top[x] = y;
    }
    const bottom = o.bottom == null ? b.h : o.bottom;
    for (let x = 0; x < W; x++) {
      const t0 = Math.round(top[x]);
      for (let y = Math.max(0, t0); y < bottom; y++) {
        let c = o.base;
        if (y === t0 && o.edge) c = o.edge;
        else if (o.fade && dith(x, y, Math.min(1, (y - t0) / o.fade))) c = o.base2 || o.base;
        b.pset(x, y, c);
      }
    }
    if (o.speckle) b.speckle(0, 0, W, bottom, (v, x, y) => y > top[x] + 1, o.speckle, o.density || 0.08, rng);
    return top;
  };

  // Grass/field texture with little vertical tufts, like the original's meadows.
  A.grass = function (b, x, y, w, h, rng, o) {
    const pal = o || {};
    b.rect(x, y, w, h, pal.base || P.g3);
    b.speckle(x, y, w, h, () => true, pal.speckle || [P.g2, P.g4], pal.density || 0.1, rng);
    const tufts = Math.round(w * h * (pal.tufts == null ? 0.012 : pal.tufts));
    for (let i = 0; i < tufts; i++) {
      const tx = x + Math.floor(rng() * w), ty = y + Math.floor(rng() * h);
      const len = 1 + Math.floor(rng() * (2 + ((ty - y) / h) * 3));
      const c = rng() < 0.6 ? pal.dark || P.g1 : pal.light || P.g5;
      b.vline(tx, ty - len, ty, c);
    }
  };

  // Streaky water inside a mask (white & light-blue dashes on blue).
  A.water = function (b, m, rng, o) {
    const opt = o || {};
    b.paint(m, (x, y) => (opt.base2 && dith(x, y, opt.mix || 0.25) ? opt.base2 : opt.base || P.w1));
    const dens = opt.streak == null ? 0.07 : opt.streak;
    for (let y = m.y0; y <= m.y1; y++) {
      const t = m.y1 > m.y0 ? (y - m.y0) / (m.y1 - m.y0) : 1;
      let x = m.x0;
      while (x <= m.x1) {
        if (m.has(x, y) && rng() < dens) {
          const len = 2 + Math.floor(rng() * (3 + t * (opt.longer || 5)));
          const r = rng();
          const c = r < 0.3 ? P.white : r < 0.62 ? P.w3 : r < 0.85 ? P.w2 : P.w0;
          for (let k = 0; k < len && m.has(x + k, y); k++) b.pset(x + k, y, c);
          x += len + 1;
        } else x++;
      }
    }
  };

  // River along a path of [x, y, halfWidth] points (perspective-flattened brush).
  A.river = function (b, pts, rng, o) {
    const opt = o || {};
    const m = new Mask(b.w, b.h);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1])));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const w = a[2] + (c[2] - a[2]) * t;
        m.ellipse(a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, w, Math.max(0.8, w * (opt.flat || 0.3)));
      }
    }
    if (opt.bank) {
      b.outline(m, opt.bank, true);
      if (opt.bank2) {
        const m2 = new Mask(b.w, b.h);
        for (let y = m.y0 - 1; y <= m.y1 + 1; y++) for (let x = m.x0 - 1; x <= m.x1 + 1; x++) if (m.has(x, y) || m.has(x - 1, y) || m.has(x + 1, y) || m.has(x, y - 1) || m.has(x, y + 1)) m2.set(x, y);
        b.outline(m2, opt.bank2);
      }
    }
    A.water(b, m, rng, opt);
    return m;
  };

  // ---- trees ----
  // Round leafy tree (like the big tree at the Kansas River crossing).
  A.roundTree = function (b, x, gy, size, rng, o) {
    const pal = Object.assign({ dark: P.g0, mid: P.g2, mid2: P.g1, light: P.g4, hi: P.g5, trunk: P.trunk1, trunkD: P.trunk0 }, o || {});
    const tw = Math.max(1, Math.round(size / 9));
    const th = size * 0.75;
    for (let i = 0; i < tw; i++) b.vline(x - (tw >> 1) + i, gy - th, gy, i === tw - 1 && tw > 1 ? pal.trunkD : pal.trunk);
    if (size > 14) {
      b.line(x, gy - th * 0.55, x - size * 0.28, gy - th * 0.95, pal.trunk);
      b.line(x, gy - th * 0.6, x + size * 0.3, gy - th * 1.0, pal.trunkD);
      b.line(x - 1, gy - 2, x - 3, gy, pal.trunkD);
      b.line(x + tw - 1, gy - 2, x + tw + 1, gy, pal.trunkD);
    }
    const cx = x, cy = gy - size * 0.95, r = size * 0.55;
    const m = new Mask(b.w, b.h);
    const n = 7 + Math.floor(size / 5);
    m.ellipse(cx, cy, r * 0.8, r * 0.7);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, d = rng() * r * 0.6;
      m.disc(cx + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d * 0.8, r * (0.3 + rng() * 0.3));
    }
    b.paint(m, (px, py) => {
      const dx = (px - cx) / r, dy = (py - cy) / r;
      let l = -0.65 * dx - 0.75 * dy + (rng() - 0.5) * 0.7;
      if (m.isEdge(px, py) && rng() < 0.5) return pal.dark;
      if (l > 0.55) return rng() < 0.35 ? pal.hi : pal.light;
      if (l > 0.15) return dith(px, py, 0.5) ? pal.light : pal.mid;
      if (l > -0.25) return rng() < 0.2 ? pal.light : pal.mid;
      if (l > -0.6) return dith(px, py, 0.5) ? pal.mid2 : pal.mid;
      return rng() < 0.15 ? pal.mid2 : pal.dark;
    });
    return m;
  };

  // Conifer with layered tiers (Willamette Valley / Blue Mountains).
  A.pine = function (b, x, gy, h, rng, o) {
    const pal = Object.assign({ dark: P.pine0, mid: P.pine1, light: P.pine2, hi: P.pine3, trunk: P.trunk1 }, o || {});
    const w = h * (o && o.wide ? o.wide : 0.36);
    b.vline(x, gy - Math.max(2, h * 0.12), gy, pal.trunk);
    const tiers = Math.max(2, Math.round(h / 5));
    const top = gy - h;
    const m = new Mask(b.w, b.h);
    for (let i = 0; i < tiers; i++) {
      const t0 = i / tiers, t1 = (i + 1.35) / tiers;
      const y0 = top + t0 * h * 0.9, y1 = Math.min(gy - h * 0.1, top + t1 * h * 0.9);
      const hw = w * (0.25 + 0.75 * ((i + 1) / tiers)) * (0.9 + rng() * 0.2);
      m.poly([[x, y0], [x + hw, y1], [x - hw, y1]]);
    }
    b.paint(m, (px, py) => {
      const rel = (px - x) / Math.max(1, w);
      if (m.isEdge(px, py)) return rel < -0.1 && rng() < 0.6 ? pal.light : pal.dark;
      if (rel < -0.35) return rng() < 0.4 ? pal.hi : pal.light;
      if (rel < 0.05) return rng() < 0.25 ? pal.light : pal.mid;
      return rng() < 0.2 ? pal.mid : pal.dark;
    });
    return m;
  };

  A.bush = function (b, x, y, r, rng, o) {
    const pal = Object.assign({ dark: P.g0, mid: P.g1, light: P.g3 }, o || {});
    const m = new Mask(b.w, b.h);
    m.ellipse(x, y - r * 0.5, r, r * 0.6);
    m.ellipse(x - r * 0.4, y - r * 0.4, r * 0.6, r * 0.45);
    m.ellipse(x + r * 0.45, y - r * 0.35, r * 0.55, r * 0.4);
    for (let yy = Math.ceil(y) + 1; yy <= m.y1; yy++) m.span(0, b.w - 1, yy, 0);
    b.paint(m, (px, py) => {
      const up = (y - py) / Math.max(1, r);
      if (m.isEdge(px, py) && py > y - 1) return pal.dark;
      if (up > 0.6 && px < x) return rng() < 0.5 ? pal.light : pal.mid;
      return rng() < 0.25 ? pal.dark : pal.mid;
    });
  };
  A.sage = (b, x, y, r, rng) => A.bush(b, x, y, r, rng, { dark: P.sg0, mid: P.sg1, light: P.sg3 });

  // ---- rock formations ----
  // Generic lit-from-left shaded polygon with horizontal strata.
  A.rockShape = function (b, pts, cx, rng, o) {
    const pal = Object.assign({ lit: P.r3, mid: P.r2, dark: P.r1, deep: P.r0, hi: P.r4 }, o || {});
    const m = new Mask(b.w, b.h);
    m.poly(pts);
    const strata = A.noise(rng, 400, [[9, 1], [3, 0.5]]);
    b.paint(m, (x, y) => {
      const edgeL = !m.has(x - 1, y);
      const rel = x - cx - (o && o.slantFn ? o.slantFn(y) : 0);
      let c;
      if (edgeL) c = pal.hi;
      else if (rel < -4) c = dith(x, y, 0.15) ? pal.mid : pal.lit;
      else if (rel < 2) c = dith(x, y, 0.55) ? pal.dark : pal.mid;
      else c = dith(x, y, 0.3) ? pal.deep : pal.dark;
      if (o && o.strata && ((y + Math.round(strata[x % 400] * 2)) % o.strata === 0) && rng() < 0.8) c = rel < 2 ? pal.dark : pal.deep;
      return c;
    });
    if (!(o && o.noOutline)) b.outline(m, pal.deep);
    return m;
  };

  // Layered sedimentary bluff: horizontal strata, lit top edge, shaded right edge.
  A.bluff = function (b, pts, rng, pal) {
    const c = Object.assign({ a: '#e8dcc0', b: '#d4c4a4', c: '#bcaa88', shade: '#98886c', deep: '#786850', top: '#f8f0dc' }, pal || {});
    const m = new Mask(b.w, b.h);
    m.poly(pts);
    const N = A.noise(rng, b.w, [[14, 1], [4, 0.5]]);
    b.paint(m, (x, y) => {
      if (!m.has(x, y - 1)) return c.top;
      let right = 0;
      while (right < 7 && m.has(x + right + 1, y)) right++;
      if (right < 2) return c.deep;
      if (right < 6) return dith(x, y, 0.5) ? c.shade : c.c;
      const band = Math.floor((y + N[x] * 2.5) / 4) % 3;
      const base = band === 0 ? c.a : band === 1 ? c.b : c.c;
      return rng() < 0.06 ? c.shade : base;
    });
    return m;
  };

  // ---- man-made stuff ----
  A.road = function (b, o, rng) {
    const m = new Mask(b.w, b.h);
    const rows = [];
    for (let y = o.y0; y <= o.y1; y++) {
      const t = (y - o.y0) / Math.max(1, o.y1 - o.y0);
      const tt = o.curve ? Math.pow(t, o.curve) : t;
      const cx = o.x0 + (o.x1 - o.x0) * tt + (o.bend || 0) * Math.sin(t * Math.PI);
      const hw = o.w0 + (o.w1 - o.w0) * t;
      rows[y] = { cx, hw, t };
      m.span(Math.round(cx - hw), Math.round(cx + hw), y);
    }
    if (o.shoulder) b.outline(m, o.shoulder);
    b.paint(m, (x, y) => (rng() < 0.12 ? P.as2 : dith(x, y, 0.3) ? P.as0 : P.as1));
    for (let y = o.y0; y <= o.y1; y++) {
      const r = rows[y];
      if (!r) continue;
      if (r.hw > 3 && o.edges !== false) {
        b.pset(Math.round(r.cx - r.hw * 0.9), y, P.edge);
        b.pset(Math.round(r.cx + r.hw * 0.9), y, P.edge);
      }
      const z = 1 / (r.t * 0.95 + 0.05);
      if (o.dashes !== false && Math.floor(z * (o.dashFreq || 1.6)) % 2 === 0) {
        const lw = Math.max(0, Math.round(r.hw * 0.035));
        b.hline(Math.round(r.cx) - lw, Math.round(r.cx) + lw, y, P.line);
      }
    }
    return { mask: m, rows };
  };

  // Road sign with text lines on posts. Returns bounding box.
  A.sign = function (b, x, y, lines, o) {
    const opt = Object.assign({ bg: '#1a7a30', fg: P.white, border: P.white, post: P.gr1, postH: 8, pad: 2 }, o || {});
    const w = Math.max(...lines.map((l) => CT.font.width(l))) + opt.pad * 2 + 2;
    const h = lines.length * 9 + opt.pad * 2;
    const x0 = Math.round(x - w / 2);
    if (opt.postH > 0) {
      b.rect(x0 + 2, y + h, 1, opt.postH, opt.post);
      b.rect(x0 + w - 3, y + h, 1, opt.postH, opt.post);
    }
    b.rect(x0, y, w, h, opt.bg);
    if (opt.border) b.frame(x0, y, w, h, opt.border);
    lines.forEach((l, i) => b.textCenter(l, x, y + opt.pad + 1 + i * 9, opt.fg));
    return { x: x0, y, w, h };
  };

  // Small pixel text for signs that must be tiny: 3x5 capitals/digits.
  const TINY = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', '.': '000000000000010', '$': '011110010011110', '-': '000000111000000', ' ': '000000000000000',
    "'": '010010000000000', '/': '001001010100100', '!': '010010010000010', ',': '000000000010100', '&': '010101010101011',
  };
  A.tiny = function (b, str, x, y, c) {
    str = String(str).toUpperCase();
    for (let i = 0; i < str.length; i++) {
      const g = TINY[str[i]] || TINY[' '];
      for (let k = 0; k < 15; k++) if (g[k] === '1') b.pset(x + i * 4 + (k % 3), y + Math.floor(k / 3), c);
    }
  };
  A.tinyWidth = (str) => String(str).length * 4 - 1;
  A.tinyCenter = (b, str, cx, y, c) => A.tiny(b, str, Math.round(cx - A.tinyWidth(str) / 2), y, c);

  A.pole = function (b, x, gy, h) {
    b.vline(x, gy - h, gy, P.wood1);
    b.hline(x - 3, x + 3, gy - h + 2, P.wood1);
    b.pset(x - 3, gy - h + 1, P.gr3);
    b.pset(x + 3, gy - h + 1, P.gr3);
  };
  A.wire = function (b, x0, y0, x1, y1, sag) {
    const n = Math.abs(x1 - x0);
    for (let i = 0; i <= n; i++) {
      const t = i / Math.max(1, n);
      b.pset(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag), P.ink);
    }
  };

  A.fence = function (b, x0, x1, y, o) {
    const c = (o && o.color) || P.wood1;
    for (let x = x0; x <= x1; x += 6) b.vline(x, y - 4, y, c);
    b.hline(x0, x1, y - 3, (o && o.wire) || P.gr2);
    b.hline(x0, x1, y - 1, (o && o.wire) || P.gr2);
  };

  // Simple building with windows. o: {wall, wall2, roof, win, door, sign, signBg, signFg, roofH, awning}
  A.building = function (b, x, gy, w, h, o) {
    const opt = Object.assign({ wall: P.wall1, wallD: P.wall0, roof: P.gr1, win: P.glass1, winHi: P.glass2, door: P.wood1, roofH: 2 }, o || {});
    const y = gy - h;
    b.rect(x, y, w, h, opt.wall);
    b.rect(x + w - Math.max(1, Math.round(w * 0.12)), y, Math.max(1, Math.round(w * 0.12)), h, opt.wallD);
    if (opt.brick) {
      for (let yy = y + 1; yy < gy; yy += 2) for (let xx = x + ((yy >> 1) & 1) * 2; xx < x + w - 1; xx += 4) b.pset(xx, yy, opt.wallD);
    }
    b.rect(x - 1, y - opt.roofH, w + 2, opt.roofH, opt.roof);
    if (opt.pitched) {
      b.poly([[x - 2, y], [x + w / 2, y - opt.pitched], [x + w + 2, y]], opt.roof);
      b.line(x - 2, y, x + w / 2, y - opt.pitched, P.ink);
      b.line(x + w / 2, y - opt.pitched, x + w + 2, y, P.ink);
    }
    const rows = opt.rows == null ? Math.max(1, Math.floor((h - 6) / 7)) : opt.rows;
    const cols = opt.cols == null ? Math.max(1, Math.floor((w - 2) / 6)) : opt.cols;
    const top = opt.winTop == null ? 3 : opt.winTop;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 2 + Math.round(c * ((w - 4) / cols)) + 1;
        const wy = y + top + r * 7;
        if (wy + 4 > gy - (opt.door ? 6 : 1)) continue;
        b.rect(wx, wy, 3, 4, opt.win);
        b.pset(wx, wy, opt.winHi);
      }
    }
    if (opt.door) b.rect(x + Math.round(w / 2) - 2, gy - 6, 4, 6, opt.door);
    if (opt.awning) {
      for (let xx = x; xx < x + w; xx++) b.vline(xx, gy - 10, gy - 9, ((xx - x) >> 1) & 1 ? opt.awning : P.white);
    }
    if (opt.sign) {
      const sw = A.tinyWidth(opt.sign) + 4;
      const sx = Math.round(x + w / 2 - sw / 2);
      const sy = y - opt.roofH - 8;
      b.rect(sx, sy, sw, 7, opt.signBg || P.red);
      A.tiny(b, opt.sign, sx + 2, sy + 1, opt.signFg || P.white);
    }
  };

  A.gasStation = function (b, x, gy, o) {
    const opt = Object.assign({ brand: 'GAS', price: '3.49', color: P.red, w: 44 }, o || {});
    const w = opt.w;
    // store
    A.building(b, x + w - 16, gy, 22, 14, { wall: P.wall2, wallD: P.wall0, roof: opt.color, rows: 1, cols: 3, door: P.glass1 });
    // canopy
    b.rect(x, gy - 17, w - 14, 4, P.white);
    b.rect(x, gy - 14, w - 14, 1, opt.color);
    b.rect(x + 3, gy - 13, 2, 13, P.gr3);
    b.rect(x + w - 21, gy - 13, 2, 13, P.gr3);
    // pumps
    for (const px of [x + 9, x + w - 29]) {
      b.rect(px, gy - 7, 4, 7, P.gr4);
      b.rect(px, gy - 7, 4, 2, opt.color);
      b.pset(px + 1, gy - 4, P.ink);
    }
    // price sign on a pole
    const sx = x - 8;
    const sw = Math.max(16, A.tinyWidth(opt.brand) + 5, A.tinyWidth(opt.price) + 5);
    b.rect(sx + 3, gy - 30, 2, 30, P.gr2);
    b.rect(sx + 4 - Math.floor(sw / 2), gy - 39, sw, 13, opt.color);
    b.frame(sx + 4 - Math.floor(sw / 2), gy - 39, sw, 13, P.white);
    A.tinyCenter(b, opt.brand, sx + 4, gy - 37, P.white);
    b.rect(sx + 5 - Math.floor(sw / 2), gy - 32, sw - 2, 5, P.white);
    A.tinyCenter(b, opt.price, sx + 4, gy - 32, P.ink);
  };

  A.waterTower = function (b, x, gy, h, label, o) {
    const c = (o && o.color) || P.gr3;
    const cd = (o && o.dark) || P.gr1;
    const tw = 22, th = 12;
    const ty = gy - h;
    b.line(x - 7, gy, x - 5, ty + th, cd);
    b.line(x + 7, gy, x + 5, ty + th, cd);
    b.line(x - 2, gy, x - 1, ty + th, cd);
    b.line(x + 2, gy, x + 1, ty + th, cd);
    b.line(x - 6, gy - (h - th) * 0.5, x + 6, gy - (h - th) * 0.5, cd);
    const m = new Mask(b.w, b.h);
    m.ellipse(x, ty + th * 0.55, tw / 2, th / 2);
    m.rect(x - tw / 2 + 1, ty + 2, tw - 2, th * 0.5);
    b.paint(m, (px, py) => (px > x + 5 ? cd : px < x - 6 ? P.white : c));
    b.poly([[x - tw / 2, ty + 3], [x, ty - 3], [x + tw / 2, ty + 3]], cd);
    if (label) A.tinyCenter(b, label, x, ty + 4, (o && o.ink) || P.blue1);
  };

  A.silos = function (b, x, gy, h) {
    for (let i = 0; i < 4; i++) {
      const sx = x + i * 7;
      b.rect(sx, gy - h, 7, h, i % 2 ? P.wall1 : P.wall2);
      b.vline(sx + 6, gy - h, gy, P.wall0);
      b.hline(sx, sx + 6, gy - h, P.wall0);
    }
    b.rect(x + 8, gy - h - 12, 12, 12, P.wall2);
    b.vline(x + 19, gy - h - 12, gy - h, P.wall0);
    b.rect(x + 10, gy - h - 16, 8, 4, P.wall1);
  };

  A.flag = function (b, x, gy, h) {
    b.vline(x, gy - h, gy, P.gr4);
    const fy = gy - h;
    for (let r = 0; r < 7; r++) b.hline(x + 1, x + 11, fy + r, r % 2 ? P.white : P.red);
    b.rect(x + 1, fy, 5, 4, P.blue);
    b.pset(x + 2, fy + 1, P.white); b.pset(x + 4, fy + 2, P.white);
  };

  A.person = function (b, x, gy, shirt, o) {
    const skin = (o && o.skin) || '#e0a878';
    b.rect(x, gy - 3, 1, 3, P.blue1);
    b.rect(x + 2, gy - 3, 1, 3, P.blue1);
    b.rect(x, gy - 7, 3, 4, shirt || P.red);
    b.rect(x, gy - 9, 3, 2, skin);
    b.hline(x, x + 2, gy - 10, (o && o.hair) || P.d1);
  };

  A.cow = function (b, x, gy, flip) {
    const s = flip ? -1 : 1;
    b.rect(x - 4, gy - 5, 9, 4, P.ink);
    b.rect(x - 3, gy - 5, 3, 2, P.white);
    b.rect(x + 1, gy - 3, 2, 1, P.white);
    b.rect(x + s * 5 - (s < 0 ? 2 : 0), gy - 6, 3, 3, P.ink);
    b.vline(x - 3, gy - 1, gy, P.ink); b.vline(x + 3, gy - 1, gy, P.ink);
  };

  A.bison = function (b, x, gy, flip) {
    const s = flip ? -1 : 1;
    b.ellipse(x, gy - 4, 5, 3, P.d0);
    b.ellipse(x + s * 3, gy - 5, 3, 3.5, P.d1);
    b.rect(x + s * 6 - 1, gy - 5, 2, 3, P.d0);
    b.vline(x - 3, gy - 2, gy, P.d0); b.vline(x + 3, gy - 2, gy, P.d0);
  };

  CT.art = CT.art || {};
  CT.art.A = A;
  CT.art.P = P;
})(typeof window !== 'undefined' ? window : globalThis);
