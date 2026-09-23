/* The Car Trail - Oregon Trail style UI widgets: message pages, numbered menus,
 * text prompts, dialog boxes and the classic white caption plate.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;
  const F = () => CT.font;

  const C = {
    white: '#ffffff', black: '#000000', yellow: '#ffff55', cyan: '#55ffff', gray: '#aaaaaa',
    dgray: '#555555', red: '#ff5555', green: '#55ff55', orange: '#ffaa00', blue: '#5555ff',
  };

  const L = { left: 16, top: 14, line: 10, cols: 48, sceneY: 16, sceneH: 160 };

  const UI = { C, L };

  UI.rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  UI.frame = (ctx, x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  };
  UI.text = (ctx, s, x, y, c, o) => F().draw(ctx, s, x, y, c || C.white, o);
  UI.center = (ctx, s, y, c, o) => F().draw(ctx, s, 160, y, c || C.white, Object.assign({ align: 'center' }, o || {}));

  // Black dialog box with a double white rule, like the "Congratulations" box.
  UI.dialog = function (ctx, x, y, w, h, fill) {
    UI.rect(ctx, x, y, w, h, fill || C.black);
    UI.frame(ctx, x, y, w, h, C.white);
    UI.frame(ctx, x + 2, y + 2, w - 4, h - 4, C.white);
  };

  // Dialog sized to fit wrapped lines, centred at (cx, cy).
  UI.dialogText = function (ctx, lines, cx, cy, color) {
    const maxLen = Math.max(1, ...lines.map((l) => l.length));
    const w = maxLen * 6 + 18;
    const h = lines.length * L.line + 14;
    const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
    UI.dialog(ctx, x, y, w, h);
    lines.forEach((l, i) => UI.text(ctx, l, x + 9, y + 8 + i * L.line, color || C.white));
    return { x, y, w, h };
  };

  // White caption plate with black text (landmark name + date).
  UI.caption = function (ctx, lines, y) {
    const maxLen = Math.max(...lines.map((l) => l.length));
    const w = Math.max(150, maxLen * 6 + 24);
    const h = lines.length * L.line + 5;
    const x = Math.round(160 - w / 2);
    UI.rect(ctx, x, y, w, h, C.white);
    lines.forEach((l, i) => UI.center(ctx, l, y + 3 + i * L.line, C.black));
    return h;
  };

  UI.continueText = function () {
    return CT.engine.coarse ? 'Tap to continue' : 'Press SPACE BAR to continue';
  };
  UI.pressSpace = function (ctx, y, text) {
    UI.center(ctx, text || UI.continueText(), y, C.white);
  };

  UI.blink = () => Math.floor(CT.engine.time * 2.5) % 2 === 0;

  function isContinueKey(k) {
    return k === ' ' || k === 'Enter' || k === 'Escape';
  }

  // ---------------------------------------------------------------------------
  // Message page. opts:
  //  lines | text, title, scene (canvas), caption [..], dialog (lines drawn in a box
  //  over the scene), overlay (draw a box over whatever is below), onDone, sound,
  //  prompt, center (centre text), y, color
  // ---------------------------------------------------------------------------
  UI.message = function (opts) {
    const o = opts || {};
    let lines = o.lines ? o.lines.slice() : o.text != null ? U.wrap(o.text, o.overlay ? 40 : L.cols) : [];
    const s = {
      kind: 'message',
      opts: o,
      overlay: !!o.overlay,
      inputDelay: o.inputDelay,
      enter() { if (o.sound) CT.sound.play(o.sound); if (o.music) CT.sound.music(o.music); if (o.onEnter) o.onEnter(); },
      done() {
        if (s._done) return;
        s._done = true;
        CT.sound.play('blip');
        if (o.onDone) o.onDone();
        else CT.engine.pop();
      },
      key(k) { if (isContinueKey(k)) s.done(); },
      click() { s.done(); },
      update(dt) { if (o.update) o.update(dt); },
      render(ctx) {
        if (o.scene) {
          ctx.drawImage(o.scene, 0, L.sceneY);
          if (o.sceneFx) o.sceneFx(ctx, L.sceneY);
          if (o.dialog) UI.dialogText(ctx, o.dialog, 160, L.sceneY + 80);
          let y = L.sceneY + L.sceneH + 6;
          if (o.caption) y += UI.caption(ctx, o.caption, y) + 4;
          lines.forEach((l, i) => UI.center(ctx, l, y + i * L.line, o.color || C.white));
          y += lines.length * L.line;
          UI.pressSpace(ctx, Math.max(y + 2, 218), o.prompt);
          return;
        }
        if (o.overlay) {
          UI.dialogText(ctx, lines.concat(['', o.prompt || UI.continueText()]), 160, o.cy || 120, o.color);
          return;
        }
        if (o.draw) o.draw(ctx);
        let y = o.y != null ? o.y : L.top;
        if (o.title) {
          UI.center(ctx, o.title, y, C.yellow);
          y += L.line * 2;
        }
        lines.forEach((l, i) => {
          if (o.center) UI.center(ctx, l, y + i * L.line, o.color || C.white);
          else UI.text(ctx, l, L.left, y + i * L.line, o.color || C.white);
        });
        UI.pressSpace(ctx, 222, o.prompt);
      },
    };
    return s;
  };

  // ---------------------------------------------------------------------------
  // Numbered menu. opts:
  //  header(ctx) -> y to start drawing at | lines [..], intro ('You may:'),
  //  options [{label, action, disabled, note}], prompt, onBack, y, draw(ctx)
  // ---------------------------------------------------------------------------
  UI.menu = function (opts) {
    const o = opts || {};
    const s = {
      kind: 'menu',
      opts: o,
      sel: -1,
      rects: [],
      overlay: !!o.overlay,
      enter() { if (o.onEnter) o.onEnter(); },
      choose(i) {
        const op = o.options[i];
        if (!op) return;
        if (op.disabled) { CT.sound.play('error'); return; }
        CT.sound.play('select');
        op.action();
      },
      key(k) {
        const n = o.options.length;
        if (/^[0-9]$/.test(k)) {
          let i = k === '0' ? 9 : parseInt(k, 10) - 1;
          if (i < n) s.choose(i);
          return;
        }
        if (o.letters) {
          const i = o.options.findIndex((op) => op.hotkey && op.hotkey.toLowerCase() === k.toLowerCase());
          if (i >= 0) { s.choose(i); return; }
        }
        if (k === 'ArrowDown') { s.sel = (s.sel + 1) % n; CT.sound.play('blip'); }
        else if (k === 'ArrowUp') { s.sel = s.sel <= 0 ? n - 1 : s.sel - 1; CT.sound.play('blip'); }
        else if (k === 'Enter' || k === ' ') { if (s.sel >= 0) s.choose(s.sel); }
        else if (k === 'Escape' || k === 'Backspace') { if (o.onBack) { CT.sound.play('blip'); o.onBack(); } }
      },
      hit(x, y) {
        for (let i = 0; i < s.rects.length; i++) {
          const r = s.rects[i];
          if (r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
        }
        return -1;
      },
      move(x, y) { const i = s.hit(x, y); if (i >= 0) s.sel = i; },
      click(x, y) {
        const i = s.hit(x, y);
        if (i >= 0) s.choose(i);
      },
      render(ctx) {
        if (o.draw) o.draw(ctx);
        let y = o.y != null ? o.y : L.top;
        if (o.header) y = o.header(ctx, y);
        if (o.lines) {
          o.lines.forEach((l) => {
            if (l && typeof l === 'object') UI.text(ctx, l.t, l.center ? 160 : L.left, y, l.c || C.white, l.center ? { align: 'center' } : undefined);
            else UI.text(ctx, l, L.left, y);
            y += L.line;
          });
          y += o.lines.length ? 4 : 0;
        }
        if (o.intro !== null) {
          UI.text(ctx, o.intro || 'You may:', L.left, y);
          y += L.line + 4;
        }
        const indent = o.indent != null ? o.indent : L.left + 12;
        const step = o.spacing || L.line + 1;
        s.rects = [];
        o.options.forEach((op, i) => {
          const num = i === 9 ? '0' : String(i + 1);
          const label = num + '. ' + op.label;
          const hot = i === s.sel;
          const w = Math.max(F().width(label) + 6, 120);
          s.rects.push({ x: indent - 3, y: y - 2, w, h: step });
          if (hot && !op.disabled) UI.rect(ctx, indent - 3, y - 2, F().width(label) + 6, step, '#0000aa');
          UI.text(ctx, label, indent, y, op.disabled ? C.dgray : hot ? C.yellow : C.white);
          if (op.note) UI.text(ctx, op.note, indent + F().width(label) + 6, y, op.disabled ? C.dgray : C.gray);
          y += step;
        });
        y += 6;
        if (o.prompt !== null) {
          const p = (o.prompt || 'What is your choice?') + ' ';
          UI.text(ctx, p, L.left, y);
          if (UI.blink()) UI.rect(ctx, L.left + F().width(p) + 1, y + 7, 5, 1, C.white);
        }
        if (o.footer) o.footer(ctx, y + L.line + 4);
      },
    };
    return s;
  };

  // ---------------------------------------------------------------------------
  // Text / number prompt. opts:
  //  lines, header(ctx,y), prompt, max, numeric, value,
  //  onSubmit(value) -> error string to reject or falsy to accept, onCancel
  // ---------------------------------------------------------------------------
  UI.input = function (opts) {
    const o = opts || {};
    const TI = CT.textInput;
    const s = {
      kind: 'input',
      opts: o,
      err: '',
      enter() {
        TI.begin({
          max: o.max || 20,
          numeric: !!o.numeric,
          value: o.value || '',
          onSubmit: (v) => {
            if (!v && !o.allowEmpty) { s.err = o.emptyError || ''; CT.sound.play('error'); return; }
            const e = o.onSubmit ? o.onSubmit(v) : null;
            if (e) { s.err = e; CT.sound.play('error'); }
          },
          onCancel: () => { if (o.onCancel) { CT.sound.play('blip'); o.onCancel(); } },
        });
      },
      resume() { s.enter(); },
      exit() { TI.end(); },
      click() { TI.focus(); },
      render(ctx) {
        if (o.draw) o.draw(ctx);
        let y = o.y != null ? o.y : L.top;
        if (o.header) y = o.header(ctx, y);
        (o.lines || []).forEach((l) => {
          if (l && typeof l === 'object') UI.text(ctx, l.t, L.left, y, l.c || C.white);
          else UI.text(ctx, l, L.left, y);
          y += L.line;
        });
        if (o.lines && o.lines.length) y += 6;
        const p = (o.prompt || '') + (o.prompt ? ' ' : '');
        UI.text(ctx, p, L.left, y);
        const px = L.left + F().width(p) + (p ? 1 : 0);
        UI.text(ctx, TI.value, px, y, C.yellow);
        if (UI.blink()) UI.rect(ctx, px + F().width(TI.value) + (TI.value ? 2 : 0), y + 7, 5, 1, C.yellow);
        if (s.err) U.wrap(s.err, L.cols).forEach((l, i) => UI.text(ctx, l, L.left, y + 16 + i * L.line, C.red));
        if (o.footer) o.footer(ctx);
        const hint = o.hint != null ? o.hint : (o.onCancel ? 'ENTER to accept, ESC to go back' : 'Press ENTER when done');
        if (hint) UI.center(ctx, hint, 222, C.gray);
      },
    };
    return s;
  };

  // Yes / No question.
  UI.yesNo = function (opts) {
    const o = opts || {};
    return UI.menu({
      header: o.header,
      lines: o.lines,
      draw: o.draw,
      y: o.y,
      intro: null,
      options: [
        { label: o.yes || 'Yes', action: o.onYes, hotkey: 'y' },
        { label: o.no || 'No', action: o.onNo, hotkey: 'n' },
      ],
      letters: true,
      prompt: o.prompt || 'Enter Y or N:',
      onBack: o.onNo,
    });
  };

  // Standard OT header block: place name, date, then a rule.
  UI.placeHeader = function (ctx, y, place, date) {
    UI.center(ctx, place, y, C.white);
    UI.center(ctx, date, y + L.line, C.white);
    return y + L.line * 2 + 4;
  };

  CT.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
