/* The Car Trail - arriving at landmarks, flooded river crossings (with a
 * drive-through animation), forks in the road and the choice at The Dalles.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const S = CT.sim;
  const E = CT.engine;
  const F = CT.flow;
  const CFG = CT.CFG;

  const toMenu = () => CT.screens.trailMenu();

  // Show the landmark picture with its caption plate (Oregon Trail style).
  CT.screens.arrival = function () {
    const G = F.G();
    const node = S.node(G.node);
    if (node.type === 'end') { CT.screens.finish(); return; }
    const scene = CT.art.scenes.get(node.id, { carId: G.carId });
    E.go(UI.message({
      scene,
      caption: [node.name, U.formatDate(G.day)],
      sound: 'good',
      sceneFx: (ctx, y) => CT.art.travel.weatherOverlay(ctx, 1, y + 1, 318, 158, G.weather.precip, E.time),
      onDone: toMenu,
    }));
  };

  // ---------------------------------------------------------------- rivers
  CT.screens.river = function () {
    const G = F.G();
    const node = S.node(G.node);
    const r = node.river;
    if (!G.river) S.riverConditions(G);
    const dm = S.detourMiles(G);
    const opts = [{ label: 'drive through the flooded road', action: ford }];
    if (r.toll) opts.push({ label: 'take ' + r.tollName + ' (' + U.money(r.toll) + ')', disabled: G.money < r.toll, action: toll });
    opts.push({ label: 'take the detour (' + dm + ' miles, ' + r.detourDays + ' ' + U.plural(r.detourDays, 'day') + ')', disabled: S.range(G) < dm, action: detour });
    opts.push({ label: 'wait to see if conditions improve', action: wait });
    opts.push({ label: 'get more information', action: info });
    E.go(UI.menu({
      header(ctx, y) {
        UI.center(ctx, node.name, y, UI.C.yellow);
        UI.center(ctx, U.formatDate(G.day), y + 10);
        UI.text(ctx, 'Weather: ' + S.weatherLabel(G.weather), 16, y + 26);
        UI.text(ctx, 'The low-water crossing is flooded.', 16, y + 40);
        UI.text(ctx, 'Water over the road: ' + G.river.depth.toFixed(1) + ' feet deep', 24, y + 50, S.fordRisk(G) >= 1 ? UI.C.red : S.fordRisk(G) >= 0.5 ? UI.C.yellow : UI.C.green);
        UI.text(ctx, 'Flooded stretch: ' + G.river.length + ' feet long', 24, y + 60);
        if (S.range(G) < dm) UI.text(ctx, '(Not enough gas for the detour.)', 24, y + 70, UI.C.gray);
        return y + 84;
      },
      options: opts,
      onBack: toMenu,
    }));

    function ford() {
      if (S.fordRisk(G) >= 1.0) {
        E.go(UI.yesNo({
          lines: ['TURN AROUND, DON\'T DROWN!', ''].concat(U.wrap('The water looks dangerously deep and fast. Just two feet of moving water can float a car. Are you sure you want to drive into it?', 48)),
          onYes: doFord,
          onNo: CT.screens.river,
        }));
      } else doFord();
    }
    function doFord() {
      const depth = G.river.depth, risk = S.fordRisk(G);
      const msgs = S.fordRiver(G);
      crossAnim(G, msgs.outcome, depth, risk, () => F.messages(msgs, departAfter));
    }
    function toll() { F.messages(S.tollBridge(G), departAfter); }
    function detour() { F.messages(S.detour(G), departAfter); }
    function wait() {
      const msgs = S.waitAtRiver(G);
      msgs.unshift({ text: 'You camp by the river and wait a day. The water is now ' + G.river.depth.toFixed(1) + ' feet deep.', tone: 'info' });
      F.messages(msgs, CT.screens.river);
    }
    function info() {
      const car = S.car(G);
      const lines = U.wrap('Driving through flood water is dangerous. Six inches of moving water can knock a person down, and two feet can float most cars away.', 48)
        .concat([''], U.wrap(car.wade < 1 ? 'Your ' + car.name + ' sits high off the ground, so it handles water better than most.' : car.wade > 1 ? 'Your ' + car.name + ' sits low to the ground. Water is extra risky for it.' : 'Your ' + car.name + ' can wade through a foot or so of water.', 48), [''],
          U.wrap((r.toll ? 'The toll bridge is safe, but it costs money and traffic may hold you up. ' : 'There is no toll bridge here. ') + 'The detour (' + r.detourName + ') is safe, but uses time and gas. If you wait, the water may go down - unless it rains.', 48));
      E.go(UI.message({ lines, onDone: CT.screens.river }));
    }
    function departAfter() {
      if (S.isOver(G)) { F.gameOver(); return; }
      S.depart(G, 0);
      F.save();
      CT.screens.travel();
    }
  };

  // Pixel-art backdrop for the crossing animation (cached per look).
  const crossArt = {};
  function crossBackdrop(dry) {
    const k = dry ? 'dry' : 'lush';
    if (crossArt[k]) return crossArt[k];
    const { Bitmap } = CT.gfx;
    const A = CT.art.A, P = CT.art.P;
    const rng = U.rng(dry ? 77 : 78);
    const bg = new Bitmap(320, 182);
    A.sky(bg, 0, 100, [P.sky0, P.sky1, P.sky2, P.sky3]);
    A.clouds(bg, [[70, 18, 90, 14], [240, 30, 80, 12]], rng);
    if (dry) A.mountains(bg, { baseY: 96, peaks: [{ x: 60, h: 26, w: 50 }, { x: 170, h: 34, w: 60 }, { x: 280, h: 28, w: 50 }], pal: A.BROWN, snowLine: 20 }, rng);
    A.grass(bg, 0, 94, 320, 18, rng, dry ? { base: '#b4a868', speckle: ['#9c9058', '#c8bc80'], dark: P.sg0, light: '#dcd4a0' } : { base: P.g3, speckle: [P.g2, P.g4], dark: P.g1, light: P.g5 });
    for (let x = 4; x < 320; x += 12 + Math.floor(rng() * 14)) {
      if (dry) A.sage(bg, x, 104 + rng() * 4, 3 + rng() * 2, rng);
      else A.roundTree(bg, x, 104 + rng() * 4, 12 + rng() * 8, rng);
    }
    bg.rect(0, 110, 320, 2, P.d1);
    bg.rect(0, 112, 320, 70, '#1850c8');
    const fg = new Bitmap(320, 182);
    const bank = (pts) => { fg.poly(pts, dry ? '#a08c5c' : P.g2); };
    bank([[0, 118], [34, 124], [52, 140], [52, 182], [0, 182]]);
    bank([[320, 118], [286, 124], [268, 140], [268, 182], [320, 182]]);
    fg.poly([[0, 124], [30, 124], [48, 136], [0, 136]], P.as1);
    fg.poly([[320, 124], [290, 124], [272, 136], [320, 136]], P.as1);
    fg.speckle(0, 116, 320, 66, (v) => v !== 0, dry ? ['#8c7848', '#c0ac78'] : [P.g1, P.g3], 0.12, rng);
    crossArt[k] = { bg: bg.toCanvas(), fg: fg.toCanvas() };
    return crossArt[k];
  }

  // A short animation of the car driving into the water.
  function crossAnim(G, outcome, depth, risk, done) {
    const dur = outcome === 'swept' ? 4 : 3.2;
    const waterY = 132;
    const sub = Math.min(14, 3 + risk * 7); // how deep the car sits in the water
    const reg = S.node(G.node).region;
    const art = crossBackdrop(reg !== 'plains');
    const s = {
      kind: 'anim',
      t: 0,
      inputDelay: 0.4,
      update(dt) {
        s.t += dt;
        if (s.t > dur + 0.6) finish();
      },
      key(k) { if (k === ' ' || k === 'Enter' || k === 'Escape') finish(); },
      click() { finish(); },
      render(ctx) {
        const t = Math.min(1, s.t / dur);
        ctx.drawImage(art.bg, 0, 0);
        ctx.fillStyle = '#6ca4fc';
        for (let i = 0; i < 60; i++) {
          const x = ((i * 47 + s.t * (40 + (i % 5) * 12)) % 340) - 10;
          ctx.fillRect(Math.round(x), 114 + ((i * 13) % 66), 4 + (i % 4), 1);
        }
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 25; i++) {
          const x = ((i * 71 + s.t * (60 + (i % 3) * 20)) % 340) - 10;
          ctx.fillRect(Math.round(x), 116 + ((i * 29) % 62), 2 + (i % 3), 1);
        }
        ctx.drawImage(art.fg, 0, 0);
        let x, y = waterY, bob = Math.sin(s.t * 8) * 1;
        if (outcome === 'stall') {
          x = t < 0.5 ? U.lerp(-50, 130, t * 2) : 130;
        } else if (outcome === 'swept') {
          x = t < 0.35 ? U.lerp(-50, 110, t / 0.35) : 110 + (t - 0.35) * 160;
          if (t >= 0.35) { y += (t - 0.35) * 40; bob = Math.sin(s.t * 5) * 3; }
        } else x = U.lerp(-50, 330, t);
        const inWater = x > 30 && x < 262;
        const cy = Math.round(y + (inWater ? sub * 0.4 + bob : 0));
        CT.art.cars.drawCtx(ctx, G.carId, Math.round(x), cy, 1, Math.floor(s.t * 12), {});
        if (inWater) {
          ctx.fillStyle = 'rgba(24,80,200,0.85)';
          ctx.fillRect(Math.round(x) - 2, cy - Math.round(sub), 54, Math.round(sub) + 4);
          ctx.fillStyle = '#ffffff';
          for (let k = 0; k < 8; k++) {
            const sx = Math.round(x) - 4 + ((k * 7 + Math.floor(s.t * 30)) % 10);
            ctx.fillRect(sx, cy - Math.round(sub) - (k % 3), 2, 1);
            if (outcome !== 'stall' || t < 0.5) ctx.fillRect(Math.round(x) + 50 + (k % 3) * 2, cy - Math.round(sub) - (k % 4) - 1, 1, 2);
          }
        }
        UI.rect(ctx, 0, 182, 320, 58, '#000');
        UI.center(ctx, S.node(G.node).name, 192, UI.C.yellow);
        UI.center(ctx, 'Driving through ' + depth.toFixed(1) + ' feet of water...', 204, UI.C.white);
      },
    };
    let fin = false;
    function finish() { if (fin) return; fin = true; done(); }
    E.go(s);
    CT.sound.play('splash');
  }

  // ---------------------------------------------------------------- forks
  CT.screens.fork = function () {
    const G = F.G();
    const node = S.node(G.node);
    const opts = node.next.map((e, i) => ({
      label: e.label + ' (' + e.miles + ' mi)',
      action: () => { S.depart(G, i); F.save(); CT.screens.travel(); },
    }));
    opts.push({ label: 'see the map', action: () => E.go(UI.message({ lines: [], prompt: '', draw(ctx) { UI.center(ctx, 'Map of the Car Trail', 6, UI.C.yellow); CT.art.map.draw(ctx, 8, 18, G, E.time); UI.text(ctx, 'Gas range: about ' + S.range(G) + ' miles', 12, 200); }, onDone: CT.screens.fork })) });
    opts.push({ label: 'go back', action: toMenu });
    const lines = ['The road divides here. Which way will you go?', ''];
    node.next.forEach((e) => {
      const to = S.node(e.to);
      lines.push(...U.wrap(to.name + ': ' + e.miles + ' miles' + (to.type === 'town' ? ' (a town with supplies)' : to.type === 'river' ? ' (a river crossing)' : ''), 48));
    });
    lines.push('', 'Your gas will take you about ' + S.range(G) + ' miles.');
    E.go(UI.menu({
      header: (ctx, y) => { UI.center(ctx, node.name, y, UI.C.yellow); UI.center(ctx, U.formatDate(G.day), y + 10); return y + 26; },
      lines,
      options: opts,
      onBack: toMenu,
    }));
  };

  // ---------------------------------------------------------------- The Dalles
  CT.screens.dalles = function () {
    const G = F.G();
    const toll = CFG.barlowToll;
    E.go(UI.menu({
      header: (ctx, y) => { UI.center(ctx, 'The Dalles, Oregon', y, UI.C.yellow); UI.center(ctx, U.formatDate(G.day), y + 10); return y + 26; },
      lines: U.wrap('The overland trail ends here, but the Willamette Valley is still 100 miles away, on the far side of the Cascade Mountains. You must choose how to get there.', 48),
      options: [
        { label: 'drive the old Columbia River Highway', action: gorge },
        { label: 'take the Barlow Road (' + U.money(toll) + ' toll)', disabled: G.money < toll, action: barlow },
        { label: 'find out about these options', action: dallesInfo },
        { label: 'go back', action: toMenu },
      ],
      onBack: toMenu,
    }));

    function barlow() {
      S.barlow(G);
      F.save();
      E.go(UI.message({
        lines: U.wrap('You pay the ' + U.money(toll) + ' toll and head up the Barlow Road into the forests of Mount Hood. The road is slow and steep, and mountain weather can change fast.', 48),
        onDone: () => CT.screens.travel(),
      }));
    }
    function gorge() {
      E.go(UI.message({
        title: 'The Columbia River Highway',
        lines: U.wrap('The historic highway twists along cliffs high above the Columbia River, past waterfalls and through old tunnels. Watch out for rockfalls, potholes, deer, slow trucks and oncoming traffic!', 48)
          .concat([''], E.coarse ? ['Touch and drag left or right to steer.', 'Touch the top of the screen to speed up.'] : ['Steer with the LEFT and RIGHT arrow keys', '(or the mouse). Hold UP to go faster and', 'DOWN to slow down.']),
        onDone: () => {
          S.depart(G, 0);
          CT.mini.gorge(G, (res) => {
            const msgs = [{ text: res.hits === 0 ? 'Amazing driving! You made it down the gorge without a scratch.' : 'You made it down the gorge, but you hit ' + res.hits + ' ' + U.plural(res.hits, 'thing') + ' along the way.', tone: res.hits ? 'info' : 'good' }]
              .concat(S.finishGorge(G));
            F.messages(msgs, () => {
              if (S.isOver(G)) { F.gameOver(); return; }
              S.arrive(G);
              CT.screens.finish();
            });
          });
        },
      }));
    }
    function dallesInfo() {
      E.go(UI.message({
        lines: U.wrap('THE COLUMBIA RIVER HIGHWAY is free and fast - you\'ll arrive in about a day. But it\'s narrow and twisty. Every crash damages your car, and can hurt your passengers or spill your supplies.', 48)
          .concat([''], U.wrap('THE BARLOW ROAD costs ' + U.money(toll) + '. It\'s a slow mountain road that takes several days. It\'s safer to drive, but snow and cold on Mount Hood can be dangerous late in the year.', 48)),
        onDone: CT.screens.dalles,
      }));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
