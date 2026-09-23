/* The Car Trail - pixel raster library.
 * All artwork is rasterized into Uint32 pixel buffers with hard edges
 * (no antialiasing) so every scene has the same chunky EGA/VGA look.
 */
(function (root) {
  'use strict';
  const CT = root.CT;

  const cache = new Map();
  // Pack '#rrggbb' into little-endian ABGR (the layout ImageData uses).
  function col(c) {
    if (typeof c === 'number') return c;
    if (!c) return 0;
    let v = cache.get(c);
    if (v !== undefined) return v;
    let h = c.charAt(0) === '#' ? c.slice(1) : c;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    cache.set(c, v);
    return v;
  }

  const BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  // True when an ordered-dither cell at (x,y) should take the second color.
  function dith(x, y, t) {
    return BAYER[y & 3][x & 3] < t * 16;
  }

  class Mask {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.d = new Uint8Array(w * h);
      this.x0 = w; this.y0 = h; this.x1 = -1; this.y1 = -1;
    }
    _grow(x, y) {
      if (x < this.x0) this.x0 = x;
      if (y < this.y0) this.y0 = y;
      if (x > this.x1) this.x1 = x;
      if (y > this.y1) this.y1 = y;
    }
    set(x, y, v) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.d[y * this.w + x] = v === undefined ? 1 : v;
      if (v !== 0) this._grow(x, y);
    }
    has(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
      return this.d[y * this.w + x] !== 0;
    }
    span(x0, x1, y, v) {
      if (y < 0 || y >= this.h) return;
      x0 = Math.max(0, x0 | 0);
      x1 = Math.min(this.w - 1, x1 | 0);
      if (x1 < x0) return;
      const val = v === undefined ? 1 : v;
      this.d.fill(val, y * this.w + x0, y * this.w + x1 + 1);
      if (val !== 0) { this._grow(x0, y); this._grow(x1, y); }
    }
    rect(x, y, w, h, v) {
      for (let j = Math.round(y); j < Math.round(y + h); j++) this.span(Math.round(x), Math.round(x + w) - 1, j, v);
    }
    ellipse(cx, cy, rx, ry, v) {
      if (rx <= 0 || ry <= 0) return;
      const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
      for (let y = y0; y <= y1; y++) {
        const dy = (y + 0.5 - cy) / ry;
        if (dy < -1 || dy > 1) continue;
        const dx = rx * Math.sqrt(1 - dy * dy);
        const xa = Math.ceil(cx - dx - 0.5), xb = Math.floor(cx + dx - 0.5);
        if (xb >= xa) this.span(xa, xb, y, v);
      }
    }
    disc(cx, cy, r, v) { this.ellipse(cx, cy, r, r, v); }
    poly(pts, v) {
      rasterPoly(pts, (x0, x1, y) => this.span(x0, x1, y, v));
    }
    thickLine(x0, y0, x1, y1, r, v) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, v);
      }
    }
    // Pixels in the mask that touch a pixel outside it (4-neighbourhood).
    isEdge(x, y) {
      return this.has(x, y) && (!this.has(x - 1, y) || !this.has(x + 1, y) || !this.has(x, y - 1) || !this.has(x, y + 1));
    }
  }

  // Even-odd scanline polygon fill sampling pixel centres.
  function rasterPoly(pts, spanFn) {
    if (pts.length < 3) return;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    const ys = Math.max(0, Math.floor(minY)), ye = Math.ceil(maxY);
    const xs = [];
    for (let y = ys; y <= ye; y++) {
      const sy = y + 0.5;
      xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) {
          xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.ceil(xs[k] - 0.5), xb = Math.floor(xs[k + 1] - 0.5);
        if (xb >= xa) spanFn(xa, xb, y);
      }
    }
  }

  class Bitmap {
    constructor(w, h) {
      this.w = w | 0;
      this.h = h | 0;
      this.data = new Uint32Array(this.w * this.h);
    }
    pset(x, y, c) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.data[y * this.w + x] = col(c);
    }
    pget(x, y) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
      return this.data[y * this.w + x];
    }
    fill(c) { this.data.fill(col(c)); return this; }
    hline(x0, x1, y, c) {
      y |= 0;
      if (y < 0 || y >= this.h) return;
      if (x1 < x0) { const t = x0; x0 = x1; x1 = t; }
      x0 = Math.max(0, x0 | 0);
      x1 = Math.min(this.w - 1, x1 | 0);
      if (x1 < x0) return;
      this.data.fill(col(c), y * this.w + x0, y * this.w + x1 + 1);
    }
    vline(x, y0, y1, c) {
      if (y1 < y0) { const t = y0; y0 = y1; y1 = t; }
      for (let y = y0 | 0; y <= (y1 | 0); y++) this.pset(x, y, c);
    }
    rect(x, y, w, h, c) {
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      for (let j = y; j < y + h; j++) this.hline(x, x + w - 1, j, c);
    }
    frame(x, y, w, h, c) {
      this.hline(x, x + w - 1, y, c);
      this.hline(x, x + w - 1, y + h - 1, c);
      this.vline(x, y, y + h - 1, c);
      this.vline(x + w - 1, y, y + h - 1, c);
    }
    // Ordered-dither blend of two colours; t = share of c2 (0..1).
    drect(x, y, w, h, c1, c2, t) {
      const a = col(c1), b = col(c2);
      x = Math.round(x); y = Math.round(y);
      for (let j = Math.max(0, y); j < Math.min(this.h, y + Math.round(h)); j++) {
        for (let i = Math.max(0, x); i < Math.min(this.w, x + Math.round(w)); i++) {
          this.data[j * this.w + i] = dith(i, j, t) ? b : a;
        }
      }
    }
    // Vertical gradient through colour stops using dithered transitions.
    vgrad(x, y, w, h, stops) {
      const n = stops.length - 1;
      for (let j = 0; j < h; j++) {
        const f = (j / Math.max(1, h - 1)) * n;
        const i = Math.min(n - 1, Math.floor(f));
        const t = f - i;
        const a = col(stops[i]), b = col(stops[i + 1]);
        const yy = y + j;
        if (yy < 0 || yy >= this.h) continue;
        for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) {
          this.data[yy * this.w + xx] = dith(xx, yy, t) ? b : a;
        }
      }
    }
    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      const cc = col(c);
      for (;;) {
        this.pset(x0, y0, cc);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    polyline(pts, c) {
      for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c);
    }
    ellipse(cx, cy, rx, ry, c) {
      const m = new Mask(this.w, this.h);
      m.ellipse(cx, cy, rx, ry);
      this.paint(m, c);
    }
    disc(cx, cy, r, c) { this.ellipse(cx, cy, r, r, c); }
    poly(pts, c) {
      const cc = col(c);
      rasterPoly(pts, (x0, x1, y) => this.hline(x0, x1, y, cc));
    }
    // Paint every mask pixel. `c` may be a colour or fn(x,y)->colour|0|null.
    paint(mask, c) {
      if (mask.x1 < 0) return;
      const fn = typeof c === 'function' ? c : null;
      const cc = fn ? 0 : col(c);
      for (let y = Math.max(0, mask.y0); y <= Math.min(this.h - 1, mask.y1); y++) {
        for (let x = Math.max(0, mask.x0); x <= Math.min(this.w - 1, mask.x1); x++) {
          if (!mask.d[y * mask.w + x]) continue;
          if (fn) {
            const v = fn(x, y);
            if (v) this.data[y * this.w + x] = col(v);
          } else this.data[y * this.w + x] = cc;
        }
      }
    }
    // Outline drawn just outside a mask.
    outline(mask, c, diagonal) {
      const cc = col(c);
      const x0 = Math.max(0, mask.x0 - 1), x1 = Math.min(this.w - 1, mask.x1 + 1);
      const y0 = Math.max(0, mask.y0 - 1), y1 = Math.min(this.h - 1, mask.y1 + 1);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (mask.has(x, y)) continue;
          let near = mask.has(x - 1, y) || mask.has(x + 1, y) || mask.has(x, y - 1) || mask.has(x, y + 1);
          if (!near && diagonal) near = mask.has(x - 1, y - 1) || mask.has(x + 1, y - 1) || mask.has(x - 1, y + 1) || mask.has(x + 1, y + 1);
          if (near) this.data[y * this.w + x] = cc;
        }
      }
    }
    // Recolour pixels in a rect: fn(x,y,current)->new colour or 0 to keep.
    each(x, y, w, h, fn) {
      for (let j = Math.max(0, y | 0); j < Math.min(this.h, (y + h) | 0); j++) {
        for (let i = Math.max(0, x | 0); i < Math.min(this.w, (x + w) | 0); i++) {
          const v = fn(i, j, this.data[j * this.w + i]);
          if (v) this.data[j * this.w + i] = col(v);
        }
      }
    }
    // Scatter colours over pixels that currently match `match` (a colour or predicate).
    speckle(x, y, w, h, match, colors, prob, rng) {
      const m = typeof match === 'function' ? match : ((cc) => (v) => v === cc)(col(match));
      const cs = colors.map(col);
      this.each(x, y, w, h, (i, j, v) => (m(v, i, j) && rng() < prob ? cs[(rng() * cs.length) | 0] : 0));
    }
    // Composite another bitmap (0 = transparent).
    draw(src, dx, dy, flip) {
      dx = Math.round(dx); dy = Math.round(dy);
      for (let y = 0; y < src.h; y++) {
        const ty = dy + y;
        if (ty < 0 || ty >= this.h) continue;
        for (let x = 0; x < src.w; x++) {
          const v = src.data[y * src.w + (flip ? src.w - 1 - x : x)];
          if (!v) continue;
          const tx = dx + x;
          if (tx < 0 || tx >= this.w) continue;
          this.data[ty * this.w + tx] = v;
        }
      }
    }
    // Draw bitmap-font text (uses CT.font glyphs).
    text(str, x, y, c, scale) {
      CT.font.drawToBitmap(this, str, x, y, c, scale || 1);
    }
    textCenter(str, cx, y, c, scale) {
      const s = scale || 1;
      this.text(str, Math.round(cx - CT.font.width(str, s) / 2), y, c, s);
    }
    clone() {
      const b = new Bitmap(this.w, this.h);
      b.data.set(this.data);
      return b;
    }
    mask() { return new Mask(this.w, this.h); }
    toCanvas() {
      const cv = document.createElement('canvas');
      cv.width = this.w;
      cv.height = this.h;
      const cx = cv.getContext('2d');
      const img = cx.createImageData(this.w, this.h);
      new Uint32Array(img.data.buffer).set(this.data);
      cx.putImageData(img, 0, 0);
      return cv;
    }
  }

  CT.gfx = { col, dith, Bitmap, Mask, rasterPoly, BAYER };
})(typeof window !== 'undefined' ? window : globalThis);
