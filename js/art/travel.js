/* The Car Trail - the scrolling travel strip shown while driving.
 * Tileable parallax layers (clouds, far range, mid hills, roadside, foreground)
 * are generated per region and season; the road and car are drawn per frame.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const { Bitmap, dith } = CT.gfx;
  const A = CT.art.A;
  const P = CT.art.P;

  const TW = 640; // tile width
  const SH = 112; // strip height
  const HORIZON = 60;
  const ROAD_Y = 84, ROAD_H = 16;

  const REG = {
    plains: { far: 'hills', farPal: [P.mb2, P.mb1], mid: 'farms', ground: { base: P.g3, speckle: [P.g2, P.g4], dark: P.g1, light: P.g5 }, road: 'poles' },
    platte: { far: 'bluffs', farPal: ['#c8a47c', '#a8845c'], mid: 'prairie', ground: { base: '#a8b44c', speckle: ['#8c9c3c', '#c4cc6c'], dark: '#6c7c30', light: '#dce08c' }, road: 'fence' },
    wyoming: { far: 'peaks', farPal: A.PURPLE, mid: 'buttes', ground: { base: '#b4a868', speckle: ['#9c9058', '#c8bc80', P.sg1], dark: P.sg0, light: '#dcd4a0' }, road: 'sage' },
    mountain: { far: 'bigpeaks', farPal: A.PURPLE, mid: 'pineslope', ground: { base: '#a8a060', speckle: ['#8c8850', '#c0b878'], dark: P.sg0, light: '#d8d098' }, road: 'rail' },
    idaho: { far: 'peaks', farPal: A.BROWN, mid: 'lava', ground: { base: '#b4a868', speckle: ['#9c9058', '#c8bc80', P.sg1], dark: P.sg0, light: '#dcd4a0' }, road: 'poles' },
    forest: { far: 'peaks', farPal: A.BLUE, mid: 'forest', ground: { base: P.g2, speckle: [P.g1, P.g3], dark: P.g0, light: P.g4 }, road: 'pines' },
    oregon: { far: 'hills', farPal: [P.mb2, P.mb1], mid: 'wheat', ground: { base: '#d0b460', speckle: ['#b89c4c', '#e4cc7c'], dark: '#98803c', light: '#f0e0a0' }, road: 'poles' },
    hood: { far: 'hood', farPal: A.PURPLE, mid: 'forest', ground: { base: P.g2, speckle: [P.g1, P.g3], dark: P.g0, light: P.g4 }, road: 'pines' },
  };
  const SNOW_GROUND = { base: '#e8ecf4', speckle: ['#c8d0e0', '#ffffff', '#b4bcd0'], dark: '#a0a8bc', light: '#ffffff' };

  function wrap(fn, x, margin) {
    fn(x);
    const m = margin || 40;
    if (x < m) fn(x + TW);
    if (x > TW - m) fn(x - TW);
  }

  function mkClouds(rng) {
    const b = new Bitmap(TW, 44);
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 104 + rng() * 30;
      const w = 50 + rng() * 50, h = 10 + rng() * 6;
      wrap((xx) => A.cloud(b, xx, 8 + rng() * 18, w, h, CT.U.rng(i * 97 + 3)), x, 60);
    }
    return b;
  }

  function mkFar(kind, pal, rng, snow) {
    const b = new Bitmap(TW, HORIZON + 4);
    const base = HORIZON + 2;
    if (kind === 'hills') {
      A.hills(b, { y: base - 10, bottom: base, waves: [[320, 4, 0], [160, 3, 1], [80, 1.5, 2]], base: pal[0], edge: pal[0], fade: 8, base2: pal[1], loop: true, rough: 1.5 }, rng);
    } else if (kind === 'bluffs') {
      const N = A.noise(rng, TW, [[80, 1], [20, 0.3]], true);
      for (let x = 0; x < TW; x++) {
        const plateau = N[x] > 0.1 ? 14 + N[x] * 6 : 3 + (N[x] + 1) * 5;
        const top = Math.round(base - plateau);
        for (let y = top; y < base; y++) b.pset(x, y, y === top ? '#e0c49c' : dith(x, y, (y - top) / 16) ? pal[1] : pal[0]);
      }
    } else if (kind === 'peaks' || kind === 'bigpeaks') {
      const big = kind === 'bigpeaks';
      const peaks = [];
      for (let i = 0; i < (big ? 9 : 10); i++) peaks.push({ x: i * (TW / (big ? 9 : 10)) + rng() * 30, h: (big ? 30 : 16) + rng() * (big ? 22 : 16), w: (big ? 40 : 30) + rng() * 20 });
      A.mountains(b, { baseY: base, peaks, pal, snowLine: snow ? 4 : big ? 16 : 12, gullies: true, loop: true }, rng);
    } else if (kind === 'hood') {
      A.hills(b, { y: base - 8, bottom: base, waves: [[320, 3, 0], [128, 2, 1]], base: P.mb2, edge: P.mb3, fade: 8, base2: P.mb1, loop: true }, rng);
      A.mountains(b, { baseY: base - 4, peaks: [{ x: 160, h: 50, w: 50, slant: 0.5, shape: 0.95 }, { x: 480, h: 36, w: 42, slant: 0.5, shape: 0.95 }], pal, snowLine: 10, snowFrac: 0.85, jag: 1.5, loop: true }, rng);
    }
    return b;
  }

  function mkMid(kind, rng, snow) {
    const b = new Bitmap(TW, 30);
    const g = (c) => (snow ? SNOW_GROUND.base : c);
    const gs = (c) => (snow ? SNOW_GROUND.speckle[0] : c);
    switch (kind) {
      case 'farms': {
        A.hills(b, { y: 10, bottom: 30, waves: [[320, 3, 0], [128, 2, 1]], base: g('#6cb834'), edge: g('#8cd048'), loop: true, speckle: [gs('#4c9c24')], density: 0.12 }, rng);
        for (let i = 0; i < 5; i++) {
          const x = i * 128 + rng() * 60;
          wrap((xx) => { b.rect(xx, 14, 40, 6, snow ? '#dce0ec' : i % 2 ? '#c8b050' : '#5c9c2c'); for (let k = 0; k < 40; k += 3) b.vline(xx + k, 14, 19, snow ? '#c8ccd8' : i % 2 ? '#a89040' : '#4c8424'); }, x, 50);
        }
        for (let i = 0; i < 4; i++) {
          const x = 60 + i * 160 + rng() * 40;
          wrap((xx) => { A.building(b, xx, 14, 12, 8, { wall: '#b43424', wallD: '#8c2418', roof: snow ? P.white : P.gr1, rows: 0, pitched: 4 }); A.silos(b, xx + 14, 14, 10); }, x, 40);
        }
        for (let i = 0; i < 18; i++) { const x = rng() * TW; wrap((xx) => A.roundTree(b, xx, 14 + rng() * 6, 7 + rng() * 5, rng, snow ? { mid: '#5c7c5c', light: '#e8ecf4', hi: P.white } : {}), x, 20); }
        break;
      }
      case 'prairie':
        A.hills(b, { y: 12, bottom: 30, waves: [[320, 2, 0], [160, 2, 2]], base: g('#9cac48'), edge: g('#b8c464'), loop: true, speckle: [gs('#7c8c38')], density: 0.14 }, rng);
        for (let i = 0; i < 14; i++) { const x = rng() * TW; wrap((xx) => A.cow(b, xx, 18 + rng() * 6, rng() < 0.5), x, 10); }
        break;
      case 'buttes':
        A.hills(b, { y: 14, bottom: 30, waves: [[320, 3, 0], [106, 2, 1]], base: g('#b8a870'), edge: g('#d0c088'), loop: true, speckle: [gs('#9c9058'), gs(P.sg1)], density: 0.18 }, rng);
        for (let i = 0; i < 4; i++) {
          const x = i * 160 + rng() * 60, w = 30 + rng() * 30, h = 10 + rng() * 8;
          wrap((xx) => A.rockShape(b, [[xx - w / 2 - 6, 18], [xx - w / 2, 18 - h], [xx + w / 2, 18 - h], [xx + w / 2 + 6, 18]], xx, rng, { strata: 3, lit: '#d4a47c', mid: '#b8845c', dark: '#946440', deep: '#6c4428', hi: snow ? P.white : '#ecc8a0' }), x, 60);
        }
        break;
      case 'pineslope':
        A.hills(b, { y: 8, bottom: 30, waves: [[320, 4, 0], [128, 3, 1]], base: g('#7c8c48'), edge: g('#9cac5c'), loop: true, speckle: [gs('#5c6c34')], density: 0.14 }, rng);
        for (let i = 0; i < 36; i++) { const x = rng() * TW; wrap((xx) => A.pine(b, xx, 16 + rng() * 12, 8 + rng() * 8, rng, snow ? { light: '#e8ecf4', hi: P.white } : {}), x, 10); }
        break;
      case 'lava':
        A.hills(b, { y: 14, bottom: 30, waves: [[320, 2, 0], [128, 2, 2]], base: g('#a09c68'), edge: g('#bcb484'), loop: true, speckle: [gs('#5c5048'), gs('#8c8858')], density: 0.16 }, rng);
        for (let i = 0; i < 4; i++) { const x = i * 160 + rng() * 60; wrap((xx) => { b.rect(xx, 18, 50, 5, snow ? '#e0e4ec' : '#4ca42c'); for (let k = 0; k < 50; k += 2) b.pset(xx + k, 18, snow ? P.white : '#6cc440'); }, x, 60); }
        for (let i = 0; i < 12; i++) { const x = rng() * TW; wrap((xx) => b.ellipse(xx, 22, 5 + rng() * 5, 2 + rng() * 2, '#3c3430'), x, 12); }
        break;
      case 'forest':
        A.hills(b, { y: 6, bottom: 30, waves: [[320, 4, 0], [128, 3, 1]], base: g(P.g1), edge: g(P.g2), loop: true }, rng);
        for (let i = 0; i < 70; i++) { const x = rng() * TW; wrap((xx) => A.pine(b, xx, 14 + rng() * 14, 10 + rng() * 10, rng, snow ? { light: '#e8ecf4', hi: P.white } : {}), x, 10); }
        break;
      case 'wheat':
        A.hills(b, { y: 10, bottom: 30, waves: [[320, 4, 0], [106, 3, 1]], base: g('#dcb85c'), edge: g('#f0d480'), loop: true, speckle: [gs('#c49c44')], density: 0.16 }, rng);
        for (let i = 0; i < 3; i++) { const x = 80 + i * 213; wrap((xx) => { b.vline(xx, 2, 18, P.white); b.line(xx, 3, xx - 5, 1, P.white); b.line(xx, 3, xx + 5, 1, P.white); b.line(xx, 3, xx, -2, P.white); }, x, 10); }
        break;
      default: break;
    }
    return b;
  }

  const NEAR_Y = 44; // near layer spans NEAR_Y..SH; grass starts at GRASS_Y
  const GRASS_Y = 70;
  function mkNear(kind, rng, snow, ground) {
    const b = new Bitmap(TW, SH - NEAR_Y);
    // ground band behind the road (transparent above so the mid layer shows)
    const gpal = snow ? SNOW_GROUND : ground;
    A.grass(b, 0, GRASS_Y - NEAR_Y, TW, SH - GRASS_Y, rng, Object.assign({}, gpal, { tufts: 0.01 }));
    for (let x = 0; x < TW; x++) b.pset(x, GRASS_Y - NEAR_Y, gpal.light);
    const top = ROAD_Y - NEAR_Y; // road top within this layer
    switch (kind) {
      case 'poles':
        for (let x = 20; x < TW; x += 80) { A.pole(b, x, top - 2, 24); }
        for (let x = 20; x < TW; x += 80) A.wire(b, x - 3, top - 25, x + 77, top - 25, 3);
        for (let i = 0; i < 10; i++) { const x = rng() * TW; wrap((xx) => A.bush(b, xx, top - 1, 3 + rng() * 3, rng, snow ? { mid: '#c8d0dc', light: P.white } : {}), x, 10); }
        break;
      case 'fence':
        A.fence(b, 0, TW, top - 3);
        for (let i = 0; i < 12; i++) { const x = rng() * TW; wrap((xx) => A.sage(b, xx, top - 1, 2 + rng() * 2, rng), x, 8); }
        break;
      case 'sage':
        for (let x = 30; x < TW; x += 160) { for (let k = 0; k < 24; k += 2) b.vline(x + k, top - 12, top - 2, P.wood1); b.hline(x, x + 22, top - 11, P.wood0); }
        for (let i = 0; i < 26; i++) { const x = rng() * TW; wrap((xx) => A.sage(b, xx, top - 1 - rng() * 8, 2 + rng() * 3, rng), x, 8); }
        break;
      case 'rail':
        for (let x = 0; x < TW; x += 10) b.vline(x, top - 4, top - 1, P.gr1);
        b.hline(0, TW - 1, top - 4, P.gr3); b.hline(0, TW - 1, top - 3, P.gr2);
        for (let i = 0; i < 10; i++) { const x = rng() * TW; wrap((xx) => A.pine(b, xx, top - 5, 14 + rng() * 10, rng, snow ? { light: '#e8ecf4', hi: P.white } : {}), x, 10); }
        break;
      case 'pines':
        for (let i = 0; i < 16; i++) { const x = rng() * TW; wrap((xx) => A.pine(b, xx, top - 1 - rng() * 4, 18 + rng() * 14, rng, snow ? { light: '#e8ecf4', hi: P.white } : {}), x, 12); }
        break;
      default: break;
    }
    // mile marker signs
    for (let x = 100; x < TW; x += 320) { b.vline(x, top - 8, top - 1, P.gr2); b.rect(x - 2, top - 12, 5, 6, '#1a6a30'); b.pset(x, top - 10, P.white); }
    return b;
  }

  function mkFore(rng, snow, ground) {
    const h = SH - (ROAD_Y + ROAD_H);
    const b = new Bitmap(TW, h);
    A.grass(b, 0, 0, TW, h, rng, Object.assign({}, snow ? SNOW_GROUND : ground, { tufts: 0.03 }));
    return b;
  }

  const cache = new Map();
  function layers(region, snow) {
    const key = region + '|' + (snow ? 1 : 0);
    let L = cache.get(key);
    if (L) return L;
    const r = REG[region] || REG.plains;
    let seed = 0;
    for (const ch of region) seed = (seed * 131 + ch.charCodeAt(0)) >>> 0;
    const rng = CT.U.rng(seed + (snow ? 7 : 0));
    const sky = new Bitmap(320, HORIZON + 4);
    A.sky(sky, 0, HORIZON + 4, snow ? ['#8ca4c4', '#a8bcd8', '#c8d4e8'] : [P.sky0, P.sky1, P.sky2, P.sky3]);
    L = {
      sky: sky.toCanvas(),
      clouds: mkClouds(rng).toCanvas(),
      far: mkFar(r.far, r.farPal, rng, snow).toCanvas(),
      mid: mkMid(r.mid, rng, snow).toCanvas(),
      near: mkNear(r.road, rng, snow, r.ground).toCanvas(),
      fore: mkFore(rng, snow, r.ground).toCanvas(),
    };
    cache.set(key, L);
    return L;
  }

  function tile(ctx, cv, off, y) {
    const o = ((off % TW) + TW) % TW;
    ctx.drawImage(cv, Math.round(o - TW), y);
    ctx.drawImage(cv, Math.round(o), y);
  }

  // Draw the strip. st = {region, snow, scroll, frame, carId, bounce, weather, time}
  function draw(ctx, x0, y0, st) {
    const L = layers(st.region, st.snow);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, 320, SH);
    ctx.clip();
    const s = st.scroll || 0;
    ctx.drawImage(L.sky, x0, y0);
    tile(ctx, L.clouds, s * 0.03 + (st.time || 0) * 2, y0 + 2);
    tile(ctx, L.far, s * 0.06, y0);
    tile(ctx, L.mid, s * 0.2, y0 + HORIZON - 12);
    tile(ctx, L.near, s * 0.7, y0 + NEAR_Y);
    // road
    ctx.fillStyle = P.as1;
    ctx.fillRect(x0, y0 + ROAD_Y, 320, ROAD_H);
    ctx.fillStyle = P.as0;
    ctx.fillRect(x0, y0 + ROAD_Y + ROAD_H - 2, 320, 2);
    ctx.fillStyle = P.edge;
    ctx.fillRect(x0, y0 + ROAD_Y + 1, 320, 1);
    ctx.fillRect(x0, y0 + ROAD_Y + ROAD_H - 3, 320, 1);
    ctx.fillStyle = P.line;
    const dash = (((s * 1.0) % 24) + 24) % 24;
    for (let x = -24 + dash; x < 320; x += 24) ctx.fillRect(x0 + Math.round(x), y0 + ROAD_Y + 8, 12, 1);
    tile(ctx, L.fore, s * 1.1, y0 + ROAD_Y + ROAD_H);
    // car
    const cs = CT.art.cars.size(st.carId, 1);
    const cx = x0 + 136;
    const gy = y0 + ROAD_Y + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(cx + 3, gy, cs.w - 8, 2);
    CT.art.cars.drawCtx(ctx, st.carId, cx, gy, 1, st.frame || 0, { bounce: st.bounce || 0 });
    // exhaust puffs
    if (st.moving) {
      for (let i = 0; i < 3; i++) {
        const t = ((st.time || 0) * 1.6 + i / 3) % 1;
        ctx.fillStyle = t < 0.5 ? 'rgba(220,220,230,0.8)' : 'rgba(200,200,210,0.5)';
        const r = 1 + Math.round(t * 2);
        ctx.fillRect(cx + cs.w - 2 + Math.round(t * 16), gy - 5 - Math.round(t * 4), r, r);
      }
    }
    // weather overlay
    if (st.weather === 'rain' || st.weather === 'storm') {
      ctx.fillStyle = 'rgba(40,60,110,0.18)';
      ctx.fillRect(x0, y0, 320, SH);
      ctx.fillStyle = '#b8d0f0';
      const n = st.weather === 'storm' ? 70 : 40;
      for (let i = 0; i < n; i++) {
        const px = (i * 53 + Math.floor((st.time || 0) * 90) * (1 + (i % 3))) % 330 - 5;
        const py = (i * 37 + Math.floor((st.time || 0) * 240)) % SH;
        ctx.fillRect(x0 + px, y0 + py, 1, 3);
      }
      if (st.weather === 'storm' && Math.floor((st.time || 0) * 3) % 17 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x0, y0, 320, SH); }
    } else if (st.weather === 'snow' || st.weather === 'blizzard') {
      ctx.fillStyle = st.weather === 'blizzard' ? 'rgba(230,236,248,0.35)' : 'rgba(230,236,248,0.12)';
      ctx.fillRect(x0, y0, 320, SH);
      ctx.fillStyle = '#ffffff';
      const n = st.weather === 'blizzard' ? 110 : 50;
      for (let i = 0; i < n; i++) {
        const px = (i * 61 + Math.floor((st.time || 0) * (st.weather === 'blizzard' ? 120 : 30)) + Math.round(Math.sin((st.time || 0) * 2 + i) * 4)) % 330 - 5;
        const py = (i * 29 + Math.floor((st.time || 0) * 40 * (1 + (i % 2)))) % SH;
        ctx.fillRect(x0 + px, y0 + py, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
      }
    }
    ctx.restore();
  }

  // Scene-level weather overlay (for landmark pictures).
  function weatherOverlay(ctx, x0, y0, w, h, weather, time) {
    if (weather === 'rain' || weather === 'storm') {
      ctx.fillStyle = '#b8d0f0';
      for (let i = 0; i < 60; i++) ctx.fillRect(x0 + ((i * 53 + Math.floor(time * 60)) % w), y0 + ((i * 37 + Math.floor(time * 220)) % h), 1, 3);
    } else if (weather === 'snow' || weather === 'blizzard') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 80; i++) ctx.fillRect(x0 + ((i * 61 + Math.floor(time * 20) + Math.round(Math.sin(time * 2 + i) * 3)) % w), y0 + ((i * 29 + Math.floor(time * 35 * (1 + (i % 2)))) % h), 1, 1);
    }
  }

  CT.art.travel = { draw, layers, SH, REGIONS: Object.keys(REG), weatherOverlay };
})(typeof window !== 'undefined' ? window : globalThis);
