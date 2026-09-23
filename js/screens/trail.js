/* The Car Trail - the trail menu ("You may: 1. Continue on trail ...") and
 * its sub-screens: supplies, map, pace, rations, rest, trading and talking.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const S = CT.sim;
  const E = CT.engine;
  const CFG = CT.CFG;
  const F = CT.flow;
  const T = CT.TRAIL;

  const back = () => CT.screens.trailMenu();

  CT.screens.trailMenu = function () {
    const G = F.G();
    if (!G) { CT.screens.title(); return; }
    if (S.isOver(G)) { F.gameOver(); return; }
    F.save();
    const node = S.node(G.node);
    const at = G.atNode;
    const town = at && node.type === 'town';
    const opts = [
      { label: 'Continue on trail', action: continueOn },
      { label: 'Check supplies', action: supplies },
      { label: 'Look at map', action: map },
      { label: 'Change pace', action: pace },
      { label: 'Change food rations', action: rations },
      { label: 'Stop to rest', action: rest },
      { label: 'Attempt to trade', action: trade },
    ];
    if (at && T.talk[G.node]) opts.push({ label: 'Talk to people', action: talk });
    if (town) {
      opts.push({ label: 'Buy supplies', action: () => CT.screens.store({ onLeave: back }) });
      opts.push({ label: 'Visit town (repairs, doctor, jobs)', action: () => CT.screens.townServices(back) });
    } else {
      opts.push({ label: 'Hunt for food', action: hunt });
      if (at && node.fish) opts.push({ label: 'Go fishing', action: fish });
    }
    E.go(UI.menu({
      header: (ctx, y) => F.statusHeader(ctx, y, G, at ? node.name : 'On the road - ' + S.milesToNext(G) + ' miles to ' + S.node(G.next).short),
      options: opts,
      spacing: 11,
      onBack: quitPrompt,
      footer(ctx) { UI.center(ctx, 'ESC: save and quit to the title screen', 229, UI.C.dgray); },
    }));
  };

  function quitPrompt() {
    E.go(UI.yesNo({
      lines: ['Your trip will be saved. You can continue', 'it later from the title screen.', '', 'Quit to the title screen?'],
      onYes: () => { F.save(); CT.screens.title(); },
      onNo: back,
    }));
  }

  function continueOn() {
    const G = F.G();
    if (!G.atNode) { CT.screens.travel(); return; }
    const node = S.node(G.node);
    if (node.type === 'river' && !G.crossed) { CT.screens.river(); return; }
    if (node.type === 'end') { CT.screens.finish(); return; }
    if (node.fork) { CT.screens.fork(); return; }
    if (node.final) { CT.screens.dalles(); return; }
    S.depart(G, 0);
    CT.screens.travel();
  }
  CT.screens.continueOn = continueOn;

  function supplies() {
    const G = F.G();
    const car = S.car(G);
    const lines = [
      { t: car.title, c: UI.C.cyan },
      'Condition: ' + S.carLabel(G.carCond) + ' (' + Math.round(G.carCond) + '%)',
      'Gas: ' + G.gas.toFixed(1) + ' of ' + S.capacity(G) + ' gallons (' + S.range(G) + ' mi)',
      'Gas cans: ' + G.cans,
      'Food: ' + Math.round(G.food) + ' pounds (car holds ' + car.cargo + ')',
      'Warm clothing: ' + G.clothing + U.plural(G.clothing, ' set', ' sets'),
      'Bullets: ' + G.bullets,
      'Spare tires: ' + G.tires + '   Batteries: ' + G.batteries + '   Belts: ' + G.belts,
      'Money: ' + U.money(G.money),
      '',
      { t: 'Your party', c: UI.C.cyan },
    ].concat(G.party.map((p, i) => ({ t: p.name + (i === 0 ? ' (driver)' : '') + ': ' + F.personStatus(p), c: !p.alive ? UI.C.dgray : p.ill ? UI.C.yellow : UI.C.white })));
    E.go(UI.message({
      title: 'Your Supplies',
      lines: [],
      draw(ctx) {
        let y = 32;
        lines.forEach((l) => {
          if (typeof l === 'string') UI.text(ctx, l, 16, y);
          else UI.text(ctx, l.t.slice(0, 50), 16, y, l.c);
          y += 10;
        });
      },
      onDone: back,
    }));
  }

  function map() {
    const G = F.G();
    const nextTxt = G.atNode ? 'You are at ' + S.node(G.node).short + '.' : S.milesToNext(G) + ' miles to ' + S.node(G.next).name;
    E.go(UI.message({
      lines: [],
      prompt: '',
      draw(ctx) {
        UI.center(ctx, 'Map of the Car Trail', 6, UI.C.yellow);
        CT.art.map.draw(ctx, 8, 18, G, E.time);
        UI.text(ctx, 'Miles traveled: ' + G.miles, 12, 200);
        UI.text(ctx, nextTxt, 12, 210);
      },
      onDone: back,
    }));
  }

  function pace() {
    const G = F.G();
    E.go(UI.menu({
      lines: ['Change pace', '(currently "' + CFG.paces[G.pace].name + '")', ''].concat(U.wrap('The pace is how long you drive each day. Driving longer covers more miles, but wears out your party and your car.', 48)),
      intro: 'You may choose:',
      options: CFG.paceOrder.map((id) => ({ label: 'a ' + CFG.paces[id].name + ' pace', action: () => { G.pace = id; back(); } }))
        .concat([{ label: 'find out what these mean', action: paceInfo }]),
      onBack: back,
    }));
  }

  function paceInfo() {
    const lines = [];
    CFG.paceOrder.forEach((id) => { lines.push(...U.wrap(CFG.paces[id].name + ' - ' + CFG.paces[id].desc + ' (about ' + CFG.paces[id].miles + ' miles a day)', 48), ''); });
    E.go(UI.message({ lines, onDone: pace }));
  }

  function rations() {
    const G = F.G();
    E.go(UI.menu({
      lines: ['Change food rations', '(currently "' + CFG.rations[G.rations].name + '")', ''].concat(U.wrap('The amount of food the people in your party eat each day can change. These amounts are:', 48)),
      intro: null,
      options: CFG.rationOrder.map((id) => ({ label: CFG.rations[id].name + ' - ' + CFG.rations[id].desc, action: () => { G.rations = id; back(); } })),
      spacing: 12,
      onBack: back,
    }));
  }

  function rest() {
    const G = F.G();
    const node = S.node(G.node);
    if (G.atNode && node.type === 'town') {
      const cost = S.motelCost(G);
      E.go(UI.menu({
        lines: U.wrap('Where would you like to rest? A motel bed helps sick people recover faster.', 48),
        intro: null,
        options: [
          { label: 'Camp at the campground (free)', action: () => restDays(false) },
          { label: 'Stay at the motel (' + U.money(cost) + '/night)', disabled: G.money < cost, action: () => restDays(true) },
          { label: 'Never mind', action: back },
        ],
        onBack: back,
      }));
    } else restDays(false);
  }

  function restDays(motel) {
    const G = F.G();
    E.go(UI.input({
      lines: [motel ? 'How many nights at the motel?' : 'How many days would you like to rest?'],
      prompt: 'Days (1-9):',
      numeric: true,
      max: 1,
      onSubmit: (v) => {
        const n = parseInt(v, 10);
        if (!(n >= 1 && n <= 9)) return 'Please enter a number from 1 to 9.';
        if (motel && G.money < S.motelCost(G) * n) return 'You can only afford ' + Math.floor(G.money / S.motelCost(G)) + ' nights.';
        const msgs = S.rest(G, n, motel);
        msgs.unshift({ text: 'You rest for ' + n + U.plural(n, ' day', ' days') + (motel ? ' at the motel' : '') + '.', tone: 'info' });
        F.messages(msgs, back);
        return null;
      },
      onCancel: back,
    }));
  }

  function trade() {
    const G = F.G();
    if (S.tradesLeft(G) <= 0) {
      E.go(UI.message({ lines: ['Nobody else wants to trade with you today.', '', 'Try again tomorrow.'], onDone: back }));
      return;
    }
    const o = S.tradeOffer(G);
    const haveTxt = (k) => (k === 'gas' ? G.gas.toFixed(1) : String(Math.round(G[k])));
    E.go(UI.yesNo({
      lines: U.wrap(o.who + ' offers to trade you ' + o.give.qty + ' ' + o.give.unit + ' for ' + o.want.qty + ' ' + o.want.unit + '.', 48)
        .concat(['', 'You have ' + haveTxt(o.want.key) + ' ' + (haveTxt(o.want.key) === '1' ? o.want.one : o.want.units) + '.', '', 'Are you willing to trade?']),
      onYes: () => {
        const p = S.acceptTrade(G, o);
        E.go(UI.message({ lines: p ? U.wrap(p, 48) : ['It\'s a deal!'], sound: p ? 'error' : 'cash', onDone: back }));
      },
      onNo: back,
    }));
  }

  function talk() {
    const G = F.G();
    G.talk = G.talk || {};
    const quotes = T.talk[G.node];
    const i = (G.talk[G.node] || 0) % quotes.length;
    G.talk[G.node] = i + 1;
    const [who, what] = quotes[i];
    E.go(UI.message({
      lines: U.wrap(who, 48).concat([''], U.wrap('"' + what + '"', 46).map((l) => ' ' + l)),
      onDone: back,
    }));
  }

  function hunt() {
    const G = F.G();
    if (G.bullets <= 0) {
      E.go(UI.message({ lines: ['You don\'t have any bullets.', '', 'You can buy ammunition in towns.'], onDone: back }));
      return;
    }
    CT.mini.hunt(G, (res) => {
      const r = S.finishHunt(G, res.lbs, res.used);
      const lines = [];
      if (res.lbs <= 0) lines.push('You didn\'t bring anything back.');
      else {
        lines.push(...U.wrap('From the animals you shot, you got ' + res.lbs + ' pounds of meat.', 48));
        if (r.carried < res.lbs) {
          if (r.carried === 0 && r.room === 0) lines.push('', ...U.wrap('However, your car is already full of food. You have to leave it all behind.', 48));
          else lines.push('', ...U.wrap('However, you were only able to carry ' + r.carried + ' pounds back to the car.', 48));
        }
      }
      if (S.scarcity(G) >= 0.5) lines.push('', ...U.wrap('Game is getting scarce around here.', 48));
      E.go(UI.message({ lines, onDone: () => F.messages(r.msgs, back) }));
    });
  }

  function fish() {
    const G = F.G();
    const node = S.node(G.node);
    CT.mini.fish(G, node.fish, (res) => {
      const r = S.finishFishing(G, res.lbs);
      const lines = [];
      if (res.lbs <= 0) lines.push('You didn\'t catch anything today.');
      else {
        lines.push(...U.wrap('You caught ' + res.count + ' ' + U.plural(res.count, 'fish', 'fish') + ' - ' + res.lbs + ' pounds in all.', 48));
        if (r.kept < res.lbs) lines.push('', ...U.wrap('Your car only had room for ' + r.kept + ' pounds.', 48));
      }
      E.go(UI.message({ lines, onDone: () => F.messages(r.msgs, back) }));
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
