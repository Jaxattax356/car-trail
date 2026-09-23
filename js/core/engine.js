/* The Car Trail - canvas setup, integer pixel scaling, main loop, screen stack and input. */
(function (root) {
  'use strict';
  const CT = root.CT;

  const W = 320, H = 240;

  // ---------------- Text entry (hidden <input> so phones get a keyboard) ----------------
  const TI = {
    el: null,
    active: false,
    value: '',
    max: 20,
    numeric: false,
    onSubmit: null,
    onCancel: null,
    init(el) {
      this.el = el;
      el.addEventListener('input', () => {
        if (!this.active) return;
        this.setValue(el.value);
      });
      el.addEventListener('blur', () => { /* keep state; tapping the canvas refocuses */ });
    },
    begin(opts) {
      this.active = true;
      this.max = opts.max || 20;
      this.numeric = !!opts.numeric;
      this.onSubmit = opts.onSubmit || null;
      this.onCancel = opts.onCancel || null;
      if (this.el) {
        this.el.setAttribute('inputmode', this.numeric ? 'numeric' : 'text');
        this.el.setAttribute('maxlength', String(this.max));
      }
      this.setValue(opts.value || '');
      this.focus();
    },
    end() {
      this.active = false;
      this.onSubmit = this.onCancel = null;
      if (this.el) {
        this.el.value = '';
        try { this.el.blur(); } catch (e) { /* ignore */ }
      }
    },
    sanitize(v) {
      let out = '';
      for (const ch of String(v)) {
        if (this.numeric ? /[0-9]/.test(ch) : CT.font.isTypeable(ch)) out += ch;
      }
      if (!this.numeric) out = out.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
      return out.slice(0, this.max);
    },
    setValue(v) {
      const s = this.sanitize(v);
      if (s.length > this.value.length) CT.sound.play('key');
      this.value = s;
      if (this.el && this.el.value !== s) this.el.value = s;
    },
    focus() {
      if (!this.el) return;
      try { this.el.focus({ preventScroll: true }); } catch (e) { try { this.el.focus(); } catch (e2) { /* ignore */ } }
    },
    submit() {
      const cb = this.onSubmit;
      if (cb) cb(this.value.trim());
    },
    cancel() {
      const cb = this.onCancel;
      if (cb) cb();
    },
  };

  const E = {
    W, H,
    canvas: null,
    ctx: null,
    stack: [],
    keys: {},
    mouse: { x: W / 2, y: H / 2, inside: false, down: false },
    coarse: false,
    time: 0,
    last: 0,
    errorShown: false,

    init() {
      this.canvas = document.getElementById('screen');
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.ctx.imageSmoothingEnabled = false;
      TI.init(document.getElementById('textin'));
      try { this.coarse = root.matchMedia && root.matchMedia('(pointer: coarse)').matches; } catch (e) { this.coarse = false; }
      this.resize();
      root.addEventListener('resize', () => this.resize());
      this.bindInput();
      requestAnimationFrame((t) => { this.last = t; this.loop(t); });
    },

    resize() {
      const vw = root.innerWidth, vh = root.innerHeight;
      let s = Math.min(vw / W, vh / H);
      if (s >= 2) s = Math.floor(s);
      else if (s >= 1) s = Math.floor(s * 4) / 4;
      s = Math.max(0.5, s);
      this.canvas.style.width = Math.round(W * s) + 'px';
      this.canvas.style.height = Math.round(H * s) + 'px';
    },

    top() { return this.stack[this.stack.length - 1] || null; },
    _enter(s) {
      s.age = 0;
      if (s.enter) s.enter();
    },
    // Replace the whole stack.
    go(s) {
      TI.end();
      while (this.stack.length) {
        const old = this.stack.pop();
        if (old.exit) old.exit();
      }
      this.stack.push(s);
      this._enter(s);
    },
    push(s) {
      TI.end();
      this.stack.push(s);
      this._enter(s);
    },
    pop() {
      TI.end();
      const s = this.stack.pop();
      if (s && s.exit) s.exit();
      const t = this.top();
      if (t) {
        t.age = Math.min(t.age || 0, 0);
        if (t.resume) t.resume();
      }
    },
    // Swap the top screen.
    replace(s) {
      TI.end();
      const old = this.stack.pop();
      if (old && old.exit) old.exit();
      this.stack.push(s);
      this._enter(s);
    },

    toCanvas(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: Math.floor(((clientX - r.left) / r.width) * W),
        y: Math.floor(((clientY - r.top) / r.height) * H),
      };
    },

    ready(s) {
      return s && (s.age || 0) >= (s.inputDelay == null ? 0.12 : s.inputDelay);
    },

    bindInput() {
      const blockKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Backspace', 'Tab', 'Spacebar']);
      root.addEventListener('keydown', (e) => {
        CT.sound.unlock();
        let k = e.key;
        if (k === 'Spacebar') k = ' ';
        if (TI.active) {
          if (k === 'Enter') { e.preventDefault(); if (!e.repeat) TI.submit(); return; }
          if (k === 'Escape') { e.preventDefault(); TI.cancel(); return; }
          if (document.activeElement !== TI.el) {
            if (k === 'Backspace') { e.preventDefault(); TI.setValue(TI.value.slice(0, -1)); }
            else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); TI.setValue(TI.value + k); }
          }
          return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Printable keys drive menus; stop the browser from also typing them into
        // the text field a menu choice may have just focused.
        if (blockKeys.has(k) || k.length === 1 || k === 'Enter') e.preventDefault();
        this.keys[k.length === 1 ? k.toLowerCase() : k] = true;
        const t = this.top();
        if (!t || !t.key) return;
        if (e.repeat && !t.allowRepeat) return;
        if (!this.ready(t)) return;
        this.safe(() => t.key(k, e));
      });
      root.addEventListener('keyup', (e) => {
        let k = e.key;
        if (k === 'Spacebar') k = ' ';
        this.keys[k.length === 1 ? k.toLowerCase() : k] = false;
        const t = this.top();
        if (t && t.keyUp) this.safe(() => t.keyUp(k, e));
      });
      root.addEventListener('blur', () => {
        this.keys = {};
        this.mouse.down = false;
        const t = this.top();
        if (t && t.blur) this.safe(() => t.blur());
      });

      const cv = this.canvas;
      let downScreen = null;
      cv.addEventListener('pointerdown', (e) => {
        CT.sound.unlock();
        e.preventDefault();
        const p = this.toCanvas(e.clientX, e.clientY);
        this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.inside = true; this.mouse.down = true;
        const t = this.top();
        downScreen = t;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (t && t.down && this.ready(t)) this.safe(() => t.down(p.x, p.y));
      });
      cv.addEventListener('pointermove', (e) => {
        const p = this.toCanvas(e.clientX, e.clientY);
        this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.inside = true;
        const t = this.top();
        if (t && t.move) this.safe(() => t.move(p.x, p.y));
      });
      cv.addEventListener('pointerleave', () => { this.mouse.inside = false; });
      const up = (e, cancelled) => {
        const p = this.toCanvas(e.clientX, e.clientY);
        this.mouse.down = false;
        const t = this.top();
        if (t && t.up) this.safe(() => t.up(p.x, p.y));
        if (!cancelled && t && t === downScreen && this.top() === t && t.click && this.ready(t)) {
          this.safe(() => t.click(p.x, p.y));
        }
        downScreen = null;
        if (TI.active) TI.focus();
      };
      cv.addEventListener('pointerup', (e) => up(e, false));
      cv.addEventListener('pointercancel', (e) => up(e, true));
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    safe(fn) {
      try {
        fn();
      } catch (err) {
        this.fail(err);
      }
    },

    fail(err) {
      if (root.console) console.error(err);
      if (this.errorShown) return;
      this.errorShown = true;
      const msg = String((err && err.message) || err).slice(0, 120);
      const scr = {
        render(ctx) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, W, H);
          const lines = CT.U.wrap('Something went wrong on the trail: ' + msg, 48);
          lines.forEach((l, i) => CT.font.draw(ctx, l, 16, 40 + i * 10, '#ff5555'));
          CT.font.draw(ctx, 'Press any key to return to the title', 160, 200, '#fff', { align: 'center' });
        },
        key() { E.errorShown = false; CT.screens.title(); },
        click() { E.errorShown = false; CT.screens.title(); },
      };
      this.stack = [scr];
      scr.age = 1;
    },

    loop(ts) {
      const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000));
      this.last = ts;
      this.time += dt;
      const t = this.top();
      if (t) {
        t.age = (t.age || 0) + dt;
        if (t.update) this.safe(() => t.update(dt));
      }
      const ctx = this.ctx;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      let start = this.stack.length - 1;
      while (start > 0 && this.stack[start].overlay) start--;
      for (let i = Math.max(0, start); i < this.stack.length; i++) {
        const s = this.stack[i];
        if (s.render) this.safe(() => s.render(ctx, i === this.stack.length - 1));
      }
      requestAnimationFrame((n) => this.loop(n));
    },
  };

  CT.engine = E;
  CT.textInput = TI;
})(typeof window !== 'undefined' ? window : globalThis);
