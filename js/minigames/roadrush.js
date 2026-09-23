/* The Car Trail - COLUMBIA RIVER HIGHWAY mini-game (the modern answer to
 * rafting down the Columbia). A top-down drive along a twisting two-lane road:
 * cliffs and waterfalls on the left, the river on the right. Dodge rockfalls,
 * potholes, deer, slow trucks and oncoming cars.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const S = CT.sim;
  const E = CT.engine;
  const Cars = CT.art.cars;

  CT.mini = CT.mini || {};

  const LENGTH = 7200; // pixels of road
  const CAR_Y = 188;
  const LANE = 26; // half road width
  const TRAFFIC_COLORS = ['#c83c2c', '#3c6cc8', '#e8e8e8', '#e8c030', '#3c8c4c', '#8c4cb0', '#303038'];

  // Top-down conifers (round shaded canopies) for the forest on the cliffs.
  const treeSprites = [];
  function trees() {
    if (treeSprites.length) return treeSprites;
    const { Bitmap, Mask } = CT.gfx;
    [4, 5, 6, 7].forEach((r) => {
      const n = r * 2 + 3;
      const b = new Bitmap(n, n);
      const m = new Mask(n, n);
      m.disc(n / 2, n / 2, r);
      b.paint(m, (x, y) => {
        const l = -(x - n / 2) - (y - n / 2);
        const d = Math.hypot(x - n / 2, y - n / 2) / r;
        if (d > 0.8) return l > 0 ? '#2c6030' : '#163c1c';
        if (l > r * 0.6) return '#6cac54';
        if (l > 0) return '#3c7c3c';
        return '#24582c';
      });
      b.outline(m, '#0a2410');
      treeSprites.push(b.toCanvas());
    });
    return treeSprites;
  }

  function center(d) {
    return 160 + 34 * Math.sin(d / 420) + 16 * Math.sin(d / 173 + 1.3);
  }

  CT.mini.gorge = function (G, done) {
    const st = {
      d: 0, speed: 100, x: 160 + LANE / 2, hits: 0, inv: 0, shake: 0, obs: [], spawnD: 260,
      texts: [], over: false, overT: 0, pointerX: null, steerT: 0, t: 0,
    };

    function spawn() {
      const r = U.rand();
      const ahead = st.d + 300;
      let o;
      if (r < 0.26) o = { kind: 'rock', lane: U.chance(0.5) ? -1 : 1, off: U.randRange(-8, 8), w: 10, h: 8, v: 0 };
      else if (r < 0.44) o = { kind: 'pothole', lane: U.chance(0.6) ? 1 : -1, off: U.randRange(-8, 8), w: 9, h: 5, v: 0 };
      else if (r < 0.62) o = { kind: 'car', lane: -1, off: 0, w: 10, h: 19, v: -U.randRange(70, 100), color: U.pick(TRAFFIC_COLORS), type: U.pick(['sedan', 'sedan', 'suv', 'minivan']) };
      else if (r < 0.78) o = { kind: 'truck', lane: 1, off: 0, w: 14, h: 30, v: U.randRange(45, 60), color: U.pick(TRAFFIC_COLORS), type: U.chance(0.5) ? 'truck' : 'rv' };
      else if (r < 0.9) o = { kind: 'deer', lane: 0, off: U.chance(0.5) ? -44 : 44, w: 12, h: 8, v: 0, cross: true, dir: 0 };
      else o = { kind: 'rock', lane: 0, off: U.randRange(-4, 4), w: 14, h: 10, v: 0 };
      o.d = ahead;
      if (o.cross) o.dir = o.off < 0 ? 1 : -1;
      st.obs.push(o);
    }

    function obsX(o) { return center(o.d) + o.lane * (LANE / 2) + o.off; }
    function obsY(o) { return CAR_Y - (o.d - st.d); }

    function hit(kind) {
      if (st.inv > 0) return;
      st.hits++;
      st.inv = 1.3;
      st.shake = 0.35;
      CT.sound.play(kind === 'pothole' ? 'thud' : 'crash');
      const out = S.gorgeHit(G, kind === 'rail' ? 'rail' : kind);
      const label = { rock: 'You hit a rock!', pothole: 'Pothole!', car: 'Crash!', truck: 'You rear-ended a truck!', deer: 'You hit a deer!', rail: 'You scraped the guardrail!' }[kind] || 'Crash!';
      st.texts.push({ t: 0, lines: [label].concat(out) });
      if (G.carCond <= 0) end();
    }

    function end() {
      if (st.over) return;
      st.over = true;
      st.overT = 0;
    }

    const scr = {
      kind: 'gorge',
      st, // exposed for automated tests
      inputDelay: 0.3,
      allowRepeat: true,
      update(dt) {
        st.t += dt;
        if (st.over) { st.overT += dt; if (st.overT > 1.6) finish(); return; }
        const k = E.keys;
        // speed
        let target = 105;
        if (k.ArrowUp || k.w) target = 165;
        if (k.ArrowDown || k.s) target = 55;
        if (st.pointerX != null && E.mouse.down && E.mouse.y < 90) target = 165;
        st.speed += (target - st.speed) * Math.min(1, dt * 1.8);
        // steering
        let steer = 0;
        if (k.ArrowLeft || k.a) steer -= 1;
        if (k.ArrowRight || k.d) steer += 1;
        if (steer) st.x += steer * 95 * dt;
        else if (st.pointerX != null) st.x += U.clamp(st.pointerX - st.x, -95 * dt, 95 * dt);
        st.d += st.speed * dt;
        // road edges
        const c = center(st.d);
        if (st.x < c - LANE - 1) { st.x = c - LANE + 3; hit('rail'); }
        if (st.x > c + LANE + 1) { st.x = c + LANE - 3; hit('rail'); }
        // obstacles
        if (st.d > st.spawnD) { spawn(); st.spawnD = st.d + U.randRange(70, 150) * (st.d > LENGTH * 0.6 ? 0.8 : 1); }
        st.obs.forEach((o) => {
          o.d += o.v * dt;
          if (o.cross && Math.abs(obsY(o) - CAR_Y) < 140) o.off += o.dir * 34 * dt;
        });
        const cw = 10, ch = 20;
        st.obs.forEach((o) => {
          if (o.hitDone) return;
          const ox = obsX(o), oy = obsY(o);
          if (Math.abs(ox - st.x) < (o.w + cw) / 2 - 2 && Math.abs(oy - CAR_Y) < (o.h + ch) / 2 - 2) {
            o.hitDone = true;
            hit(o.kind);
          }
        });
        st.obs = st.obs.filter((o) => obsY(o) < 270 && obsY(o) > -80 && !(o.cross && Math.abs(o.off) > 70));
        if (st.inv > 0) st.inv -= dt;
        if (st.shake > 0) st.shake -= dt;
        st.texts.forEach((t) => { t.t += dt; });
        st.texts = st.texts.filter((t) => t.t < 2.2);
        if (st.d >= LENGTH) end();
      },
      move(x) { st.pointerX = x; },
      down(x) { st.pointerX = x; },
      key(k) { if (k === 'Escape') { /* no quitting halfway down a cliff road */ } },
      render(ctx) {
        const sx = st.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
        ctx.save();
        ctx.translate(sx, 0);
        // scenery, row by row
        for (let y = 0; y < 240; y += 2) {
          const d = st.d + (CAR_Y - y);
          const c = Math.round(center(d));
          const l = c - LANE, r = c + LANE;
          const stripe = Math.floor(d / 16) % 2;
          // cliff & forest on the left
          ctx.fillStyle = stripe ? '#2c5c2c' : '#285428';
          ctx.fillRect(-4, y, l - 14 + 4, 2);
          ctx.fillStyle = stripe ? '#6c5c50' : '#5c4c44';
          ctx.fillRect(l - 14, y, 10, 2);
          ctx.fillStyle = '#8c8c94';
          ctx.fillRect(l - 4, y, 4, 2);
          // road
          ctx.fillStyle = '#3c3c46';
          ctx.fillRect(l, y, r - l, 2);
          ctx.fillStyle = '#e8e8e8';
          ctx.fillRect(l + 1, y, 1, 2);
          ctx.fillRect(r - 2, y, 1, 2);
          if (Math.floor(d / 12) % 2 === 0) { ctx.fillStyle = '#f8d020'; ctx.fillRect(c - 1, y, 1, 2); ctx.fillRect(c + 1, y, 1, 2); }
          // guardrail, shore, river
          ctx.fillStyle = '#c8c8d0';
          ctx.fillRect(r, y, 2, 2);
          if (Math.floor(d / 10) % 3 === 0) { ctx.fillStyle = '#6c6c74'; ctx.fillRect(r, y, 2, 1); }
          ctx.fillStyle = '#6c7c3c';
          ctx.fillRect(r + 2, y, 10, 2);
          ctx.fillStyle = '#b8a47c';
          ctx.fillRect(r + 12, y, 4, 2);
          ctx.fillStyle = '#1850c8';
          ctx.fillRect(r + 16, y, 340 - r, 2);
        }
        // river sparkles
        ctx.fillStyle = '#8cc0fc';
        for (let i = 0; i < 40; i++) {
          const yy = ((i * 37 + st.d * 1.0) % 250) - 5;
          const cc = center(st.d + (CAR_Y - yy));
          ctx.fillRect(Math.round(cc + LANE + 20 + ((i * 53) % 90)), Math.round(yy), 3 + (i % 4), 1);
        }
        // forest on the cliffs: trees seeded by their position along the road
        for (let i = 0; i < 44; i++) {
          const dd = Math.floor(st.d / 24) * 24 + i * 24 - 480;
          const yy = CAR_Y - (dd - st.d);
          if (yy < -12 || yy > 252) continue;
          const cc = center(dd);
          for (let k = 0; k < 3; k++) {
            const h = ((dd * 7919 + k * 104729) >>> 0) % 1000 / 1000;
            const tx = cc - LANE - 22 - k * 34 - h * 26;
            if (tx < -8) continue;
            const spr = trees()[Math.floor(h * 4)];
            ctx.drawImage(spr, Math.round(tx - spr.width / 2), Math.round(yy - spr.height / 2));
          }
        }
        // mossy boulders at the cliff base
        for (let i = 0; i < 16; i++) {
          const dd = Math.floor(st.d / 70) * 70 + i * 70 - 420;
          const yy = CAR_Y - (dd - st.d);
          if (yy < -8 || yy > 248) continue;
          const bx = center(dd) - LANE - 11;
          ctx.fillStyle = '#3c3430'; ctx.fillRect(Math.round(bx) - 3, Math.round(yy) - 2, 7, 5);
          ctx.fillStyle = '#6c6458'; ctx.fillRect(Math.round(bx) - 2, Math.round(yy) - 2, 4, 2);
        }
        // Multnomah-style waterfall spilling off the cliffs
        [LENGTH * 0.3, LENGTH * 0.72].forEach((wd) => {
          const yy = CAR_Y - (wd - st.d);
          if (yy < -40 || yy > 280) return;
          const cc = center(wd);
          const wx = Math.round(cc - LANE - 22);
          ctx.fillStyle = '#e8f4ff';
          ctx.fillRect(wx, Math.round(yy) - 30, 6, 30);
          ctx.fillStyle = '#9cc8f4';
          for (let k = 0; k < 8; k++) ctx.fillRect(wx + (k % 3) * 2, Math.round(yy) - 30 + ((k * 7 + Math.floor(st.t * 40)) % 30), 1, 3);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(wx - 3, Math.round(yy), 12, 4);
        });
        // obstacles
        st.obs.forEach((o) => {
          const x = Math.round(obsX(o)), y = Math.round(obsY(o));
          if (o.kind === 'rock') {
            ctx.fillStyle = '#141018'; ctx.fillRect(x - o.w / 2 - 1, y - o.h / 2 - 1, o.w + 2, o.h + 2);
            ctx.fillStyle = '#8c8478'; ctx.fillRect(x - o.w / 2, y - o.h / 2, o.w, o.h);
            ctx.fillStyle = '#b8b0a4'; ctx.fillRect(x - o.w / 2, y - o.h / 2, o.w - 3, 2);
            ctx.fillStyle = '#5c544c'; ctx.fillRect(x - o.w / 2 + 2, y + o.h / 2 - 2, o.w - 2, 2);
          } else if (o.kind === 'pothole') {
            ctx.fillStyle = '#141418'; ctx.fillRect(x - 4, y - 2, 9, 5); ctx.fillRect(x - 3, y - 3, 7, 7);
            ctx.fillStyle = '#26262c'; ctx.fillRect(x - 2, y - 1, 5, 3);
          } else if (o.kind === 'deer') {
            const f = Math.floor(st.t * 8) % 2;
            ctx.fillStyle = '#141018'; ctx.fillRect(x - 7, y - 3, 14, 6);
            ctx.fillStyle = '#a86c38'; ctx.fillRect(x - 6, y - 2, 12, 4);
            ctx.fillStyle = '#cc9460'; ctx.fillRect(x + (o.dir > 0 ? 4 : -7), y - 3, 3, 3);
            ctx.fillStyle = '#704420';
            ctx.fillRect(x - 5, y + (f ? 2 : -4), 1, 2); ctx.fillRect(x + 4, y + (f ? -4 : 2), 1, 2);
          } else {
            const cv = Cars.topCanvas(o.type, o.color, o.kind === 'car');
            ctx.drawImage(cv, x - Math.round(cv.width / 2), y - Math.round(cv.height / 2));
          }
        });
        // player car
        const pc = Cars.topCanvas(G.carId, Cars.colorOf(G.carId), false);
        if (st.inv <= 0 || Math.floor(st.t * 12) % 2 === 0) ctx.drawImage(pc, Math.round(st.x - pc.width / 2), Math.round(CAR_Y - pc.height / 2));
        ctx.restore();
        // HUD
        UI.rect(ctx, 0, 0, 320, 12, 'rgba(0,0,0,0.8)');
        const left = Math.max(0, Math.ceil((1 - st.d / LENGTH) * 100));
        UI.text(ctx, left + ' miles to go', 4, 2, UI.C.yellow);
        UI.text(ctx, 'Car: ' + Math.round(G.carCond) + '%', 124, 2, G.carCond < 30 ? UI.C.red : UI.C.white);
        UI.text(ctx, 'Hits: ' + st.hits, 316, 2, UI.C.white, { align: 'right' });
        UI.rect(ctx, 200, 5, 60, 3, '#555555');
        UI.rect(ctx, 200, 5, Math.round(60 * Math.min(1, st.d / LENGTH)), 3, '#55ff55');
        st.texts.slice(-2).forEach((t, i) => t.lines.forEach((l, j) => UI.center(ctx, l, 20 + i * 24 + j * 10, j === 0 ? UI.C.red : UI.C.yellow, { shadow: '#000' })));
        if (st.over) UI.dialogText(ctx, [G.carCond <= 0 ? 'Your car gives out!' : 'You made it through the gorge!'], 160, 110);
        else if (st.t < 3) UI.dialogText(ctx, [E.coarse ? 'Drag to steer. Touch up high to speed up.' : 'LEFT/RIGHT to steer, UP/DOWN for speed'], 160, 110);
      },
    };
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done({ hits: st.hits, wrecked: G.carCond <= 0 });
    }
    E.go(scr);
  };
})(typeof window !== 'undefined' ? window : globalThis);
