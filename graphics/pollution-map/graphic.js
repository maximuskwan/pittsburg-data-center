// CalEnviroScreen map ("From Black Diamond to data hub"): each Contra Costa
// census tract around the former golf course, shaded and labeled with its
// statewide CalEnviroScreen 5.0 percentile; tracts at the 90th or higher in red.
// Data: data/pollution-map.csv (numbers) and data/pollution-map.topojson
// (shapes), both built by tools/fetch-calenviroscreen.mjs. Drawn with D3 as SVG.
import * as d3 from '../../vendor/d3/d3.mjs';
import { feature } from '../../vendor/topojson-client/topojson-client.mjs';

// Which CalEnviroScreen column the map shows. The overall score is the one
// OEHHA ranks communities by; pollution_burden_percentile is one of its two halves.
const MEASURE = 'ces_percentile';
const BINS = [50, 75, 90];
const TOP = 90;

// What the map frames: a tight box on phones, the wider area on desktop.
const VIEW = {
  narrow: [[-121.962, 37.977], [-121.838, 38.052]],
  wide: [[-121.992, 37.962], [-121.8, 38.066]],
};
// Hand-placed labels (lon, lat), checked against the drawn map.
const PLACES = [
  { name: 'PITTSBURG', at: [-121.905, 38.0395], wide: true, narrow: true },
  { name: 'BAY POINT', at: [-121.958, 38.0335], wide: true, narrow: false },
  { name: 'ANTIOCH', at: [-121.817, 38.012], wide: true, narrow: false },
  { name: 'CONCORD', at: [-121.968, 37.975], wide: true, narrow: false },
  { name: 'Suisun Bay', at: [-121.975, 38.06], water: true, wide: true, narrow: false },
  { name: 'New York Slough', at: [-121.862, 38.0365], water: true, wide: true, narrow: false },
];
const HWY_LABEL = [-121.935, 38.0185];

export default async function draw(ctx) {
  const [topo, rows] = await Promise.all([ctx.json('data/pollution-map.topojson'), ctx.csv('data/pollution-map.csv')]);
  const byTract = new Map(rows.map((r) => [String(Number(r.tract)), r]));
  const layer = (name) => feature(topo, topo.objects[name]);
  const tracts = layer('tracts').features.map((f) => {
    const row = byTract.get(String(f.properties.tract));
    return { f, row, value: row && row.county === 'Contra Costa' ? ctx.num(row[MEASURE]) : NaN };
  });
  const water = layer('water'), roads = layer('roads'), canal = layer('canal'), site = layer('site');

  const C = {
    land: '#f7f6f3', edge: '#ffffff', ink: ctx.token('--ink'), muted: ctx.token('--muted'),
    water: ctx.token('--water'), canal: ctx.token('--canal'), road: '#9b9b9b',
    bins: ['#ecebe6', '#f6d9de', '#e597a4', ctx.token('--red')],
  };
  const fill = (v) => (Number.isFinite(v) ? C.bins[d3.bisectRight(BINS, v)] : C.land);
  const shown = (v) => Math.floor(v); // 92.6 → "92": never rounds a tract up past a threshold

  const body = ctx.$('.ph-body');
  ctx.onResize((width) => {
    const narrow = width < 520;
    const height = Math.round(width * (narrow ? 1.02 : 0.64));
    const [[w, s], [e, n]] = VIEW[narrow ? 'narrow' : 'wide'];
    const box = { type: 'MultiPoint', coordinates: [[w, s], [e, n], [w, n], [e, s]] };
    const projection = d3.geoMercator().fitExtent([[0, 0], [width, height]], box);
    const path = d3.geoPath(projection);
    const svg = ctx.s('svg', { class: 'pm-map', viewBox: `0 0 ${width} ${height}`, width, height, 'aria-hidden': 'true' });
    const g = (cls) => svg.appendChild(ctx.s('g', { class: cls }));

    const land = g('pm-tracts');
    for (const t of tracts) land.append(ctx.s('path', { d: path(t.f), fill: fill(t.value), stroke: C.edge, 'stroke-width': 0.8 }));
    // Outline the 90th-percentile tracts so they read as a group.
    const top = g('pm-top');
    for (const t of tracts) if (t.value >= TOP) top.append(ctx.s('path', { d: path(t.f), fill: 'none', stroke: '#7a0a1c', 'stroke-width': 1.2 }));
    g('pm-water').append(ctx.s('path', { d: path(water), fill: C.water }));
    g('pm-canal').append(ctx.s('path', { d: path(canal), fill: 'none', stroke: C.canal, 'stroke-width': 1.6 }));
    const road = g('pm-road');
    road.append(ctx.s('path', { d: path(roads), fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linejoin': 'round' }));
    road.append(ctx.s('path', { d: path(roads), fill: 'none', stroke: C.road, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
    // The plan area's callout goes first, so tract numbers can keep clear of it.
    const [sx, sy] = path.centroid({ type: 'FeatureCollection', features: site.features });
    const [lx, ly] = [sx - (narrow ? 52 : 64), sy + (narrow ? 46 : 42)];
    const [[px0, py0], [px1, py1]] = path.bounds({ type: 'FeatureCollection', features: site.features });
    const taken = [{ x0: lx - 62, x1: lx + 62, y0: ly - 14, y1: ly + 18 }, { x0: px0 - 3, x1: px1 + 3, y0: py0 - 3, y1: py1 + 3 }];
    const clear = (x, y, r) => !taken.some((b) => x + r > b.x0 && x - r < b.x1 && y + r > b.y0 && y - r < b.y1);
    // Place names and the highway label, also placed before the tract numbers.
    const fixed = PLACES.filter((p) => p[narrow ? 'narrow' : 'wide'])
      .map((p) => ({ ...p, xy: projection(p.at), cls: p.water ? 'pm-water-name' : 'pm-place' }))
      .concat([{ name: 'Hwy. 4', xy: projection(HWY_LABEL).map((v, i) => (i ? v - 7 : v)), cls: 'pm-road-name' }])
      .filter(({ xy: [x, y] }) => x > 0 && x < width && y > 0 && y < height);
    for (const { name, xy: [x, y] } of fixed) {
      const half = name.length * 3.9 + 4;
      taken.push({ x0: x - half, x1: x + half, y0: y - 11, y1: y + 3 });
    }

    // Percentile in each tract big enough to hold it.
    const labels = g('pm-values');
    for (const t of tracts) {
      if (!Number.isFinite(t.value)) continue;
      const spot = labelSpot(t.f, projection, [width, height]);
      const big = t.value >= TOP;
      if (!spot || spot.r < (big ? 9 : 8) || !clear(spot.x, spot.y, 7)) continue;
      labels.append(ctx.s('text', {
        x: spot.x, y: spot.y, dy: '0.35em', 'text-anchor': 'middle', class: big ? 'pm-value pm-value--top' : 'pm-value',
        fill: big ? '#fff' : C.ink, text: shown(t.value),
      }));
    }

    // The plan area, on top of everything.
    const plan = g('pm-site');
    for (const f of site.features) {
      plan.append(ctx.s('path', { d: path(f), fill: f.properties.phase === 1 ? C.ink : 'rgba(18,18,18,0.18)', stroke: C.ink, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }));
    }
    plan.append(ctx.s('path', { d: `M${sx - 3},${sy + 5}L${lx + 10},${ly - 13}`, stroke: C.ink, 'stroke-width': 1, fill: 'none' }));
    plan.append(halo(ctx.s('text', { x: lx, y: ly, 'text-anchor': 'middle', class: 'pm-callout' },
      ctx.s('tspan', { x: lx, dy: 0, text: 'Plan area:' }), ctx.s('tspan', { x: lx, dy: '1.15em', text: 'former golf course' }))));

    const names = g('pm-names');
    for (const { name, xy: [x, y], cls } of fixed) names.append(halo(ctx.s('text', { x, y, 'text-anchor': 'middle', class: cls, text: name })));

    body.replaceChildren(svg, ctx.h('p', { class: 'pm-note', text: 'Numbers are each tract’s statewide percentile; higher means more burdened. Tracts at the 90th percentile or higher are red.' }));
  });

  function halo(text) {
    text.setAttribute('paint-order', 'stroke');
    text.setAttribute('stroke', '#fff');
    text.setAttribute('stroke-width', '3');
    text.setAttribute('stroke-linejoin', 'round');
    return text;
  }
}

// The point inside a tract farthest from its edges (a coarse grid search in
// screen space), and how far that is: where a label fits best.
function labelSpot(f, projection, [width, height]) {
  const EDGE = 4; // keep labels this far inside the map's edges
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = polys.map((poly) => poly.map((ring) => ring.map((p) => projection(p))));
  let best = null;
  for (const poly of rings) {
    const xs = poly[0].map((p) => p[0]), ys = poly[0].map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.max(EDGE, Math.min(...xs)), Math.min(width - EDGE, Math.max(...xs)), Math.max(EDGE, Math.min(...ys)), Math.min(height - EDGE, Math.max(...ys))];
    if (x1 <= x0 || y1 <= y0) continue;
    const step = Math.max(2, Math.min(x1 - x0, y1 - y0) / 24);
    for (let x = x0 + step / 2; x < x1; x += step) {
      for (let y = y0 + step / 2; y < y1; y += step) {
        if (!inside([x, y], poly)) continue;
        let d = Math.min(x - EDGE, width - EDGE - x, y - EDGE, height - EDGE - y) * 2; // the map's edge counts, loosely
        for (const ring of poly) for (let i = 1; i < ring.length; i++) d = Math.min(d, segDist(ring[i - 1], ring[i], [x, y]));
        if (!best || d > best.r) best = { x, y, r: d };
      }
    }
  }
  return best;
}
function inside([px, py], poly) {
  let c = false;
  for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
  }
  return c;
}
function segDist([ax, ay], [bx, by], [px, py]) {
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
}
