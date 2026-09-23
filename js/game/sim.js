/* The Car Trail - game simulation. Pure logic (no DOM) so it can be tested in node.
 * Follows the Oregon Trail's model: daily food & health, pace and rations,
 * illness, weather, random events, river crossings, forks, trading and scoring.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const CFG = CT.CFG;
  const T = CT.TRAIL;

  const S = {};
  const M = (text, tone) => ({ text, tone: tone || 'info' });

  // ---------------------------------------------------------------- basics
  S.node = (id) => T.nodes[id];
  S.car = (G) => CFG.cars[G.carId] || CFG.cars.wagon;
  S.occ = (G) => CFG.occupations[G.occupation];
  S.alive = (G) => G.party.filter((p) => p.alive);
  S.leader = (G) => G.party[0];
  S.isOver = (G) => !G.party[0].alive || S.alive(G).length === 0;
  S.illness = (id) => CFG.illnesses.find((i) => i.id === id);

  S.newGame = function (o) {
    const occ = CFG.occupations[o.occupation];
    const start = U.dayNum(o.year, o.month, 1);
    const G = {
      v: 1,
      occupation: occ.id,
      party: [o.leader].concat(o.members).map((name) => ({ name, health: 100, alive: true, ill: null, cause: '' })),
      money: occ.money,
      carId: '',
      carCond: 0,
      gas: 0, cans: 0, food: 0, clothing: 0, bullets: 0, tires: 0, batteries: 0, belts: 0,
      startDay: start,
      day: start,
      miles: 0,
      node: T.start,
      next: '',
      segMiles: 0,
      segDone: 0,
      atNode: true,
      crossed: false,
      pace: 'steady',
      rations: 'filling',
      weather: { temp: 60, precip: 'none' },
      tempDev: 0,
      wetness: 0,
      river: null,
      scarcity: {},
      tradeDay: -1,
      trades: 0,
      visited: [T.start],
      slowNext: 1,
      noFoodWarned: false,
      stats: { hunted: 0, fished: 0, breakdowns: 0, tickets: 0, days: 0 },
      finished: false,
    };
    S.rollWeather(G);
    return G;
  };

  S.buyCar = function (G, id) {
    const car = CFG.cars[id];
    G.carId = id;
    G.carCond = car.cond;
    G.money -= car.price;
    G.gas = Math.round(car.tank * 0.25); // dealers never fill the tank
  };

  S.capacity = (G, extraCans) => S.car(G).tank + (G.cans + (extraCans || 0)) * 5;
  S.cargo = (G) => S.car(G).cargo;
  S.mpg = function (G) {
    let m = S.car(G).mpg * CFG.paces[G.pace].mpg;
    if (G.carCond < 40) m *= 0.9;
    if (G.weather.precip === 'snow' || G.weather.precip === 'blizzard') m *= 0.9;
    return m;
  };
  S.range = (G) => Math.floor(G.gas * S.mpg(G));

  S.regionId = function (G) {
    if (G.atNode || !G.next) return S.node(G.node).region;
    return S.node(G.next).region;
  };
  S.region = (G) => CFG.regions[S.regionId(G)];

  S.healthAvg = function (G) {
    const a = S.alive(G);
    return a.length ? a.reduce((s, p) => s + p.health, 0) / a.length : 0;
  };
  S.healthLabel = (v) => (v >= 70 ? 'good' : v >= 45 ? 'fair' : v >= 25 ? 'poor' : 'very poor');
  S.partyHealth = (G) => S.healthLabel(S.healthAvg(G));
  S.carLabel = (c) => (c >= 75 ? 'good' : c >= 50 ? 'fair' : c >= 25 ? 'poor' : 'very poor');

  S.milesToNext = (G) => (G.atNode ? 0 : Math.max(0, G.segMiles - G.segDone));
  S.placeName = function (G) {
    if (G.atNode) return S.node(G.node).name;
    return 'On the road';
  };

  // ---------------------------------------------------------------- weather
  S.rollWeather = function (G) {
    const m = U.dateParts(G.day).month;
    const reg = S.region(G);
    G.tempDev = G.tempDev * 0.6 + U.randRange(-8, 8);
    const temp = Math.round(CFG.monthTemps[m] + reg.tempOff + G.tempDev);
    const wasWet = G.weather && G.weather.precip !== 'none';
    const p = CFG.monthPrecip[m] * reg.wet * (wasWet ? 1.5 : 1);
    let precip = 'none';
    if (U.chance(p)) {
      const heavy = U.chance(0.3);
      if (temp <= 34) precip = heavy ? 'blizzard' : 'snow';
      else precip = heavy ? 'storm' : 'rain';
    }
    G.weather = { temp, precip };
    if (precip === 'rain') G.wetness = Math.min(3, G.wetness + 0.5);
    else if (precip === 'storm') G.wetness = Math.min(3, G.wetness + 1);
    else G.wetness = Math.max(0, G.wetness - 0.35);
  };

  S.tempClass = function (w) {
    if (w.precip === 'blizzard') return 'verycold';
    const t = w.temp;
    if (t >= 92) return 'veryhot';
    if (t >= 80) return 'hot';
    if (t >= 45) return 'mild';
    if (t >= 30) return 'cold';
    return 'verycold';
  };
  S.weatherLabel = function (w) {
    switch (w.precip) {
      case 'rain': return 'rainy';
      case 'storm': return 'thunderstorms';
      case 'snow': return 'snowy';
      case 'blizzard': return 'blizzard';
      default: break;
    }
    const t = w.temp;
    return t >= 92 ? 'very hot' : t >= 80 ? 'hot' : t >= 62 ? 'warm' : t >= 45 ? 'cool' : t >= 30 ? 'cold' : 'very cold';
  };

  // ---------------------------------------------------------------- illness
  S.pickIllness = function (G, tc, mode) {
    const reg = S.regionId(G);
    const west = ['wyoming', 'mountain', 'idaho', 'oregon'].indexOf(reg) >= 0;
    const tired = G.pace !== 'steady' || S.healthAvg(G) < 50;
    return U.weighted(CFG.illnesses, (i) => {
      if (i.when === 'hot') return tc === 'hot' || tc === 'veryhot' ? i.w : 0;
      if (i.when === 'cold') return tc === 'cold' || tc === 'verycold' ? i.w : 0;
      if (i.when === 'west') return west && mode !== 'motel' ? i.w : 0;
      if (i.when === 'tired') return tired ? i.w : 0;
      return i.w;
    });
  };

  S.makeSick = function (G, p, ill) {
    p.ill = { id: ill.id, sev: U.randInt(ill.sev[0], ill.sev[1]), days: U.randInt(ill.days[0], ill.days[1]) };
    return M(p.name + ' has ' + ill.has + '.', 'ill');
  };

  S.kill = function (G, p, cause) {
    p.alive = false;
    p.health = 0;
    p.ill = null;
    p.cause = cause;
    p.diedDay = G.day;
    p.diedMile = G.miles;
    return { text: p.name + ' has died of ' + cause + '.', tone: 'death', who: p.name, leader: p === G.party[0] };
  };

  // ---------------------------------------------------------------- a day passes
  // mode: 'travel' | 'rest' | 'motel' | 'wait' | 'hunt' | 'fish'
  S.passDay = function (G, mode) {
    const msgs = [];
    const alive = S.alive(G);
    if (!alive.length) return msgs;
    const rat = CFG.rations[G.rations];
    const need = alive.length * rat.lbs;
    const starving = G.food < need;
    G.food = Math.max(0, G.food - need);
    if (starving) {
      if (!G.noFoodWarned) { msgs.push(M('You have run out of food!', 'bad')); G.noFoodWarned = true; }
    } else G.noFoodWarned = false;

    const tc = S.tempClass(G.weather);
    const clothPer = G.clothing / alive.length;
    const student = G.occupation === 'student';
    const resting = mode === 'rest' || mode === 'motel';

    for (const p of alive) {
      let d = 0;
      if (!p.ill) d += 0.5;
      if (mode === 'travel') d += CFG.paces[G.pace].health;
      if (mode === 'rest') d += 4;
      else if (mode === 'motel') d += 8;
      if (starving) d -= 8;
      else {
        let r = rat.health;
        if (r < 0 && student) r /= 2;
        d += r;
      }
      if (tc === 'cold' && clothPer < 1) d -= 2;
      if (tc === 'verycold') d -= clothPer < 1 ? 7 : clothPer < 2 ? 3.5 : 0;
      if (tc === 'veryhot') d -= G.carCond < 50 ? 2 : 0.5;
      if (p.ill) {
        d -= p.ill.sev * (resting ? 0.6 : 1);
        // Pushing on at a hard pace keeps people sick longer; resting speeds recovery.
        if (resting) p.ill.days -= 2;
        else if (mode !== 'travel' || G.pace === 'steady' || U.chance(0.5)) p.ill.days -= 1;
      }
      p.health = U.clamp(p.health + d, 0, 100);
    }

    for (const p of alive) {
      if (p.ill && p.ill.days <= 0 && p.health > 0) {
        msgs.push(M(p.name + ' is feeling better.', 'good'));
        p.ill = null;
      }
    }

    for (const p of alive) {
      if (p.ill || p.health <= 0) continue;
      let ch = 0.03;
      if (p.health < 60) ch += 0.012;
      if (p.health < 35) ch += 0.02;
      if (G.rations === 'bare') ch += student ? 0.006 : 0.012;
      else if (G.rations === 'meager') ch += student ? 0.002 : 0.004;
      if (mode === 'travel') ch += G.pace === 'grueling' ? 0.012 : G.pace === 'strenuous' ? 0.004 : 0;
      if (starving) ch += 0.03;
      if (tc === 'verycold' && clothPer < 2) ch += 0.025;
      else if (tc === 'cold' && clothPer < 1) ch += 0.01;
      if (tc === 'veryhot') ch += 0.01;
      if (resting) ch *= 0.5;
      if (U.chance(ch)) msgs.push(S.makeSick(G, p, S.pickIllness(G, tc, mode)));
    }

    for (const p of alive) {
      if (p.health > 0) continue;
      const cause = p.ill ? S.illness(p.ill.id).has : starving ? 'starvation'
        : tc === 'verycold' || tc === 'cold' ? 'exposure' : 'exhaustion';
      msgs.push(S.kill(G, p, cause));
    }

    for (const k of Object.keys(G.scarcity)) G.scarcity[k] = Math.max(0, G.scarcity[k] - 0.03);
    G.day += 1;
    G.stats.days += 1;
    S.rollWeather(G);
    return msgs;
  };

  // ---------------------------------------------------------------- travel
  S.depart = function (G, idx) {
    const n = S.node(G.node);
    const e = n.next[idx || 0];
    if (!e) return false;
    G.next = e.to;
    G.segMiles = e.miles;
    G.segDone = 0;
    G.atNode = false;
    G.river = null;
    return true;
  };

  S.arrive = function (G) {
    G.node = G.next;
    G.next = '';
    G.atNode = true;
    G.crossed = false;
    G.segMiles = 0;
    G.segDone = 0;
    if (G.visited.indexOf(G.node) < 0) G.visited.push(G.node);
    const n = S.node(G.node);
    if (n.type === 'river') S.riverConditions(G);
    if (n.type === 'end') G.finished = true;
  };

  // One day on the road. Returns {msgs, events, arrived, outOfGas, miles}.
  S.travelDay = function (G) {
    const out = { msgs: [], events: [], arrived: false, outOfGas: false, miles: 0 };
    if (G.atNode || !G.next) return out;
    if (G.gas <= 0.05) {
      G.gas = 0;
      out.outOfGas = true;
      return out;
    }
    const car = S.car(G);
    const reg = S.region(G);
    const w = G.weather;
    if (w.precip === 'blizzard' && reg.mountain) {
      out.msgs.push(M('A blizzard has closed the road over the mountains. You lose a day.', 'bad'));
      out.msgs.push(...S.passDay(G, 'wait'));
      return out;
    }
    const pace = CFG.paces[G.pace];
    let miles = pace.miles * car.speed * reg.speed;
    if (G.carCond < 25) miles *= 0.75;
    else if (G.carCond < 50) miles *= 0.9;
    if (w.precip === 'rain') miles *= 0.9;
    else if (w.precip === 'storm') miles *= 0.75;
    else if (w.precip === 'snow') miles *= Math.max(0.35, 1 - 0.4 * car.snow);
    else if (w.precip === 'blizzard') miles *= 0.35;
    if (S.healthAvg(G) < 25) miles *= 0.85;
    miles *= G.slowNext;
    G.slowNext = 1;
    miles = Math.max(1, Math.round(miles * U.randRange(0.9, 1.1)));
    const remaining = G.segMiles - G.segDone;
    if (miles >= remaining) miles = remaining;

    const mpg = S.mpg(G);
    const need = miles / mpg;
    if (G.gas + 1e-9 < need) {
      miles = Math.floor(G.gas * mpg);
      G.gas = 0;
      out.outOfGas = true;
    } else {
      G.gas = Math.max(0, Math.round((G.gas - need) * 100) / 100);
    }
    G.segDone += miles;
    G.miles += miles;
    out.miles = miles;
    if (G.segDone >= G.segMiles) {
      out.arrived = true;
      out.outOfGas = false;
    }

    let wear = (0.8 + U.rand() * 0.8) * pace.wear * reg.wear * (w.precip !== 'none' ? 1.25 : 1);
    if (G.occupation === 'mechanic') wear *= 0.7;
    wear *= miles / pace.miles;
    G.carCond = Math.max(0, G.carCond - wear);

    out.msgs.push(...S.passDay(G, 'travel'));
    if (S.isOver(G)) return out;
    if (!out.outOfGas) {
      const ev = S.rollEvent(G);
      if (ev) out.events.push(ev);
    }
    return out;
  };

  // ---------------------------------------------------------------- prices
  S.priceMult = function (G) {
    const n = S.node(G.node);
    if (G.atNode && n.price) return n.price;
    // Between towns: use the most recent town's prices.
    let mult = 1;
    for (const id of G.visited) if (S.node(id).price) mult = S.node(id).price;
    return mult;
  };
  S.itemPrice = (G, item, mult) => Math.round(item.price * (mult || S.priceMult(G)));
  S.gasPrice = (G, mult) => Math.round(349 * (mult || S.priceMult(G)));

  // How many more of an item fit, given what is already in the cart.
  S.itemRoom = function (G, item, cart) {
    const c = cart || {};
    if (item.id === 'gas') return Math.max(0, Math.floor(S.capacity(G, c.cans || 0) - G.gas));
    if (item.id === 'food') return Math.max(0, S.cargo(G) - G.food);
    if (item.id === 'ammo') return Math.max(0, item.max - Math.floor(G.bullets / 20));
    return Math.max(0, item.max - (G[item.key] || 0));
  };

  S.cartTotal = function (G, cart, mult) {
    let t = 0;
    for (const it of CFG.items) t += (cart[it.id] || 0) * (it.id === 'gas' ? S.gasPrice(G, mult) : S.itemPrice(G, it, mult));
    return t;
  };

  S.applyCart = function (G, cart, mult) {
    const total = S.cartTotal(G, cart, mult);
    if (total > G.money) return false;
    G.money -= total;
    for (const it of CFG.items) {
      const q = cart[it.id] || 0;
      if (!q) continue;
      if (it.id === 'ammo') G.bullets += q * 20;
      else G[it.key] += q;
    }
    if (G.food > 0) G.noFoodWarned = false;
    return true;
  };

  S.repairCost = function (G) {
    const pts = Math.max(0, Math.ceil(100 - G.carCond));
    let c = pts * CFG.repairPerPoint * S.priceMult(G);
    if (G.occupation === 'mechanic') c *= 0.5;
    return Math.round(c);
  };
  S.motelCost = (G) => Math.round(CFG.motelPerNight * S.priceMult(G));

  // ---------------------------------------------------------------- urgent care (towns only)
  S.patients = (G) => S.alive(G).filter((p) => p.ill || p.health < 70);
  S.clinicCost = (G) => Math.round(CFG.clinicPerPatient * S.priceMult(G)) * S.patients(G).length;
  S.clinic = function (G) {
    const pts = S.patients(G);
    const cost = S.clinicCost(G);
    if (!pts.length) return [M('Nobody in your party needs a doctor.')];
    if (G.money < cost) return [M('You can\'t afford the clinic.', 'bad')];
    G.money -= cost;
    pts.forEach((p) => { p.ill = null; p.health = Math.min(100, p.health + 30); });
    return [M('The doctors at urgent care treat ' + U.listJoin(pts.map((p) => p.name)) + '. The bill is ' + U.dollars(cost) + '.', 'good')];
  };

  // ---------------------------------------------------------------- rest
  S.rest = function (G, days, motel) {
    const msgs = [];
    for (let i = 0; i < days; i++) {
      if (motel) {
        const c = S.motelCost(G);
        if (G.money < c) { msgs.push(M('You can\'t afford another night at the motel.', 'bad')); motel = false; }
        else G.money -= c;
      }
      msgs.push(...S.passDay(G, motel ? 'motel' : 'rest'));
      if (S.isOver(G)) break;
    }
    return msgs;
  };

  // ---------------------------------------------------------------- odd jobs (towns only)
  const JOBS = {
    engineer: { pay: [220, 340], text: 'You spend the day fixing a website for a coffee shop, using their free wifi.' },
    mechanic: { pay: [160, 260], text: 'You spend the day fixing cars at the local garage.' },
    student: { pay: [80, 140], text: 'You spend the day washing dishes at a diner.' },
  };
  S.jobText = (G) => JOBS[G.occupation].text;
  S.work = function (G) {
    const j = JOBS[G.occupation];
    const pay = U.randInt(j.pay[0], j.pay[1]) * 100;
    G.money += pay;
    const msgs = [M(j.text + ' You earn ' + U.dollars(pay) + '.', 'good')];
    msgs.push(...S.passDay(G, 'wait'));
    return msgs;
  };

  // ---------------------------------------------------------------- random events
  const PART = {
    tires: { item: 'spare tire', items: 'spare tires', broken: 'flat tire', fixVerb: 'change the tire', help: 150 },
    batteries: { item: 'car battery', items: 'car batteries', broken: 'dead battery', fixVerb: 'swap the battery', help: 180 },
    belts: { item: 'fan belt', items: 'fan belts', broken: 'broken fan belt', fixVerb: 'replace the fan belt', help: 60 },
  };
  S.PART = PART;

  function randomMember(G, excludeLeader) {
    const a = S.alive(G).filter((p) => !excludeLeader || p !== G.party[0]);
    return a.length ? U.pick(a) : null;
  }

  function loseDay(G, text) {
    return { kind: 'msg', text: text + ' Lose 1 day.', tone: 'bad', after: S.passDay(G, 'wait') };
  }

  function burnGas(G, miles) {
    const g = Math.min(G.gas, miles / S.mpg(G));
    G.gas = Math.max(0, Math.round((G.gas - g) * 100) / 100);
    return g;
  }

  function stealSomething(G) {
    const options = [];
    if (G.food > 20) options.push(() => { const n = Math.max(5, Math.round(G.food * U.randRange(0.1, 0.3))); G.food -= n; return n + ' pounds of food'; });
    if (G.clothing > 0) options.push(() => { const n = Math.min(G.clothing, U.randInt(1, 3)); G.clothing -= n; return n + U.plural(n, ' set', ' sets') + ' of clothing'; });
    if (G.bullets >= 10) options.push(() => { const n = Math.min(G.bullets, U.randInt(1, 3) * 10); G.bullets -= n; return n + ' bullets'; });
    if (G.tires > 0) options.push(() => { G.tires--; return 'a spare tire'; });
    if (G.batteries > 0) options.push(() => { G.batteries--; return 'a car battery'; });
    if (G.gas > 4) options.push(() => { const n = Math.round(Math.min(G.gas - 1, U.randInt(3, 6))); G.gas -= n; return n + ' gallons of gas (siphoned)'; });
    if (G.money > 5000) options.push(() => { const n = Math.min(G.money, U.randInt(2, 8) * 1000); G.money -= n; return U.dollars(n) + ' in cash'; });
    if (!options.length) return null;
    return U.pick(options)();
  }

  const EVENTS = [
    { id: 'flat', w: (G, c) => 5 * c.rel * c.condF * (c.reg === 'idaho' ? 1.3 : c.reg === 'wyoming' ? 1.2 : 1),
      run: (G) => ({ kind: 'breakdown', part: 'tires', text: U.pick(['You ran over a nail.', 'You hit a deep pothole.', 'You drove over a sharp rock.', 'Your tire blew out.']) + ' You have a flat tire.' }) },
    { id: 'battery', w: (G, c) => 2.5 * c.rel * c.condF * (c.tc === 'cold' || c.tc === 'verycold' ? 2.2 : 1),
      run: () => ({ kind: 'breakdown', part: 'batteries', text: 'Your car won\'t start. The battery is dead.' }) },
    { id: 'belt', w: (G, c) => 2.5 * c.rel * c.condF * (c.tc === 'hot' || c.tc === 'veryhot' ? 1.8 : 1),
      run: () => ({ kind: 'breakdown', part: 'belts', text: 'You hear a loud squeal and a snap. Your fan belt broke.' }) },
    { id: 'overheat', w: (G, c) => (c.tc === 'veryhot' ? 6 : c.tc === 'hot' ? 3.5 : 0.3) * c.rel,
      run: (G) => { G.slowNext = 0.5; G.carCond = Math.max(0, G.carCond - 3); return { kind: 'msg', text: 'Your engine overheated. You wait by the road for it to cool down. You lose half a day.', tone: 'bad' }; } },
    { id: 'checkengine', w: (G, c) => 1.5 * c.condF,
      run: (G) => { G.carCond = Math.max(0, G.carCond - 4); return { kind: 'msg', text: 'Your check engine light came on. You decide to ignore it, like everyone does.' }; } },
    { id: 'deer', w: (G, c) => (c.reg === 'forest' || c.reg === 'plains' ? 3 : 2),
      run: (G) => { const d = U.randInt(10, 18); G.carCond = Math.max(0, G.carCond - d); return { kind: 'msg', text: 'A deer jumped in front of your car! You swerved but clipped it. The deer ran off. Your car was damaged.', tone: 'bad' }; } },
    { id: 'ticket', w: (G) => ({ steady: 0.3, strenuous: 3, grueling: 7 })[G.pace],
      run: (G) => {
        G.stats.tickets++;
        const fine = U.randInt(12, 28) * 1000;
        if (G.money >= fine) { G.money -= fine; return { kind: 'msg', text: 'You were pulled over for speeding. The fine is ' + U.dollars(fine) + '.', tone: 'bad' }; }
        return loseDay(G, 'You were pulled over for speeding, but you can\'t pay the ' + U.dollars(fine) + ' fine. You spend a day doing community service.');
      } },
    { id: 'wrongturn', w: (G) => (G.occupation === 'engineer' ? 1.0 : 3.5),
      run: (G) => { burnGas(G, U.randInt(30, 60)); return loseDay(G, 'Your phone lost signal and you took a wrong turn. It took hours to find the road again.'); } },
    { id: 'construction', w: () => 3,
      run: (G) => { G.slowNext = 0.5; return { kind: 'msg', text: U.pick(['Road construction! You wait in a long line behind a flagger.', 'The road is down to one lane for repaving.']) + ' You lose half a day.', tone: 'bad' }; } },
    { id: 'thief', w: () => 2,
      run: (G) => { const s = stealSomething(G); return s ? { kind: 'msg', text: 'A thief broke into your car last night and stole ' + s + '.', tone: 'bad' } : null; } },
    { id: 'abandoned', w: () => 2,
      run: (G) => {
        if (U.chance(0.25)) return { kind: 'msg', text: 'You find an abandoned car by the side of the road. It has been picked clean.' };
        const found = [];
        const tries = U.randInt(1, 2);
        const opts = [
          () => { const g = Math.min(U.randInt(2, 5), Math.floor(S.capacity(G) - G.gas)); if (g > 0) { G.gas += g; return g + ' gallons of gas'; } return null; },
          () => { if (G.tires < 3) { G.tires++; return 'a spare tire'; } return null; },
          () => { if (G.belts < 3) { G.belts++; return 'a fan belt'; } return null; },
          () => { const n = U.randInt(1, 3); G.clothing += n; return n + U.plural(n, ' set', ' sets') + ' of clothing'; },
          () => { const n = U.randInt(1, 3) * 10; G.bullets += n; return n + ' bullets'; },
          () => { const n = Math.min(U.randInt(10, 40), S.cargo(G) - G.food); if (n > 0) { G.food += n; return n + ' pounds of canned food'; } return null; },
        ];
        for (let i = 0; i < tries; i++) { const r = U.pick(opts)(); if (r && found.indexOf(r) < 0) found.push(r); }
        if (!found.length) return { kind: 'msg', text: 'You find an abandoned car by the side of the road. There is nothing useful inside.' };
        return { kind: 'msg', text: 'You find an abandoned car by the side of the road. You salvage ' + U.listJoin(found) + '.', tone: 'good' };
      } },
    { id: 'gasstation', w: (G, c) => (c.reg === 'plains' ? 1.5 : 4.5),
      run: (G) => ({ kind: 'gasStation', price: Math.round(S.gasPrice(G) * U.randRange(1.25, 1.6)) }) },
    { id: 'hitchhiker', w: (G) => (S.car(G).seats > S.alive(G).length ? 1.6 : 0),
      run: () => ({ kind: 'hitchhiker', pay: U.randInt(2, 6) * 1000 }) },
    { id: 'leftbehind', w: (G) => (S.alive(G).length >= 2 ? 1.2 : 0),
      run: (G) => { const p = randomMember(G, true); if (!p) return null; burnGas(G, 30); G.slowNext = 0.5; return { kind: 'msg', text: 'Oops! You left ' + p.name + ' behind at a gas station. You drive back to get them. You lose half a day.', tone: 'bad' }; } },
    { id: 'spoil', w: (G, c) => (G.food > 30 ? (c.tc === 'veryhot' ? 4 : c.tc === 'hot' ? 2.5 : 0.5) : 0),
      run: (G) => { const n = Math.max(5, Math.round(G.food * U.randRange(0.08, 0.2))); G.food -= n; return { kind: 'msg', text: 'The ice in your cooler melted. ' + n + ' pounds of food spoiled.', tone: 'bad' }; } },
    { id: 'hail', w: (G, c) => ((c.reg === 'plains' || c.reg === 'platte') && c.month >= 3 && c.month <= 6 ? 2 : 0.2),
      run: (G) => { G.carCond = Math.max(0, G.carCond - U.randInt(6, 12)); return { kind: 'msg', text: 'A hailstorm pounded your car with ice the size of golf balls. Your car was damaged.', tone: 'bad' }; } },
    { id: 'tornado', w: (G, c) => ((c.reg === 'plains' || c.reg === 'platte') && c.month >= 3 && c.month <= 6 ? 1.5 : 0),
      run: (G) => loseDay(G, 'Tornado warning! Sirens are blaring. You take shelter in a gas station basement until it passes.') },
    { id: 'dust', w: (G, c) => ((c.reg === 'wyoming' || c.reg === 'idaho') && c.month >= 5 && c.month <= 8 ? 1.5 : 0),
      run: (G) => { G.slowNext = 0.6; return { kind: 'msg', text: 'A dust storm blows across the road. You can barely see. You lose part of a day.', tone: 'bad' }; } },
    { id: 'wildfire', w: (G, c) => ((c.reg === 'idaho' || c.reg === 'forest' || c.reg === 'oregon') && c.month >= 6 && c.month <= 8 ? 1.5 : 0),
      run: (G) => { burnGas(G, U.randInt(40, 70)); return loseDay(G, 'A wildfire has closed the road ahead. You take a long detour through the smoke.'); } },
    { id: 'cattle', w: (G, c) => (c.reg === 'platte' || c.reg === 'wyoming' ? 2 : 0.3),
      run: (G) => { G.slowNext = 0.6; return { kind: 'msg', text: 'A cattle drive is blocking the road. Hundreds of cows wander past your car. You lose part of a day.' }; } },
    { id: 'fog', w: (G, c) => (c.reg === 'forest' || c.reg === 'oregon' ? 2 : 0.8),
      run: (G) => { G.slowNext = 0.7; return { kind: 'msg', text: 'Heavy fog. You creep along the road with your headlights on.' }; } },
    { id: 'berries', w: (G, c) => (c.month >= 5 && c.month <= 8 ? 1.5 : 0.3),
      run: (G) => {
        const n = Math.min(U.randInt(10, 30), S.cargo(G) - G.food);
        if (n <= 0) return null;
        G.food += n; G.noFoodWarned = false;
        return { kind: 'msg', text: 'You find a patch of wild berries by the road. You pick ' + n + ' pounds.', tone: 'good' };
      } },
    { id: 'arewethereyet', w: (G) => (S.alive(G).length >= 2 ? 1.2 : 0),
      run: (G) => { const p = randomMember(G, true); return p ? { kind: 'msg', text: p.name + ' asks "Are we there yet?" for the ' + U.fmtNum(U.randInt(12, 60) * 10) + 'th time.' } : null; } },
    { id: 'samaritan', w: () => 1,
      run: (G) => {
        const r = U.randInt(0, 2);
        if (r === 0) { const g = Math.min(4, Math.floor(S.capacity(G) - G.gas)); if (g > 0) { G.gas += g; return { kind: 'msg', text: 'A friendly trucker shares ' + g + ' gallons of diesel... wait, gas. Lucky you!', tone: 'good' }; } }
        if (r === 1) { G.carCond = Math.min(100, G.carCond + 10); return { kind: 'msg', text: 'A retired mechanic at a rest stop tunes up your engine for free. Your car runs better.', tone: 'good' }; }
        const n = Math.min(25, S.cargo(G) - G.food);
        if (n > 0) { G.food += n; G.noFoodWarned = false; return { kind: 'msg', text: 'A church group at a rest stop gives you ' + n + ' pounds of sandwiches.', tone: 'good' }; }
        return null;
      } },
    { id: 'attraction', w: () => 1.2,
      run: (G) => {
        const reg = S.regionId(G);
        const spots = {
          plains: 'the World\'s Largest Ball of Twine', platte: 'Carhenge - Stonehenge built out of old cars',
          wyoming: 'a giant jackalope statue', mountain: 'a scenic overlook', idaho: 'the Idaho Potato Museum',
          forest: 'a scenic overlook', oregon: 'a giant wooden cowboy', hood: 'a roadside waterfall',
        };
        G.slowNext = 0.8;
        S.alive(G).forEach((p) => { p.health = Math.min(100, p.health + 3); });
        return { kind: 'msg', text: 'You stop to see ' + (spots[reg] || 'a roadside attraction') + '. Everyone\'s spirits are lifted.', tone: 'good' };
      } },
    { id: 'sushi', w: (G) => (S.alive(G).length ? 0.8 : 0),
      run: (G) => {
        const p = U.pick(S.alive(G).filter((x) => !x.ill));
        if (!p) return null;
        const m = S.makeSick(G, p, S.illness('foodpoison'));
        return { kind: 'msg', text: p.name + ' ate gas station sushi. ' + m.text, tone: 'ill' };
      } },
  ];
  S.EVENTS = EVENTS;

  S.eventContext = function (G) {
    const car = S.car(G);
    return {
      rel: car.rel * (G.occupation === 'mechanic' ? 0.75 : 1),
      condF: 1 + (100 - G.carCond) / 80,
      reg: S.regionId(G),
      tc: S.tempClass(G.weather),
      month: U.dateParts(G.day).month,
    };
  };

  S.rollEvent = function (G, force) {
    if (!force && !U.chance(0.38)) return null;
    const c = S.eventContext(G);
    for (let tries = 0; tries < 4; tries++) {
      const ev = U.weighted(EVENTS, (e) => e.w(G, c));
      if (!ev) return null;
      const r = ev.run(G);
      if (r) { r.id = ev.id; return r; }
    }
    return null;
  };

  // ---------------------------------------------------------------- breakdowns
  S.fixWithPart = function (G, part, lostDay) {
    G[part] = Math.max(0, G[part] - 1);
    G.stats.breakdowns++;
    if (part === 'batteries') G.carCond = Math.min(100, G.carCond + 2);
    if (lostDay) return { ok: true, msgs: S.passDay(G, 'wait') };
    return { ok: true, msgs: [] };
  };

  S.patchChance = (G) => (G.occupation === 'mechanic' ? 0.75 : 0.45);
  S.patchAttempt = function (G, part) {
    const ok = U.chance(S.patchChance(G));
    const p = PART[part];
    const msgs = [];
    if (ok) {
      G.stats.breakdowns++;
      G.carCond = Math.max(0, G.carCond - 3);
      msgs.push(M({ tires: 'You patched the tire with a plug kit. It should hold.', batteries: 'A little cleaning of the terminals and the battery comes back to life.', belts: 'You rigged a temporary belt out of duct tape and zip ties. It works!' }[part], 'good'));
    } else msgs.push(M('You tried all day, but you couldn\'t fix the ' + p.broken + '.', 'bad'));
    msgs.push(...S.passDay(G, 'wait'));
    return { ok, msgs };
  };

  S.waitForHelp = function (G, part) {
    const p = PART[part];
    const msgs = [];
    let ok = false;
    if (U.chance(0.5)) {
      const cost = Math.round(p.help * 100 * S.priceMult(G));
      if (G.money >= cost) {
        G.money -= cost;
        ok = true;
        msgs.push(M('A passing driver stops and sells you a ' + p.item + ' for ' + U.dollars(cost) + '. Together you get the car running.', 'good'));
      } else if (U.chance(0.6)) {
        ok = true;
        msgs.push(M('A kind stranger stops and fixes your ' + p.broken + ' for free.', 'good'));
      } else msgs.push(M('A driver stops, but you can\'t afford the part they have. They drive off.', 'bad'));
    } else msgs.push(M('You wait all day. Nobody stops to help.', 'bad'));
    if (ok) G.stats.breakdowns++;
    msgs.push(...S.passDay(G, 'wait'));
    return { ok, msgs };
  };

  S.towCost = (G) => Math.round(CFG.towCost * S.priceMult(G));
  S.tow = function (G, part) {
    const cost = S.towCost(G);
    if (G.money < cost) return { ok: false, msgs: [M('You can\'t afford a tow truck.', 'bad')] };
    G.money -= cost;
    G.stats.breakdowns++;
    const msgs = [M('A tow truck hauls you to a garage. The ' + PART[part].broken + ' is fixed. It cost ' + U.dollars(cost) + '.')];
    msgs.push(...S.passDay(G, 'wait'));
    return { ok: true, msgs };
  };

  // ---------------------------------------------------------------- out of gas
  S.walkForGas = function (G) {
    const msgs = [];
    const days = U.randInt(1, 2);
    const price = Math.round(S.gasPrice(G) * 1.5);
    const gal = Math.min(5, Math.floor(G.money / price), Math.floor(S.capacity(G) - G.gas));
    msgs.push(M('You walk ' + (days === 1 ? 'all day' : 'for two days') + ' to reach a gas station.'));
    for (let i = 0; i < days; i++) {
      msgs.push(...S.passDay(G, 'wait'));
      if (S.isOver(G)) return { msgs };
    }
    if (gal > 0) {
      G.money -= gal * price;
      G.gas += gal;
      msgs.push(M('You buy ' + gal + ' gallons at ' + U.money(price) + ' a gallon and carry them back to the car.', 'good'));
    } else msgs.push(M('You can\'t afford any gas. You walk back empty-handed.', 'bad'));
    return { msgs };
  };

  S.flagDown = function (G) {
    const msgs = [];
    if (U.chance(0.5)) {
      const gal = Math.min(U.randInt(2, 4), Math.floor(S.capacity(G) - G.gas));
      const cost = gal * 600;
      if (G.money >= cost && U.chance(0.6)) {
        G.money -= cost;
        G.gas += gal;
        msgs.push(M('A driver stops and sells you ' + gal + ' gallons of gas for ' + U.dollars(cost) + '.', 'good'));
      } else {
        G.gas += gal;
        msgs.push(M('A friendly driver stops and gives you ' + gal + ' gallons of gas for free!', 'good'));
      }
    } else msgs.push(M('You wave at cars all day. Nobody stops.', 'bad'));
    msgs.push(...S.passDay(G, 'wait'));
    return { msgs };
  };

  S.assistCost = (G) => Math.round(9000 * S.priceMult(G)) + 5 * S.gasPrice(G) * 2;
  S.callAssistance = function (G) {
    const cost = S.assistCost(G);
    if (G.money < cost) return { msgs: [M('You can\'t afford roadside assistance.', 'bad')] };
    G.money -= cost;
    const gal = Math.min(5, Math.floor(S.capacity(G) - G.gas));
    G.gas += gal;
    return { msgs: [M('A roadside assistance truck brings you ' + gal + ' gallons of gas. It cost ' + U.dollars(cost) + '.')] };
  };

  S.buyGas = function (G, gal, price) {
    gal = Math.max(0, Math.min(gal, Math.floor(S.capacity(G) - G.gas), Math.floor(G.money / price)));
    G.gas += gal;
    G.money -= gal * price;
    return gal;
  };

  S.pickUpHitchhiker = function (G, pay) {
    G.money += pay;
    const msgs = [M('The hitchhiker, a friendly guitar player, pays you ' + U.dollars(pay) + ' and sings road songs all day.', 'good')];
    if (U.chance(0.25)) {
      const s = stealSomething(G);
      if (s) msgs.push(M('When you wake up the next morning, the hitchhiker is gone - and so is ' + s + '!', 'bad'));
    }
    return msgs;
  };

  // ---------------------------------------------------------------- rivers
  S.riverConditions = function (G) {
    const r = S.node(G.node).river;
    const m = U.dateParts(G.day).month;
    let d = U.randRange(r.depth[0], r.depth[1]);
    if (m >= 3 && m <= 5) d *= 1.25; // spring rain & snowmelt
    d += G.wetness * 0.35;
    G.river = { depth: Math.max(0.1, Math.round(d * 10) / 10), length: U.randInt(r.length[0], r.length[1]) };
  };

  S.waitAtRiver = function (G) {
    const msgs = S.passDay(G, 'wait');
    const r = G.river;
    let d = r.depth * U.randRange(0.62, 0.95);
    if (G.weather.precip === 'rain') d += 0.3;
    if (G.weather.precip === 'storm') d += 0.7;
    r.depth = Math.max(0.1, Math.round(d * 10) / 10);
    return msgs;
  };

  S.fordRisk = (G) => G.river.depth * S.car(G).wade;

  function loseSupplies(G, frac) {
    const lost = [];
    const f = Math.round(G.food * frac * U.randRange(0.7, 1.2));
    if (f > 0) { G.food = Math.max(0, G.food - f); lost.push(f + ' pounds of food'); }
    const cl = Math.min(G.clothing, Math.round(U.randRange(0, 4) * frac * 2));
    if (cl > 0) { G.clothing -= cl; lost.push(cl + U.plural(cl, ' set', ' sets') + ' of clothing'); }
    const b = Math.min(G.bullets, Math.round((G.bullets * frac) / 10) * 10);
    if (b > 0) { G.bullets -= b; lost.push(b + ' bullets'); }
    if (frac >= 0.3) {
      for (const k of ['tires', 'batteries', 'belts']) {
        if (G[k] > 0 && U.chance(0.4)) { G[k]--; lost.push('a ' + PART[k].item); }
      }
    }
    return lost;
  }

  S.fordRiver = function (G) {
    const e = S.fordRisk(G);
    const msgs = [];
    const r = U.rand();
    const swept = (drownChance) => {
      const lost = loseSupplies(G, U.randRange(0.3, 0.55));
      G.carCond = Math.max(0, G.carCond - U.randInt(20, 30));
      msgs.push(M('The water lifted your car and pushed it downstream! You finally drag it onto the far bank.', 'bad'));
      if (lost.length) msgs.push(M('Lost: ' + U.listJoin(lost) + '.', 'bad'));
      if (U.chance(drownChance)) {
        const p = randomMember(G, true) || S.leader(G);
        if (p && p.alive) {
          const d = S.kill(G, p, 'drowning');
          d.text = p.name + ' was swept away and drowned.';
          msgs.push(d);
        }
      }
      msgs.push(...S.passDay(G, 'wait'));
    };
    const stall = (dmg) => {
      G.carCond = Math.max(0, G.carCond - dmg);
      msgs.push(M('Water got sucked into the engine and it stalled halfway across. It took a day to push the car out and dry it off.', 'bad'));
      msgs.push(...S.passDay(G, 'wait'));
    };
    let outcome = 'safe';
    if (e < 0.5) {
      msgs.push(M('You splash across the flooded road safely.', 'good'));
    } else if (e < 1.0) {
      if (r < 0.35) { stall(8); outcome = 'stall'; }
      else if (r < 0.6) {
        const lost = loseSupplies(G, U.randRange(0.08, 0.18));
        msgs.push(M('You made it across, but water leaked into the car.' + (lost.length ? ' Ruined: ' + U.listJoin(lost) + '.' : ''), 'bad'));
        outcome = 'wet';
      } else msgs.push(M('Water sprays everywhere, but you make it across.', 'good'));
    } else if (e < 2.0) {
      if (r < 0.42) { swept(0.3); outcome = 'swept'; }
      else if (r < 0.72) { stall(15); outcome = 'stall'; }
      else { msgs.push(M('Your car made it across - just barely.', 'good')); outcome = 'barely'; }
    } else if (r < 0.7) { swept(0.5); outcome = 'swept'; }
    else { msgs.push(M('Somehow, your car made it across. Everyone is shaking.', 'good')); outcome = 'barely'; }
    G.crossed = true;
    msgs.outcome = outcome;
    return msgs;
  };

  S.tollBridge = function (G) {
    const cost = S.node(G.node).river.toll;
    G.money -= cost;
    const msgs = [M('You pay the ' + U.dollars(cost) + ' toll and cross the bridge.')];
    if (U.chance(0.3)) {
      msgs.push(M('Traffic on the bridge is backed up for miles. You lose a day.', 'bad'));
      msgs.push(...S.passDay(G, 'wait'));
    }
    G.crossed = true;
    return msgs;
  };

  S.detourMiles = function (G) {
    const r = S.node(G.node).river;
    if (!G.river.detour) G.river.detour = U.randInt(r.detour[0], r.detour[1]);
    return G.river.detour;
  };
  S.detour = function (G) {
    const r = S.node(G.node).river;
    const miles = S.detourMiles(G);
    burnGas(G, miles);
    G.carCond = Math.max(0, G.carCond - 1);
    const msgs = [M('You ' + r.detourName + '. It adds ' + miles + ' miles.')];
    for (let i = 0; i < r.detourDays; i++) {
      msgs.push(...S.passDay(G, 'travel'));
      if (S.isOver(G)) break;
    }
    G.crossed = true;
    return msgs;
  };

  // ---------------------------------------------------------------- the end of the trail
  S.barlow = function (G) {
    G.money -= CFG.barlowToll;
    G.slowNext = 1;
    S.depart(G, 0);
  };

  S.gorgeHit = function (G, kind) {
    const out = [];
    const dmg = { rock: [10, 16], car: [14, 22], deer: [8, 14], pothole: [4, 8], rail: [5, 9], truck: [14, 22] }[kind] || [6, 10];
    G.carCond = Math.max(0, G.carCond - U.randInt(dmg[0], dmg[1]));
    const r = U.rand();
    if ((kind === 'rock' || kind === 'pothole') && r < 0.35) {
      if (G.tires > 0) { G.tires--; out.push('Flat tire! You used a spare.'); }
      else { G.carCond = Math.max(0, G.carCond - 8); out.push('Flat tire! No spare - you limp on.'); }
    } else if ((kind === 'car' || kind === 'truck' || kind === 'deer') && r < 0.4) {
      const p = randomMember(G, false);
      if (p) { p.health = Math.max(1, p.health - U.randInt(10, 20)); out.push(p.name + ' was hurt!'); }
    } else if (r < 0.7 && G.food > 10) {
      const n = Math.max(5, Math.round(G.food * U.randRange(0.05, 0.12)));
      G.food -= n;
      out.push('Groceries went flying! Lost ' + n + ' lbs of food.');
    } else out.push('Your car was damaged!');
    return out;
  };

  S.finishGorge = function (G) {
    const msgs = [];
    G.segDone = G.segMiles;
    G.miles += G.segMiles;
    if (G.carCond <= 0) {
      const cost = Math.min(G.money, S.towCost(G));
      G.money -= cost;
      msgs.push(M('Your car finally gave out. A tow truck hauled you the rest of the way for ' + U.dollars(cost) + '.', 'bad'));
    }
    msgs.push(...S.passDay(G, 'travel'));
    return msgs;
  };

  // ---------------------------------------------------------------- hunting & fishing
  S.huntRegion = (G) => S.regionId(G);
  S.scarcity = (G) => G.scarcity[S.huntRegion(G)] || 0;
  S.finishHunt = function (G, lbs, bulletsUsed) {
    G.bullets = Math.max(0, G.bullets - bulletsUsed);
    const reg = S.huntRegion(G);
    if (lbs > 0) G.scarcity[reg] = Math.min(0.75, (G.scarcity[reg] || 0) + 0.25);
    const room = Math.max(0, S.cargo(G) - G.food);
    const carried = Math.min(lbs, CFG.carryLimit, room);
    G.food += carried;
    if (carried > 0) G.noFoodWarned = false;
    G.stats.hunted += carried;
    const msgs = S.passDay(G, 'hunt');
    return { carried, room, msgs };
  };

  S.finishFishing = function (G, lbs) {
    const room = Math.max(0, S.cargo(G) - G.food);
    const kept = Math.min(lbs, room);
    G.food += kept;
    if (kept > 0) G.noFoodWarned = false;
    G.stats.fished += kept;
    const msgs = S.passDay(G, 'fish');
    return { kept, msgs };
  };

  // ---------------------------------------------------------------- trading
  const TRADE = [
    { key: 'food', unit: 'pounds of food', one: 'pound of food', value: 200, qty: [20, 100], step: 5 },
    { key: 'clothing', unit: 'sets of clothing', one: 'set of clothing', value: 2500, qty: [1, 4], step: 1 },
    { key: 'bullets', unit: 'bullets', one: 'bullet', value: 90, qty: [20, 80], step: 10 },
    { key: 'tires', unit: 'spare tires', one: 'spare tire', value: 9000, qty: [1, 1], step: 1, max: 3 },
    { key: 'batteries', unit: 'car batteries', one: 'car battery', value: 12000, qty: [1, 1], step: 1, max: 3 },
    { key: 'belts', unit: 'fan belts', one: 'fan belt', value: 2500, qty: [1, 2], step: 1, max: 3 },
    { key: 'gas', unit: 'gallons of gas', one: 'gallon of gas', value: 400, qty: [3, 10], step: 1 },
    { key: 'cans', unit: 'gas cans', one: 'gas can', value: 2500, qty: [1, 1], step: 1, max: 6 },
  ];
  const TRADERS = ['A trucker', 'A family in an RV', 'A rancher', 'A college kid on a road trip', 'A retired couple', 'A motorcycle rider', 'A farmer'];

  S.tradesLeft = function (G) {
    if (G.tradeDay !== G.day) { G.tradeDay = G.day; G.trades = 0; }
    return Math.max(0, 2 - G.trades);
  };

  S.tradeOffer = function (G) {
    S.tradesLeft(G);
    G.trades++;
    const want = U.pick(TRADE);
    let give = U.pick(TRADE);
    let guard = 0;
    while (give.key === want.key && guard++ < 20) give = U.pick(TRADE);
    const wq = snap(U.randInt(want.qty[0], want.qty[1]), want.step);
    const target = wq * want.value * U.randRange(0.6, 1.4);
    let gq = Math.max(1, snap(Math.round(target / give.value), give.step));
    if (give.max) gq = Math.min(gq, give.max);
    return {
      who: U.pick(TRADERS),
      want: { key: want.key, unit: wq === 1 ? want.one : want.unit, units: want.unit, one: want.one, qty: wq },
      give: { key: give.key, unit: gq === 1 ? give.one : give.unit, units: give.unit, one: give.one, qty: gq },
    };
  };
  function snap(v, step) { return Math.max(step, Math.round(v / step) * step); }

  S.tradeProblem = function (G, o) {
    if ((G[o.want.key] || 0) < o.want.qty) return 'You don\'t have enough ' + o.want.units.replace(/^(sets|pounds|gallons) of /, '') + ' to trade.';
    const k = o.give.key;
    if (k === 'gas' && G.gas + o.give.qty > S.capacity(G) + (o.want.key === 'cans' ? -5 * o.want.qty : 0)) return 'Your tank and gas cans can\'t hold that much gas.';
    if (k === 'food' && G.food + o.give.qty > S.cargo(G)) return 'You don\'t have room in the car for that much food.';
    const t = TRADE.find((x) => x.key === k);
    if (t.max && G[k] + o.give.qty > t.max) return 'You can\'t carry any more ' + t.unit + '.';
    if (o.want.key === 'cans' && G.gas > S.capacity(G) - 5 * o.want.qty) return 'Your gas cans are full of gas. You can\'t trade them away.';
    return '';
  };

  S.acceptTrade = function (G, o) {
    const p = S.tradeProblem(G, o);
    if (p) return p;
    G[o.want.key] -= o.want.qty;
    G[o.give.key] += o.give.qty;
    if (o.give.key === 'food') G.noFoodWarned = false;
    return '';
  };

  // ---------------------------------------------------------------- scoring
  S.score = function (G) {
    const alive = S.alive(G);
    const label = S.partyHealth(G);
    const per = { good: 500, fair: 400, poor: 300, 'very poor': 200 }[label];
    const rows = [];
    rows.push([alive.length + ' ' + U.plural(alive.length, 'person', 'people') + ' in ' + label + ' health', alive.length * per]);
    rows.push(['1 car in ' + S.carLabel(G.carCond) + ' condition', 50 + Math.round(G.carCond)]);
    const parts = G.tires + G.batteries + G.belts;
    rows.push([parts + ' spare ' + U.plural(parts, 'part'), parts * 2]);
    rows.push([G.clothing + U.plural(G.clothing, ' set', ' sets') + ' of clothing', G.clothing * 2]);
    rows.push([G.bullets + ' bullets', Math.floor(G.bullets / 50)]);
    rows.push([Math.round(G.food) + ' pounds of food', Math.floor(G.food / 25)]);
    rows.push([Math.floor(G.gas) + ' gallons of gas', Math.floor(G.gas / 5)]);
    rows.push([U.dollars(G.money) + ' cash', Math.floor(G.money / 2500)]);
    const sub = rows.reduce((s, r) => s + r[1], 0);
    const mult = S.occ(G).mult;
    return { rows, sub, mult, total: sub * mult, perPerson: per, label };
  };

  S.rating = (score) => CFG.ratings.find((r) => score >= r.min).name;

  // ---------------------------------------------------------------- persistence
  const SAVE_KEY = 'cartrail.save.v1';
  S.save = function (G) { if (G && !S.isOver(G) && !G.finished) U.store.set(SAVE_KEY, G); };
  S.load = function () {
    const G = U.store.get(SAVE_KEY, null);
    if (!G || G.v !== 1 || !Array.isArray(G.party) || !G.party.length || !CFG.cars[G.carId] || !S.node(G.node)) return null;
    if (G.next && !S.node(G.next)) return null;
    return G;
  };
  S.clearSave = () => U.store.remove(SAVE_KEY);

  const TOP_KEY = 'cartrail.topten.v1';
  S.topTen = function () {
    const t = U.store.get(TOP_KEY, null);
    if (Array.isArray(t) && t.length && t.every((e) => e && typeof e.name === 'string' && typeof e.score === 'number')) return t.slice(0, 10);
    return CFG.defaultTopTen.map((e) => Object.assign({}, e));
  };
  S.qualifies = (score) => { const t = S.topTen(); return t.length < 10 || score > t[t.length - 1].score; };
  S.addTopTen = function (name, score, occ) {
    const t = S.topTen();
    t.push({ name, score, occ });
    t.sort((a, b) => b.score - a.score);
    U.store.set(TOP_KEY, t.slice(0, 10));
  };
  S.resetTopTen = () => U.store.remove(TOP_KEY);

  const TOMB_KEY = 'cartrail.tombstones.v1';
  S.tombstones = function () {
    const t = U.store.get(TOMB_KEY, []);
    return Array.isArray(t) ? t.filter((x) => x && typeof x.mile === 'number' && typeof x.name === 'string') : [];
  };
  S.addTombstone = function (mile, name, epitaph) {
    const t = S.tombstones().filter((x) => Math.abs(x.mile - mile) > 20);
    t.push({ mile: Math.round(mile), name, epitaph: epitaph || '' });
    U.store.set(TOMB_KEY, t.slice(-12));
  };
  S.clearTombstones = () => U.store.remove(TOMB_KEY);
  // Tombstones passed while driving from mile a (exclusive) to b (inclusive).
  S.tombstonesBetween = (a, b) => S.tombstones().filter((t) => t.mile > a && t.mile <= b);

  CT.sim = S;
})(typeof window !== 'undefined' ? window : globalThis);
