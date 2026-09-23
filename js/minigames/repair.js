/* The Car Trail - ROADSIDE REPAIR mini-game.
 * A needle sweeps across a gauge; press SPACE (or tap) while it is in the green
 * zone to tighten each lug nut / bolt / clamp. Three or more misses and the
 * repair eats up the whole day.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const E = CT.engine;
  const { Bitmap, Mask, dith } = CT.gfx;
  const P = CT.art.P;

  CT.mini = CT.mini || {};

  const GX = 40, GW = 240, GY = 196;

  const JOB = {
    tires: { need: 5, title: 'Tighten the lug nuts', verb: 'lug nut' },
    belts: { need: 3, title: 'Tighten the belt tensioner', verb: 'bolt' },
    batteries: { need: 2, title: 'Connect the battery terminals', verb: 'terminal' },
  };

  function wheelArt() {
    const b = new Bitmap(320, 170);
    b.fill('#3c3c46');
    b.speckle(0, 0, 320, 170, () => true, ['#2c2c34', '#50505c'], 0.2, U.rng(3));
    const cx = 160, cy = 86;
    const tire = new Mask(320, 170);
    tire.disc(cx, cy, 70);
    b.paint(tire, (x, y) => {
      const a = Math.atan2(y - cy, x - cx);
      const d = Math.hypot(x - cx, y - cy);
      if (d > 60 && Math.floor((a + Math.PI) * 18) % 2 === 0) return '#26262c';
      return d > 66 ? '#1a1a1e' : '#202024';
    });
    b.outline(tire, '#0c0c10');
    const rim = new Mask(320, 170);
    rim.disc(cx, cy, 44);
    b.paint(rim, (x, y) => {
      const l = -(x - cx) * 0.5 - (y - cy);
      if (Math.hypot(x - cx, y - cy) > 41) return '#6c6c78';
      return l > 20 ? '#e0e0e8' : l > -10 ? '#b8b8c4' : '#8c8c98';
    });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      b.ellipse(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, 8, 8, '#6c6c78');
    }
    b.disc(cx, cy, 13, '#9c9ca8');
    b.disc(cx, cy, 7, '#50505c');
    return b.toCanvas();
  }
  function nutPos(i, n) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [160 + Math.cos(a) * 20, 86 + Math.sin(a) * 20];
  }

  function engineArt() {
    const b = new Bitmap(320, 170);
    b.fill('#2c2c34');
    b.rect(40, 30, 240, 120, '#50505c');
    b.rect(40, 30, 240, 4, '#6c6c78');
    b.rect(70, 50, 110, 70, '#8c3c2c');
    b.rect(70, 50, 110, 5, '#b85c44');
    for (let x = 80; x < 170; x += 14) b.rect(x, 60, 8, 50, '#6c2c1c');
    b.rect(200, 50, 60, 40, '#1c1c24');
    b.rect(205, 55, 50, 6, '#e8c030');
    [[230, 120, 16], [190, 130, 10], [260, 100, 9]].forEach(([x, y, r]) => { b.disc(x, y, r + 1, '#101014'); b.disc(x, y, r, '#8c8c98'); b.disc(x, y, r * 0.4, '#50505c'); });
    return b.toCanvas();
  }

  function batteryArt() {
    const b = new Bitmap(320, 170);
    b.fill('#2c2c34');
    b.rect(90, 50, 140, 90, '#141418');
    b.rect(92, 52, 136, 20, '#303038');
    b.rect(110, 90, 100, 30, '#e8e8e8');
    CT.font.drawToBitmap(b, '12 VOLT', 139, 101, '#141418', 1);
    b.rect(110, 36, 18, 16, '#9c9ca8'); b.rect(192, 36, 18, 16, '#9c9ca8');
    CT.font.drawToBitmap(b, '+', 116, 58, '#e02020', 1);
    CT.font.drawToBitmap(b, '-', 198, 58, '#e8e8e8', 1);
    return b.toCanvas();
  }

  const art = {};
  function getArt(part) {
    if (!art[part]) art[part] = part === 'tires' ? wheelArt() : part === 'belts' ? engineArt() : batteryArt();
    return art[part];
  }

  CT.mini.repair = function (G, part, done) {
    const job = JOB[part];
    const mech = G.occupation === 'mechanic';
    const zoneW = mech ? 58 : 40;
    const st = {
      needle: 0, dir: 1, speed: 170, zone: 0, got: 0, misses: 0, t: 0, flash: 0, flashGood: false, over: false, overT: 0, shake: 0,
    };
    const newZone = () => { st.zone = U.randRange(10, GW - zoneW - 10); };
    newZone();

    function press() {
      if (st.over) return;
      const inZone = st.needle >= st.zone && st.needle <= st.zone + zoneW;
      st.flash = 0.25;
      st.flashGood = inZone;
      if (inZone) {
        st.got++;
        st.speed += 22;
        CT.sound.play('clank');
        if (st.got >= job.need) { st.over = true; CT.sound.play('good'); }
        else newZone();
      } else {
        st.misses++;
        st.shake = 0.25;
        CT.sound.play('slip');
        if (st.misses >= 6) { st.over = true; }
      }
    }

    const scr = {
      kind: 'repair',
      st, // exposed for automated tests
      inputDelay: 0.35,
      update(dt) {
        st.t += dt;
        if (st.over) { st.overT += dt; if (st.overT > 1.3) finish(); return; }
        st.needle += st.dir * st.speed * dt;
        if (st.needle >= GW) { st.needle = GW; st.dir = -1; }
        if (st.needle <= 0) { st.needle = 0; st.dir = 1; }
        if (st.flash > 0) st.flash -= dt;
        if (st.shake > 0) st.shake -= dt;
      },
      key(k) { if (k === ' ' || k === 'Enter') press(); },
      down() { press(); },
      render(ctx) {
        const sx = st.shake > 0 ? Math.round((Math.random() - 0.5) * 6) : 0;
        ctx.drawImage(getArt(part), sx, 0);
        // bolts
        if (part === 'tires') {
          for (let i = 0; i < job.need; i++) {
            const [x, y] = nutPos(i, job.need);
            const done_ = i < st.got;
            ctx.fillStyle = '#141018'; ctx.fillRect(Math.round(x) - 4 + sx, Math.round(y) - 4, 9, 9);
            ctx.fillStyle = done_ ? '#f8e060' : '#8c8c98'; ctx.fillRect(Math.round(x) - 3 + sx, Math.round(y) - 3, 7, 7);
            ctx.fillStyle = done_ ? '#fff8c0' : '#b8b8c4'; ctx.fillRect(Math.round(x) - 3 + sx, Math.round(y) - 3, 3, 2);
            if (i === st.got && !st.over) { UI.frame(ctx, Math.round(x) - 6 + sx, Math.round(y) - 6, 13, 13, UI.blink() ? '#ffff55' : '#ffffff'); }
          }
        } else if (part === 'belts') {
          ctx.fillStyle = st.got >= job.need ? '#303038' : '#141418';
          // belt path around the pulleys
          const pts = [[230, 104], [190, 120], [260, 91], [246, 120], [200, 140]];
          pts.forEach(([x, y]) => ctx.fillRect(x - 1 + sx, y - 1, 3, 3));
          ctx.fillStyle = '#141418';
          for (let t = 0; t <= 1; t += 0.02) { ctx.fillRect(Math.round(U.lerp(190, 260, t)) + sx, Math.round(U.lerp(120, 91, t)), 2, 2); ctx.fillRect(Math.round(U.lerp(200, 246, t)) + sx, Math.round(U.lerp(140, 120, t)), 2, 2); }
          for (let i = 0; i < job.need; i++) {
            const x = 110 + i * 34, y = 136;
            ctx.fillStyle = i < st.got ? '#f8e060' : '#8c8c98';
            ctx.fillRect(x - 4 + sx, y - 4, 9, 9);
            if (i === st.got && !st.over) UI.frame(ctx, x - 6 + sx, y - 6, 13, 13, UI.blink() ? '#ffff55' : '#ffffff');
          }
        } else {
          [[119, 44, '#e02020'], [201, 44, '#141418']].forEach(([x, y, c], i) => {
            if (i < st.got) {
              ctx.fillStyle = c;
              for (let k = 0; k < 30; k++) ctx.fillRect(x - 2 + sx + Math.round(Math.sin(k / 5) * 3), y - 8 - k, 5, 2);
              ctx.fillStyle = '#c8c8d0'; ctx.fillRect(x - 5 + sx, y - 8, 11, 6);
            } else if (i === st.got && !st.over) UI.frame(ctx, x - 11 + sx, y - 10, 22, 20, UI.blink() ? '#ffff55' : '#ffffff');
          });
        }
        // gauge
        UI.rect(ctx, 0, 170, 320, 70, '#000');
        UI.center(ctx, job.title + '  (' + st.got + '/' + job.need + ')', 176, UI.C.yellow);
        UI.rect(ctx, GX - 2, GY - 2, GW + 4, 14, '#ffffff');
        UI.rect(ctx, GX, GY, GW, 10, '#801818');
        UI.rect(ctx, GX + Math.round(st.zone), GY, zoneW, 10, '#20b040');
        UI.rect(ctx, GX + Math.round(st.zone) + Math.round(zoneW / 2) - 1, GY, 2, 10, '#80ff90');
        const nx = GX + Math.round(st.needle);
        UI.rect(ctx, nx - 1, GY - 5, 3, 20, '#141018');
        UI.rect(ctx, nx, GY - 4, 1, 18, '#ffff55');
        if (st.flash > 0) UI.center(ctx, st.flashGood ? 'Clank! Got it.' : 'The wrench slipped!', 214, st.flashGood ? UI.C.green : UI.C.red);
        else UI.center(ctx, E.coarse ? 'Tap when the needle is in the green!' : 'Press SPACE when the needle is in the green!', 214, UI.C.white);
        UI.text(ctx, 'Misses: ' + st.misses, 12, 228, st.misses >= 3 ? UI.C.red : UI.C.gray);
        if (mech) UI.text(ctx, 'Mechanic: bigger target', 308, 228, UI.C.cyan, { align: 'right' });
        if (st.over) UI.dialogText(ctx, [st.got >= job.need ? (st.misses >= 3 ? 'Fixed - but it took forever.' : 'Fixed! Back on the road.') : 'Ugh. This is taking all day...'], 160, 80);
      },
    };
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done(st.got >= job.need ? st.misses : Math.max(3, st.misses));
    }
    E.go(UI.message({
      title: 'Roadside Repair',
      lines: U.wrap('You pull over, pop the trunk and get to work. ' + (part === 'tires' ? 'The spare goes on - now tighten the ' + job.need + ' lug nuts.' : part === 'belts' ? 'The new belt is on - now tighten the tensioner bolts.' : 'The new battery is in - now connect the terminals.'), 48)
        .concat(['', E.coarse ? 'Tap when the moving needle is inside the' : 'Press SPACE when the moving needle is inside', E.coarse ? 'green zone.' : 'the green zone.', '', 'Miss three times and the repair will take', 'the whole day.']),
      onDone: () => E.go(scr),
    }));
  };
})(typeof window !== 'undefined' ? window : globalThis);
