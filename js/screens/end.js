/* The Car Trail - arriving in Oregon (scoring, Top Ten) and game over
 * (tombstone with an epitaph that later travelers will pass).
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const S = CT.sim;
  const E = CT.engine;
  const F = CT.flow;

  CT.screens.finish = function () {
    const G = F.G();
    G.finished = true;
    S.clearSave();
    const node = S.node('willamette');
    E.go(UI.message({
      scene: CT.art.scenes.get('willamette', { carId: G.carId }),
      dialog: ['Congratulations!  You have', 'made it to Oregon!  Let\'s', 'see how many points you have', 'received.'],
      caption: [node.name, U.formatDate(G.day)],
      music: 'fanfare',
      onDone: score,
    }));
  };

  function score() {
    const G = F.G();
    const sc = S.score(G);
    const occ = S.occ(G);
    E.go(UI.message({
      lines: [],
      draw(ctx) {
        UI.center(ctx, 'Points for arriving in Oregon', 12, UI.C.yellow);
        UI.text(ctx, 'Health of party', 24, 30, UI.C.cyan);
        UI.text(ctx, 'Points per person', 296, 30, UI.C.cyan, { align: 'right' });
        [['good', 500], ['fair', 400], ['poor', 300], ['very poor', 200]].forEach(([l, p], i) => {
          const hot = l === sc.label;
          UI.text(ctx, l, 36, 42 + i * 10, hot ? UI.C.yellow : UI.C.white);
          UI.text(ctx, String(p), 250, 42 + i * 10, hot ? UI.C.yellow : UI.C.white, { align: 'right' });
        });
        UI.rect(ctx, 16, 84, 288, 1, UI.C.gray);
        sc.rows.forEach((r, i) => {
          UI.text(ctx, r[0], 24, 90 + i * 10);
          UI.text(ctx, U.fmtNum(r[1]), 296, 90 + i * 10, UI.C.white, { align: 'right' });
        });
        const y = 90 + sc.rows.length * 10 + 4;
        UI.rect(ctx, 16, y, 288, 1, UI.C.gray);
        UI.text(ctx, 'Subtotal', 24, y + 5);
        UI.text(ctx, U.fmtNum(sc.sub), 296, y + 5, UI.C.white, { align: 'right' });
        if (sc.mult > 1) UI.center(ctx, 'For going as a ' + occ.short + ', your points are ' + (sc.mult === 2 ? 'doubled' : 'tripled') + '.', y + 18, UI.C.cyan);
        UI.center(ctx, 'Total: ' + U.fmtNum(sc.total) + ' points  (' + S.rating(sc.total) + ')', y + 32, UI.C.yellow);
      },
      onDone: () => {
        if (S.qualifies(sc.total)) enterName(sc.total);
        else CT.screens.topTen(() => CT.screens.title());
      },
    }));
  }

  function enterName(total) {
    const G = F.G();
    E.go(UI.input({
      lines: ['Congratulations! Your score of ' + U.fmtNum(total), 'makes the Car Trail Top Ten!', '', 'Enter your name for the list:'],
      max: 16,
      value: G.party[0].name,
      onSubmit: (v) => {
        S.addTopTen(v, total, G.occupation);
        CT.sound.play('cash');
        CT.screens.topTen(() => CT.screens.title());
        return null;
      },
    }));
  }

  // ---------------------------------------------------------------- game over
  F.gameOver = function () {
    const G = F.G();
    if (!G) { CT.screens.title(); return; }
    if (G._over) return; // already showing the end of this trip
    G._over = true;
    S.clearSave();
    const leader = G.party[0];
    const cause = leader.alive ? 'exhaustion' : leader.cause;
    const deathLines = U.wrap('Died of ' + cause, 13).slice(0, 3);
    const scene = CT.art.scenes.get('tombstone', { name: leader.name, lines: deathLines });
    const scr = UI.message({
      scene,
      caption: ['Here lies ' + leader.name, U.formatDate(G.day)],
      lines: [S.alive(G).length ? 'Without the driver, the trip is over.' : 'Your whole party has died.'],
      music: 'dirge',
      onDone: askEpitaph,
    });
    E.go(scr);

    function askEpitaph() {
      E.go(UI.yesNo({
        lines: U.wrap('Travelers who follow you will pass ' + leader.name + '\'s roadside memorial.', 48).concat(['', 'Would you like to write an epitaph?']),
        onYes: writeEpitaph,
        onNo: () => { S.addTombstone(G.miles, leader.name, 'Died of ' + cause); summary(); },
      }));
    }
    function writeEpitaph() {
      E.go(UI.input({
        lines: ['Write a short epitaph (up to 26 letters):'],
        max: 26,
        allowEmpty: true,
        onSubmit: (v) => { S.addTombstone(G.miles, leader.name, v || 'Died of ' + cause); summary(); return null; },
        onCancel: () => { S.addTombstone(G.miles, leader.name, 'Died of ' + cause); summary(); },
      }));
    }
    function summary() {
      const lost = G.party.filter((p) => !p.alive).map((p) => p.name + ' - ' + p.cause);
      E.go(UI.message({
        title: 'The End of the Road',
        lines: ['You traveled ' + G.miles + ' miles in ' + (G.day - G.startDay) + ' days.', ''].concat(
          ['Lost along the way:'], lost.map((l) => '  ' + l), ['', 'Better luck next time on the Car Trail.']),
        onDone: () => CT.screens.title(),
      }));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
