/* The Car Trail - title screen, introduction, options and the Top Ten. */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const S = CT.sim;
  const E = CT.engine;
  const F = CT.flow;

  const INTRO = [
    ['In 1848, pioneers spent five months walking the Oregon Trail beside their covered wagons.',
      '',
      'Today you will retrace their 2,000-mile route from Independence, Missouri to the Willamette Valley of Oregon - in a car.',
      '',
      'But this is no ordinary road trip. To follow the old trail you\'ll take back roads, gravel roads and two-lane highways across some of the emptiest country in America. Towns are far apart, gas stations are rare, and help can be a long way off.'],
    ['You choose your occupation, your party, your car and the month you leave. In towns you can buy gas, food, warm clothing, ammunition and spare parts.',
      '',
      'Watch your gas gauge! Running out of gas in the middle of Wyoming is no fun.',
      '',
      'Along the way you\'ll face flat tires, dead batteries, flooded roads, speeding tickets, blizzards, thieves - and plenty of illness, including, yes, dysentery.'],
    ['MINI-GAMES',
      '* Hunting - bag some dinner when food runs low.',
      '* Fishing - try your luck at river crossings.',
      '* Roadside repair - change your own flat tire.',
      '* The Columbia River Highway - a wild final drive to the end of the trail.',
      '',
      'CONTROLS',
      'Press a number key or click to choose. While driving, press ENTER (or tap) to stop and size up the situation. Mini-games work with the keyboard, mouse or touch.'],
    ['TIPS FROM OLD TRAIL HANDS',
      '* A steady pace and filling meals keep people healthy.',
      '* Rest when someone is sick - or see a doctor in town.',
      '* Always carry a spare tire and a fan belt.',
      '* Buy gas cans before the empty stretches of Wyoming.',
      '* Cold weather is dangerous without warm clothing.',
      '* Short on money? Work a day job in town.',
      '',
      'Good luck on the Car Trail!'],
  ];

  function introPage(i) {
    const page = INTRO[i];
    const lines = [];
    page.forEach((p) => { if (p === '') lines.push(''); else lines.push(...U.wrap(p, 48)); });
    E.go(UI.message({
      title: 'The Car Trail  (' + (i + 1) + '/' + INTRO.length + ')',
      lines,
      onDone: () => (i + 1 < INTRO.length ? introPage(i + 1) : CT.screens.title()),
    }));
  }

  CT.screens.topTen = function (after) {
    const list = S.topTen();
    E.go(UI.message({
      title: 'The Car Trail Top Ten',
      lines: [],
      draw(ctx) {
        UI.text(ctx, 'Name', 24, 40, UI.C.cyan);
        UI.text(ctx, 'Points', 160, 40, UI.C.cyan, { align: 'right' });
        UI.text(ctx, 'Rating', 180, 40, UI.C.cyan);
        list.forEach((e, i) => {
          const y = 56 + i * 14;
          UI.text(ctx, (i + 1 < 10 ? ' ' : '') + (i + 1) + '. ' + e.name.slice(0, 16), 12, y);
          UI.text(ctx, U.fmtNum(e.score), 196, y, UI.C.white, { align: 'right' });
          UI.text(ctx, S.rating(e.score), 206, y, UI.C.yellow);
        });
      },
      onDone: after || (() => CT.screens.title()),
    }));
  };

  CT.screens.options = function () {
    E.go(UI.menu({
      header(ctx, y) { UI.center(ctx, 'Management Options', y, UI.C.yellow); return y + 24; },
      intro: null,
      options: [
        { label: 'Turn sound ' + (CT.sound.enabled ? 'off' : 'on'), action: () => { CT.sound.setEnabled(!CT.sound.enabled); CT.sound.unlock(); CT.sound.play('select'); CT.screens.options(); } },
        { label: 'Travel speed: ' + (CT.settings.fast ? 'fast' : 'normal'), action: () => { CT.settings.fast = !CT.settings.fast; CT.screens.options(); } },
        { label: 'See the Top Ten', action: () => CT.screens.topTen(() => CT.screens.options()) },
        { label: 'Erase the Top Ten list', action: () => confirm('Erase the Top Ten list?', () => { S.resetTopTen(); CT.screens.options(); }) },
        { label: 'Erase roadside memorials', action: () => confirm('Erase all tombstones left by earlier trips?', () => { S.clearTombstones(); CT.screens.options(); }) },
        { label: 'Return to the main menu', action: () => CT.screens.title() },
      ],
      onBack: () => CT.screens.title(),
    }));
  };

  function confirm(q, yes) {
    E.go(UI.yesNo({ lines: [q], onYes: yes, onNo: () => CT.screens.options() }));
  }

  CT.screens.title = function () {
    const saved = S.load();
    const carId = saved ? saved.carId : 'wagon';
    const s = {
      kind: 'title',
      sel: 3,
      inputDelay: 0.2,
      enter() {
        CT.sound.stopTune();
        s.wantMusic = true;
      },
      // Browsers only allow audio after a user gesture, so start the tune as soon as sound unlocks.
      update() {
        if (s.wantMusic && CT.sound.ok()) { s.wantMusic = false; CT.sound.music('title'); }
      },
      exit() { CT.sound.stopTune(); },
      choose(i) {
        CT.sound.play('select');
        CT.sound.stopTune();
        if (i === 0) introPage(0);
        else if (i === 1) CT.screens.options();
        else if (i === 2) CT.screens.topTen();
        else CT.screens.setup();
      },
      resumeSave() {
        const G = S.load();
        if (!G) return;
        CT.sound.play('select');
        CT.game.G = G;
        CT.screens.trailMenu();
      },
      key(k) {
        if (k === 'ArrowLeft') { s.sel = (s.sel + 3) % 4; CT.sound.play('blip'); }
        else if (k === 'ArrowRight' || k === 'Tab') { s.sel = (s.sel + 1) % 4; CT.sound.play('blip'); }
        else if (k === 'Enter' || k === ' ') s.choose(s.sel);
        else if (/^[1-4]$/.test(k)) s.choose(parseInt(k, 10) - 1);
        else if ((k === 'c' || k === 'C') && saved) s.resumeSave();
      },
      move(x, y) { const i = CT.art.title.hitButton(x, y); if (i >= 0) s.sel = i; },
      click(x, y) {
        const i = CT.art.title.hitButton(x, y);
        if (i >= 0) { s.choose(i); return; }
        if (saved && y >= 188 && y < 202 && x > 60 && x < 260) s.resumeSave();
      },
      render(ctx) {
        ctx.drawImage(CT.art.title.get(carId), 0, 0);
        CT.art.title.drawButtons(ctx, s.sel);
        if (saved) {
          const t = (E.coarse ? 'Tap here' : 'Press C') + ' to continue your trip';
          const w = CT.font.width(t) + 8;
          UI.rect(ctx, 160 - w / 2, 189, w, 12, '#000000');
          UI.frame(ctx, 160 - w / 2, 189, w, 12, '#f8e888');
          UI.center(ctx, t, 191, UI.blink() ? '#ffff55' : '#f8e888');
        }
      },
    };
    E.go(s);
  };
})(typeof window !== 'undefined' ? window : globalThis);
