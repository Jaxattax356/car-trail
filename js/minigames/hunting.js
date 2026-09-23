/* The Car Trail - HUNTING mini-game.
 * Animals run across a field at three depths. Aim with the mouse, touch or the
 * arrow keys; shoot with a click/tap or SPACE. You can only carry 200 pounds
 * of meat back to the car - just like the original.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const S = CT.sim;
  const E = CT.engine;
  const { Bitmap, dith } = CT.gfx;
  const A = CT.art.A;
  const P = CT.art.P;
  const C = CT.art.critters;

  CT.mini = CT.mini || {};

  const FAUNA = {
    plains: { rabbit: 5, deer: 4, turkey: 4 },
    platte: { rabbit: 4, pronghorn: 3, deer: 3, bison: 1.2 },
    wyoming: { rabbit: 4, pronghorn: 5, elk: 1, bison: 1 },
    mountain: { rabbit: 3, elk: 3, deer: 3, bear: 1 },
    idaho: { rabbit: 5, pronghorn: 3, deer: 3 },
    forest: { deer: 4, elk: 3, bear: 2, turkey: 2 },
    oregon: { rabbit: 4, deer: 4, turkey: 3 },
    hood: { deer: 3, elk: 3, bear: 2 },
  };
  const LOOK = {
    plains: { ground: { base: P.g3, speckle: [P.g2, P.g4], dark: P.g1, light: P.g5 }, far: 'hills', bush: 'bush' },
    platte: { ground: { base: '#a8b44c', speckle: ['#8c9c3c', '#c4cc6c'], dark: '#6c7c30', light: '#dce08c' }, far: 'bluffs', bush: 'sage' },
    wyoming: { ground: { base: '#b4a868', speckle: ['#9c9058', '#c8bc80'], dark: P.sg0, light: '#dcd4a0' }, far: 'peaks', bush: 'sage' },
    mountain: { ground: { base: '#a8a060', speckle: ['#8c8850', '#c0b878'], dark: P.sg0, light: '#d8d098' }, far: 'peaks', bush: 'pine' },
    idaho: { ground: { base: '#b4a868', speckle: ['#9c9058', '#c8bc80'], dark: P.sg0, light: '#dcd4a0' }, far: 'brown', bush: 'sage' },
    forest: { ground: { base: P.g2, speckle: [P.g1, P.g3], dark: P.g0, light: P.g4 }, far: 'blue', bush: 'pine' },
    oregon: { ground: { base: '#d0b460', speckle: ['#b89c4c', '#e4cc7c'], dark: '#98803c', light: '#f0e0a0' }, far: 'hills', bush: 'bush' },
    hood: { ground: { base: P.g2, speckle: [P.g1, P.g3], dark: P.g0, light: P.g4 }, far: 'peaks', bush: 'pine' },
  };
  const BANDS = [
    { y0: 92, y1: 118, s: 0.6 },
    { y0: 126, y1: 160, s: 0.8 },
    { y0: 170, y1: 214, s: 1.0 },
  ];

  const bgCache = new Map();
  function background(reg) {
    if (bgCache.has(reg)) return bgCache.get(reg);
    const look = LOOK[reg] || LOOK.plains;
    const b = new Bitmap(320, 240);
    const rng = U.rng(reg.length * 991 + 7);
    A.sky(b, 0, 90, [P.sky0, P.sky1, P.sky2, P.sky3]);
    A.clouds(b, [[60, 20, 80, 13], [220, 30, 100, 15]], rng);
    if (look.far === 'hills') A.hills(b, { y: 76, bottom: 92, waves: [[160, 5, 0], [60, 2, 1]], base: P.mb2, edge: P.mb3, fade: 10, base2: P.mb1 }, rng);
    else if (look.far === 'bluffs') { b.poly([[0, 90], [30, 72], [110, 70], [140, 84], [200, 90]], '#c8a47c'); b.poly([[180, 90], [220, 70], [300, 68], [320, 76], [320, 92]], '#b08860'); }
    else A.mountains(b, { baseY: 92, peaks: [{ x: 50, h: 30, w: 50 }, { x: 140, h: 40, w: 60 }, { x: 230, h: 32, w: 50 }, { x: 310, h: 38, w: 50 }], pal: look.far === 'blue' ? A.BLUE : look.far === 'brown' ? A.BROWN : A.PURPLE, snowLine: 16 }, rng);
    A.grass(b, 0, 90, 320, 150, rng, Object.assign({}, look.ground, { tufts: 0.02 }));
    for (let y = 90; y < 100; y++) for (let x = 0; x < 320; x++) if (dith(x, y, 1 - (y - 90) / 10)) b.pset(x, y, look.ground.light);
    for (let i = 0; i < 16; i++) {
      const x = rng() * 320, y = 96 + rng() * 130;
      const sz = 3 + ((y - 90) / 150) * 8;
      if (look.bush === 'pine') A.pine(b, x, y, sz * 4, rng);
      else if (look.bush === 'sage') A.sage(b, x, y, sz, rng);
      else if (rng() < 0.25) A.roundTree(b, x, y, sz * 3.5, rng);
      else A.bush(b, x, y, sz, rng);
    }
    for (let i = 0; i < 6; i++) {
      const x = rng() * 320, y = 110 + rng() * 120, r = 2 + ((y - 90) / 150) * 5;
      b.ellipse(x, y, r * 1.4, r * 0.8, P.gr1);
      b.ellipse(x - r * 0.3, y - r * 0.2, r * 0.9, r * 0.5, P.gr2);
    }
    const cv = b.toCanvas();
    bgCache.set(reg, cv);
    return cv;
  }

  CT.mini.hunt = function (G, done) {
    const reg = S.huntRegion(G);
    const fauna = FAUNA[reg] || FAUNA.plains;
    const scarcity = S.scarcity(G);
    const bg = background(reg);
    const TIME = 30;
    const st = {
      t: 0, left: TIME, used: 0, lbs: 0, kills: [], animals: [], puffs: [], flash: 0,
      aimX: 160, aimY: 150, spawnT: 0.4, msg: '', msgT: 0, over: false, overT: 0,
    };
    const bulletsLeft = () => G.bullets - st.used;

    function spawn() {
      const type = U.weighted(Object.keys(fauna), (k) => fauna[k]);
      const bi = U.randInt(0, 2);
      const band = BANDS[bi];
      const sp = C.SPECIES[type];
      const dir = U.chance(0.5) ? 1 : -1; // 1 = moving right
      const a = {
        type, band: bi, s: band.s, dir,
        y: U.randRange(band.y0, band.y1),
        speed: sp.speed * band.s * U.randRange(0.8, 1.2),
        state: 'run', t: 0, frameT: 0, frame: 0, pauseAt: U.chance(0.35) ? U.randRange(60, 260) : -1,
      };
      const cv = C.animalCanvas(type, a.s, 0, false, dir > 0);
      a.w = cv.cv.width;
      a.x = dir > 0 ? -a.w : 320;
      st.animals.push(a);
    }

    function hitTest(a, x, y) {
      const spr = C.animalCanvas(a.type, a.s, a.frame, false, a.dir > 0);
      const lx = Math.floor(x - a.x), ly = Math.floor(y - (a.y - spr.gy));
      if (lx < 0 || ly < 0 || lx >= spr.bmp.w || ly >= spr.bmp.h) return false;
      // forgiving: accept any opaque pixel within 1px
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (spr.bmp.pget(lx + dx, ly + dy)) return true;
      return false;
    }

    function shoot() {
      if (st.over) return;
      if (bulletsLeft() <= 0) { st.msg = 'Out of bullets!'; st.msgT = 1.5; CT.sound.play('error'); return; }
      st.used++;
      st.flash = 0.08;
      CT.sound.play('shot');
      const order = st.animals.filter((a) => a.state !== 'dead').sort((p, q) => q.y - p.y);
      for (const a of order) {
        if (hitTest(a, st.aimX, st.aimY)) {
          a.state = 'dead';
          a.t = 0;
          const sp = C.SPECIES[a.type];
          const lbs = U.randInt(sp.meat[0], sp.meat[1]);
          st.lbs += lbs;
          st.kills.push({ type: a.type, lbs });
          st.msg = 'You shot a ' + sp.name + '! (' + lbs + ' lbs)';
          st.msgT = 1.6;
          CT.sound.play('hit');
          st.animals.forEach((o) => { if (o !== a && o.state !== 'dead' && Math.abs(o.x - a.x) < 120) { o.state = 'flee'; o.speed *= 1.7; } });
          return;
        }
      }
      for (let i = 0; i < 6; i++) st.puffs.push({ x: st.aimX, y: st.aimY, vx: U.randRange(-20, 20), vy: U.randRange(-30, -5), t: 0 });
      st.animals.forEach((o) => { if (o.state !== 'dead' && Math.abs(o.x + o.w / 2 - st.aimX) < 60 && Math.abs(o.y - st.aimY) < 40) { o.state = 'flee'; o.speed *= 1.6; } });
    }

    function end() {
      if (st.over) return;
      st.over = true;
      st.overT = 0;
      st.msg = st.left <= 0 ? 'Time is up!' : 'You head back to the car.';
      st.msgT = 99;
    }

    const scr = {
      kind: 'hunt',
      st, // exposed for automated tests
      inputDelay: 0.3,
      allowRepeat: true,
      update(dt) {
        if (st.over) {
          st.overT += dt;
          if (st.overT > 1.4) { finish(); }
          return;
        }
        st.t += dt;
        st.left = Math.max(0, TIME - st.t);
        if (st.left <= 0) end();
        // keyboard aiming
        const k = E.keys;
        const v = 150 * dt;
        if (k.ArrowLeft || k.a) st.aimX -= v;
        if (k.ArrowRight || k.d) st.aimX += v;
        if (k.ArrowUp || k.w) st.aimY -= v;
        if (k.ArrowDown || k.s) st.aimY += v;
        st.aimX = U.clamp(st.aimX, 2, 317);
        st.aimY = U.clamp(st.aimY, 20, 228);
        // spawning
        st.spawnT -= dt;
        const alive = st.animals.filter((a) => a.state !== 'dead').length;
        if (st.spawnT <= 0 && alive < 4) {
          if (!U.chance(scarcity * 0.8)) spawn();
          st.spawnT = U.randRange(0.9, 2.2) * (1 + scarcity * 1.5);
        }
        st.animals.forEach((a) => {
          a.t += dt;
          if (a.state === 'dead') return;
          if (a.state === 'graze') {
            if (a.t > 1.4) { a.state = 'run'; a.t = 0; }
            return;
          }
          a.x += a.dir * a.speed * dt;
          a.frameT += dt * (a.speed / 10);
          a.frame = Math.floor(a.frameT) % 4;
          if (a.state === 'run' && a.pauseAt > 0 && ((a.dir > 0 && a.x > a.pauseAt) || (a.dir < 0 && a.x < a.pauseAt))) {
            a.pauseAt = -1;
            if (a.type !== 'rabbit') { a.state = 'graze'; a.t = 0; }
          }
        });
        st.animals = st.animals.filter((a) => (a.state === 'dead' ? a.t < 2.5 : a.x > -a.w - 10 && a.x < 330));
        st.puffs.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; });
        st.puffs = st.puffs.filter((p) => p.t < 0.5);
        if (st.flash > 0) st.flash -= dt;
        if (st.msgT > 0) st.msgT -= dt;
      },
      move(x, y) { st.aimX = x; st.aimY = y; },
      down(x, y) { st.aimX = x; st.aimY = y; shoot(); },
      key(k) {
        if (k === ' ' || k === 'Enter') shoot();
        else if (k === 'Escape') end();
      },
      render(ctx) {
        ctx.drawImage(bg, 0, 0);
        st.animals.slice().sort((p, q) => p.y - q.y).forEach((a) => {
          const spr = C.animalCanvas(a.type, a.s, a.state === 'graze' ? 0 : a.frame, a.state === 'dead', a.dir > 0);
          ctx.drawImage(spr.cv, Math.round(a.x), Math.round(a.y - spr.gy));
        });
        ctx.fillStyle = '#c8b890';
        st.puffs.forEach((p) => ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2));
        if (st.flash > 0) { ctx.fillStyle = 'rgba(255,255,220,0.35)'; ctx.fillRect(0, 0, 320, 240); }
        // crosshair
        const x = Math.round(st.aimX), y = Math.round(st.aimY);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 7, y - 1, 5, 3); ctx.fillRect(x + 3, y - 1, 5, 3);
        ctx.fillRect(x - 1, y - 7, 3, 5); ctx.fillRect(x - 1, y + 3, 3, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 6, y, 4, 1); ctx.fillRect(x + 3, y, 4, 1);
        ctx.fillRect(x, y - 6, 1, 4); ctx.fillRect(x, y + 3, 1, 4);
        ctx.fillStyle = '#ff3030';
        ctx.fillRect(x, y, 1, 1);
        // HUD
        UI.rect(ctx, 0, 0, 320, 11, 'rgba(0,0,0,0.75)');
        UI.text(ctx, 'Bullets: ' + bulletsLeft(), 4, 1, bulletsLeft() < 5 ? UI.C.red : UI.C.white);
        UI.text(ctx, 'Meat: ' + st.lbs + ' lbs', 110, 1, UI.C.yellow);
        const secs = Math.ceil(st.left);
        UI.text(ctx, 'Time: 0:' + (secs < 10 ? '0' : '') + secs, 316, 1, secs <= 5 ? UI.C.red : UI.C.white, { align: 'right' });
        UI.rect(ctx, 0, 229, 320, 11, 'rgba(0,0,0,0.75)');
        UI.center(ctx, E.coarse ? 'Tap an animal to shoot' : 'Aim: mouse/arrows   Shoot: click/SPACE   ESC: done', 230, UI.C.gray);
        if (st.msgT > 0 && st.msg) UI.dialogText(ctx, [st.msg], 160, 50, UI.C.white);
      },
    };
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done({ lbs: st.lbs, used: st.used, kills: st.kills });
    }
    E.go(UI.message({
      title: 'Hunting',
      lines: U.wrap('You grab the rifle and head out into the ' + ({ plains: 'fields', platte: 'prairie', wyoming: 'sagebrush', mountain: 'mountains', idaho: 'sagebrush', forest: 'woods', oregon: 'fields', hood: 'forest' }[reg] || 'fields') + '. You have ' + G.bullets + ' bullets and 30 seconds.', 48)
        .concat([''], E.coarse ? ['Tap on an animal to shoot it.'] : ['Aim with the mouse or the arrow keys.', 'Shoot with a click or the SPACE BAR.', 'Press ESC to stop hunting early.'], ['', 'Remember: you can only carry 200 pounds', 'of meat back to the car.']),
      onDone: () => E.go(scr),
    }));
  };
})(typeof window !== 'undefined' ? window : globalThis);
