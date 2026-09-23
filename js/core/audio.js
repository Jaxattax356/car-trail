/* The Car Trail - PC-speaker flavoured sound effects via WebAudio.
 * Everything is synthesized; nothing is downloaded. Fails silently if audio is unavailable.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const U = CT.U;

  const NOTE = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function freq(name) {
    const m = /^([A-G]#?)(\d)$/.exec(name);
    if (!m) return 0;
    const semis = NOTE[m[1]] + (parseInt(m[2], 10) - 4) * 12;
    return 440 * Math.pow(2, semis / 12);
  }

  // "Oh! Susanna" (Stephen Foster, 1848 - public domain), the year the real trail boomed.
  const SUSANNA = [
    ['C4', 0.5], ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['G4', 0.75], ['A4', 0.25], ['G4', 0.5], ['E4', 0.5],
    ['C4', 0.75], ['D4', 0.25], ['E4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['D4', 1.5],
    ['C4', 0.5], ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['G4', 0.75], ['A4', 0.25], ['G4', 0.5], ['E4', 0.5],
    ['C4', 0.75], ['D4', 0.25], ['E4', 0.5], ['E4', 0.5], ['D4', 0.5], ['D4', 0.5], ['C4', 2],
  ];
  const FANFARE = [['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.75], ['G4', 0.25], ['C5', 1.25]];
  // Chopin's funeral march (public domain)
  const DIRGE = [['D4', 1], ['D4', 0.75], ['D4', 0.25], ['D4', 1], ['F4', 0.75], ['E4', 0.25], ['E4', 0.75],
    ['D4', 0.25], ['D4', 0.75], ['C#4', 0.25], ['D4', 2]];

  const sound = {
    enabled: U.store.get('cartrail.sound', true) !== false,
    ctx: null,
    master: null,
    noiseBuf: null,
    tuneTimer: null,
    tuneNodes: [],

    unlock() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
      }
      try {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) {
        this.ctx = null;
      }
    },

    setEnabled(on) {
      this.enabled = !!on;
      U.store.set('cartrail.sound', this.enabled);
      if (!on) this.stopTune();
    },

    ok() {
      return this.enabled && this.ctx && this.ctx.state === 'running';
    },

    tone(f, dur, opts) {
      if (!this.ok()) return null;
      const o = opts || {};
      try {
        const t0 = this.ctx.currentTime + (o.delay || 0);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = o.type || 'square';
        osc.frequency.setValueAtTime(f, t0);
        if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + dur);
        const v = o.vol == null ? 0.08 : o.vol;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(v, t0 + 0.006);
        g.gain.setValueAtTime(v, t0 + Math.max(0.007, dur - 0.03));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
        return osc;
      } catch (e) {
        return null;
      }
    },

    noise(dur, opts) {
      if (!this.ok()) return;
      const o = opts || {};
      try {
        const t0 = this.ctx.currentTime + (o.delay || 0);
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const filt = this.ctx.createBiquadFilter();
        filt.type = o.filter || 'lowpass';
        filt.frequency.value = o.freq || 1200;
        const g = this.ctx.createGain();
        const v = o.vol == null ? 0.25 : o.vol;
        g.gain.setValueAtTime(v, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(t0, Math.random() * 0.5);
        src.stop(t0 + dur + 0.02);
      } catch (e) { /* ignore */ }
    },

    play(name) {
      switch (name) {
        case 'blip': this.tone(880, 0.05, { vol: 0.05 }); break;
        case 'select': this.tone(660, 0.05, { vol: 0.05 }); this.tone(990, 0.07, { vol: 0.05, delay: 0.05 }); break;
        case 'key': this.tone(1200, 0.02, { vol: 0.03 }); break;
        case 'error': this.tone(180, 0.18, { vol: 0.07 }); break;
        case 'cash': this.tone(1320, 0.05, { vol: 0.05 }); this.tone(1760, 0.1, { vol: 0.05, delay: 0.06 }); break;
        case 'shot': this.noise(0.25, { vol: 0.5, freq: 2500 }); this.tone(140, 0.12, { vol: 0.08, slide: 50 }); break;
        case 'hit': this.tone(300, 0.12, { vol: 0.08, slide: 90 }); break;
        case 'thud': this.noise(0.12, { vol: 0.35, freq: 400 }); break;
        case 'splash': this.noise(0.4, { vol: 0.25, freq: 3000, filter: 'highpass' }); break;
        case 'crash': this.noise(0.5, { vol: 0.5, freq: 900 }); this.tone(90, 0.3, { vol: 0.1, slide: 40 }); break;
        case 'honk': this.tone(415, 0.25, { vol: 0.06 }); this.tone(349, 0.25, { vol: 0.06 }); break;
        case 'clank': this.tone(1800, 0.04, { vol: 0.06 }); this.tone(2400, 0.06, { vol: 0.04, delay: 0.03 }); break;
        case 'slip': this.tone(400, 0.15, { vol: 0.06, slide: 150 }); break;
        case 'bite': this.tone(700, 0.06, { vol: 0.06 }); this.tone(900, 0.06, { vol: 0.06, delay: 0.08 }); break;
        case 'reel': this.tone(1500 + Math.random() * 300, 0.015, { vol: 0.02 }); break;
        case 'catch': this.tune(FANFARE.slice(0, 4), 300); break;
        case 'bad': this.tone(330, 0.12, { vol: 0.06 }); this.tone(247, 0.25, { vol: 0.06, delay: 0.12 }); break;
        case 'good': this.tone(523, 0.1, { vol: 0.05 }); this.tone(784, 0.18, { vol: 0.05, delay: 0.1 }); break;
        case 'engine': this.tone(70, 0.4, { vol: 0.05, type: 'sawtooth', slide: 110 }); break;
        default: break;
      }
    },

    stopTune() {
      if (this.tuneTimer) { clearTimeout(this.tuneTimer); this.tuneTimer = null; }
      this.tuneNodes.forEach((n) => { try { n.stop(); } catch (e) { /* ignore */ } });
      this.tuneNodes = [];
    },

    tune(notes, bpm) {
      if (!this.ok()) return;
      this.stopTune();
      const beat = 60 / (bpm || 160);
      let t = 0;
      for (const [n, b] of notes) {
        const f = freq(n);
        const dur = b * beat;
        if (f) {
          const osc = this.tone(f, Math.max(0.05, dur * 0.9), { vol: 0.045, delay: t });
          if (osc) this.tuneNodes.push(osc);
        }
        t += dur;
      }
      this.tuneTimer = setTimeout(() => { this.tuneNodes = []; this.tuneTimer = null; }, t * 1000 + 100);
    },

    music(name) {
      if (name === 'title') this.tune(SUSANNA, 200);
      else if (name === 'fanfare') this.tune(FANFARE, 150);
      else if (name === 'dirge') this.tune(DIRGE, 70);
    },
  };

  CT.sound = sound;
})(typeof window !== 'undefined' ? window : globalThis);
