/* The Car Trail - shared utilities.
 * Every script attaches to the single global namespace `CT`.
 * Scripts are plain (non-module) so the game runs straight from file://.
 */
(function (root) {
  'use strict';
  const CT = (root.CT = root.CT || {});

  const U = {};

  U.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  U.lerp = (a, b, t) => a + (b - a) * t;

  // Deterministic PRNG (mulberry32) so procedural art is identical every run.
  U.rng = function (seed) {
    let a = seed >>> 0;
    const f = function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + f() * (hi - lo);
    f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    return f;
  };

  // Game-logic randomness. Tests may swap this for a seeded generator.
  U.random = Math.random;
  U.rand = () => U.random();
  U.randInt = (lo, hi) => Math.floor(lo + U.random() * (hi - lo + 1));
  U.randRange = (lo, hi) => lo + U.random() * (hi - lo);
  U.chance = (p) => U.random() < p;
  U.pick = (arr) => arr[Math.floor(U.random() * arr.length)];
  U.weighted = function (items, weightOf) {
    let total = 0;
    for (const it of items) total += Math.max(0, weightOf(it));
    if (total <= 0) return null;
    let r = U.random() * total;
    for (const it of items) {
      r -= Math.max(0, weightOf(it));
      if (r < 0) return it;
    }
    return items[items.length - 1];
  };

  // ---- Money is stored as integer cents everywhere to avoid float drift ----
  U.money = function (cents) {
    const neg = cents < 0;
    cents = Math.abs(Math.round(cents));
    const dollars = Math.floor(cents / 100);
    const c = cents % 100;
    const d = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-$' : '$') + d + '.' + (c < 10 ? '0' : '') + c;
  };
  // Whole-dollar display for big round amounts.
  U.dollars = function (cents) {
    const d = Math.round(cents / 100);
    return '$' + String(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // ---- Dates are integer day numbers (days since 1970-01-01 UTC) ----
  U.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  U.dayNum = (year, month, day) => Math.round(Date.UTC(year, month, day) / 86400000);
  U.dateParts = function (dayNum) {
    const d = new Date(dayNum * 86400000);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
  };
  U.formatDate = function (dayNum) {
    const p = U.dateParts(dayNum);
    return U.MONTHS[p.month] + ' ' + p.day + ', ' + p.year;
  };

  U.plural = (n, one, many) => (n === 1 ? one : many || one + 's');
  U.fmtNum = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Word-wrap a string to a max number of characters per line.
  U.wrap = function (text, maxChars) {
    const out = [];
    String(text).split('\n').forEach((para) => {
      if (para === '') { out.push(''); return; }
      let line = '';
      para.split(' ').forEach((word) => {
        while (word.length > maxChars) {
          if (line) { out.push(line); line = ''; }
          out.push(word.slice(0, maxChars));
          word = word.slice(maxChars);
        }
        if (!line) line = word;
        else if (line.length + 1 + word.length <= maxChars) line += ' ' + word;
        else { out.push(line); line = word; }
      });
      out.push(line);
    });
    return out;
  };

  U.listJoin = function (arr) {
    if (arr.length === 0) return '';
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr[0] + ' and ' + arr[1];
    return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
  };

  // Safe localStorage access (private mode / blocked storage must never crash the game).
  U.store = {
    get(key, fallback) {
      try {
        const v = root.localStorage && root.localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        if (root.localStorage) root.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove(key) {
      try {
        if (root.localStorage) root.localStorage.removeItem(key);
      } catch (e) { /* ignore */ }
    },
  };

  CT.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
