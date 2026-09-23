/* Headless simulation tests for The Car Trail.
 * Run: node tests/sim-test.js [games]
 * 1) Fuzz: random decisions through every branch; checks invariants every step.
 * 2) Balance: a sensible bot plays each occupation/car; reports outcomes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Map, Set };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['js/core/util.js', 'js/data/config.js', 'js/data/trail.js', 'js/game/sim.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}
const CT = ctx.CT;
const { U, CFG, sim: S, TRAIL } = CT;

// In-memory localStorage stand-in (sim persistence helpers use it).
const mem = {};
ctx.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };

let failures = 0;
function fail(msg, G) {
  failures++;
  if (failures <= 20) console.error('FAIL:', msg, G ? JSON.stringify({ day: G.day, node: G.node, next: G.next, miles: G.miles }) : '');
}

function check(G, where) {
  const num = (v, name, lo, hi) => {
    if (typeof v !== 'number' || !isFinite(v)) fail(where + ': ' + name + ' not finite: ' + v, G);
    else if (lo !== undefined && v < lo - 1e-6) fail(where + ': ' + name + ' below ' + lo + ': ' + v, G);
    else if (hi !== undefined && v > hi + 1e-6) fail(where + ': ' + name + ' above ' + hi + ': ' + v, G);
  };
  num(G.money, 'money', 0);
  if (!Number.isInteger(G.money)) fail(where + ': money not integer cents ' + G.money, G);
  num(G.food, 'food', 0);
  num(G.gas, 'gas', 0, S.capacity(G) + 0.01);
  num(G.carCond, 'carCond', 0, 100);
  for (const k of ['cans', 'clothing', 'bullets', 'tires', 'batteries', 'belts']) num(G[k], k, 0);
  for (const k of ['tires', 'batteries', 'belts']) num(G[k], k, 0, 3);
  num(G.miles, 'miles', 0, 2300);
  num(G.day, 'day');
  num(G.weather.temp, 'temp', -60, 140);
  for (const p of G.party) {
    num(p.health, 'health(' + p.name + ')', 0, 100);
    if (!p.alive && p.ill) fail(where + ': dead person still ill', G);
  }
  if (!S.node(G.node)) fail(where + ': bad node ' + G.node, G);
  if (!G.atNode && !S.node(G.next)) fail(where + ': bad next ' + G.next, G);
  if (G.segDone > G.segMiles + 1e-9 && !G.atNode) fail(where + ': segDone > segMiles', G);
  const lbl = S.weatherLabel(G.weather);
  if (!lbl) fail(where + ': no weather label', G);
  for (const m of [].concat(G._lastMsgs || [])) if (!m || typeof m.text !== 'string' || /undefined|NaN|null/.test(m.text)) fail(where + ': bad message ' + JSON.stringify(m), G);
}

function msgsOk(list, where, G) {
  for (const m of list) {
    if (!m || typeof m.text !== 'string' || !m.text || /undefined|NaN|\[object/.test(m.text)) fail(where + ': bad message ' + JSON.stringify(m), G);
  }
}

function setup(occ, carId, month, rnd, policy) {
  const G = S.newGame({ occupation: occ, leader: 'Alex', members: ['Bea', 'Cam', 'Dee', 'Eli'], month, year: 2026 });
  if (G.money < CFG.cars[carId].price) carId = 'wagon';
  S.buyCar(G, carId);
  const cart = policy.initialCart(G, rnd);
  if (!S.applyCart(G, cart, 1)) fail('initial cart over budget', G);
  return G;
}

// ---------------- policies ----------------
function fuzzPolicy(rnd) {
  const r = () => rnd();
  return {
    name: 'fuzz',
    initialCart(G) {
      const cart = {};
      for (const it of CFG.items) {
        const room = S.itemRoom(G, it, cart);
        cart[it.id] = Math.floor(r() * Math.min(room, it.id === 'food' ? 600 : it.id === 'gas' ? 60 : 6) + 0.5);
        cart[it.id] = Math.min(cart[it.id], S.itemRoom(G, it, cart));
        while (cart[it.id] > 0 && S.cartTotal(G, cart, 1) > G.money) cart[it.id]--;
      }
      return cart;
    },
    pace: () => U.pick(CFG.paceOrder),
    rations: () => U.pick(CFG.rationOrder),
    river: (G) => U.pick(['ford', 'toll', 'detour', 'wait']),
    fork: (G, n) => U.randInt(0, n - 1),
    breakdown: () => U.pick(['part', 'partslow', 'patch', 'wait', 'tow']),
    gas: () => U.pick(['walk', 'flag', 'assist']),
    shouldHunt: () => r() < 0.08,
    shouldFish: () => r() < 0.3,
    shouldRest: () => r() < 0.08,
    shouldTrade: () => r() < 0.2,
    shouldWork: () => r() < 0.2,
    useClinic: () => r() < 0.3,
    townShop(G) {
      const cart = {};
      for (const it of CFG.items) {
        cart[it.id] = Math.floor(r() * Math.min(S.itemRoom(G, it, cart), it.id === 'food' ? 300 : it.id === 'gas' ? 40 : 3));
        cart[it.id] = Math.min(cart[it.id], S.itemRoom(G, it, cart));
        while (cart[it.id] > 0 && S.cartTotal(G, cart) > G.money) cart[it.id]--;
      }
      return cart;
    },
    repair: () => r() < 0.3,
    dalles: () => U.pick(['gorge', 'barlow']),
  };
}

function smartPolicy(pace) {
  return {
    name: 'smart-' + pace,
    initialCart(G) {
      const car = S.car(G);
      const cart = {};
      const budget = () => G.money - S.cartTotal(G, cart, 1);
      const add = (id, q) => {
        const it = CFG.itemById[id];
        q = Math.min(q, S.itemRoom(G, it, cart) + (cart[id] || 0));
        const price = id === 'gas' ? S.gasPrice(G, 1) : it.price;
        while (q > (cart[id] || 0) && budget() >= price) cart[id] = (cart[id] || 0) + 1;
      };
      const cansNeeded = Math.max(0, Math.ceil((600 / car.mpg - car.tank) / 5));
      add('cans', Math.min(4, cansNeeded));
      add('gas', 999);
      add('tires', 1);
      add('belts', 1);
      add('food', Math.min(car.cargo, 200));
      add('clothing', G.money > 400000 ? 10 : 5);
      add('ammo', 2);
      if (G.money > 400000) add('batteries', 1);
      add('food', Math.min(car.cargo, G.money > 400000 ? 400 : 250));
      return cart;
    },
    pace: () => pace,
    rations: (G) => (G.food > S.alive(G).length * 3 * 6 ? 'filling' : 'meager'),
    river: (G) => {
      const risk = S.fordRisk(G);
      if (risk < 0.5) return 'ford';
      const toll = S.node(G.node).river.toll;
      if (toll && G.money >= toll + 3000) return 'toll';
      if (S.range(G) > S.detourMiles(G) + 40) return 'detour';
      if (risk < 0.9) return 'ford';
      return 'wait';
    },
    fork: (G) => {
      const n = S.node(G.node);
      const long = n.next[0].miles + S.node(n.next[0].to).next[0].miles;
      return S.range(G) > long + 40 ? 0 : 1;
    },
    breakdown: (G, part) => (G[part] > 0 ? (U.chance(0.7) ? 'part' : 'partslow') : G.money > S.towCost(G) + 40000 ? 'tow' : 'patch'),
    gas: (G) => (G.money > S.assistCost(G) ? 'assist' : 'walk'),
    shouldHunt: (G) => G.bullets >= 20 && G.food < S.alive(G).length * 3 * 5,
    shouldFish: (G) => G.food < S.alive(G).length * 3 * 8,
    shouldRest: (G) => S.healthAvg(G) < 45 || S.alive(G).some((p) => p.ill && p.health < 40),
    shouldTrade: () => false,
    shouldWork: (G) => G.money < 30000,
    useClinic: (G) => S.alive(G).some((p) => p.ill && p.health < 60) && G.money > S.clinicCost(G) + 50000,
    townShop(G) {
      const cart = {};
      const budget = () => G.money - S.cartTotal(G, cart);
      const add = (id, q) => {
        const it = CFG.itemById[id];
        q = Math.min(q, S.itemRoom(G, it, cart) + (cart[id] || 0));
        const price = id === 'gas' ? S.gasPrice(G) : S.itemPrice(G, it);
        while (q > (cart[id] || 0) && budget() >= price) cart[id] = (cart[id] || 0) + 1;
      };
      const car = S.car(G);
      if (G.cans * 5 + car.tank < 560 / car.mpg) add('cans', Math.min(6 - G.cans, Math.ceil((560 / car.mpg - car.tank) / 5) - G.cans));
      add('gas', 999);
      if (G.tires < 1) add('tires', 1);
      const need = S.alive(G).length * 3 * 8;
      if (G.food < need) add('food', need - G.food);
      if (G.clothing < S.alive(G).length * 2) add('clothing', S.alive(G).length * 2 - G.clothing);
      if (G.belts < 1) add('belts', 1);
      return cart;
    },
    repair: (G) => G.carCond < 55 && G.money > S.repairCost(G) + 30000,
    dalles: (G) => (G.money > CFG.barlowToll + 10000 ? 'barlow' : 'gorge'),
  };
}

// ---------------- game driver ----------------
function play(G, pol, rnd) {
  const allMsgs = [];
  let guard = 0;
  while (!S.isOver(G) && !G.finished) {
    if (++guard > 400) { fail('game did not terminate', G); break; }
    check(G, 'loop');
    if (G.atNode) {
      const n = S.node(G.node);
      G.pace = pol.pace(G);
      G.rations = pol.rations(G);
      if (n.type === 'town') {
        let w = 0;
        while (pol.shouldWork && pol.shouldWork(G) && w++ < 6 && !S.isOver(G)) msgsOk(S.work(G), 'work', G);
        if (S.isOver(G)) break;
        if (pol.useClinic && pol.useClinic(G) && G.money >= S.clinicCost(G)) msgsOk(S.clinic(G), 'clinic', G);
        const cart = pol.townShop(G);
        if (!S.applyCart(G, cart)) fail('town cart over budget', G);
        if (pol.repair(G)) { const c = S.repairCost(G); if (G.money >= c) { G.money -= c; G.carCond = 100; } }
        check(G, 'shop');
      }
      if (pol.shouldTrade(G) && S.tradesLeft(G) > 0) { const o = S.tradeOffer(G); const p = S.acceptTrade(G, o); check(G, 'trade'); void p; }
      if (pol.shouldRest(G)) { const m = S.rest(G, 2, n.type === 'town' && G.money > S.motelCost(G) * 2 + 20000); msgsOk(m, 'rest', G); allMsgs.push(...m); if (S.isOver(G)) break; }
      if (n.fish && pol.shouldFish(G)) { const r = S.finishFishing(G, U.randInt(0, 30)); msgsOk(r.msgs, 'fish', G); if (S.isOver(G)) break; }
      if (n.type !== 'town' && pol.shouldHunt(G)) { const r = S.finishHunt(G, U.randInt(0, 300), Math.min(G.bullets, U.randInt(5, 20))); msgsOk(r.msgs, 'hunt', G); if (S.isOver(G)) break; }
      check(G, 'node');
      if (n.type === 'river' && !G.crossed) {
        let guard2 = 0;
        while (!G.crossed && !S.isOver(G)) {
          if (++guard2 > 30) { G.crossed = true; break; }
          let c = pol.river(G);
          if (c === 'toll' && (!n.river.toll || G.money < n.river.toll)) c = 'wait';
          if (c === 'detour' && S.range(G) < S.detourMiles(G)) c = 'wait';
          const m = c === 'ford' ? S.fordRiver(G) : c === 'toll' ? S.tollBridge(G) : c === 'detour' ? S.detour(G) : S.waitAtRiver(G);
          msgsOk(m, 'river-' + c, G);
          check(G, 'river-' + c);
        }
        if (S.isOver(G)) break;
      }
      if (n.fork) S.depart(G, pol.fork(G, n.next.length));
      else if (n.final) {
        const c = pol.dalles(G);
        if (c === 'barlow' && G.money >= CFG.barlowToll) S.barlow(G);
        else {
          S.depart(G, 0);
          const hits = U.randInt(0, 6);
          for (let i = 0; i < hits; i++) { const t = S.gorgeHit(G, U.pick(['rock', 'car', 'deer', 'pothole', 'rail', 'truck'])); t.forEach((x) => { if (/undefined|NaN/.test(x)) fail('gorge text ' + x, G); }); }
          const m = S.finishGorge(G);
          msgsOk(m, 'gorge', G);
          if (!S.isOver(G)) S.arrive(G);
          continue;
        }
      } else S.depart(G, 0);
      continue;
    }
    // on the road
    const r = S.travelDay(G);
    msgsOk(r.msgs, 'travel', G);
    allMsgs.push(...r.msgs);
    check(G, 'travel');
    if (S.isOver(G)) break;
    for (const ev of r.events) {
      if (ev.kind === 'msg') { msgsOk([ev].concat(ev.after || []), 'event-' + ev.id, G); }
      else if (ev.kind === 'breakdown') {
        if (!/\w/.test(ev.text)) fail('breakdown text', G);
        let fixed = false; let g2 = 0;
        while (!fixed && !S.isOver(G)) {
          if (++g2 > 60) { fail('breakdown loop', G); break; }
          let c = pol.breakdown(G, ev.part);
          if ((c === 'part' || c === 'partslow') && G[ev.part] <= 0) c = 'patch';
          if (c === 'tow' && G.money < S.towCost(G)) c = 'wait';
          let res;
          if (c === 'part' || c === 'partslow') res = S.fixWithPart(G, ev.part, c === 'partslow');
          else if (c === 'patch') res = S.patchAttempt(G, ev.part);
          else if (c === 'wait') res = S.waitForHelp(G, ev.part);
          else res = S.tow(G, ev.part);
          msgsOk(res.msgs, 'fix-' + c, G);
          fixed = res.ok;
          check(G, 'fix-' + c);
        }
      } else if (ev.kind === 'gasStation') {
        if (!(ev.price > 0)) fail('gas price', G);
        S.buyGas(G, 999, ev.price);
        check(G, 'gasStation');
      } else if (ev.kind === 'hitchhiker') {
        if (rnd() < 0.5) msgsOk(S.pickUpHitchhiker(G, ev.pay), 'hitch', G);
      } else fail('unknown event kind ' + ev.kind, G);
      if (S.isOver(G)) break;
    }
    if (S.isOver(G)) break;
    if (r.outOfGas) {
      let g3 = 0;
      while (G.gas <= 0.05 && !S.isOver(G)) {
        if (++g3 > 60) { fail('out of gas loop', G); break; }
        let c = pol.gas(G);
        if (c === 'assist' && G.money < S.assistCost(G)) c = 'flag';
        const res = c === 'walk' ? S.walkForGas(G) : c === 'flag' ? S.flagDown(G) : S.callAssistance(G);
        msgsOk(res.msgs, 'gas-' + c, G);
        check(G, 'gas-' + c);
      }
    }
    if (r.arrived && !S.isOver(G)) S.arrive(G);
    if (pol.shouldHunt(G) && !S.isOver(G) && !G.atNode) { const h = S.finishHunt(G, U.randInt(40, 220), Math.min(G.bullets, U.randInt(6, 16))); msgsOk(h.msgs, 'hunt', G); }
  }
  check(G, 'end');
  return allMsgs;
}

function runFuzz(n) {
  let finished = 0;
  for (let i = 0; i < n; i++) {
    const seed = 1000 + i;
    const rnd = U.rng(seed);
    U.random = rnd;
    const occ = U.pick(CFG.occupationOrder);
    const car = U.pick(CFG.carOrder);
    const month = U.pick(CFG.startMonths);
    const pol = fuzzPolicy(rnd);
    const G = setup(occ, car, month, rnd, pol);
    play(G, pol, rnd);
    if (G.finished) {
      finished++;
      const sc = S.score(G);
      if (!(sc.total >= 0) || !isFinite(sc.total)) fail('bad score', G);
      sc.rows.forEach((r) => { if (/undefined|NaN/.test(r[0]) || !isFinite(r[1])) fail('score row ' + r, G); });
    }
  }
  console.log('fuzz: ' + n + ' games, ' + finished + ' reached Oregon');
}

function runBalance(n) {
  const table = [];
  for (const occ of CFG.occupationOrder) {
    for (const car of CFG.carOrder) {
      if (CFG.occupations[occ].money < CFG.cars[car].price) continue;
      for (const pace of ['steady', 'strenuous']) {
        let fin = 0, deaths = 0, days = 0, score = 0, oog = 0, brk = 0, leaderDead = 0;
        for (let i = 0; i < n; i++) {
          const rnd = U.rng(5000 + i * 7);
          U.random = rnd;
          const pol = smartPolicy(pace);
          const G = setup(occ, car, U.pick([3, 4, 5]), rnd, pol);
          play(G, pol, rnd);
          if (G.finished) { fin++; score += S.score(G).total; }
          if (!G.party[0].alive) leaderDead++;
          deaths += G.party.filter((p) => !p.alive).length;
          days += G.stats.days;
          brk += G.stats.breakdowns;
        }
        table.push({ occ, car, pace, finish: (100 * fin / n).toFixed(0) + '%', deaths: (deaths / n).toFixed(2), leaderDead: (100 * leaderDead / n).toFixed(0) + '%', days: (days / n).toFixed(1), breakdowns: (brk / n).toFixed(1), avgScore: fin ? Math.round(score / fin) : 0 });
        void oog;
      }
    }
  }
  console.table(table);
}

if (require.main === module) {
  const n = parseInt(process.argv[2] || '400', 10);
  runFuzz(n);
  runBalance(Math.max(50, Math.floor(n / 4)));
  if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
  console.log('all sim checks passed');
} else {
  module.exports = { CT, U, CFG, S, TRAIL, setup, play, smartPolicy, fuzzPolicy, check, failures: () => failures };
}
