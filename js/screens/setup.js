/* The Car Trail - new game setup: occupation, party names, departure month,
 * Honest Hank's used car lot, then Mel's store.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const S = CT.sim;
  const E = CT.engine;
  const CFG = CT.CFG;

  const RANDOM_NAMES = ['Sarah', 'Mike', 'Jess', 'Tyler', 'Ava', 'Omar', 'Priya', 'Luis', 'Kim', 'Noah', 'Zoe', 'Ben',
    'Maya', 'Jake', 'Lily', 'Sam', 'Rosa', 'Dev', 'Emma', 'Leo', 'Nina', 'Carlos', 'Hana', 'Ike', 'June', 'Owen'];

  const setup = { occupation: '', names: [], month: 2 };

  function randomName() {
    const used = setup.names.map((n) => n.toLowerCase());
    const pool = RANDOM_NAMES.filter((n) => used.indexOf(n.toLowerCase()) < 0);
    return U.pick(pool.length ? pool : RANDOM_NAMES);
  }

  CT.screens.setup = function () {
    setup.occupation = '';
    setup.names = [];
    occupationMenu();
  };

  function occupationMenu() {
    E.go(UI.menu({
      lines: ['Many kinds of people made the trip to', 'Oregon.'],
      options: [
        { label: 'Be a software engineer from Boston', action: () => pick('engineer') },
        { label: 'Be an auto mechanic from Detroit', action: () => pick('mechanic') },
        { label: 'Be a college student from Ohio', action: () => pick('student') },
        { label: 'Find out the differences', action: differences },
      ],
      onBack: () => CT.screens.title(),
    }));
  }

  function differences() {
    const o = CFG.occupations;
    E.go(UI.message({
      lines: U.wrap('Traveling to Oregon isn\'t easy! But if you\'re a software engineer, you\'ll have more money for supplies and services than a mechanic or a student.', 48)
        .concat([''], U.wrap('However, the harder you have to try, the more points you deserve! The mechanic earns twice the points of the engineer, and the student earns three times as many.', 48), [''],
          U.wrap('Engineer (' + U.dollars(o.engineer.money) + '): ' + o.engineer.perk, 48),
          U.wrap('Mechanic (' + U.dollars(o.mechanic.money) + '): ' + o.mechanic.perk, 48),
          U.wrap('Student (' + U.dollars(o.student.money) + '): ' + o.student.perk, 48)),
      onDone: occupationMenu,
    }));
  }

  function pick(occ) {
    setup.occupation = occ;
    leaderName();
  }

  function leaderName() {
    E.go(UI.input({
      lines: ['What is the first name of the driver', '(the leader of your party)?'],
      max: 12,
      value: setup.names[0] || '',
      allowEmpty: true,
      hint: 'Type a name and press ENTER (blank = random)',
      onSubmit: (v) => { setup.names[0] = v || randomName(); memberNames(1); },
      onCancel: occupationMenu,
    }));
  }

  function memberNames(idx) {
    if (idx > 4) { confirmNames(); return; }
    E.go(UI.input({
      lines: ['What are the first names of the four', 'other members in your party?', ''].concat(
        [0, 1, 2, 3, 4].map((i) => (i + 1) + '. ' + (i < idx ? setup.names[i] : i === idx ? '<' : ''))),
      prompt: 'Name #' + (idx + 1) + ':',
      max: 12,
      allowEmpty: true,
      hint: 'Type a name and press ENTER (blank = random)',
      onSubmit: (v) => {
        const name = v || randomName();
        setup.names[idx] = name;
        memberNames(idx + 1);
      },
      onCancel: () => (idx > 1 ? memberNames(idx - 1) : leaderName()),
    }));
  }

  function confirmNames() {
    E.go(UI.yesNo({
      lines: ['Your party:', ''].concat(setup.names.map((n, i) => '  ' + (i + 1) + '. ' + n + (i === 0 ? ' (driver)' : '')), ['', 'Are these names correct?']),
      onYes: monthMenu,
      onNo: () => { setup.names = []; leaderName(); },
    }));
  }

  function year() {
    return new Date().getFullYear();
  }

  function monthMenu() {
    E.go(UI.menu({
      lines: U.wrap('It is ' + year() + '. Your trip begins in Independence, Missouri. You must decide which month to leave.', 48),
      options: CFG.startMonths.map((m) => ({ label: U.MONTHS[m], action: () => { setup.month = m; startGame(); } }))
        .concat([{ label: 'Ask for advice', action: advice }]),
      onBack: confirmNames,
    }));
  }

  function advice() {
    E.go(UI.message({
      lines: U.wrap('You attend a public meeting held for "folks with the Oregon road trip fever." You\'re told:', 48)
        .concat([''], U.wrap('If you leave too early, snow and blizzards can close the roads over South Pass and the Blue Mountains. You\'ll need warm clothes.', 48), [''],
          U.wrap('If you leave too late, summer heat will overheat your engine, spoil your food and bring wildfires out west.', 48), [''],
          U.wrap('April and May bring spring floods, so river crossings are deeper. Most folks think late spring is best.', 48)),
      onDone: monthMenu,
    }));
  }

  function startGame() {
    const G = S.newGame({ occupation: setup.occupation, leader: setup.names[0], members: setup.names.slice(1), month: setup.month, year: year() });
    CT.game.G = G;
    E.go(UI.message({
      lines: U.wrap('Before leaving Independence you should buy a car and supplies. You have ' + U.money(G.money) + ' in cash, but you don\'t have to spend it all now.', 48)
        .concat([''], U.wrap('You can buy more supplies in towns along the way, but prices go up the farther west you go - and the towns get farther apart.', 48)),
      onDone: dealership,
    }));
  }

  // ---------------- Honest Hank's Used Cars ----------------
  function dealership() {
    const G = CT.game.G;
    const s = UI.menu({
      y: 116,
      intro: null,
      prompt: 'Which car would you like?',
      options: CFG.carOrder.map((id) => {
        const c = CFG.cars[id];
        return { label: pad(c.title, 31) + U.dollars(c.price), action: () => buy(id), disabled: false };
      }),
      draw(ctx) {
        const id = CFG.carOrder[Math.max(0, s.sel)];
        const c = CFG.cars[id];
        // the lot
        UI.rect(ctx, 0, 0, 320, 70, '#6cb8f4');
        UI.rect(ctx, 0, 56, 320, 24, '#50505c');
        UI.rect(ctx, 0, 79, 320, 1, '#e8e8e8');
        for (let x = 0; x < 320; x += 16) {
          ctx.fillStyle = ['#d42020', '#f8e040', '#2040c0', '#20a040'][(x / 16) % 4];
          ctx.fillRect(x, 6 + ((x / 16) % 2), 8, 4);
        }
        UI.rect(ctx, 0, 5, 320, 1, '#303030');
        UI.rect(ctx, 6, 14, 124, 22, '#c02020');
        UI.frame(ctx, 6, 14, 124, 22, '#ffffff');
        CT.font.draw(ctx, "HONEST HANK'S", 68, 17, '#ffffff', { align: 'center' });
        CT.font.draw(ctx, 'USED CARS', 68, 26, '#ffff55', { align: 'center' });
        const sz = CT.art.cars.size(id, 2);
        CT.art.cars.drawCtx(ctx, id, 226 - sz.w / 2, 76, 2, Math.floor(E.time * 4));
        UI.rect(ctx, 0, 80, 320, 34, '#000');
        UI.text(ctx, c.mpg + ' mpg   tank ' + c.tank + ' gal   trunk ' + c.cargo + ' lbs food', 8, 83, UI.C.cyan);
        U.wrap(c.blurb, 51).slice(0, 2).forEach((l, i) => UI.text(ctx, l, 8, 93 + i * 10, UI.C.gray));
        CT.font.draw(ctx, 'You have ' + U.money(G.money), 314, 16, '#ffffff', { align: 'right', shadow: '#000' });
      },
      onBack: () => CT.screens.setup(),
    });
    s.sel = 0;
    E.go(s);
  }

  function pad(t, n) { return (t + ' '.repeat(n)).slice(0, n); }

  function buy(id) {
    const G = CT.game.G;
    const c = CFG.cars[id];
    if (c.price > G.money) {
      E.go(UI.message({ lines: ['Hank shakes his head.', '', '"You can\'t afford that one, friend."'], onDone: dealership }));
      return;
    }
    const left = G.money - c.price;
    const warn = left < 150000 ? U.wrap('Hank scratches his chin: "That only leaves you ' + U.money(left) + ' for gas and food. You sure about this?"', 48) : [];
    E.go(UI.yesNo({
      lines: U.wrap('Buy the ' + c.title + ' for ' + U.money(c.price) + '?', 48).concat(warn.length ? [''].concat(warn) : []),
      onYes: () => {
        S.buyCar(G, id);
        CT.sound.play('cash');
        E.go(UI.message({
          lines: U.wrap('Hank hands you the keys. "She\'s got about a quarter tank of gas. Don\'t say I never gave you nothin\'!"', 48),
          onDone: melIntro,
        }));
      },
      onNo: dealership,
    }));
  }

  function melIntro() {
    E.go(UI.message({
      lines: ['Hi, I\'m Mel. So you\'re driving to Oregon!', 'I can fix you up with what you need:', '',
        ' - gas cans for the long, empty stretches',
        ' - gasoline, of course',
        ' - food for the trip',
        ' - warm clothing for the mountains',
        ' - ammunition for hunting',
        ' - spare tires, batteries and fan belts', ''].concat(U.wrap('Figure at least 100 pounds of food per person, and enough gas to go 500 miles between fill-ups out west.', 48)),
      onDone: () => CT.screens.store({ initial: true, onLeave: ready }),
    }));
  }

  function ready() {
    E.go(UI.message({
      lines: ['Well then, you\'re ready to start.', 'Good luck! You have a long and', 'difficult journey ahead of you.'],
      center: true,
      y: 90,
      onDone: () => CT.screens.arrival(true),
    }));
  }
})(typeof window !== 'undefined' ? window : globalThis);
