/* The Car Trail - FISHING mini-game.
 * Cast your line, wait for a bite, hook the fish at the right moment, then
 * keep it inside the green zone while you reel it in.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const E = CT.engine;
  const { Bitmap, dith } = CT.gfx;
  const A = CT.art.A;
  const P = CT.art.P;
  const C = CT.art.critters;

  CT.mini = CT.mini || {};

  const SURFACE = 96;
  const HOOK_DEPTH = 44; // hook sits this far under the bobber
  const TIME = 60;

  const bgCache = new Map();
  function background(water) {
    if (bgCache.has(water)) return bgCache.get(water);
    const b = new Bitmap(320, 240);
    const rng = U.rng(water.length * 131 + 5);
    A.sky(b, 0, 70, [P.sky0, P.sky1, P.sky2]);
    A.clouds(b, [[80, 16, 90, 14], [250, 24, 70, 12]], rng);
    const dry = water === 'green' || water === 'snake' || water === 'columbia';
    if (dry) A.mountains(b, { baseY: 74, peaks: [{ x: 60, h: 24, w: 50 }, { x: 170, h: 30, w: 60 }, { x: 280, h: 26, w: 50 }], pal: water === 'columbia' ? A.BLUE : A.BROWN, snowLine: 18 }, rng);
    A.grass(b, 0, 70, 320, 28, rng, dry ? { base: '#b4a868', speckle: ['#9c9058', '#c8bc80'], dark: P.sg0, light: '#dcd4a0' } : { base: P.g3, speckle: [P.g2, P.g4], dark: P.g1, light: P.g5 });
    for (let x = 4; x < 320; x += 11 + Math.floor(rng() * 14)) {
      if (dry) A.sage(b, x, 88 + rng() * 6, 3, rng);
      else A.roundTree(b, x, 84 + rng() * 4, 10 + rng() * 8, rng);
    }
    // water: gets darker with depth
    for (let y = SURFACE; y < 240; y++) {
      const t = (y - SURFACE) / (240 - SURFACE);
      for (let x = 0; x < 320; x++) {
        let c = t < 0.33 ? (dith(x, y, t * 3) ? '#1850c8' : '#2c68dc') : t < 0.66 ? (dith(x, y, (t - 0.33) * 3) ? '#103ca0' : '#1850c8') : (dith(x, y, (t - 0.66) * 3) ? '#0a2878' : '#103ca0');
        b.pset(x, y, c);
      }
    }
    b.hline(0, 319, SURFACE, '#8cc0fc');
    // rocks & weeds on the bottom
    for (let i = 0; i < 16; i++) {
      const x = rng() * 320;
      b.ellipse(x, 236, 6 + rng() * 10, 4 + rng() * 3, '#2c3c4c');
      for (let k = 0; k < 3; k++) b.line(x + k * 3, 232, x + k * 3 + (rng() - 0.5) * 6, 214 - rng() * 12, '#1c5c3c');
    }
    // dock and angler
    b.rect(0, 90, 70, 5, P.wood2);
    b.rect(0, 94, 70, 2, P.wood0);
    for (let x = 4; x < 70; x += 16) b.rect(x, 96, 3, 40, P.wood1);
    for (let x = 0; x < 70; x += 7) b.vline(x, 90, 94, P.wood1);
    const px = 38, gy = 90;
    b.rect(px, gy - 7, 2, 7, P.blue1); b.rect(px + 3, gy - 7, 2, 7, P.blue1);
    b.rect(px - 1, gy - 16, 7, 9, '#c83c2c');
    b.rect(px, gy - 21, 5, 5, '#e0a878');
    b.rect(px - 1, gy - 23, 7, 2, '#3c6c2c'); b.rect(px + 1, gy - 25, 3, 2, '#3c6c2c');
    b.rect(px + 5, gy - 14, 4, 2, '#e0a878');
    const cv = b.toCanvas();
    bgCache.set(water, cv);
    return cv;
  }

  CT.mini.fish = function (G, water, done) {
    const w = water || 'kansas';
    const bg = background(w);
    const table = C.WATERS[w] || C.WATERS.kansas;
    const ROD_TIP = { x: 84, y: 52 };
    const st = {
      t: 0, phase: 'aim', aimX: 190, bob: null, fish: [], caught: [], lbs: 0,
      msg: '', msgT: 0, reel: null, over: false, overT: 0, holding: false, show: null,
    };

    function newFish() {
      const type = U.pick(table);
      const f = C.FISH[type];
      return {
        type, lbs: U.randInt(f.lbs[0], f.lbs[1]),
        x: U.randRange(90, 310), y: U.randRange(SURFACE + 24, 222),
        dir: U.chance(0.5) ? 1 : -1, speed: U.randRange(10, 26),
        state: 'swim', t: 0, turnT: U.randRange(1, 4), nib: 0,
      };
    }
    for (let i = 0; i < 5; i++) st.fish.push(newFish());

    function say(m, t) { st.msg = m; st.msgT = t || 1.5; }

    function action() {
      if (st.over) return;
      if (st.phase === 'aim') {
        st.phase = 'cast';
        st.bob = { x: ROD_TIP.x, y: ROD_TIP.y, tx: st.aimX, t: 0 };
        CT.sound.play('blip');
      } else if (st.phase === 'wait') {
        const f = st.fish.find((x) => x.state === 'nibble' || x.state === 'bite');
        if (f && f.state === 'bite') {
          st.phase = 'reel';
          const diff = C.FISH[f.type].diff;
          st.reel = { f, zone: 110, zv: 0, fy: 110, fv: 0, target: 110, prog: 0.3, diff, tt: 0 };
          CT.sound.play('bite');
        } else if (f) {
          f.state = 'flee'; f.t = 0; f.dir = f.x > st.bob.x ? 1 : -1; f.speed = 70;
          say('Too early! You scared it away.');
          CT.sound.play('slip');
        } else {
          st.phase = 'aim';
          st.bob = null;
          say('You reel in your line.', 1);
        }
      }
    }

    function land() {
      const f = st.reel.f;
      st.caught.push(f);
      st.lbs += f.lbs;
      st.show = { f, t: 0 };
      st.fish.splice(st.fish.indexOf(f), 1);
      st.fish.push(newFish());
      st.phase = 'aim';
      st.bob = null;
      st.reel = null;
      CT.sound.play('catch');
    }

    function lose(txt) {
      const f = st.reel.f;
      f.state = 'flee'; f.t = 0; f.speed = 80;
      st.phase = 'aim';
      st.bob = null;
      st.reel = null;
      say(txt || 'It got away!');
      CT.sound.play('bad');
    }

    function end() {
      if (st.over) return;
      st.over = true;
      say(st.t >= TIME ? 'The sun is setting. Time to go.' : 'You pack up your fishing gear.', 99);
    }

    const scr = {
      kind: 'fish',
      st, // exposed for automated tests
      inputDelay: 0.3,
      update(dt) {
        if (st.over) { st.overT += dt; if (st.overT > 1.5) finish(); return; }
        st.t += dt;
        if (st.t >= TIME && st.phase !== 'reel') end();
        if (st.msgT > 0) st.msgT -= dt;
        if (st.show) { st.show.t += dt; if (st.show.t > 1.8) st.show = null; }
        const k = E.keys;
        if (st.phase === 'aim') {
          if (k.ArrowLeft || k.a) st.aimX -= 120 * dt;
          if (k.ArrowRight || k.d) st.aimX += 120 * dt;
          st.aimX = U.clamp(st.aimX, 100, 308);
        }
        if (st.phase === 'cast') {
          const b = st.bob;
          b.t += dt / 0.55;
          const t = Math.min(1, b.t);
          b.x = U.lerp(ROD_TIP.x, b.tx, t);
          b.y = U.lerp(ROD_TIP.y, SURFACE, t) - Math.sin(t * Math.PI) * 30;
          if (t >= 1) { st.phase = 'wait'; b.y = SURFACE; CT.sound.play('splash'); }
        }
        // fish AI
        st.fish.forEach((f) => {
          f.t += dt;
          if (f.state === 'swim') {
            f.x += f.dir * f.speed * dt;
            f.y += Math.sin(st.t * 1.3 + f.x * 0.05) * 4 * dt;
            f.turnT -= dt;
            if (f.turnT <= 0 || f.x < 80 || f.x > 315) { f.dir = f.x < 80 ? 1 : f.x > 315 ? -1 : -f.dir; f.turnT = U.randRange(1.5, 4); }
            if (st.phase === 'wait' && !st.fish.some((o) => o.state === 'approach' || o.state === 'nibble' || o.state === 'bite')) {
              const hx = st.bob.x, hy = SURFACE + HOOK_DEPTH;
              if (Math.abs(f.x - hx) < 70 && Math.abs(f.y - hy) < 70 && U.chance(dt * 0.6)) { f.state = 'approach'; f.t = 0; }
            }
          } else if (f.state === 'approach') {
            if (st.phase !== 'wait') { f.state = 'swim'; return; }
            const hx = st.bob.x + (f.x < st.bob.x ? -6 : 6), hy = SURFACE + HOOK_DEPTH;
            const dx = hx - f.x, dy = hy - f.y, d = Math.hypot(dx, dy);
            f.dir = dx >= 0 ? 1 : -1;
            if (d < 3) { f.state = 'nibble'; f.t = 0; f.nib = U.randInt(1, 3); }
            else { f.x += (dx / d) * 22 * dt; f.y += (dy / d) * 22 * dt; }
          } else if (f.state === 'nibble') {
            if (st.phase !== 'wait') { f.state = 'swim'; return; }
            if (f.t > 0.55) { f.t = 0; f.nib--; CT.sound.play('blip'); if (f.nib <= 0) { f.state = 'bite'; f.t = 0; CT.sound.play('bite'); } }
          } else if (f.state === 'bite') {
            if (st.phase !== 'wait') return;
            const win = 0.75 - C.FISH[f.type].diff * 0.3;
            if (f.t > win) { f.state = 'flee'; f.t = 0; f.speed = 60; f.dir = U.chance(0.5) ? 1 : -1; say('It stole your bait and got away!'); }
          } else if (f.state === 'flee') {
            f.x += f.dir * f.speed * dt;
            f.y += 10 * dt;
            if (f.t > 1.5) { f.state = 'swim'; f.speed = U.randRange(10, 26); }
          }
          f.x = U.clamp(f.x, 70, 318);
          f.y = U.clamp(f.y, SURFACE + 16, 226);
        });
        // reeling
        if (st.phase === 'reel') {
          const r = st.reel;
          r.tt += dt;
          const hold = st.holding || k[' '] || k.ArrowUp || k.Enter || k.w;
          r.zv += (hold ? -260 : 200) * dt;
          r.zv = U.clamp(r.zv, -120, 140);
          r.zone += r.zv * dt;
          if (r.zone < 60) { r.zone = 60; r.zv = 0; }
          if (r.zone > 176) { r.zone = 176; r.zv = 0; }
          if (Math.abs(r.fy - r.target) < 4 || U.chance(dt * (0.6 + r.diff))) r.target = U.randRange(66, 190);
          r.fv += Math.sign(r.target - r.fy) * (40 + r.diff * 120) * dt;
          r.fv = U.clamp(r.fv, -30 - r.diff * 90, 30 + r.diff * 90);
          r.fy = U.clamp(r.fy + r.fv * dt, 64, 192);
          const inZone = Math.abs(r.fy - (r.zone + 12)) < 13;
          r.prog += (inZone ? 0.32 : -0.22 - r.diff * 0.08) * dt;
          if (inZone && Math.random() < dt * 12) CT.sound.play('reel');
          if (r.prog >= 1) land();
          else if (r.prog <= 0) lose();
        }
      },
      move(x) { if (st.phase === 'aim') st.aimX = U.clamp(x, 100, 308); },
      down(x) {
        if (st.phase === 'reel') { st.holding = true; return; }
        if (st.phase === 'aim') st.aimX = U.clamp(x, 100, 308);
        action();
      },
      up() { st.holding = false; },
      blur() { st.holding = false; },
      key(k) {
        if (k === 'Escape') { if (st.phase === 'reel') lose('You cut the line.'); end(); return; }
        if ((k === ' ' || k === 'Enter') && st.phase !== 'reel') action();
      },
      render(ctx) {
        ctx.drawImage(bg, 0, 0);
        // fish
        st.fish.forEach((f) => {
          const spr = C.fishCanvas(f.type, 1, f.dir > 0);
          const depth = (f.y - SURFACE) / (240 - SURFACE);
          ctx.globalAlpha = 0.9 - depth * 0.45;
          ctx.drawImage(spr.cv, Math.round(f.x - spr.cv.width / 2), Math.round(f.y - spr.cv.height / 2));
          ctx.globalAlpha = 1;
        });
        // rod & line
        ctx.fillStyle = '#6c4420';
        for (let i = 0; i <= 40; i++) ctx.fillRect(Math.round(U.lerp(44, ROD_TIP.x, i / 40)), Math.round(U.lerp(78, ROD_TIP.y, i / 40)), 1, 1);
        if (st.bob) {
          const b = st.bob;
          ctx.fillStyle = '#e8e8e8';
          const n = 30;
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            ctx.fillRect(Math.round(U.lerp(ROD_TIP.x, b.x, t)), Math.round(U.lerp(ROD_TIP.y, b.y, t) + Math.sin(t * Math.PI) * 6), 1, 1);
          }
          if (st.phase === 'wait' || st.phase === 'reel') {
            ctx.fillStyle = 'rgba(230,230,230,0.6)';
            ctx.fillRect(Math.round(b.x), SURFACE + 2, 1, HOOK_DEPTH - 2);
            ctx.fillStyle = '#c8c8d0';
            ctx.fillRect(Math.round(b.x) - 1, SURFACE + HOOK_DEPTH, 2, 2);
          }
          const f = st.fish.find((x) => x.state === 'nibble' || x.state === 'bite');
          let by = b.y;
          if (f && f.state === 'nibble') by += Math.sin(st.t * 30) > 0.6 ? 1 : 0;
          if (f && f.state === 'bite') by += 3;
          if (st.phase === 'wait' && !f) by += Math.sin(st.t * 2.5) * 0.6;
          ctx.fillStyle = '#141018';
          ctx.fillRect(Math.round(b.x) - 2, Math.round(by) - 3, 5, 6);
          ctx.fillStyle = '#e02020';
          ctx.fillRect(Math.round(b.x) - 1, Math.round(by) - 2, 3, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(b.x) - 1, Math.round(by), 3, 2);
          if (f && f.state === 'bite' && st.phase === 'wait') {
            UI.text(ctx, '!', Math.round(b.x) - 2, Math.round(by) - 16, UI.C.yellow, { scale: 2 });
          }
        }
        if (st.phase === 'aim') {
          const x = Math.round(st.aimX);
          ctx.fillStyle = UI.blink() ? '#ffff55' : '#ffffff';
          ctx.fillRect(x - 4, SURFACE - 1, 9, 1);
          ctx.fillRect(x, SURFACE - 5, 1, 4);
        }
        // reel meter
        if (st.phase === 'reel') {
          const r = st.reel;
          UI.rect(ctx, 270, 56, 24, 142, '#141018');
          UI.frame(ctx, 270, 56, 24, 142, '#ffffff');
          UI.rect(ctx, 272, Math.round(r.zone), 20, 25, 'rgba(80,220,80,0.75)');
          UI.frame(ctx, 272, Math.round(r.zone), 20, 25, '#b0ffb0');
          const spr = C.fishCanvas(r.f.type, 0.6, false);
          ctx.drawImage(spr.cv, 282 - spr.cv.width / 2, Math.round(r.fy) - spr.cv.height / 2);
          UI.rect(ctx, 298, 56, 6, 142, '#141018');
          UI.frame(ctx, 298, 56, 6, 142, '#ffffff');
          const h = Math.round(138 * U.clamp(r.prog, 0, 1));
          UI.rect(ctx, 300, 196 - h, 2, h, r.prog > 0.66 ? '#55ff55' : r.prog > 0.33 ? '#ffff55' : '#ff5555');
          UI.dialogText(ctx, [E.coarse ? 'Hold your finger down to raise the net' : 'Hold SPACE to raise the green zone', 'Keep the fish inside it!'], 132, 160, UI.C.white);
        }
        // HUD
        UI.rect(ctx, 0, 0, 320, 11, 'rgba(0,0,0,0.75)');
        UI.text(ctx, 'Fish: ' + st.caught.length + '  (' + st.lbs + ' lbs)', 4, 1, UI.C.yellow);
        const secs = Math.max(0, Math.ceil(TIME - st.t));
        UI.text(ctx, 'Time: ' + (secs >= 60 ? '1:00' : '0:' + (secs < 10 ? '0' : '') + secs), 316, 1, secs <= 10 ? UI.C.red : UI.C.white, { align: 'right' });
        UI.rect(ctx, 0, 229, 320, 11, 'rgba(0,0,0,0.75)');
        const hint = st.phase === 'aim' ? (E.coarse ? 'Tap the water to cast' : 'Aim: mouse/arrows   Cast: click/SPACE   ESC: done')
          : st.phase === 'wait' ? (E.coarse ? 'Tap when the bobber goes under!' : 'Press SPACE when the bobber goes under!') : st.phase === 'reel' ? 'Reel it in!' : '';
        UI.center(ctx, hint, 230, UI.C.gray);
        if (st.show) {
          const f = C.FISH[st.show.f.type];
          const spr = C.fishCanvas(st.show.f.type, 2, false);
          UI.dialog(ctx, 70, 40, 180, 70);
          ctx.drawImage(spr.cv, 160 - spr.cv.width / 2, 50);
          UI.center(ctx, 'You caught a ' + st.show.f.lbs + ' lb', 80, UI.C.yellow);
          UI.center(ctx, f.name + '!', 90, UI.C.yellow);
        } else if (st.msgT > 0 && st.msg) UI.dialogText(ctx, [st.msg], 160, 44);
      },
    };
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done({ lbs: st.lbs, count: st.caught.length });
    }
    E.go(UI.message({
      title: 'Fishing',
      lines: U.wrap('You find a good spot on the riverbank and bait your hook. You have until sunset - about a minute.', 48)
        .concat([''], E.coarse
          ? ['Tap the water to cast your line.', 'When the bobber goes under, tap quickly!', 'Then hold your finger down to keep the', 'fish inside the green zone.']
          : ['1. Aim with the mouse or arrows, and cast', '   with a click or the SPACE BAR.', '2. When the bobber goes under, press SPACE', '   quickly to set the hook. Not too early!', '3. Hold SPACE (or the mouse button) to keep', '   the fish inside the green zone.']),
      onDone: () => E.go(scr),
    }));
  };
})(typeof window !== 'undefined' ? window : globalThis);
