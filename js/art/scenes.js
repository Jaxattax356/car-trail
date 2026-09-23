/* The Car Trail - full-screen landmark scenes (320x160), in the style of the
 * original's arrival pictures: flat skies with puffy clouds, purple snowy peaks,
 * streaky blue rivers, speckled meadows - plus modern roads, signs and towns.
 * Each painter is deterministic (seeded), so a landmark always looks the same.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const { Bitmap, Mask, dith } = CT.gfx;
  const A = CT.art.A;
  const P = CT.art.P;
  const W = 320, H = 160;

  const LUSH = { base: P.g3, speckle: [P.g2, P.g4], dark: P.g1, light: P.g5 };
  const PRAIRIE = { base: '#98b040', speckle: ['#7c9434', '#b8cc5c'], dark: '#5c7424', light: '#d4dc7c' };
  const DRY = { base: '#c8ac5c', speckle: ['#b09448', '#dcc478'], dark: '#8c7438', light: '#ecdc9c' };
  const SAGE = { base: '#b4a868', speckle: ['#9c9058', '#c8bc80', P.sg1], dark: P.sg0, light: '#dcd4a0', density: 0.14 };
  const WHEAT = { base: '#dcb85c', speckle: ['#c49c44', '#ecd07c'], dark: '#a8843c', light: '#f8e8a8' };

  function sky(b, horizon, stops) { A.sky(b, 0, horizon, stops || [P.sky1, P.sky2, P.sky3]); }

  function farRidge(b, rng, y, amp, color, color2, per) {
    const N = A.noise(rng, W, [[per || 40, 1], [11, 0.4]]);
    for (let x = 0; x < W; x++) {
      const top = Math.round(y - amp * (0.5 + 0.5 * N[x]));
      for (let yy = top; yy <= y; yy++) b.pset(x, yy, color2 && dith(x, yy, (yy - top) / Math.max(1, y - top)) ? color2 : color);
    }
  }

  function treeLine(b, rng, y, x0, x1, pal) {
    const p = pal || [P.g0, P.g1, P.g2];
    for (let x = x0; x < x1; x += 2 + Math.floor(rng() * 3)) {
      const r = 2 + rng() * 3;
      b.ellipse(x, y - r * 0.6, r, r * 0.8, p[1]);
      b.pset(x - 1, Math.round(y - r), p[2]);
    }
    b.speckle(x0, y - 8, x1 - x0, 9, (v) => v === CT.gfx.col(p[1]), [p[0], p[2]], 0.25, rng);
  }

  function car(b, ctx, x, gy, flip) {
    CT.art.cars.drawTo(b, (ctx && ctx.carId) || 'wagon', x, gy, 1, { flip: !!flip });
  }

  function barricade(b, x, gy) {
    b.rect(x + 1, gy - 7, 1, 7, P.gr3);
    b.rect(x + 16, gy - 7, 1, 7, P.gr3);
    for (let i = 0; i < 18; i++) b.vline(x + i, gy - 11, gy - 8, ((i >> 1) & 1) ? P.orn : P.white);
    b.frame(x, gy - 12, 18, 5, P.ink);
  }

  function diamond(b, cx, y, text, color) {
    b.vline(cx, y + 6, y + 18, P.gr2);
    b.poly([[cx, y - 1], [cx + 8, y + 7], [cx, y + 15], [cx - 8, y + 7]], P.ink);
    b.poly([[cx, y], [cx + 7, y + 7], [cx, y + 14], [cx - 7, y + 7]], color || P.yel);
    (Array.isArray(text) ? text : [text]).forEach((t, i, arr) => A.tinyCenter(b, t, cx + 1, y + 5 - (arr.length - 1) * 3 + i * 6, P.ink));
  }

  function snowcapPeaks(b, rng, baseY, peaks, pal, snowLine) {
    A.mountains(b, { baseY, peaks, pal: pal || A.PURPLE, snowLine: snowLine == null ? 10 : snowLine, gullies: true }, rng);
  }

  // ---------------------------------------------------------------- scenes
  const S = {};

  S.independence = function (b, rng, ctx) {
    sky(b, 96, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[60, 16, 70, 13], [200, 10, 90, 15], [300, 24, 50, 10]], rng);
    treeLine(b, rng, 96, 0, 320);
    b.rect(0, 94, 320, 20, P.g2);
    // courthouse with a clock tower
    A.building(b, 88, 110, 64, 36, { wall: '#e0d4b8', wallD: '#b0a488', roof: '#5c5c64', rows: 3, cols: 7, door: P.wood0 });
    b.rect(110, 48, 20, 28, '#e8dcc0');
    b.rect(126, 48, 4, 28, '#b8ac90');
    b.poly([[108, 49], [120, 34], [132, 49]], '#3c7c5c');
    b.vline(120, 28, 34, P.gr1);
    b.disc(120, 58, 5, P.white); b.disc(120, 58, 4, '#f8f4e0');
    b.line(120, 58, 120, 55, P.ink); b.line(120, 58, 122, 58, P.ink);
    b.rect(113, 67, 3, 5, P.glass1); b.rect(124, 67, 3, 5, P.glass1);
    // brick storefronts
    const fronts = [[0, 30, 40, P.b1], [30, 26, 34, P.b2], [56, 32, 44, P.b0], [152, 34, 40, P.b1], [186, 30, 32, '#a05c3c']];
    fronts.forEach(([x, w, h, c], i) => A.building(b, x, 112, w, h, { wall: c, wallD: P.b0, brick: true, roof: P.gr0, rows: 2, door: P.wood0, awning: i % 2 ? '#2c6cb0' : '#c02828', sign: i === 3 ? 'TRAIL MUSEUM' : i === 1 ? 'DINER' : '' }));
    // Mel's Gas & Grocery
    A.gasStation(b, 238, 116, { brand: "MEL'S", price: '3.49', w: 64 });
    // street
    b.rect(0, 116, 320, 44, P.as1);
    b.speckle(0, 116, 320, 44, () => true, [P.as0, P.as2], 0.2, rng);
    b.rect(0, 114, 320, 2, P.gr3);
    for (let x = 4; x < 320; x += 20) b.rect(x, 138, 10, 1, P.line);
    b.rect(0, 157, 320, 3, P.gr3);
    A.sign(b, 44, 66, ['INDEPENDENCE', 'Queen City', 'of the Trails'], { postH: 30, bg: '#1a6a30' });
    car(b, ctx, 118, 134);
    A.person(b, 180, 113, P.blue); A.person(b, 60, 113, P.yel, { hair: '#e8d070' });
  };

  S.kansas = function (b, rng, ctx) {
    sky(b, 66, [P.sky1, P.sky2]);
    A.clouds(b, [[36, 6, 80, 16], [156, 14, 96, 15], [290, 8, 70, 13]], rng);
    b.poly([[0, 52], [30, 48], [70, 55], [110, 60], [110, 68], [0, 68]], P.mp2);
    b.poly([[0, 58], [50, 57], [100, 62], [160, 64], [160, 70], [0, 70]], '#b04c9c');
    farRidge(b, rng, 70, 5, P.mb1, P.mb0, 50);
    A.grass(b, 0, 70, 320, 90, rng, LUSH);
    b.rect(0, 70, 320, 4, P.g2);
    // modern low-water crossing road
    A.road(b, { y0: 106, y1: 160, x0: 214, x1: 296, w0: 6, w1: 26, dashes: true, shoulder: P.d2 }, rng);
    A.river(b, [[-40, 158, 70], [40, 140, 60], [120, 116, 44], [190, 98, 30], [250, 84, 20], [300, 76, 12], [340, 72, 8]], rng, { bank: P.d1, bank2: P.d2, flat: 0.28, streak: 0.09 });
    A.roundTree(b, 244, 110, 46, rng);
    b.poly([[200, 112], [270, 108], [300, 116], [240, 120]], P.g1);
    barricade(b, 226, 114);
    b.vline(229, 108, 113, P.gr2); b.vline(241, 108, 113, P.gr2);
    b.rect(222, 95, 27, 14, P.white); b.frame(222, 95, 27, 14, P.red);
    A.tinyCenter(b, 'ROAD', 236, 97, P.ink); A.tinyCenter(b, 'CLOSED', 236, 103, P.red);
    diamond(b, 280, 96, ['HIGH', 'WATER']);
    car(b, ctx, 250, 146);
  };

  S.bigblue = function (b, rng, ctx) {
    sky(b, 70, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[80, 14, 90, 16], [240, 20, 70, 12]], rng);
    A.hills(b, { y: 68, bottom: 90, waves: [[140, 5, 1], [60, 2, 0]], base: '#7ca040', edge: '#9cbc58', speckle: ['#6c8c34'], density: 0.1 }, rng);
    A.hills(b, { y: 82, bottom: 160, waves: [[200, 6, 2], [70, 2, 1]], base: PRAIRIE.base, edge: '#b8cc5c', speckle: PRAIRIE.speckle, density: 0.12 }, rng);
    A.grass(b, 0, 118, 320, 42, rng, PRAIRIE);
    A.river(b, [[150, 78, 3], [140, 90, 8], [170, 104, 14], [140, 122, 22], [90, 142, 32], [60, 170, 42]], rng, { bank: P.d1, flat: 0.35, streak: 0.08 });
    // washed-out truss bridge
    const bx0 = 104, bx1 = 212, deck = 104;
    b.rect(bx0 - 4, deck, 30, 3, P.gr1);
    b.rect(bx1 - 32, deck, 36, 3, P.gr1);
    for (let x = bx0 - 4; x < bx0 + 24; x += 7) { b.line(x, deck, x + 7, deck - 10, '#5c6c7c'); b.line(x + 7, deck, x, deck - 10, '#5c6c7c'); }
    for (let x = bx1 - 32; x < bx1 + 2; x += 7) { b.line(x, deck, x + 7, deck - 10, '#5c6c7c'); b.line(x + 7, deck, x, deck - 10, '#5c6c7c'); }
    b.hline(bx0 - 4, bx0 + 24, deck - 10, '#5c6c7c');
    b.hline(bx1 - 32, bx1 + 4, deck - 10, '#5c6c7c');
    b.rect(bx0 + 22, deck + 3, 3, 16, P.gr2); b.rect(bx1 - 34, deck + 3, 3, 16, P.gr2);
    [[40, 96, 24], [262, 98, 28], [290, 112, 22], [24, 126, 20]].forEach(([x, y, s]) => A.roundTree(b, x, y, s, rng, { mid: '#4c9c2c', light: '#88cc44' }));
    A.sign(b, 70, 86, ['BRIDGE OUT'], { bg: P.orn, fg: P.ink, border: P.ink, postH: 8 });
    car(b, ctx, 214, 146);
  };

  S.kearney = function (b, rng, ctx) {
    sky(b, 92, [P.sky0, P.sky1, P.sky3]);
    A.clouds(b, [[50, 12, 70, 12], [270, 16, 80, 14]], rng);
    for (let i = 0; i < 7; i++) { const x = 150 + i * 9, y = 22 + Math.abs(i - 3) * 3; b.line(x - 3, y - 1, x, y, P.gr1); b.line(x, y, x + 3, y - 1, P.gr1); }
    treeLine(b, rng, 92, 0, 320, [P.g0, P.g1, P.g3]);
    A.grass(b, 0, 92, 320, 68, rng, PRAIRIE);
    A.waterTower(b, 40, 92, 50, 'KEARNEY');
    A.silos(b, 262, 94, 34);
    // the Great Platte River Road Archway spanning the interstate
    b.rect(118, 60, 10, 58, '#6c4c34'); b.rect(214, 60, 10, 58, '#6c4c34');
    b.rect(126, 60, 2, 58, '#4c3424'); b.rect(222, 60, 2, 58, '#4c3424');
    b.poly([[112, 64], [170, 36], [230, 64], [230, 80], [112, 80]], '#8c6444');
    b.poly([[112, 64], [170, 36], [230, 64]], '#6c4c34');
    for (let x = 120; x < 224; x += 7) b.rect(x, 68, 4, 6, '#f0c060');
    b.line(112, 64, 170, 36, P.ink); b.line(170, 36, 230, 64, P.ink); b.hline(112, 230, 80, P.ink);
    for (let y = 44; y < 64; y += 5) b.hline(146 + (y - 44), 194 - (y - 44), y, '#a07c58');
    // interstate
    b.rect(0, 116, 320, 30, P.as1);
    b.speckle(0, 116, 320, 30, () => true, [P.as0, P.as2], 0.2, rng);
    b.hline(0, 319, 117, P.edge); b.hline(0, 319, 144, P.edge);
    for (let x = 0; x < 320; x += 18) b.rect(x, 130, 9, 1, P.white);
    A.sign(b, 290, 70, ['I-80', 'WEST'], { bg: '#1c4ca0', postH: 26 });
    // trucks
    b.rect(20, 118, 40, 10, P.white); b.rect(8, 120, 12, 8, P.red); b.rect(9, 121, 5, 3, P.glass1);
    b.disc(14, 128, 2, P.ink); b.disc(30, 128, 2, P.ink); b.disc(52, 128, 2, P.ink);
    car(b, ctx, 170, 142);
  };

  S.chimney = function (b, rng, ctx) {
    sky(b, 88, [P.sky0, P.sky1, P.sky3]);
    A.clouds(b, [[250, 18, 100, 16], [40, 26, 60, 10]], rng);
    b.poly([[0, 86], [40, 74], [90, 72], [120, 84], [180, 88], [0, 90]], '#c0986c');
    b.poly([[210, 88], [240, 70], [290, 68], [320, 74], [320, 90]], '#b08860');
    A.grass(b, 0, 88, 320, 72, rng, DRY);
    // Chimney Rock: cone with a spire
    A.rockShape(b, [[98, 102], [130, 72], [144, 66], [150, 66], [164, 74], [196, 102]], 146, rng, { strata: 4, lit: '#e4c8a0', mid: '#caa478', dark: '#a8805c', deep: '#7c5838', hi: '#f4e4c8' });
    A.rockShape(b, [[141, 67], [142, 30], [144, 18], [146, 14], [149, 17], [151, 30], [153, 67]], 147, rng, { strata: 5, lit: '#e4c8a0', mid: '#caa478', dark: '#a8805c', deep: '#7c5838', hi: '#f4e4c8' });
    A.road(b, { y0: 96, y1: 160, x0: 170, x1: 210, w0: 2, w1: 34, bend: -10 }, rng);
    for (let i = 0; i < 26; i++) A.sage(b, rng() * 320, 104 + rng() * 56, 2 + rng() * 3, rng);
    A.sign(b, 70, 104, ['CHIMNEY ROCK', 'National Historic Site'], { bg: '#6c4424', postH: 10 });
    car(b, ctx, 196, 150);
  };

  S.laramie = function (b, rng, ctx) {
    sky(b, 80, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[90, 12, 90, 14], [260, 22, 70, 12]], rng);
    b.poly([[0, 80], [30, 64], [80, 62], [120, 72], [170, 80]], '#b89468');
    b.poly([[180, 82], [230, 62], [280, 60], [320, 70], [320, 84]], '#a88458');
    A.grass(b, 0, 80, 320, 80, rng, PRAIRIE);
    A.river(b, [[-10, 104, 6], [80, 108, 8], [180, 112, 9], [330, 118, 10]], rng, { bank: P.d1, flat: 0.5, streak: 0.06 });
    // Old Bedlam: white two-storey with porches
    A.building(b, 60, 100, 70, 30, { wall: P.wall3, wallD: P.wall1, roof: '#6c7074', rows: 2, cols: 9, door: P.wood1, pitched: 8 });
    for (let x = 60; x <= 130; x += 7) b.vline(x, 72, 100, P.wall2);
    b.hline(58, 132, 86, P.wall1);
    A.building(b, 150, 100, 40, 18, { wall: '#d8cca8', wallD: '#a8987c', roof: '#6c7074', rows: 1, door: P.wood1 });
    A.flag(b, 140, 100, 34);
    [[24, 104, 26], [210, 110, 30], [300, 112, 24]].forEach(([x, y, s]) => A.roundTree(b, x, y, s, rng, { mid: '#5ca434', light: '#94d450' }));
    A.gasStation(b, 236, 138, { brand: 'FUEL', price: '4.36', color: '#1c5cb0', w: 56 });
    car(b, ctx, 110, 146);
  };

  S.indrock = function (b, rng, ctx) {
    sky(b, 84, [P.sky0, P.sky1, P.sky3]);
    A.clouds(b, [[60, 14, 90, 14], [230, 10, 110, 16]], rng);
    snowcapPeaks(b, rng, 86, [{ x: 250, h: 18, w: 40 }, { x: 300, h: 14, w: 36 }, { x: 200, h: 10, w: 30 }], A.PURPLE, 11);
    A.grass(b, 0, 84, 320, 76, rng, SAGE);
    // Independence Rock - a huge granite whaleback
    const m = new Mask(W, H);
    const rcx = 116, rcy = 110, rrx = 92, rry = 38;
    m.ellipse(rcx, rcy, rrx, rry);
    m.ellipse(80, 100, 40, 22);
    m.ellipse(160, 104, 44, 22);
    for (let y = 111; y < H; y++) m.span(0, W - 1, y, 0);
    b.paint(m, (x, y) => {
      const nx = (x - rcx) / rrx, ny = (y - rcy) / rry;
      const l = -0.55 * nx - 0.85 * ny + (rng() - 0.5) * 0.12;
      if (!m.has(x, y - 1)) return '#e8dcc8';
      if (l > 0.75) return dith(x, y, 0.3) ? '#d8ccb4' : '#e4d8c4';
      if (l > 0.5) return dith(x, y, 0.5) ? '#c4b49c' : '#d8ccb4';
      if (l > 0.25) return dith(x, y, 0.4) ? '#a89884' : '#c4b49c';
      return dith(x, y, 0.5) ? '#887868' : '#a89884';
    });
    b.outline(m, '#5c5048');
    for (let i = 0; i < 14; i++) { const x = 50 + rng() * 140, y = 80 + rng() * 24; if (m.has(x, y)) b.line(x, y, x + 3 + rng() * 4, y + 2 + rng() * 3, '#7c6c5c'); }
    for (let i = 0; i < 18; i++) { const x = 60 + rng() * 80, y = 96 + rng() * 10; if (m.has(x, y)) b.pset(x, y, '#5c5048'); }
    A.river(b, [[-10, 118, 5], [100, 116, 6], [200, 122, 7], [330, 120, 6]], rng, { bank: P.sg0, flat: 0.5, streak: 0.06 });
    A.road(b, { y0: 90, y1: 160, x0: 270, x1: 250, w0: 2, w1: 30 }, rng);
    for (let i = 0; i < 30; i++) A.sage(b, rng() * 320, 110 + rng() * 50, 2 + rng() * 3, rng);
    A.sign(b, 104, 126, ['INDEPENDENCE ROCK', 'State Historic Site'], { bg: '#6c4424', postH: 8 });
    car(b, ctx, 238, 152);
  };

  S.southpass = function (b, rng, ctx) {
    sky(b, 86, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[70, 10, 80, 14], [180, 22, 60, 10]], rng);
    snowcapPeaks(b, rng, 90, [{ x: 170, h: 26, w: 50 }, { x: 220, h: 38, w: 55 }, { x: 270, h: 32, w: 50 }, { x: 318, h: 40, w: 50 }, { x: 120, h: 16, w: 40 }], A.PURPLE, 14);
    farRidge(b, rng, 92, 4, P.mb1, P.mb0, 60);
    A.grass(b, 0, 92, 320, 68, rng, DRY);
    A.road(b, { y0: 93, y1: 160, x0: 150, x1: 120, w0: 1, w1: 40, bend: 18 }, rng);
    for (let i = 0; i < 24; i++) A.sage(b, rng() * 320, 100 + rng() * 60, 2 + rng() * 2.5, rng);
    A.sign(b, 238, 100, ['CONTINENTAL DIVIDE', 'ELEV 7412 FT'], { bg: '#1a6a30', postH: 14 });
    A.fence(b, 0, 90, 112);
    car(b, ctx, 110, 150);
  };

  S.greenriver = function (b, rng, ctx) {
    sky(b, 84, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[250, 12, 90, 14], [80, 20, 60, 10]], rng);
    // Names Hill limestone bluffs
    A.bluff(b, [[0, 102], [0, 50], [22, 46], [48, 48], [70, 44], [96, 50], [118, 58], [140, 74], [158, 90], [170, 102]], rng);
    A.bluff(b, [[0, 102], [0, 70], [30, 66], [60, 70], [84, 76], [100, 88], [110, 102]], rng, { a: '#d4c4a4', b: '#c4b294', c: '#b09c7c', top: '#e8dcc0' });
    for (let i = 0; i < 10; i++) b.pset(30 + rng() * 60, 56 + rng() * 10, '#6c5c48');
    b.poly([[140, 80], [200, 72], [260, 62], [320, 66], [320, 80]], '#b89c74');
    A.grass(b, 170, 76, 150, 84, rng, SAGE);
    A.grass(b, 0, 100, 170, 60, rng, SAGE);
    A.road(b, { y0: 110, y1: 160, x0: 250, x1: 262, w0: 5, w1: 26 }, rng);
    A.river(b, [[330, 82, 10], [240, 92, 20], [160, 108, 34], [80, 132, 50], [0, 158, 64]], rng, { bank: '#8c7c5c', flat: 0.3, streak: 0.09, base: '#2058b8' });
    [[196, 92, 26], [300, 96, 30], [220, 104, 22]].forEach(([x, y, s]) => A.roundTree(b, x, y, s, rng, { mid: '#6cac34', light: '#b0dc5c', hi: '#e0f080' }));
    barricade(b, 226, 118);
    diamond(b, 294, 108, ['HIGH', 'WATER']);
    car(b, ctx, 250, 152);
  };

  S.bridger = function (b, rng, ctx) {
    sky(b, 80, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[60, 14, 80, 14], [220, 8, 100, 16]], rng);
    snowcapPeaks(b, rng, 84, [{ x: 40, h: 26, w: 50 }, { x: 110, h: 34, w: 55 }, { x: 180, h: 28, w: 50 }, { x: 250, h: 36, w: 55 }, { x: 310, h: 26, w: 40 }], A.BLUE, 16);
    A.grass(b, 0, 84, 320, 76, rng, PRAIRIE);
    // log stockade
    for (let x = 30; x < 150; x += 3) {
      const h = 22 + ((x * 7) % 3);
      b.rect(x, 108 - h, 3, h, x % 2 ? P.wood2 : P.wood1);
      b.pset(x + 1, 108 - h - 1, P.wood1);
      b.vline(x + 2, 108 - h, 108, P.wood0);
    }
    b.rect(76, 94, 16, 14, P.wood0);
    A.building(b, 150, 110, 40, 20, { wall: P.wood2, wallD: P.wood1, roof: P.wood0, rows: 1, door: P.wood0, pitched: 7, sign: 'TRADING POST', signBg: P.wood0 });
    A.gasStation(b, 236, 124, { brand: 'GAS', price: '4.89', color: '#208040', w: 60 });
    b.rect(0, 124, 320, 16, P.as1);
    b.speckle(0, 124, 320, 16, () => true, [P.as0, P.as2], 0.2, rng);
    for (let x = 0; x < 320; x += 16) b.rect(x, 131, 8, 1, P.line);
    car(b, ctx, 120, 138);
    A.person(b, 196, 112, '#8c5c2c', { hair: '#4c2c14' });
  };

  S.soda = function (b, rng, ctx) {
    sky(b, 82, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[250, 14, 90, 14]], rng);
    b.poly([[0, 84], [50, 60], [110, 58], [160, 72], [220, 64], [280, 56], [320, 62], [320, 86], [0, 86]], P.ol1);
    b.speckle(0, 55, 320, 32, (v) => v === CT.gfx.col(P.ol1), [P.ol0, P.ol2], 0.2, rng);
    A.grass(b, 0, 84, 320, 76, rng, LUSH);
    // pond
    const pond = new Mask(W, H);
    pond.ellipse(140, 124, 70, 14);
    b.outline(pond, '#c8b088', true);
    A.water(b, pond, rng, { base: '#3c8ce0', streak: 0.08 });
    // the captive geyser
    const g = new Mask(W, H);
    for (let y = 30; y < 118; y++) {
      const t = (118 - y) / 88;
      const w = 2 + t * t * 10 + Math.sin(y * 0.7) * 1.5;
      g.span(Math.round(138 - w), Math.round(138 + w), y);
    }
    g.ellipse(138, 32, 16, 10);
    g.ellipse(126, 40, 10, 8);
    g.ellipse(150, 38, 10, 8);
    b.paint(g, (x, y) => (x > 140 && rng() < 0.4 ? P.cloud1 : rng() < 0.08 ? P.cloud2 : P.white));
    b.speckle(110, 26, 60, 96, (v) => v !== CT.gfx.col(P.white), [P.cloud1], 0.05, rng);
    b.rect(132, 116, 12, 4, '#e0b048');
    b.rect(133, 117, 10, 2, '#f0d080');
    A.building(b, 230, 104, 36, 18, { wall: '#e8d8b0', wallD: '#b8a880', roof: '#7c3c24', rows: 1, door: P.wood1, pitched: 6 });
    [[30, 110, 26], [290, 118, 24], [206, 100, 20]].forEach(([x, y, s]) => A.roundTree(b, x, y, s, rng));
    A.sign(b, 60, 132, ['CAPTIVE GEYSER', 'Erupts every hour'], { bg: '#6c4424', postH: 8 });
    car(b, ctx, 224, 152);
  };

  S.pocatello = function (b, rng, ctx) {
    sky(b, 78, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[90, 14, 80, 14], [270, 20, 60, 12]], rng);
    A.mountains(b, { baseY: 84, peaks: [{ x: 40, h: 26, w: 60 }, { x: 130, h: 34, w: 70 }, { x: 230, h: 28, w: 60 }, { x: 310, h: 32, w: 50 }], pal: A.BROWN, snowLine: 26, jag: 2 }, rng);
    A.grass(b, 0, 84, 320, 76, rng, SAGE);
    A.waterTower(b, 270, 96, 46, 'POCATELLO');
    // Fort Hall replica
    for (let x = 16; x < 90; x += 3) b.rect(x, 86, 3, 16, x % 2 ? P.wood2 : P.wood1);
    b.rect(24, 76, 14, 12, P.wood1); b.poly([[22, 77], [31, 70], [40, 77]], P.wood0);
    A.flag(b, 60, 86, 22);
    // railroad and a freight train
    b.rect(0, 108, 320, 2, P.d1);
    for (let x = 0; x < 320; x += 4) b.pset(x, 109, P.d0);
    b.hline(0, 319, 107, P.gr2);
    const tx = 110;
    b.rect(tx, 96, 30, 10, '#e8b820'); b.rect(tx + 20, 92, 10, 6, '#e8b820'); b.rect(tx + 22, 93, 6, 3, P.glass1);
    b.rect(tx, 100, 30, 2, '#c02020');
    for (let i = 0; i < 4; i++) { const cx = tx + 32 + i * 30; b.rect(cx, 94, 28, 12, ['#8c3c24', '#5c6c7c', '#8c3c24', '#3c5c3c'][i]); b.vline(cx + 13, 95, 105, P.ink); }
    for (let x = tx + 3; x < tx + 150; x += 10) b.disc(x, 106, 1.5, P.ink);
    A.road(b, { y0: 112, y1: 160, x0: 60, x1: 90, w0: 12, w1: 40 }, rng);
    for (let i = 0; i < 20; i++) A.sage(b, rng() * 320, 116 + rng() * 44, 2 + rng() * 2.5, rng);
    car(b, ctx, 70, 150);
  };

  S.snake = function (b, rng, ctx) {
    sky(b, 72, [P.sky0, P.sky1, P.sky3]);
    A.clouds(b, [[60, 10, 80, 13], [220, 18, 100, 15]], rng);
    b.poly([[0, 72], [80, 66], [160, 70], [240, 64], [320, 68], [320, 78], [0, 78]], '#a09068');
    A.grass(b, 0, 76, 320, 84, rng, SAGE);
    // dark basalt canyon rim
    A.rockShape(b, [[0, 84], [60, 80], [120, 86], [200, 82], [320, 86], [320, 98], [0, 98]], 160, rng, { lit: '#5c5048', mid: '#44403c', dark: '#34302c', deep: '#201c1c', hi: '#7c7064', strata: 3 });
    A.river(b, [[-20, 108, 30], [80, 112, 60], [180, 118, 80], [260, 124, 90], [340, 130, 90]], rng, { flat: 0.18, streak: 0.09, bank: '#6c5c48' });
    // the three islands
    [[70, 108, 22, 3], [150, 116, 30, 4], [240, 124, 26, 3]].forEach(([x, y, rx, ry]) => {
      b.ellipse(x, y, rx, ry, '#c8b488');
      b.ellipse(x, y - 1, rx - 4, ry - 1, '#8ca04c');
    });
    A.grass(b, 0, 138, 320, 22, rng, SAGE);
    A.road(b, { y0: 128, y1: 160, x0: 270, x1: 290, w0: 8, w1: 22 }, rng);
    for (let i = 0; i < 14; i++) A.sage(b, rng() * 320, 142 + rng() * 18, 2 + rng() * 2.5, rng);
    A.sign(b, 70, 124, ['THREE ISLAND', 'CROSSING'], { bg: '#6c4424', postH: 8 });
    diamond(b, 226, 124, ['DEEP', 'WATER']);
    car(b, ctx, 270, 156);
  };

  S.boise = function (b, rng, ctx) {
    sky(b, 80, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[80, 14, 90, 14], [250, 10, 80, 13]], rng);
    A.hills(b, { y: 70, bottom: 96, waves: [[120, 8, 0], [50, 3, 2]], base: '#b89c6c', edge: '#d0b888', speckle: ['#a08858', '#c8b080'], density: 0.15 }, rng);
    A.grass(b, 0, 96, 320, 64, rng, LUSH);
    // Idaho capitol
    b.rect(110, 72, 100, 30, P.wall3);
    b.rect(200, 72, 10, 30, P.wall1);
    for (let x = 116; x < 204; x += 6) b.rect(x, 78, 3, 20, P.wall2);
    b.rect(140, 62, 40, 10, P.wall3);
    for (let x = 142; x < 180; x += 4) b.vline(x, 62, 72, P.wall1);
    const dome = new Mask(W, H);
    dome.ellipse(160, 62, 18, 16);
    for (let y = 63; y < H; y++) dome.span(0, W - 1, y, 0);
    b.paint(dome, (x, y) => (x < 156 ? P.wall3 : x < 166 ? P.wall2 : P.wall1));
    b.outline(dome, P.gr2);
    b.rect(157, 40, 6, 8, P.wall2); b.vline(160, 34, 40, P.gr1);
    b.poly([[108, 72], [160, 64], [212, 72]], P.wall1);
    b.rect(150, 90, 20, 12, P.gr1);
    A.building(b, 20, 104, 40, 38, { wall: '#9c7c5c', wallD: '#7c5c44', roof: P.gr0, rows: 4, cols: 5 });
    A.building(b, 250, 104, 34, 44, { wall: P.glass1, wallD: P.glass0, win: P.glass2, winHi: P.glass3, roof: P.gr0, rows: 5, cols: 4 });
    [[80, 112, 24], [232, 114, 26], [296, 116, 22], [10, 118, 20]].forEach(([x, y, s]) => A.roundTree(b, x, y, s, rng));
    b.rect(0, 122, 320, 20, P.as1);
    b.speckle(0, 122, 320, 20, () => true, [P.as0, P.as2], 0.2, rng);
    for (let x = 0; x < 320; x += 16) b.rect(x, 131, 8, 1, P.line);
    car(b, ctx, 150, 140);
  };

  S.bluemtns = function (b, rng, ctx) {
    sky(b, 60, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[200, 12, 110, 15]], rng);
    A.hills(b, { y: 52, bottom: 90, waves: [[160, 8, 0], [60, 3, 1]], base: P.mb2, edge: P.mb3, fade: 20, base2: P.mb1 }, rng);
    A.hills(b, { y: 66, bottom: 110, waves: [[130, 9, 2], [50, 3, 0]], base: P.mb1, edge: P.mb2, fade: 20, base2: P.mb0 }, rng);
    for (let x = 0; x < 320; x += 5) A.pine(b, x + rng() * 3, 86 + Math.sin(x / 20) * 5 + rng() * 4, 12 + rng() * 6, rng, { dark: '#1c3c34', mid: '#28524a', light: '#3c6c5c', hi: '#548474' });
    A.grass(b, 0, 96, 320, 64, rng, { base: P.g2, speckle: [P.g1, P.g3], dark: P.g0, light: P.g4 });
    A.road(b, { y0: 92, y1: 160, x0: 200, x1: 150, w0: 2, w1: 36, bend: 30, curve: 0.9 }, rng);
    for (let i = 0; i < 18; i++) {
      const x = i < 9 ? rng() * 90 : 230 + rng() * 90;
      A.pine(b, x, 110 + rng() * 50, 24 + rng() * 22, rng);
    }
    A.sign(b, 108, 104, ['DEADMAN PASS', 'ELEV 4193'], { bg: '#1a6a30', postH: 10 });
    diamond(b, 236, 112, ['6%', 'GRADE']);
    car(b, ctx, 150, 152);
  };

  S.wallawalla = function (b, rng, ctx) {
    sky(b, 72, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[100, 12, 100, 15], [270, 20, 60, 11]], rng);
    A.hills(b, { y: 64, bottom: 80, waves: [[150, 5, 0], [60, 2, 1]], base: P.mb2, edge: P.mb3, fade: 12, base2: P.mb1 }, rng);
    A.hills(b, { y: 78, bottom: 120, waves: [[110, 6, 1], [45, 3, 2]], base: WHEAT.base, edge: WHEAT.light, speckle: WHEAT.speckle, density: 0.18 }, rng);
    // vineyard rows in perspective
    b.rect(0, 108, 320, 52, '#8c6c44');
    for (let i = 0; i < 16; i++) {
      const x1 = -80 + i * 32, x0 = 100 + i * 8;
      const m = new Mask(W, H);
      m.poly([[x0, 108], [x0 + 3, 108], [x1 + 12, 160], [x1, 160]]);
      b.paint(m, (x, y) => (rng() < 0.3 ? P.g4 : rng() < 0.5 ? P.g2 : P.g1));
    }
    A.building(b, 230, 92, 30, 18, { wall: '#b43424', wallD: '#8c2418', roof: P.gr1, rows: 0, door: P.white, pitched: 9 });
    b.line(232, 90, 258, 90, P.white);
    A.silos(b, 268, 92, 20);
    A.sign(b, 70, 74, ['WALLA WALLA', 'Sweet Onion Capital'], { bg: '#1a6a30', postH: 12 });
    b.rect(0, 104, 320, 6, P.as1);
    b.hline(0, 319, 107, P.line);
    car(b, ctx, 150, 108);
  };

  S.dalles = function (b, rng, ctx) {
    sky(b, 64, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[70, 10, 90, 14], [200, 16, 60, 10]], rng);
    A.mountains(b, { baseY: 68, peaks: [{ x: 290, h: 46, w: 42, slant: 0.5, shape: 0.95 }], pal: A.PURPLE, snowLine: 12, snowFrac: 0.85, jag: 1.5 }, rng);
    A.rockShape(b, [[0, 60], [60, 56], [110, 62], [120, 80], [0, 84]], 50, rng, { lit: '#6c5c50', mid: '#544840', dark: '#3c3430', deep: '#241c1c', hi: '#8c7c6c', strata: 4, noOutline: true });
    A.rockShape(b, [[170, 70], [230, 62], [320, 66], [320, 84], [170, 84]], 240, rng, { lit: '#6c5c50', mid: '#544840', dark: '#3c3430', deep: '#241c1c', hi: '#8c7c6c', strata: 4, noOutline: true });
    const riv = new Mask(W, H);
    riv.rect(0, 80, 320, 30);
    A.water(b, riv, rng, { base: '#1c54b4', streak: 0.1 });
    // The Dalles Dam
    b.rect(120, 76, 90, 12, P.gr3);
    for (let x = 122; x < 208; x += 8) { b.rect(x, 78, 5, 8, P.gr2); b.pset(x + 2, 77, P.gr1); }
    b.rect(120, 88, 90, 3, P.white);
    b.speckle(120, 88, 90, 6, () => true, [P.w3, P.white], 0.3, rng);
    A.grass(b, 0, 110, 320, 50, rng, DRY);
    b.rect(0, 108, 320, 3, '#a09070');
    A.building(b, 20, 132, 30, 22, { wall: P.b1, wallD: P.b0, brick: true, roof: P.gr0, rows: 2, door: P.wood0, sign: 'MUSEUM' });
    A.building(b, 56, 132, 26, 18, { wall: '#d8c8a0', wallD: '#a89878', roof: P.gr0, rows: 1, door: P.wood0, awning: '#2c6cb0' });
    A.gasStation(b, 240, 136, { brand: 'GAS', price: '5.58', color: P.red, w: 56 });
    b.rect(0, 136, 320, 12, P.as1);
    for (let x = 0; x < 320; x += 16) b.rect(x, 141, 8, 1, P.line);
    A.sign(b, 160, 104, ['END OF THE', 'OREGON TRAIL'], { bg: '#6c4424', postH: 16 });
    car(b, ctx, 120, 146);
  };

  S.willamette = function (b, rng, ctx) {
    sky(b, 50, [P.sky1, P.sky2]);
    A.mountains(b, { baseY: 56, peaks: [{ x: 60, h: 18, w: 40 }, { x: 110, h: 30, w: 44 }, { x: 150, h: 22, w: 36 }, { x: 190, h: 26, w: 40 }, { x: 250, h: 20, w: 36 }, { x: 290, h: 30, w: 44 }], pal: A.PURPLE, snowLine: 10, gullies: true }, rng);
    A.grass(b, 0, 56, 320, 104, rng, { base: P.g3, speckle: [P.g4], dark: P.g2, light: P.g4, density: 0.05, tufts: 0.004 });
    for (let y = 56; y < 80; y++) for (let x = 0; x < 320; x++) if (dith(x, y, 0.3) && b.pget(x, y) === CT.gfx.col(P.g3)) b.pset(x, y, P.g4);
    // farm fields
    b.poly([[150, 66], [240, 64], [260, 76], [140, 80]], '#c8b050');
    b.poly([[240, 64], [320, 62], [320, 72], [260, 76]], P.g2);
    A.building(b, 214, 66, 14, 9, { wall: '#b43424', wallD: '#8c2418', roof: P.gr1, rows: 0, pitched: 5 });
    A.river(b, [[330, 92, 16], [280, 96, 18], [240, 108, 14], [270, 124, 18], [330, 132, 22]], rng, { bank: P.d2, flat: 0.45, streak: 0.1, base: P.w2 });
    b.line(170, 72, 320, 70, '#c86c3c');
    for (let x = 250; x < 320; x += 5) A.pine(b, x, 88 + rng() * 3, 8 + rng() * 5, rng);
    // tall conifers on the left edge
    [[8, 160, 110], [30, 160, 96], [52, 162, 70], [16, 118, 40]].forEach(([x, gy, h]) => A.pine(b, x, gy, h, rng, { wide: 0.3 }));
    A.bush(b, 90, 150, 12, rng); A.bush(b, 120, 156, 10, rng);
    car(b, ctx, 150, 138);
  };

  S.tombstone = function (b, rng, ctx) {
    sky(b, 70, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[80, 16, 90, 14], [250, 10, 90, 14]], rng);
    farRidge(b, rng, 72, 6, P.mp2, P.mp1, 60);
    A.grass(b, 0, 72, 320, 88, rng, LUSH);
    A.roundTree(b, 270, 120, 40, rng);
    A.fence(b, 0, 320, 108);
    const t = CT.art.critters.tombstone(ctx.name || '', ctx.lines || []);
    b.draw(t, 115, 70);
  };

  // A plain roadside scene for events (flat tire, etc.) coloured by region.
  S.roadside = function (b, rng, ctx) {
    const reg = ctx.region || 'plains';
    const dry = reg === 'wyoming' || reg === 'idaho' || reg === 'mountain';
    sky(b, 80, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[70, 14, 90, 14], [240, 20, 70, 12]], rng);
    if (reg === 'mountain' || reg === 'forest' || reg === 'hood') snowcapPeaks(b, rng, 84, [{ x: 80, h: 30, w: 50 }, { x: 170, h: 40, w: 60 }, { x: 260, h: 32, w: 50 }], reg === 'forest' ? A.BLUE : A.PURPLE, 14);
    else farRidge(b, rng, 84, 8, dry ? '#b09070' : P.mb2, dry ? '#a08060' : P.mb1, 50);
    A.grass(b, 0, 84, 320, 76, rng, dry ? SAGE : reg === 'platte' ? DRY : PRAIRIE);
    b.rect(0, 118, 320, 26, P.as1);
    b.speckle(0, 118, 320, 26, () => true, [P.as0, P.as2], 0.2, rng);
    b.hline(0, 319, 119, P.edge); b.hline(0, 319, 142, P.edge);
    for (let x = 0; x < 320; x += 18) b.rect(x, 130, 9, 1, P.line);
    for (let x = 20; x < 320; x += 70) A.pole(b, x, 112, 26);
    for (let x = 20; x + 70 < 320; x += 70) A.wire(b, x - 3, 87, x + 67, 87, 3);
    if (reg === 'forest' || reg === 'hood') for (let i = 0; i < 10; i++) A.pine(b, rng() * 320, 100 + rng() * 14, 20 + rng() * 14, rng);
    else for (let i = 0; i < 12; i++) (dry ? A.sage : A.bush)(b, rng() * 320, 100 + rng() * 16, 3 + rng() * 3, rng);
    car(b, ctx, 130, 138);
  };

  const cache = new Map();
  function get(id, ctx) {
    const c = ctx || {};
    const key = id + '|' + (c.carId || '') + '|' + (c.region || '') + '|' + (c.name || '') + '|' + (c.lines || []).join('/');
    let cv = cache.get(key);
    if (!cv) {
      const b = new Bitmap(W, H);
      b.fill(P.sky2); // safety net: no unpainted black holes
      let seed = 0;
      for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      (S[id] || S.roadside)(b, CT.U.rng(seed), c);
      // 1px black border like the original's framed pictures
      b.frame(0, 0, W, H, P.black);
      cv = b.toCanvas();
      cache.set(key, cv);
    }
    return cv;
  }

  CT.art.scenes = { W, H, painters: S, get, has: (id) => !!S[id] };
})(typeof window !== 'undefined' ? window : globalThis);
