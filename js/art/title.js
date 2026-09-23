/* The Car Trail - title screen artwork: ornate gold frame, ribbon banner,
 * desert river valley with a mesa, the family car, a cow skull and a rattlesnake -
 * a modern take on the original's title picture.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const { Bitmap, Mask, dith } = CT.gfx;
  const A = CT.art.A;
  const P = CT.art.P;

  const FRAME = 12;
  const IN = { x: FRAME + 3, y: FRAME + 3, w: 320 - 2 * (FRAME + 3), h: 240 - 2 * (FRAME + 3) };

  function frame(b) {
    // braided gold frame
    for (let y = 0; y < 240; y++) {
      for (let x = 0; x < 320; x++) {
        const d = Math.min(x, y, 319 - x, 239 - y);
        if (d >= FRAME) continue;
        let c;
        if (d === 0 || d === FRAME - 1) c = '#6c3c08';
        else if (d === 1 || d === FRAME - 2) c = '#f8d878';
        else {
          const along = (x + y) % 8, across = (x - y + 800) % 8;
          const braid = (along < 2 || across < 2) ? '#b86c10' : d < 4 || d > FRAME - 5 ? '#f0a830' : '#f8c048';
          c = braid;
          if ((along === 0 || across === 0) && d > 2 && d < FRAME - 3) c = '#7c4408';
        }
        b.pset(x, y, c);
      }
    }
    // cream mat
    b.frame(FRAME, FRAME, 320 - 2 * FRAME, 240 - 2 * FRAME, '#fff4d8');
    b.frame(FRAME + 1, FRAME + 1, 320 - 2 * FRAME - 2, 240 - 2 * FRAME - 2, '#f8e8b8');
    b.frame(FRAME + 2, FRAME + 2, 320 - 2 * FRAME - 4, 240 - 2 * FRAME - 4, '#8c5c1c');
  }

  function skull(b, x, y) {
    const m = new Mask(320, 240);
    m.ellipse(x, y, 11, 8);
    m.ellipse(x + 2, y + 9, 6, 7);
    b.paint(m, (px, py) => (px > x + 5 ? '#b8b0a0' : py < y - 4 ? '#ffffff' : '#e8e4d8'));
    b.outline(m, P.ink);
    b.ellipse(x - 3, y + 1, 2.5, 3, P.ink);
    b.ellipse(x + 6, y + 1, 2.5, 3, P.ink);
    b.rect(x + 1, y + 10, 1, 3, P.ink); b.rect(x + 3, y + 10, 1, 3, P.ink);
    // horns
    const h = new Mask(320, 240);
    h.thickLine(x - 9, y - 4, x - 20, y - 10, 2.2);
    h.thickLine(x - 20, y - 10, x - 22, y - 18, 1.5);
    h.thickLine(x + 10, y - 4, x + 20, y - 9, 2.2);
    h.thickLine(x + 20, y - 9, x + 21, y - 17, 1.5);
    b.paint(h, (px, py) => (py < y - 12 ? '#8c8474' : '#d8d0bc'));
    b.outline(h, P.ink);
  }

  function snake(b, cx, cy) {
    // coiled rattlesnake: spiral of a thick patterned body, head raised
    const coils = [];
    for (let t = 0; t < Math.PI * 5.2; t += 0.05) {
      const r = 3 + t * 1.9;
      coils.push([cx + Math.cos(t) * r * 1.35, cy + Math.sin(t) * r * 0.62, t]);
    }
    for (let i = coils.length - 1; i >= 0; i--) {
      const [x, y, t] = coils[i];
      const w = 2.4 + Math.min(1.6, t * 0.12);
      const pattern = Math.floor(t * 3.2) % 3;
      const c = pattern === 0 ? '#4c3418' : pattern === 1 ? '#c8a060' : '#9c7438';
      b.disc(x, y, w + 0.8, P.ink);
      b.disc(x, y, w, c);
      if (pattern === 1) b.pset(Math.round(x), Math.round(y - 1), '#e8d098');
    }
    // raised neck and head
    const hm = new Mask(320, 240);
    hm.thickLine(cx + 2, cy, cx - 2, cy - 12, 2.4);
    hm.ellipse(cx - 4, cy - 15, 4.4, 3);
    b.outline(hm, P.ink);
    b.paint(hm, (x, y) => (y < cy - 14 ? '#b08850' : dith(x, y, 0.4) ? '#9c7438' : '#c8a060'));
    b.pset(cx - 6, cy - 16, P.ink);
    b.line(cx - 9, cy - 14, cx - 11, cy - 13, P.red);
    // rattle
    const last = coils[coils.length - 1];
    for (let k = 0; k < 4; k++) b.disc(last[0] + 3 + k * 2, last[1] - 2 - k, 1.4, k % 2 ? '#e8d8a8' : '#b8a070');
  }

  function build(carId) {
    const b = new Bitmap(320, 240);
    const rng = CT.U.rng(1848);
    const X = IN.x, Y = IN.y, Wd = IN.w, Ht = IN.h;
    const inner = new Bitmap(Wd, Ht);
    A.sky(inner, 0, 104, ['#3c8ce8', '#5ca8f4', '#80c4fc', '#b0dcfc', '#d8f0fc']);
    A.clouds(inner, [[40, 76, 40, 7], [236, 70, 50, 8]], rng);
    A.mountains(inner, { baseY: 104, peaks: [{ x: 90, h: 14, w: 30 }, { x: 120, h: 20, w: 28 }, { x: 150, h: 16, w: 26 }, { x: 180, h: 12, w: 24 }, { x: 40, h: 10, w: 24 }], pal: { lit: '#b8a0dc', mid: '#9480c4', dark: '#7060a8', hi: '#d8c8f0', snow: '#ffffff', snowShade: '#dcd4f4', line: '#6c5ca0' }, snowLine: 6 }, rng);
    // desert plain
    A.grass(inner, 0, 104, Wd, Ht - 104, rng, { base: '#e8cc78', speckle: ['#d4b464', '#f4e09c', '#c8a458'], dark: '#b89448', light: '#fcf0c0', density: 0.12, tufts: 0.004 });
    for (let y = 104; y < 118; y++) for (let x = 0; x < Wd; x++) if (dith(x, y, 1 - (y - 104) / 14)) inner.pset(x, y, '#f0dc9c');
    // mesa on the right
    A.bluff(inner, [[176, 124], [196, 106], [206, 98], [230, 96], [240, 70], [244, 60], [262, 58], [270, 64], [276, 94], [290, 102], [290, 124]], rng, { a: '#e0a868', b: '#cc9454', c: '#b88048', shade: '#94603c', deep: '#6c4428', top: '#f4c888' });
    A.bluff(inner, [[150, 140], [180, 118], [220, 112], [260, 116], [290, 112], [290, 150]], rng, { a: '#d8a868', b: '#c89458', c: '#b4804c', shade: '#946440', deep: '#6c4830', top: '#f0cc90' });
    // river winding to the foreground
    A.river(inner, [[150, 104, 2], [160, 112, 5], [140, 122, 9], [118, 132, 12], [150, 146, 16], [120, 162, 20], [80, 176, 24], [40, 200, 30]], rng, { bank: '#b89448', flat: 0.35, streak: 0.1, base: '#2c6ce0' });
    // lone tree
    A.roundTree(inner, 100, 108, 14, rng, { mid: '#6c8c34', light: '#a4c050', dark: '#3c5418', mid2: '#546c28' });
    // grass & sage in the foreground
    A.grass(inner, 0, 178, Wd, Ht - 178, rng, { base: '#8ca040', speckle: ['#6c8030', '#a8bc54'], dark: '#4c6020', light: '#c8d470', density: 0.2, tufts: 0.05 });
    for (let i = 0; i < 18; i++) A.sage(inner, rng() * Wd, 150 + rng() * 40, 3 + rng() * 4, rng);
    // the car (scale 2) on a dirt track
    for (let x = 0; x < 150; x++) { const y = 150 + Math.round(Math.sin(x / 30) * 2); inner.hline(x, x, y, '#c8a060'); inner.hline(x, x, y + 1, '#b08c50'); }
    CT.art.cars.drawTo(inner, carId || 'wagon', 12, 152, 2, { shadowColor: '#8c6c3c' });
    skull(inner, 50, 182);
    snake(inner, 150, 178);
    A.sign(inner, 250, 142, ['OREGON', '2,040 MI'], { bg: '#1a6a30', postH: 22 });
    b.draw(inner, X, Y);
    frame(b);
    // ribbon banner
    const bx0 = 58, bx1 = 262, by = 28;
    b.poly([[bx0 - 22, by + 8], [bx0 + 4, by + 8], [bx0 + 4, by + 30], [bx0 - 22, by + 30], [bx0 - 14, by + 19]], '#d8d0b8');
    b.poly([[bx1 + 22, by + 8], [bx1 - 4, by + 8], [bx1 - 4, by + 30], [bx1 + 22, by + 30], [bx1 + 14, by + 19]], '#d8d0b8');
    b.poly([[bx0 - 22, by + 8], [bx0 + 4, by + 8], [bx0 + 4, by + 30], [bx0 - 22, by + 30], [bx0 - 14, by + 19]], '#d8d0b8');
    b.rect(bx0, by, bx1 - bx0, 26, '#fffcf0');
    b.rect(bx0, by + 22, bx1 - bx0, 4, '#e8e0c8');
    b.frame(bx0, by, bx1 - bx0, 26, '#8c7c5c');
    b.poly([[bx0, by + 26], [bx0 + 4, by + 30], [bx0 + 4, by + 26]], '#a89878');
    b.poly([[bx1, by + 26], [bx1 - 4, by + 30], [bx1 - 4, by + 26]], '#a89878');
    const title = 'The Car Trail';
    const tw = CT.font.width(title, 2) + 2;
    const tx = Math.round(160 - tw / 2);
    b.text(title, tx + 1, by + 6, '#a8987c', 2);
    b.text(title, tx, by + 5, '#1c1410', 2);
    b.text(title, tx + 1, by + 5, '#1c1410', 2);
    return b.toCanvas();
  }

  const cache = new Map();
  function get(carId) {
    const k = carId || 'wagon';
    if (!cache.has(k)) cache.set(k, build(k));
    return cache.get(k);
  }

  // Buttons along the bottom (drawn at runtime so they can highlight).
  const BUTTONS = [
    { label: 'Introduction', x: 17, w: 77 },
    { label: 'Options', x: 97, w: 50 },
    { label: 'Top Ten', x: 150, w: 50 },
    { label: 'Travel the Trail', x: 203, w: 101 },
  ];
  const BTN_Y = 206, BTN_H = 12;
  function drawButtons(ctx, sel) {
    BUTTONS.forEach((btn, i) => {
      const hot = i === sel;
      ctx.fillStyle = '#3c2c10';
      ctx.fillRect(btn.x + 1, BTN_Y + 1, btn.w, BTN_H);
      ctx.fillStyle = hot ? '#fff8b0' : '#f8e888';
      ctx.fillRect(btn.x + 1, BTN_Y, btn.w - 2, BTN_H);
      ctx.fillRect(btn.x, BTN_Y + 1, btn.w, BTN_H - 2);
      ctx.fillStyle = hot ? '#ffffff' : '#fffcd0';
      ctx.fillRect(btn.x + 1, BTN_Y + 1, btn.w - 2, 1);
      ctx.fillStyle = '#b8a048';
      ctx.fillRect(btn.x + 1, BTN_Y + BTN_H - 2, btn.w - 2, 1);
      CT.font.draw(ctx, btn.label, btn.x + btn.w / 2, BTN_Y + 2, hot ? '#a01010' : '#141010', { align: 'center' });
    });
  }
  function hitButton(x, y) {
    for (let i = 0; i < BUTTONS.length; i++) {
      const b = BUTTONS[i];
      if (x >= b.x && x < b.x + b.w && y >= BTN_Y && y < BTN_Y + BTN_H) return i;
    }
    return -1;
  }

  CT.art.title = { get, drawButtons, hitButton, BUTTONS };
})(typeof window !== 'undefined' ? window : globalThis);
