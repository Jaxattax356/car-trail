/* The Car Trail - shared screen helpers: game state holder, message queues,
 * settings, and the status header used by trail menus.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const UI = CT.UI;
  const S = CT.sim;
  const E = CT.engine;

  CT.screens = CT.screens || {};
  CT.game = { G: null };

  const settings = Object.assign({ fast: false }, U.store.get('cartrail.settings', {}));
  CT.settings = {
    get fast() { return !!settings.fast; },
    set fast(v) { settings.fast = !!v; U.store.set('cartrail.settings', settings); },
  };

  const F = {};

  F.G = () => CT.game.G;

  F.toneSound = { bad: 'bad', ill: 'bad', death: 'bad', good: 'good', info: 'blip' };

  // Show a list of sim messages one at a time, then call next().
  // overlay: draw each as a dialog over the current screen instead of a full page.
  F.messages = function (msgs, next, opts) {
    const o = opts || {};
    const list = (msgs || []).filter((m) => m && m.text);
    let i = 0;
    const step = () => {
      const G = F.G();
      if (G && S.isOver(G)) { F.gameOver(); return; }
      if (i >= list.length) { next(); return; }
      const m = list[i++];
      const color = m.tone === 'death' ? UI.C.red : m.tone === 'good' ? UI.C.green : m.tone === 'ill' ? UI.C.yellow : UI.C.white;
      const scr = UI.message({
        text: m.text,
        overlay: !!o.overlay,
        color,
        sound: m.tone === 'death' ? null : F.toneSound[m.tone] || 'blip',
        music: m.tone === 'death' ? 'dirge' : null,
        center: !o.overlay,
        y: o.overlay ? undefined : 90,
        onDone: () => {
          if (o.overlay) E.pop();
          step();
        },
      });
      if (o.overlay) E.push(scr);
      else E.go(scr);
    };
    step();
  };

  // Header block used by the trail menu and similar screens.
  F.statusHeader = function (ctx, y, G, place) {
    const L = UI.L;
    UI.dialog(ctx, 8, y, 304, 64);
    UI.center(ctx, place || S.placeName(G), y + 6, UI.C.yellow);
    UI.center(ctx, U.formatDate(G.day), y + 16, UI.C.white);
    const c1 = 18, c2 = 164;
    const yy = y + 30;
    UI.text(ctx, 'Weather: ' + S.weatherLabel(G.weather), c1, yy);
    UI.text(ctx, 'Health: ' + S.partyHealth(G), c2, yy);
    UI.text(ctx, 'Pace: ' + CT.CFG.paces[G.pace].name, c1, yy + L.line);
    UI.text(ctx, 'Rations: ' + CT.CFG.rations[G.rations].name, c2, yy + L.line);
    UI.text(ctx, 'Gas: ' + G.gas.toFixed(1) + ' gal (' + S.range(G) + ' mi)', c1, yy + L.line * 2);
    UI.text(ctx, 'Car: ' + S.carLabel(G.carCond), c2, yy + L.line * 2);
    return y + 68;
  };

  F.save = function () { const G = F.G(); if (G) S.save(G); };

  F.personStatus = function (p) {
    if (!p.alive) return 'died of ' + p.cause;
    const h = S.healthLabel(p.health);
    if (p.ill) return h + ', has ' + S.illness(p.ill.id).has;
    return h + ' health';
  };

  // Crop a landmark/roadside scene to a banner for event screens.
  F.banner = function (ctx, sceneCanvas, y, srcY, h) {
    ctx.drawImage(sceneCanvas, 0, srcY, 320, h, 0, y, 320, h);
    UI.frame(ctx, 0, y, 320, h, '#000');
  };

  F.regionScene = function (G) {
    return CT.art.scenes.get('roadside', { carId: G.carId, region: S.regionId(G) });
  };

  CT.flow = F;
})(typeof window !== 'undefined' ? window : globalThis);
