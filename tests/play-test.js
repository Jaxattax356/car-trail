/* End-to-end browser playthrough test for The Car Trail.
 * A bot plays two complete trips in headless Chromium (with a fast virtual clock),
 * reading each screen and choosing sensibly: shopping, river crossings, breakdowns,
 * all four mini-games, save & resume, and the ending. Fails on any JS error or if
 * the game ever gets stuck.
 *
 *   npm install playwright   (or have it installed globally)
 *   node tests/play-test.js [seed] [occupation 1-3] [car 1-4] [month 1-5]
 *   SHOTS=/tmp/shots node tests/play-test.js      # also save screenshots
 */
'use strict';
const path = require('path');
function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* fall back to a global install */ }
  const root = require('child_process').execSync('npm root -g').toString().trim();
  return require(path.join(root, 'playwright'));
}
const { chromium } = loadPlaywright();
const SH = process.env.SHOTS ? path.resolve(process.env.SHOTS) + path.sep : '';
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const [seed = '1', occ = '2', carSel = '3', monthSel = '3', prefix = 'bot'] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.stack));
  await page.clock.install();
  await page.addInitScript((seed) => {
    // deterministic game randomness for reproducible runs
    let a = (+seed * 2654435761) >>> 0;
    Math.random = function () { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try { localStorage.clear(); } catch (e) {}
  }, seed);
  await page.goto(URL);
  await page.clock.runFor(500);
  await page.evaluate(() => { CT.settings.fast = true; });
  const run = (ms) => page.clock.runFor(ms);
  const key = async (k, ms = 320) => { await page.keyboard.press(k); await run(ms); };
  const type = async (t) => { for (const ch of t) await page.keyboard.press(ch); await run(150); };
  const shots = new Set();
  const shot = async (name) => { if (shots.has(name)) return; shots.add(name); if (SH) await page.locator('#screen').screenshot({ path: SH + prefix + '-' + name + '.png' }); };
  const info = () => page.evaluate(() => {
    const t = CT.engine.top();
    const o = t.opts || {};
    const G = CT.game.G;
    const lines = (o.lines || []).map((l) => (typeof l === 'string' ? l : l && l.t) || '');
    return {
      kind: t.kind || '?',
      labels: o.options ? o.options.map((x) => ({ label: x.label, disabled: !!x.disabled })) : null,
      lines, title: o.title || '', text: o.text || '', prompt: o.prompt || '', err: t.err || '', dialog: (o.dialog || []).join(' '),
      G: G ? { node: G.node, next: G.next, atNode: G.atNode, miles: G.miles, day: G.day, gas: G.gas, cap: CT.sim.capacity(G), money: G.money, food: G.food, alive: CT.sim.alive(G).length, finished: G.finished, over: CT.sim.isOver(G), cond: G.carCond } : null,
      st: t.st ? JSON.parse(JSON.stringify(t.st, (k, v) => (k === 'f' || k === 'fish' || k === 'obs' || k === 'texts' || k === 'animals' || k === 'kills' || k === 'caught' || k === 'puffs' ? undefined : v))) : null,
    };
  });
  const did = {};
  let started = false, steps = 0, lastSig = '', same = 0, trips = 0, lastG = null;
  const log = [];
  while (steps++ < 9000) {
    const s = await info();
    if (s.G) lastG = s.G;
    const sig = JSON.stringify([s.kind, s.labels && s.labels.map((l) => l.label), s.lines.slice(0, 2), s.G && [s.G.day, s.G.miles]]);
    if (sig === lastSig) same++; else { same = 0; lastSig = sig; }
    if (same > 60 && ['travel', 'gorge', 'hunt', 'fish', 'repair', 'anim'].indexOf(s.kind) < 0) { log.push('STUCK on ' + sig); break; }
    const L = s.labels ? s.labels.map((l) => l.label) : [];
    const has = (t) => L.findIndex((l) => l.indexOf(t) >= 0);
    const pick = async (i) => { if (i < 0) i = s.labels.findIndex((l) => !l.disabled); await key(i === 9 ? '0' : String(i + 1)); };
    const allLines = s.lines.join(' ') + ' ' + s.text + ' ' + s.title;
    if (s.kind === 'title') {
      if (started) {
        trips++;
        log.push('trip ' + trips + ' ended: ' + (did.finished ? 'finished' : 'died') + ' at ' + (lastG ? lastG.miles : '?') + ' mi');
        if (trips >= 2) break;
        for (const k of Object.keys(did)) delete did[k];
      }
      await shot('title'); started = true; await key('4'); continue;
    }
    if (s.kind === 'message') {
      if (/Congratulations/.test(s.dialog)) { await shot('finish'); did.finished = (did.finished || 0) + 1; }
      else if (s.lines.length === 0 && s.G && s.G.finished && !s.title) await shot('score');
      if (/Top Ten/.test(s.title)) await shot('topten');
      if (/Hunting/.test(s.title)) await shot('hunt-intro');
      if (/Fishing/.test(s.title)) await shot('fish-intro');
      if (/Columbia River Highway/.test(s.title)) await shot('gorge-intro');
      if (/Roadside Repair/.test(s.title)) await shot('repair-intro');
      if (/End of the Road/.test(s.title)) await shot('summary');
      if (s.G && s.G.over) await shot('gameover');
      await key(' ', 250); continue;
    }
    if (s.kind === 'tomb') { await shot('memorial'); await key(' '); continue; }
    if (s.kind === 'anim') { await shot('ford-anim'); await run(4500); continue; }
    if (s.kind === 'travel') { await shot('travel-' + (s.G ? s.G.next : '')); await run(700); continue; }
    if (s.kind === 'repair') {
      await shot('repair');
      const st = s.st;
      if (st && !st.over && st.needle > st.zone + 4 && st.needle < st.zone + 30) await key(' ', 60); else await run(30);
      continue;
    }
    if (s.kind === 'hunt') {
      await shot('hunt');
      const target = await page.evaluate(() => { const st = CT.engine.top().st; const a = st.animals.find((x) => x.state !== 'dead' && x.x > 10 && x.x < 290); if (!a) return null; const spr = CT.art.critters.animalCanvas(a.type, a.s, a.frame, false, a.dir > 0); return { x: a.x + spr.cv.width * 0.5, y: a.y - spr.gy + spr.cv.height * 0.62 }; });
      if (target && s.st.used < 12) {
        const box = await page.locator('#screen').boundingBox();
        await page.mouse.move(box.x + (target.x / 320) * box.width, box.y + (target.y / 240) * box.height);
        await page.mouse.down(); await page.mouse.up();
        await run(250);
        if (s.st.used === 3) await shot('hunt-action');
      } else if (s.st.t > 12) { await key('Escape', 300); } else await run(300);
      continue;
    }
    if (s.kind === 'fish') {
      await shot('fish');
      const st = s.st;
      if (st.phase === 'aim') { await key(' ', 300); continue; }
      const f = await page.evaluate(() => { const st = CT.engine.top().st; const f = st.fish.find((x) => x.state === 'bite'); const r = st.reel; return { bite: !!f, reel: r ? { zone: r.zone, fy: r.fy, prog: r.prog } : null, phase: st.phase, t: st.t }; });
      if (f.phase === 'wait' && f.bite) { await key(' ', 50); continue; }
      if (f.phase === 'reel') {
        await shot('fish-reel');
        const want = f.reel.fy < f.reel.zone + 12;
        if (want) await page.keyboard.down(' '); else await page.keyboard.up(' ');
        await run(50);
        continue;
      }
      await page.keyboard.up(' ');
      if (f.t > 40) { await key('Escape', 300); continue; }
      await run(100);
      continue;
    }
    if (s.kind === 'gorge') {
      await shot('gorge');
      const g = await page.evaluate(() => { const st = CT.engine.top().st; return { x: st.x, d: st.d, obs: st.obs.map((o) => ({ lane: o.lane, off: o.off, d: o.d, v: o.v, hit: !!o.hitDone })) }; });
      const C = (d) => 160 + 34 * Math.sin(d / 420) + 16 * Math.sin(d / 173 + 1.3);
      const danger = (laneX) => g.obs.some((o) => { if (o.hit) return false; const ahead = o.d - g.d; if (ahead < -20 || ahead > (o.v < 0 ? 200 : 140)) return false; return Math.abs(C(o.d) + o.lane * 13 + o.off - laneX) < 14; });
      const c = C(g.d), right = c + 13, left = c - 13;
      const target = !danger(right) ? right : !danger(left) ? left : g.x;
      const want = target < g.x - 2 ? 'ArrowLeft' : target > g.x + 2 ? 'ArrowRight' : null;
      if (want !== did.held) { if (did.held) await page.keyboard.up(did.held); if (want) await page.keyboard.down(want); did.held = want; }
      await run(60);
      if (g.d > 3500) await shot('gorge-late');
      continue;
    }
    if (did.held) { await page.keyboard.up(did.held); did.held = null; }
    if (s.kind === 'input') {
      const txt = allLines + ' ' + s.prompt;
      if (/Name #|first name of the driver/.test(txt)) { if (/driver/.test(txt)) await type('Alex'); await key('Enter'); continue; }
      if (/How many days|How many nights/.test(txt)) { await type('2'); await key('Enter'); continue; }
      if (/How many gallons/.test(txt) && !/Most you can buy/.test(txt)) { const m = /up to (\d+)/.exec(txt); await type(m ? m[1] : '1'); await key('Enter'); continue; }
      if (/Most you can buy/.test(txt)) {
        const m = /Most you can buy: (\d+)/.exec(txt); const max = m ? +m[1] : 0;
        let want = 0;
        const item = s.lines[0];
        const G = s.G;
        if (item === 'GAS CANS') want = Math.min(max, 2);
        else if (item === 'GASOLINE') want = max;
        else if (item === 'FOOD') want = Math.min(max, Math.max(0, 260 - Math.round(G.food)));
        else if (item === 'WARM CLOTHING') want = Math.min(max, 10);
        else if (item === 'AMMUNITION') want = Math.min(max, 2);
        else want = Math.min(max, 1);
        await type(String(want)); await key('Enter');
        if ((await info()).kind === 'input') await key('Escape');
        if (did.storeQueue && did.storeQueue[0] === did.pendingItem) did.storeQueue.shift();
        continue;
      }
      if (/Top Ten|name for the list/.test(txt)) { await key('Enter'); continue; }
      if (/epitaph/.test(txt)) { await type('Should have rested'); await key('Enter'); continue; }
      await key('Enter'); continue;
    }
    if (s.kind === 'menu') {
      if (has('Continue on trail') >= 0) {
        await shot('trailmenu');
        const G = s.G;
        const town = has('Buy supplies') >= 0;
        const nodeKey = G.node + (G.atNode ? '' : '-road');
        if (town && !did['shop-' + G.node] && (G.gas < G.cap * 0.7 || G.food < 200)) { did['shop-' + G.node] = 1; await pick(has('Buy supplies')); continue; }
        if (town && !did.services) { did.services = 1; await pick(has('Visit town')); continue; }
        if (!did.quit && G.miles > 600) { did.quit = 1; await key('Escape'); await shot('quit-prompt'); await key('y', 500); await shot('title-continue'); await key('c', 500); await shot('resumed'); continue; }
        if (!did.talk && has('Talk to people') >= 0) { did.talk = 1; await pick(has('Talk to people')); await shot('talk'); continue; }
        if (!did.fish && has('Go fishing') >= 0) { did.fish = 1; await pick(has('Go fishing')); continue; }
        if (!did.hunt && has('Hunt for food') >= 0 && G.miles > 150) { did.hunt = 1; await pick(has('Hunt for food')); continue; }
        if (!did.trade && G.miles > 300) { did.trade = 1; await pick(has('Attempt to trade')); await shot('trade'); continue; }
        if (!did.rest && G.miles > 500 && town) { did.rest = 1; await pick(has('Stop to rest')); continue; }
        if (!did.pace) { did.pace = 1; await pick(has('Change pace')); await shot('pace'); continue; }
        if (!did.rations) { did.rations = 1; await pick(has('Change food rations')); await shot('rations'); continue; }
        if (!did.supplies && G.miles > 800) { did.supplies = 1; await pick(has('Check supplies')); await shot('supplies'); continue; }
        if (!did.map && G.miles > 900) { did.map = 1; await pick(has('Look at map')); await shot('map'); continue; }
        await pick(0); continue;
      }
      if (has('Leave the store') >= 0) {
        await shot('store');
        if (!did.storeQueue) did.storeQueue = did.initialDone ? ['Gasoline', 'Food', 'Spare tires'] : ['Gas cans', 'Gasoline', 'Food', 'Warm clothing', 'Ammunition', 'Spare tires', 'Fan belts'];
        if (did.storeQueue.length) { did.pendingItem = did.storeQueue[0]; await pick(has(did.storeQueue[0])); continue; }
        did.storeQueue = null; did.initialDone = 1;
        await key(' '); continue;
      }
      if (has('drive through the flooded road') >= 0) {
        await shot('river-' + s.G.node);
        const toll = s.labels.findIndex((l) => l.label.indexOf('take the ') === 0 && l.label.indexOf('detour') < 0 && !l.disabled);
        const det = s.labels.findIndex((l) => l.label.indexOf('detour') >= 0 && !l.disabled);
        if (!did.riverInfo) { did.riverInfo = 1; await pick(has('get more information')); continue; }
        if (!did.ford) { did.ford = 1; await pick(0); continue; }
        await pick(toll >= 0 ? toll : det >= 0 ? det : 0); continue;
      }
      if (L.length === 2 && L[0] === 'Yes') {
        if (/Quit to the title/.test(allLines)) { await key('n'); continue; }
        if (/TURN AROUND/.test(allLines)) await shot('turnaround');
        await key('y'); continue;
      }
      if (has('head for') >= 0) { await shot('fork'); await pick(0); continue; }
      if (has('Columbia River Highway') >= 0) { await shot('dalles'); const barlow = +seed % 2 === 1 && !s.labels[1].disabled; await pick(barlow ? 1 : 0); continue; }
      if (has('do it yourself') >= 0) { await shot('breakdown'); await pick(has('do it yourself')); continue; }
      if (has('Walk to the nearest') >= 0) { await shot('outofgas'); const a = has('roadside assistance'); await pick(s.labels[a].disabled ? 0 : a); continue; }
      if (has('Buy gas') >= 0) { await shot('gasstation'); await pick(s.labels[0].disabled ? 1 : 0); continue; }
      if (has('Go back') >= 0 && has('urgent care') >= 0) { await shot('services'); if (!did.clinic) { did.clinic = 1; await pick(has('urgent care')); } else if (!did.shopVisit) { did.shopVisit = 1; await pick(0); } else if (!did.work) { did.work = 1; await pick(has('Work a day job')); } else await pick(has('Go back')); continue; }
      if (has('See the doctor') >= 0) { await shot('clinic'); await pick(s.labels[0].disabled ? 1 : 0); continue; }
      if (has('Leave the shop') >= 0) { await shot('repairshop'); await pick(s.labels[0].disabled ? has('Leave the shop') : 0); continue; }
      if (has('Camp at the campground') >= 0) { await shot('restplace'); await pick(s.labels[1].disabled ? 0 : 1); continue; }
      if (has('Try to patch') >= 0 || has('Try to get it started') >= 0 || has('Try a temporary fix') >= 0) { await shot('breakdown-nospare'); const tow = has('tow truck'); await pick(!s.labels[tow].disabled && s.G.money > 60000 ? tow : 0); continue; }
      if (has('a steady pace') >= 0) { await pick(0); continue; }
      if (has('filling') >= 0) { await pick(0); continue; }
      if (has('Be a software engineer') >= 0) { await shot('occupation'); await key(occ); continue; }
      if (has('March') >= 0) { await shot('month'); await key(monthSel); continue; }
      if (has('Wood-Panel') >= 0) { await shot('dealer'); await key(carSel); continue; }
      await pick(-1); continue;
    }
    log.push('unknown screen ' + s.kind); await key(' ');
  }
  const fin = await info();
  console.log(JSON.stringify({ seed, occ, carSel, monthSel, steps, log, screensSeen: [...shots].length }));
  console.log('ERRORS:', errors.length ? errors.slice(0, 20).join('\n') : 'none');
  await browser.close();
  const stuck = log.some((l) => l.indexOf('STUCK') === 0 || l.indexOf('unknown') === 0);
  const ok = !errors.length && !stuck && trips >= 2;
  console.log(ok ? 'PLAY TEST PASSED' : 'PLAY TEST FAILED');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
