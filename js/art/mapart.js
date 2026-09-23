/* The Car Trail - parchment map of the route with state lines, rivers,
 * landmarks and your progress.
 */
(function (root) {
  'use strict';
  const CT = root.CT;
  const { Bitmap, dith } = CT.gfx;
  const T = CT.TRAIL;

  const MW = 304, MH = 176;
  const B = T.map.bounds;

  function project(lat, lon) {
    const x = ((lon - B.lonMin) / (B.lonMax - B.lonMin)) * (MW - 16) + 8;
    const y = ((B.latMax - lat) / (B.latMax - B.latMin)) * (MH - 16) + 8;
    return [x, y];
  }

  function line(b, a, c, color, dotted) {
    const [x0, y0] = project(a[0], a[1]);
    const [x1, y1] = project(c[0], c[1]);
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      if (dotted && (i >> 1) % 2) continue;
      const t = i / n;
      b.pset(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), color);
    }
  }

  let base = null;
  function getBase() {
    if (base) return base;
    const b = new Bitmap(MW, MH);
    const rng = CT.U.rng(46);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const edge = Math.min(x, y, MW - 1 - x, MH - 1 - y);
      let c = dith(x, y, 0.25) ? '#e8d4a4' : '#f0e0b8';
      if (edge < 6) c = dith(x, y, 1 - edge / 6) ? '#c8a870' : c;
      if (rng() < 0.02) c = '#dcc494';
      b.pset(x, y, c);
    }
    // ocean west of the coast
    const coast = T.map.coast;
    for (let y = 0; y < MH; y++) {
      // find coast x at this latitude
      let cx = 0;
      for (let i = 0; i < coast.length - 1; i++) {
        const [a, c] = [project(coast[i][0], coast[i][1]), project(coast[i + 1][0], coast[i + 1][1])];
        if ((a[1] <= y && c[1] >= y) || (c[1] <= y && a[1] >= y)) {
          const t = (y - a[1]) / Math.max(0.001, c[1] - a[1]);
          cx = a[0] + (c[0] - a[0]) * t;
        }
      }
      for (let x = 6; x < cx; x++) b.pset(x, y, dith(x, y, 0.5) ? '#a8c8d8' : '#98bcd0');
    }
    T.map.states.forEach((pl) => { for (let i = 0; i < pl.length - 1; i++) line(b, pl[i], pl[i + 1], '#a08058', true); });
    T.map.rivers.forEach((pl) => { for (let i = 0; i < pl.length - 1; i++) line(b, pl[i], pl[i + 1], '#4c7cc8'); });
    // state names
    const lbl = [['MISSOURI', 38.4, -94.9], ['KANSAS', 38.6, -99.5], ['NEBRASKA', 41.4, -99.5], ['WYOMING', 43.5, -107.5], ['IDAHO', 44.6, -115.2], ['OREGON', 44.0, -120.8], ['WASHINGTON', 47.0, -120.4], ['UTAH', 38.8, -111.8], ['COLORADO', 38.8, -105.5]];
    lbl.forEach(([n, lat, lon]) => { const [x, y] = project(lat, lon); CT.art.A.tinyCenter(b, n, Math.round(x), Math.round(y), '#a88c64'); });
    // the route (all branches) dotted
    for (const id of T.order) {
      const n = T.nodes[id];
      n.next.forEach((e) => { const m = T.nodes[e.to]; line(b, [n.lat, n.lon], [m.lat, m.lon], '#6c4c2c', true); });
    }
    base = b.toCanvas();
    return base;
  }

  // Draw the map with progress. G may be null (just the route).
  function draw(ctx, x0, y0, G, time) {
    ctx.drawImage(getBase(), x0, y0);
    const P = (id) => { const n = T.nodes[id]; const p = project(n.lat, n.lon); return [x0 + p[0], y0 + p[1]]; };
    const seg = (a, c, color) => {
      const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1])));
      ctx.fillStyle = color;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        ctx.fillRect(Math.round(a[0] + (c[0] - a[0]) * t), Math.round(a[1] + (c[1] - a[1]) * t), 2, 2);
      }
    };
    let here = P(T.start);
    if (G) {
      const v = G.visited;
      for (let i = 1; i < v.length; i++) seg(P(v[i - 1]), P(v[i]), '#c01c1c');
      here = P(G.node);
      if (!G.atNode && G.next) {
        const a = P(G.node), c = P(G.next);
        const t = G.segMiles ? G.segDone / G.segMiles : 0;
        const p = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
        seg(a, p, '#c01c1c');
        here = p;
      }
    }
    for (const id of T.order) {
      const [x, y] = P(id);
      const seen = G && G.visited.indexOf(id) >= 0;
      const town = T.nodes[id].type === 'town' || T.nodes[id].type === 'end';
      ctx.fillStyle = '#2c1c0c';
      ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
      ctx.fillStyle = seen ? '#c01c1c' : town ? '#f8f0d0' : '#c8a870';
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    if (Math.floor((time || 0) * 3) % 2 === 0) {
      ctx.fillStyle = '#ffff55';
      ctx.fillRect(Math.round(here[0]) - 3, Math.round(here[1]) - 3, 7, 7);
      ctx.fillStyle = '#c01c1c';
      ctx.fillRect(Math.round(here[0]) - 2, Math.round(here[1]) - 2, 5, 5);
    }
    return here;
  }

  function nodePos(id, x0, y0) { const n = T.nodes[id]; const p = project(n.lat, n.lon); return [x0 + p[0], y0 + p[1]]; }

  CT.art.map = { draw, project, nodePos, W: MW, H: MH };
})(typeof window !== 'undefined' ? window : globalThis);
