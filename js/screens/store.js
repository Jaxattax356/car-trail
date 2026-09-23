/* The Car Trail - stores (Oregon Trail style shopping cart), the auto repair
 * shop, urgent care and odd jobs in towns.
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

  function unitPrice(G, it, mult) {
    return it.id === 'gas' ? S.gasPrice(G, mult) : S.itemPrice(G, it, mult);
  }

  function have(G, it) {
    if (it.id === 'ammo') return Math.floor(G.bullets / 20) + ' boxes (' + G.bullets + ')';
    if (it.id === 'gas') return G.gas.toFixed(1) + ' of ' + S.capacity(G);
    return String(Math.round(G[it.key]));
  }

  // opts: {initial, onLeave}
  CT.screens.store = function (opts) {
    const o = opts || {};
    const G = F.G();
    const node = S.node(G.node);
    const mult = o.initial ? 1 : S.priceMult(G);
    const cart = o.cart || {};
    const name = node.store || 'General Store';
    const leave = () => {
      const total = S.cartTotal(G, cart, mult);
      if (o.initial && G.food + (cart.food || 0) <= 0 && !o.warned) {
        E.go(UI.yesNo({
          lines: U.wrap('Mel looks worried. "You haven\'t bought any food! Without food your party will starve. Leave anyway?"', 48),
          onYes: () => { o.warned = true; o.cart = cart; leave(); },
          onNo: () => CT.screens.store(Object.assign(o, { cart })),
        }));
        return;
      }
      if (!S.applyCart(G, cart, mult)) { CT.sound.play('error'); return; }
      if (total > 0) CT.sound.play('cash');
      F.save();
      o.onLeave();
    };
    const s = UI.menu({
      y: 12,
      intro: null,
      spacing: 11,
      indent: 16,
      prompt: null,
      options: CFG.items.map((it) => ({ label: it.name, action: () => itemScreen(it) })).concat([{ label: 'Leave the store', action: leave }]),
      header(ctx, y) {
        UI.center(ctx, name, y, UI.C.yellow);
        UI.center(ctx, node.name + '   ' + U.formatDate(G.day), y + 10, UI.C.gray);
        UI.rect(ctx, 12, y + 22, 296, 1, UI.C.white);
        UI.text(ctx, 'Item', 34, y + 26, UI.C.cyan);
        UI.text(ctx, 'Price', 164, y + 26, UI.C.cyan, { align: 'right' });
        UI.text(ctx, 'Buy', 194, y + 26, UI.C.cyan, { align: 'right' });
        UI.text(ctx, 'Cost', 252, y + 26, UI.C.cyan, { align: 'right' });
        UI.text(ctx, 'Have', 262, y + 26, UI.C.cyan);
        return y + 38;
      },
      draw() {},
      footer(ctx) {
        // columns for each item row (menu rows start at y=50, 11px apart)
        CFG.items.forEach((it, i) => {
          const y = 50 + i * 11;
          const p = unitPrice(G, it, mult);
          const q = cart[it.id] || 0;
          UI.text(ctx, U.money(p), 164, y, UI.C.white, { align: 'right' });
          UI.text(ctx, String(q), 194, y, q ? UI.C.yellow : UI.C.dgray, { align: 'right' });
          UI.text(ctx, U.money(p * q), 252, y, q ? UI.C.white : UI.C.dgray, { align: 'right' });
          UI.text(ctx, have(G, it).split(' ')[0], 262, y, UI.C.gray);
        });
        const total = S.cartTotal(G, cart, mult);
        UI.rect(ctx, 12, 152, 296, 1, UI.C.white);
        UI.text(ctx, 'Total bill:', 164, 158, UI.C.white, { align: 'right' });
        UI.text(ctx, U.money(total), 252, 158, UI.C.yellow, { align: 'right' });
        UI.text(ctx, 'Amount you have:', 164, 168, UI.C.white, { align: 'right' });
        UI.text(ctx, U.money(G.money), 252, 168, UI.C.white, { align: 'right' });
        UI.text(ctx, 'Left after paying:', 164, 178, UI.C.white, { align: 'right' });
        UI.text(ctx, U.money(G.money - total), 252, 178, G.money - total < 0 ? UI.C.red : UI.C.green, { align: 'right' });
        const p = 'Which item would you like to buy? ';
        UI.text(ctx, p, 16, 196);
        if (UI.blink()) UI.rect(ctx, 16 + CT.font.width(p) + 1, 203, 5, 1, UI.C.white);
        UI.center(ctx, E.coarse ? 'Tap "Leave the store" when done' : 'Press SPACE BAR to leave the store', 222, UI.C.gray);
      },
      onBack: leave,
    });
    // SPACE leaves the store (Oregon Trail convention); ENTER still picks a highlighted row.
    const baseKey = s.key;
    s.key = (k) => { if (k === ' ') leave(); else baseKey(k); };
    E.go(s);

    function itemScreen(it) {
      const p = unitPrice(G, it, mult);
      const room = S.itemRoom(G, it, cart);
      const others = S.cartTotal(G, cart, mult) - (cart[it.id] || 0) * p;
      const afford = Math.max(0, Math.floor((G.money - others) / p));
      const max = Math.min(room, afford);
      const lines = [it.name.toUpperCase(), ''].concat(U.wrap(it.desc, 48), [''],
        ['Price: ' + U.money(p) + ' per ' + it.unit + (it.per ? ' (' + it.per + ' bullets)' : ''),
          'You have: ' + have(G, it),
          'In your cart: ' + (cart[it.id] || 0),
          'Most you can buy: ' + max + (room < afford ? ' (all you can carry)' : afford < room ? ' (all you can afford)' : '')]);
      if (it.id === 'gas' && (cart.cans || 0) > 0) lines.push('(includes room in the ' + cart.cans + ' new gas ' + U.plural(cart.cans, 'can') + ')');
      E.go(UI.input({
        lines,
        prompt: 'How many ' + it.units + '?',
        numeric: true,
        max: 4,
        value: cart[it.id] ? String(cart[it.id]) : '',
        allowEmpty: true,
        hint: 'Type a number and press ENTER (ESC = back)',
        onSubmit: (v) => {
          if (v === '') { CT.screens.store(Object.assign(o, { cart })); return; }
          const n = parseInt(v, 10);
          if (!(n >= 0)) return 'Please type a number.';
          if (n > room) return room === 0 ? 'You can\'t carry any more ' + it.units + '.' : 'You only have room for ' + room + ' ' + (room === 1 ? it.unit : it.units) + '.';
          if (others + n * p > G.money) return 'You don\'t have enough money for that many.';
          cart[it.id] = n;
          // shrinking the gas-can order may leave too much gas in the cart
          if (it.id === 'cans' && cart.gas) cart.gas = Math.min(cart.gas, S.itemRoom(G, CFG.itemById.gas, cart));
          CT.sound.play('select');
          CT.screens.store(Object.assign(o, { cart }));
          return null;
        },
        onCancel: () => CT.screens.store(Object.assign(o, { cart })),
      }));
    }
  };

  // ---------------- Auto repair shop ----------------
  CT.screens.repairShop = function (back) {
    const G = F.G();
    const node = S.node(G.node);
    const cost = S.repairCost(G);
    const cond = Math.round(G.carCond);
    const lines = [node.shop || 'Auto Repair', ''].concat(
      U.wrap('The mechanic looks over your ' + S.car(G).name + '. "Your car is in ' + S.carLabel(G.carCond) + ' shape - about ' + cond + '%."', 48), ['']);
    if (G.occupation === 'mechanic') lines.push(...U.wrap('Since you\'re a mechanic, you do the work yourself and only pay for parts: half price!', 48), '');
    if (cond >= 99) {
      E.go(UI.message({ lines: lines.concat(['"She\'s running great. Nothing to fix!"']), onDone: back }));
      return;
    }
    lines.push('A full repair will cost ' + U.money(cost) + '.', 'You have ' + U.money(G.money) + '.');
    const opts = [{ label: 'Fix it up (to 100%) - ' + U.money(cost), disabled: G.money < cost, action: () => { G.money -= cost; G.carCond = 100; CT.sound.play('cash'); F.save(); E.go(UI.message({ lines: ['Your car is as good as it\'s going to get.', 'A better car breaks down less often.'], onDone: back })); } }];
    const half = Math.round(cost / 2);
    if (G.money < cost && G.money >= half && cond < 90) {
      opts.push({ label: 'Just the basics (+' + Math.round((100 - cond) / 2) + '%) - ' + U.money(half), action: () => { G.money -= half; G.carCond = Math.min(100, G.carCond + (100 - G.carCond) / 2); CT.sound.play('cash'); F.save(); back(); } });
    }
    opts.push({ label: 'Leave the shop', action: back });
    E.go(UI.menu({ lines, intro: null, options: opts, onBack: back }));
  };

  // ---------------- Urgent care ----------------
  CT.screens.clinic = function (back) {
    const G = F.G();
    const pts = S.patients(G);
    if (!pts.length) {
      E.go(UI.message({ lines: ['URGENT CARE', '', 'The nurse says everyone in your party', 'looks healthy. "Come back if you need us!"'], onDone: back }));
      return;
    }
    const cost = S.clinicCost(G);
    const lines = ['URGENT CARE', '', 'Patients:'].concat(pts.map((p) => '  ' + p.name + ' - ' + F.personStatus(p)), ['',
      'The doctor can see ' + U.plural(pts.length, 'this patient', 'these patients') + ' for ' + U.money(cost) + '.', 'You have ' + U.money(G.money) + '.']);
    E.go(UI.menu({
      lines,
      intro: null,
      options: [
        { label: 'See the doctor - ' + U.money(cost), disabled: G.money < cost, action: () => { CT.sound.play('cash'); F.messages(S.clinic(G), () => { F.save(); back(); }); } },
        { label: 'Leave', action: back },
      ],
      onBack: back,
    }));
  };

  // ---------------- Town services submenu ----------------
  CT.screens.townServices = function (back) {
    const G = F.G();
    const node = S.node(G.node);
    const again = () => CT.screens.townServices(back);
    E.go(UI.menu({
      header: (ctx, y) => F.statusHeader(ctx, y, G),
      options: [
        { label: 'Visit ' + (node.shop || 'the auto shop'), action: () => CT.screens.repairShop(again) },
        { label: 'Visit the urgent care clinic', action: () => CT.screens.clinic(again) },
        { label: 'Work a day job', action: () => workJob(again) },
        { label: 'Go back', action: back },
      ],
      onBack: back,
    }));
  };

  function workJob(back) {
    const G = F.G();
    E.go(UI.yesNo({
      lines: U.wrap('You can pick up a day of work in town. ' + S.jobText(G).replace('You spend the day', 'You would spend the day') + ' It will take a day. Go to work?', 48),
      onYes: () => F.messages(S.work(G), () => { F.save(); back(); }),
      onNo: back,
    }));
  }
})(typeof window !== 'undefined' ? window : globalThis);
