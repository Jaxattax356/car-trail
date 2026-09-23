/* The Car Trail - the travel screen (scrolling road + status panel) and the
 * roadside events that interrupt it: breakdowns, lonely gas stations,
 * hitchhikers, running out of gas and roadside memorials.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const S = CT.sim;
  const E = CT.engine;
  const F = CT.flow;

  CT.screens.travel = function () {
    const G = F.G();
    let s = null;

    function run(list, done) {
      let i = 0;
      const step = () => {
        if (S.isOver(G)) { F.gameOver(); return; }
        if (E.top() !== s) E.go(s);
        s.busy = true;
        if (i >= list.length) { done(); return; }
        const a = list[i++];
        a(step);
      };
      step();
    }

    function day() {
      s.busy = true;
      const prev = G.miles;
      const res = S.travelDay(G);
      if (res.miles > 0) s.flash = 0;
      const actions = [];
      S.tombstonesBetween(prev, G.miles).slice(0, 1).forEach((t) => actions.push((next) => showTomb(t, next)));
      if (res.msgs.length) actions.push((next) => F.messages(res.msgs, next, { overlay: true }));
      res.events.forEach((ev) => actions.push((next) => handleEvent(G, ev, next)));
      if (res.outOfGas) actions.push((next) => outOfGas(G, next));
      run(actions, () => {
        if (res.arrived && !S.isOver(G)) {
          S.arrive(G);
          F.save();
          CT.screens.arrival();
          return;
        }
        F.save();
        s.busy = false;
        s.timer = 0;
      });
    }

    function stop() {
      CT.sound.play('select');
      CT.screens.trailMenu();
    }

    s = {
      kind: 'travel',
      timer: 0,
      scroll: 0,
      busy: false,
      inputDelay: 0.25,
      enter() { s.timer = 0; },
      resume() { s.timer = 0; },
      update(dt) {
        if (s.busy) return;
        s.scroll += dt * 64;
        s.timer += dt;
        if (s.timer >= (CT.settings.fast ? 0.6 : 1.4)) {
          s.timer = 0;
          day();
        }
      },
      key(k) {
        if (s.busy) return;
        if (k === 'Enter' || k === 'Escape' || k === ' ') stop();
      },
      click() { if (!s.busy) stop(); },
      render(ctx) {
        const moving = !s.busy;
        UI.center(ctx, E.coarse ? 'Tap to size up the situation' : 'Press ENTER to size up the situation', 2, UI.C.white);
        const w = G.weather.precip;
        const snowy = w === 'snow' || w === 'blizzard' || G.weather.temp <= 26;
        CT.art.travel.draw(ctx, 0, 12, {
          region: S.regionId(G), snow: snowy, scroll: s.scroll, frame: Math.floor(s.scroll / 3) % 4,
          carId: G.carId, moving, time: E.time, weather: w,
          bounce: moving && Math.floor(s.scroll / 23) % 9 === 0 ? -1 : 0,
        });
        // status panel
        UI.dialog(ctx, 8, 130, 304, 106);
        const lx = 150, vx = 156;
        const rows = [
          ['Date:', U.formatDate(G.day)],
          ['Weather:', S.weatherLabel(G.weather) + ' (' + G.weather.temp + '°F)'],
          ['Health:', S.partyHealth(G)],
          ['Food:', Math.round(G.food) + ' pounds'],
          ['Gas:', G.gas.toFixed(1) + ' gal (' + S.range(G) + ' mi)'],
          ['Next landmark:', S.milesToNext(G) + ' miles'],
          ['Miles traveled:', G.miles + ' miles'],
        ];
        rows.forEach(([l, v], i) => {
          UI.text(ctx, l, lx, 138 + i * 10, UI.C.white, { align: 'right' });
          const warn = (l === 'Food:' && G.food < S.alive(G).length * 6) || (l === 'Gas:' && S.range(G) < S.milesToNext(G));
          UI.text(ctx, v.replace('°', ''), vx, 138 + i * 10, warn ? UI.C.red : UI.C.yellow);
        });
        // progress bar to the next landmark
        const pct = G.segMiles ? Math.min(1, G.segDone / G.segMiles) : 0;
        UI.rect(ctx, 20, 216, 280, 1, UI.C.dgray);
        UI.rect(ctx, 20, 216, Math.round(280 * pct), 1, UI.C.yellow);
        UI.rect(ctx, 19 + Math.round(280 * pct), 214, 3, 5, UI.C.white);
        UI.text(ctx, S.node(G.node).short, 20, 222, UI.C.gray);
        if (G.next) UI.text(ctx, S.node(G.next).short, 300, 222, UI.C.gray, { align: 'right' });
      },
    };
    E.go(s);
  };

  // ---------------------------------------------------------------- events
  function handleEvent(G, ev, next) {
    if (ev.kind === 'msg') {
      F.messages([{ text: ev.text, tone: ev.tone }].concat(ev.after || []), next, { overlay: true });
    } else if (ev.kind === 'breakdown') breakdown(G, ev, next, true);
    else if (ev.kind === 'gasStation') gasStation(G, ev, next);
    else if (ev.kind === 'hitchhiker') hitchhiker(G, ev, next);
    else next();
  }

  function banner(G) {
    const sc = F.regionScene(G);
    return (ctx) => F.banner(ctx, sc, 0, 58, 92);
  }

  const PATCH = {
    tires: 'Try to patch the tire',
    batteries: 'Try to get it started',
    belts: 'Try a temporary fix',
  };

  function breakdown(G, ev, next, first) {
    const part = ev.part;
    const info = S.PART[part];
    const n = G[part];
    const again = () => breakdown(G, ev, next, false);
    const opts = [];
    if (n > 0) {
      opts.push({
        label: 'Use a ' + info.item + ' - do it yourself',
        action: () => CT.mini.repair(G, part, (misses) => {
          const lost = misses >= 3;
          const r = S.fixWithPart(G, part, lost);
          const txt = lost ? 'You fumbled around all day, but the car is fixed.' : 'Nice work! You fixed it and got right back on the road.';
          F.messages([{ text: txt, tone: lost ? 'bad' : 'good' }].concat(r.msgs), next);
        }),
      });
      opts.push({
        label: 'Use a ' + info.item + ' - slow and careful',
        action: () => {
          const r = S.fixWithPart(G, part, true);
          F.messages([{ text: 'You spend the day carefully making the repair. You lose a day.' }].concat(r.msgs), next);
        },
      });
    }
    opts.push({ label: PATCH[part] + ' (1 day)', action: () => { const r = S.patchAttempt(G, part); F.messages(r.msgs, r.ok ? next : again); } });
    opts.push({ label: 'Wait for someone to help (1 day)', action: () => { const r = S.waitForHelp(G, part); F.messages(r.msgs, r.ok ? next : again); } });
    const tow = S.towCost(G);
    opts.push({ label: 'Call a tow truck (' + U.money(tow) + ')', disabled: G.money < tow, action: () => { const r = S.tow(G, part); F.messages(r.msgs, r.ok ? next : again); } });
    const lines = (first ? U.wrap(ev.text, 48) : ['You still need to deal with the ' + info.broken + '.'])
      .concat(['You have ' + n + ' ' + (n === 1 ? info.item : info.items) + '.' + (n ? '' : ' Uh oh.')]);
    E.go(UI.menu({ draw: banner(G), y: 98, lines, intro: null, options: opts, prompt: 'What will you do?' }));
    if (first) CT.sound.play('bad');
  }

  function gasStation(G, ev, next) {
    const room = Math.floor(S.capacity(G) - G.gas);
    const afford = Math.floor(G.money / ev.price);
    const max = Math.min(room, afford);
    E.go(UI.menu({
      draw: banner(G),
      y: 98,
      lines: U.wrap('You come across a lonely gas station in the middle of nowhere. Gas here costs ' + U.money(ev.price) + ' a gallon.', 48)
        .concat(['You have ' + G.gas.toFixed(1) + ' gallons (room for ' + room + ' more) and', U.money(G.money) + '.']),
      intro: null,
      options: [
        { label: 'Buy gas', disabled: max <= 0, action: () => buyGas(G, ev, max, next) },
        { label: 'Keep driving', action: next },
      ],
    }));
  }

  function buyGas(G, ev, max, next) {
    E.go(UI.input({
      draw: banner(G),
      y: 98,
      lines: ['Gas costs ' + U.money(ev.price) + ' a gallon.', 'You can buy up to ' + max + ' gallons.'],
      prompt: 'How many gallons?',
      numeric: true,
      max: 3,
      onSubmit: (v) => {
        const n = parseInt(v, 10);
        if (!(n >= 1 && n <= max)) return 'Please enter a number from 1 to ' + max + '.';
        const got = S.buyGas(G, n, ev.price);
        CT.sound.play('cash');
        F.messages([{ text: 'You buy ' + got + ' gallons of gas for ' + U.money(got * ev.price) + '.' }], next);
        return null;
      },
      onCancel: () => gasStation(G, ev, next),
    }));
  }

  function hitchhiker(G, ev, next) {
    E.go(UI.yesNo({
      draw: banner(G),
      y: 98,
      lines: U.wrap('A hitchhiker with a guitar is standing by the road. They offer you ' + U.money(ev.pay) + ' for a ride to the next town.', 48).concat(['', 'Pick them up?']),
      onYes: () => F.messages(S.pickUpHitchhiker(G, ev.pay), next),
      onNo: next,
    }));
  }

  function outOfGas(G, next) {
    if (G.gas > 0.05) { next(); return; }
    const cost = S.assistCost(G);
    const again = () => (G.gas > 0.05 ? next() : outOfGas(G, next));
    E.go(UI.menu({
      draw: banner(G),
      y: 98,
      lines: ['You have run out of gas!', '', 'You have ' + U.money(G.money) + '.'],
      intro: null,
      options: [
        { label: 'Walk to the nearest gas station (1-2 days)', action: () => F.messages(S.walkForGas(G).msgs, again) },
        { label: 'Flag down a passing driver (1 day)', action: () => F.messages(S.flagDown(G).msgs, again) },
        { label: 'Call roadside assistance (' + U.money(cost) + ')', disabled: G.money < cost, action: () => F.messages(S.callAssistance(G).msgs, again) },
      ],
      prompt: 'What will you do?',
    }));
    CT.sound.play('bad');
  }

  function showTomb(t, next) {
    const lines = U.wrap(t.epitaph || '', 13).slice(0, 3);
    const cv = CT.art.critters.tombstone(t.name, lines).toCanvas();
    E.push({
      kind: 'tomb',
      overlay: true,
      render(ctx) {
        UI.dialog(ctx, 70, 40, 180, 150);
        UI.center(ctx, 'You pass a roadside memorial.', 48, UI.C.white);
        ctx.drawImage(cv, 115, 62);
        UI.center(ctx, UI.continueText(), 176, UI.C.gray);
      },
      key(k) { if (k === ' ' || k === 'Enter' || k === 'Escape') { E.pop(); next(); } },
      click() { E.pop(); next(); },
    });
  }

  CT.screens.outOfGas = outOfGas;
})(typeof window !== 'undefined' ? window : globalThis);
