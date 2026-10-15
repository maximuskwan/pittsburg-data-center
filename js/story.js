// Scrollytelling engine. You shouldn't need to edit this file to change the
// story: chapter text is in index.html and camera moves are in js/config.js.
import * as maplibregl from '../vendor/maplibre-gl/maplibre-gl.mjs';
import config from './config.js';
import { densify, snapOffset } from './snap.js';

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const framed = window.self !== window.top;
const recording = root.classList.contains('record');
const calibrating = root.classList.contains('calibrate');
const offline = params.has('offline'); // skip remote tiles (testing, or if a tile host is down)

if (framed && !calibrating && !params.has('static') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  root.classList.toggle('static', window.innerWidth < config.staticBelowWidthInIframe);
}
const isStatic = root.classList.contains('static');

const steps = [...document.querySelectorAll('.step')];
const chapterIds = steps.map((s) => s.dataset.chapter);
for (const id of chapterIds) {
  if (!config.chapters[id]) console.warn(`index.html has chapter "${id}" but js/config.js does not`);
}

for (const a of document.querySelectorAll('#story-link')) a.href = config.storyUrl;

// Screen-reader description of what the map or photo shows at each step.
for (const step of steps) {
  if (!step.dataset.alt) continue;
  const p = document.createElement('p');
  p.className = 'sr-only';
  p.textContent = `${config.chapters[step.dataset.chapter]?.photo ? 'Photo' : 'Map'}: ${step.dataset.alt}`;
  step.querySelector('.card').prepend(p);
}

const DATA = {
  states: 'data/states.geojson',
  counties: 'data/ca-counties.geojson',
  datacenters: 'data/datacenters.geojson',
  sites: 'data/bay-area-sites.geojson',
  route: 'data/carlmont-route.geojson',
  site: 'data/site-local.json',
};
const loadJSON = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
});

// ── Draft banner: unresolved TKs and placeholder data are impossible to miss ──
function updateDraftBanner(data) {
  const tks = document.querySelectorAll('mark.tk').length;
  const placeholders = Object.entries(data)
    .filter(([, fc]) => fc?.features?.some((f) => f.properties?.placeholder))
    .map(([name]) => name);
  if (config.site.placeholder) placeholders.push('site location (open ?calibrate)');
  if (!tks && !placeholders.length) return;
  const banner = document.getElementById('draft-banner');
  const parts = [];
  if (tks) parts.push(`${tks} TK item${tks === 1 ? '' : 's'}`);
  if (placeholders.length) parts.push(`placeholder data: ${placeholders.join(', ')}`);
  banner.textContent = `DRAFT — ${parts.join(' · ')}. This banner disappears when everything is resolved.`;
  banner.hidden = false;
}

// ── Static version ────────────────────────────────────────────────────────────
async function buildStatic() {
  const data = {};
  await Promise.all(['datacenters', 'sites', 'route'].map(async (k) => {
    data[k] = await loadJSON(DATA[k]).catch(() => null);
  }));
  updateDraftBanner(data);

  for (const step of steps) {
    const id = step.dataset.chapter;
    if (id === 'opener') continue;
    const fig = document.createElement('figure');
    fig.className = 'still';
    const img = new Image();
    img.src = config.chapters[id]?.photo || `media/stills/${id}.jpg`;
    img.alt = step.dataset.alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => fig.remove());
    fig.append(img);
    step.prepend(fig);
  }
}

// ── The project site: traced shapes in local meters, placed at config.site.anchor ──
function buildSite(local, anchor) {
  const [lng0, lat0] = anchor;
  const mPerLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ll = ([e, n]) => [lng0 + e / mPerLng, lat0 + n / 110540];
  const poly = (ring) => ({ type: 'Polygon', coordinates: [ring.map(ll)] });
  const centroid = (rings) => {
    const pts = rings.flatMap((r) => r.slice(0, -1));
    return ll([pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]);
  };
  const plan = {
    type: 'FeatureCollection',
    features: local.parcels.map((p) => ({ type: 'Feature', properties: { name: p.name, phase: p.phase }, geometry: poly(p.ring) })),
  };
  const canal = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: local.canal.map(ll) } }] };
  const model = {
    type: 'FeatureCollection',
    features: local.model.map((s) => ({ type: 'Feature', properties: { kind: s.kind, height: s.height, base: s.base || 0 }, geometry: poly(s.ring) })),
  };
  const [w, n, e, s] = local.calibration_image.bounds_m;
  const at = {
    plan: centroid(local.parcels.map((p) => p.ring)),
    phase1: centroid(local.parcels.filter((p) => p.phase === 1).map((p) => p.ring)),
    future: centroid(local.parcels.filter((p) => p.phase > 1).map((p) => p.ring)),
    building: centroid(local.model.filter((m) => m.kind === 'building').map((m) => m.ring)),
    generators: centroid(local.model.filter((m) => m.kind === 'generator').map((m) => m.ring)),
    substation: centroid(local.model.filter((m) => m.kind === 'substation-pad').map((m) => m.ring)),
  };
  return { ll, plan, canal, model, at, imageCorners: [ll([w, n]), ll([e, n]), ll([e, s]), ll([w, s])] };
}

// ── Map style ─────────────────────────────────────────────────────────────────
const C = {
  land: '#efeeea', // outside the U.S.
  us: '#ffffff',
  water: '#d6e8f5',
  stateLine: '#b3b3b3',
  county: '#c2c2c2',
  road: '#e4e4e4',
  roadMajor: '#cdcdcd',
  red: '#c8102e',
  redDark: '#8a0b20',
  redLight: '#f6d9de',
  canal: '#9cc8e6',
  ink: '#121212',
};
const fade = { duration: 900, delay: 0 };

// Every layer belongs to a group; config.js turns groups on/off by name.
// `opacity` lists each paint property to fade and its full-strength value.
function buildLayers() {
  const L = [];
  const add = (group, opacity, layer) => {
    for (const prop of Object.keys(opacity)) layer.paint[`${prop}-transition`] = fade;
    for (const prop of Object.keys(opacity)) layer.paint[prop] = 0;
    layer.layout = { ...(layer.layout || {}), visibility: 'none' };
    L.push({ group, opacity, layer });
  };

  add('states', { 'fill-opacity': 1 }, { id: 'states-fill', type: 'fill', source: 'states', paint: { 'fill-color': C.us } });
  add('california', { 'fill-opacity': 1 }, { id: 'ca-fill', type: 'fill', source: 'states', filter: ['==', ['get', 'name'], 'California'], paint: { 'fill-color': '#fdf2f4' } });
  add('contra-costa', { 'fill-opacity': 0.12 }, { id: 'cc-fill', type: 'fill', source: 'counties', filter: ['==', ['get', 'name'], 'Contra Costa'], paint: { 'fill-color': C.red } });
  if (!offline) {
    add('basemap', { 'fill-opacity': 1 }, { id: 'bm-water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': C.water } });
    add('basemap', { 'line-opacity': 1 }, {
      id: 'bm-roads-minor', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 10,
      filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary', 'minor']]],
      paint: { 'line-color': C.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 15, 2] },
    });
    add('basemap', { 'line-opacity': 1 }, {
      id: 'bm-roads-major', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 6,
      filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
      paint: { 'line-color': C.roadMajor, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 10, 1.2, 15, 4] },
    });
    add('aerial', { 'raster-opacity': 1 }, { id: 'aerial', type: 'raster', source: 'aerial', paint: { 'raster-saturation': -0.05 } });
  }
  add('states', { 'line-opacity': 1 }, { id: 'states-line', type: 'line', source: 'states', paint: { 'line-color': C.stateLine, 'line-width': 0.8 } });
  add('california', { 'line-opacity': 1 }, { id: 'ca-line', type: 'line', source: 'states', filter: ['==', ['get', 'name'], 'California'], paint: { 'line-color': C.red, 'line-width': 1.6 } });
  add('counties', { 'line-opacity': 1 }, { id: 'counties-line', type: 'line', source: 'counties', paint: { 'line-color': C.county, 'line-width': 0.7, 'line-dasharray': [3, 2] } });
  add('contra-costa', { 'line-opacity': 1 }, { id: 'cc-line', type: 'line', source: 'counties', filter: ['==', ['get', 'name'], 'Contra Costa'], paint: { 'line-color': C.red, 'line-width': 1.4 } });
  if (!offline) {
    add('basemap', { 'text-opacity': 1 }, {
      id: 'bm-places', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', minzoom: 8.5,
      filter: ['all',
        ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        ['!', ['in', ['get', 'name'], ['literal', ['Pittsburg', 'Santa Clara', 'Belmont']]]]],
      layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 12 },
      paint: { 'text-color': '#6b6b6b', 'text-halo-color': '#fff', 'text-halo-width': 1.4 },
    });
  }
  add('datacenters', { 'circle-opacity': 0.18 }, {
    id: 'dc-glow', type: 'circle', source: 'datacenters',
    paint: { 'circle-color': C.red, 'circle-blur': 0.8, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 8, 8, 14] },
  });
  add('datacenters', { 'circle-opacity': 1, 'circle-stroke-opacity': 1 }, {
    id: 'dc-dot', type: 'circle', source: 'datacenters',
    paint: { 'circle-color': C.red, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.6, 8, 5], 'circle-stroke-color': '#fff', 'circle-stroke-width': 0.6 },
  });
  add('sites', { 'circle-opacity': 0.2 }, {
    id: 'sites-glow', type: 'circle', source: 'sites',
    paint: { 'circle-color': C.red, 'circle-blur': 0.8, 'circle-radius': ['match', ['get', 'id'], 'santa-clara', 30, 18] },
  });
  add('sites', { 'circle-opacity': 1, 'circle-stroke-opacity': 1 }, {
    id: 'sites-dot', type: 'circle', source: 'sites',
    paint: { 'circle-color': ['match', ['get', 'id'], 'perseus', C.red, C.redDark], 'circle-radius': 6, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
  });
  add('route', { 'line-opacity': 1 }, {
    id: 'route-line', type: 'line', source: 'route', filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round' }, paint: { 'line-color': C.red, 'line-width': 2.5, 'line-dasharray': [1, 2] },
  });
  add('route', { 'circle-opacity': 1, 'circle-stroke-opacity': 1 }, {
    id: 'route-end', type: 'circle', source: 'route', filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-color': C.ink, 'circle-radius': 5, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
  });
  // The canal comes from OpenStreetMap so it sits exactly on the real water. The
  // line traced from the city's map is only a fallback (offline) and a reference
  // in ?calibrate, because the city drew its canal by hand.
  const canalWidth = ['interpolate', ['linear'], ['zoom'], 13, 2, 17, 9];
  if (!offline) {
    add('canal', { 'line-opacity': 1 }, {
      id: 'canal-osm', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway',
      filter: ['==', ['get', 'class'], 'canal'],
      layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.canal, 'line-width': canalWidth },
    });
  }
  add(offline ? 'canal' : 'canal-traced', { 'line-opacity': 1 }, {
    id: 'canal-line', type: 'line', source: 'canal', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: offline
      ? { 'line-color': C.canal, 'line-width': canalWidth }
      : { 'line-color': '#1f6fb2', 'line-width': 2, 'line-dasharray': [2, 2] },
  });
  add('plan', { 'fill-opacity': 0.22 }, { id: 'plan-fill', type: 'fill', source: 'plan', filter: ['==', ['get', 'phase'], 1], paint: { 'fill-color': C.red } });
  add('plan', { 'fill-opacity': 0.07 }, { id: 'plan-fill-future', type: 'fill', source: 'plan', filter: ['>', ['get', 'phase'], 1], paint: { 'fill-color': C.red } });
  add('plan', { 'line-opacity': 1 }, {
    id: 'plan-line-future', type: 'line', source: 'plan', filter: ['>', ['get', 'phase'], 1],
    paint: { 'line-color': C.red, 'line-width': 1.8, 'line-dasharray': [3, 2] },
  });
  add('plan', { 'line-opacity': 1 }, {
    id: 'plan-line', type: 'line', source: 'plan', filter: ['==', ['get', 'phase'], 1],
    paint: { 'line-color': C.red, 'line-width': 3 },
  });
  add('model', { 'fill-extrusion-opacity': 0.95 }, {
    id: 'model', type: 'fill-extrusion', source: 'model',
    paint: {
      'fill-extrusion-color': ['match', ['get', 'kind'],
        'building', C.red,
        'generator', '#4a0510',
        'substation-pad', '#bdbdbd',
        C.redDark],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-vertical-gradient': true,
    },
  });
  return L;
}

const AERIAL = {
  usgs: {
    tiles: ['https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'],
    maxzoom: 16,
    attribution: 'Imagery: <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
  },
  esri: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    maxzoom: 19,
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
};

// ── Interactive version ───────────────────────────────────────────────────────
async function buildInteractive() {
  const data = Object.fromEntries(await Promise.all(
    Object.entries(DATA).map(async ([k, url]) => [k, await loadJSON(url)]),
  ));
  updateDraftBanner(data);

  let anchor = [...config.site.anchor];
  let site = buildSite(data.site, anchor);

  // The Pittsburg dot and the end of the Carlmont line follow the site.
  const sitesData = () => ({
    ...data.sites,
    features: [...data.sites.features, { type: 'Feature', properties: { id: 'perseus' }, geometry: { type: 'Point', coordinates: site.at.phase1 } }],
  });
  const carlmont = data.route.features.find((f) => f.geometry.type === 'Point').geometry.coordinates;
  const routeData = (t = 1) => {
    const b = site.at.phase1;
    const end = [carlmont[0] + (b[0] - carlmont[0]) * t, carlmont[1] + (b[1] - carlmont[1]) * t];
    return {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [carlmont, end] } },
        { type: 'Feature', properties: { name: 'Carlmont High School' }, geometry: { type: 'Point', coordinates: carlmont } },
      ],
    };
  };

  const aerial = AERIAL[config.aerial] || AERIAL.usgs;
  const layers = buildLayers();
  const sources = {
    states: { type: 'geojson', data: data.states, attribution: 'Boundaries: U.S. Census Bureau, City of Pittsburg' },
    counties: { type: 'geojson', data: data.counties },
    datacenters: { type: 'geojson', data: data.datacenters, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
    sites: { type: 'geojson', data: sitesData() },
    route: { type: 'geojson', data: routeData() },
    plan: { type: 'geojson', data: site.plan },
    canal: { type: 'geojson', data: site.canal },
    model: { type: 'geojson', data: site.model },
  };
  if (!offline) {
    sources.openmaptiles = { type: 'vector', url: config.vectorTiles };
    sources.aerial = { type: 'raster', tiles: aerial.tiles, tileSize: 256, maxzoom: aerial.maxzoom, attribution: aerial.attribution };
  }
  if (calibrating) {
    sources.nop = { type: 'image', url: data.site.calibration_image.file, coordinates: site.imageCorners };
    const at = layers.findIndex((l) => l.layer.id === 'states-line');
    layers.splice(at, 0, { group: 'nop', opacity: { 'raster-opacity': 0.5 }, layer: { id: 'nop', type: 'raster', source: 'nop', paint: { 'raster-opacity': 0 }, layout: { visibility: 'none' } } });
  }

  const first = config.chapters[chapterIds[0]];
  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      glyphs: config.glyphs,
      light: { anchor: 'viewport', color: '#ffffff', intensity: 0.35, position: [1.15, 210, 30] },
      sources,
      layers: [{ id: 'background', type: 'background', paint: { 'background-color': C.land } }, ...layers.map((l) => l.layer)],
    },
    bounds: first.bounds, center: first.center, zoom: first.zoom ?? 3,
    interactive: calibrating, // scrolling drives the story, never the map
    attributionControl: { compact: true, customAttribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">© OpenMapTiles</a>' },
    fadeDuration: 300,
    preserveDrawingBuffer: recording,
    maxPitch: 70,
  });
  map.on('error', (e) => console.warn('map:', e.error?.message || e));

  // Group opacity, with layers switched off entirely once faded out so hidden
  // layers (e.g. aerial imagery at national zoom) don't download tiles.
  const groupState = {};
  const setGroup = (group, value) => {
    if (groupState[group] === value) return;
    groupState[group] = value;
    for (const { group: g, opacity, layer } of layers) {
      if (g !== group) continue;
      if (value > 0) map.setLayoutProperty(layer.id, 'visibility', 'visible');
      for (const [prop, full] of Object.entries(opacity)) map.setPaintProperty(layer.id, prop, full * value);
      if (value === 0) {
        setTimeout(() => { if (groupState[group] === 0) map.setLayoutProperty(layer.id, 'visibility', 'none'); }, fade.duration + 50);
      }
    }
  };
  const groups = [...new Set(layers.map((l) => l.group))];

  // DOM labels (no font downloads, crisp type, easy to restyle in CSS).
  const resolve = (where) => {
    if (Array.isArray(where)) return where;
    if (where.at) return site.at[where.at];
    if (where.site) return site.ll(where.site);
    throw new Error(`Bad label position ${JSON.stringify(where)}`);
  };
  const OFFSET = { left: [12, 0], right: [-12, 0], top: [0, 12], bottom: [0, -14] };
  const labels = {};
  for (const [id, l] of Object.entries(config.labels)) {
    // MapLibre sets inline opacity on the marker element itself, so fade an inner element.
    const el = document.createElement('div');
    const inner = document.createElement('div');
    inner.className = `label${l.minor ? ' label--minor' : ''}${l.accent ? ' label--accent' : ''}`;
    inner.innerHTML = `<b></b>${l.sub ? '<small></small>' : ''}`;
    el.append(inner);
    el.querySelector('b').textContent = l.text;
    if (l.sub) el.querySelector('small').textContent = l.sub;
    const anchorSide = l.anchor || 'left';
    labels[id] = new maplibregl.Marker({ element: el, anchor: anchorSide, offset: OFFSET[anchorSide] || [0, 0] }).setLngLat(resolve(l.lngLat)).addTo(map);
  }

  // When the camera moves (e.g. the orbit), a label that would cover one listed
  // earlier in the chapter's `labels` fades out until there's room again.
  let activeLabels = [];
  let declutterQueued = false;
  const declutter = () => {
    declutterQueued = false;
    const placed = [];
    for (const id of activeLabels) {
      const inner = labels[id]?.getElement().firstChild;
      if (!inner) continue;
      const r = inner.getBoundingClientRect();
      const hit = placed.some((p) => r.left < p.right + 4 && r.right > p.left - 4 && r.top < p.bottom + 2 && r.bottom > p.top - 2);
      inner.classList.toggle('collide', hit);
      if (!hit) placed.push(r);
    }
  };
  map.on('move', () => {
    if (declutterQueued || !activeLabels.length) return;
    declutterQueued = true;
    requestAnimationFrame(declutter);
  });

  // Animated route line from Carlmont to the site.
  let routeAnim = 0;
  const drawRoute = (instant) => {
    cancelAnimationFrame(routeAnim);
    const set = (t) => map.getSource('route').setData(routeData(t));
    if (instant) return set(1);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1600);
      set(1 - (1 - t) ** 3);
      if (t < 1) routeAnim = requestAnimationFrame(tick);
    };
    set(0);
    routeAnim = requestAnimationFrame(tick);
  };

  // Slow orbit around the model.
  let orbiting = false;
  let orbitFrame = 0;
  const startOrbit = () => {
    if (orbiting) return;
    orbiting = true;
    let last = performance.now();
    const spin = (now) => {
      if (!orbiting) return;
      map.setBearing(map.getBearing() - (now - last) * 0.004); // ~4°/sec
      last = now;
      orbitFrame = requestAnimationFrame(spin);
    };
    orbitFrame = requestAnimationFrame(spin);
  };
  const stopOrbit = () => { orbiting = false; cancelAnimationFrame(orbitFrame); };

  // Photos cross-fade over the map. Faded with requestAnimationFrame rather than
  // CSS so the video recorder (which runs on a virtual clock) captures the fade.
  const photoLayer = document.getElementById('photo-layer');
  const photos = {};
  for (const [id, ch] of Object.entries(config.chapters)) {
    if (!ch.photo || photos[ch.photo]) continue;
    const img = new Image();
    img.src = ch.photo;
    img.alt = '';
    img.decoding = 'async';
    photoLayer.append(img);
    photos[ch.photo] = { img, opacity: 0, target: 0 };
  }
  // Photo to photo: the new one fades in on top while the old one stays fully
  // opaque underneath, so the map never shows through mid-fade. Photo to map:
  // everything fades out.
  let photoFrame = 0;
  let topZ = 1;
  let photoRequest = 0;
  const setOpacity = (p, o) => { p.opacity = o; p.img.style.opacity = o; };
  const showPhoto = async (src) => {
    const request = ++photoRequest;
    const target = src ? photos[src] : null;
    cancelAnimationFrame(photoFrame);
    if (target && !target.img.complete) {
      await target.img.decode().catch(() => {});
      if (request !== photoRequest) return; // the reader has already moved on
    }
    if (target && target.opacity < 1) target.img.style.zIndex = ++topZ;
    let last = performance.now();
    const step = (now) => {
      const delta = (now - last) / 900; // 0.9 s fade
      last = now;
      let moving = false;
      if (target) {
        setOpacity(target, Math.min(1, target.opacity + delta));
        if (target.opacity < 1) moving = true;
        else for (const p of Object.values(photos)) if (p !== target && p.opacity) setOpacity(p, 0);
      } else {
        for (const p of Object.values(photos)) {
          if (p.opacity > 0) { setOpacity(p, Math.max(0, p.opacity - delta)); moving = true; }
        }
      }
      if (moving) photoFrame = requestAnimationFrame(step);
    };
    photoFrame = requestAnimationFrame(step);
  };

  const padding = () => {
    const w = map.getContainer().clientWidth;
    const h = map.getContainer().clientHeight;
    if (recording) {
      // Clean video: frame the subject in the middle. Captioned: leave room for the caption at lower left.
      return root.classList.contains('captions')
        ? { top: 60, bottom: 60, left: Math.round(w * 0.42), right: 60 }
        : { top: 60, bottom: 60, left: 60, right: 60 };
    }
    if (w <= 700) return { top: 70, left: 80, right: 80, bottom: Math.round(h * 0.42) };
    const card = Math.min(400, w * 0.4) + Math.max(48, w * 0.05);
    return { top: 60, bottom: 60, left: card + 40, right: 60 };
  };

  // Center and zoom that fit `bounds` inside the padded viewport at a given
  // bearing (Web Mercator, 512px tiles). Done by hand because cameraForBounds
  // also folds in whatever padding the map currently has.
  const mercX = (lng) => (lng + 180) / 360;
  const mercY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
  const unMercY = (y) => (360 / Math.PI) * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - 90;
  function fitBounds([[w, s], [e, n]], pad, bearing) {
    const x0 = mercX(w), x1 = mercX(e), y0 = mercY(n), y1 = mercY(s);
    const a = (bearing * Math.PI) / 180;
    const xs = [], ys = [];
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
      xs.push(x * Math.cos(a) - y * Math.sin(a));
      ys.push(x * Math.sin(a) + y * Math.cos(a));
    }
    const el = map.getContainer();
    const availW = Math.max(50, el.clientWidth - pad.left - pad.right);
    const availH = Math.max(50, el.clientHeight - pad.top - pad.bottom);
    const scale = Math.min(availW / (Math.max(...xs) - Math.min(...xs)), availH / (Math.max(...ys) - Math.min(...ys)));
    return {
      center: [((x0 + x1) / 2) * 360 - 180, unMercY((y0 + y1) / 2)],
      zoom: Math.log2(scale / 512),
    };
  }

  const caption = document.getElementById('caption');
  let current = null;

  function goTo(id, { instant = false } = {}) {
    const ch = config.chapters[id];
    if (!ch) return;
    const prev = current;
    current = id;

    for (const g of groups) setGroup(g, ch.layers?.[g] ?? 0);
    for (const [lid, m] of Object.entries(labels)) m.getElement().firstChild.classList.toggle('on', !!ch.labels?.includes(lid));
    activeLabels = ch.labels || [];
    requestAnimationFrame(declutter);
    if (ch.layers?.route && prev !== id) drawRoute(instant);
    showPhoto(ch.photo);

    if (recording) {
      const step = steps.find((s) => s.dataset.chapter === id);
      caption.className = id === 'opener' ? 'title on' : 'on';
      caption.innerHTML = step.querySelector('.card').innerHTML;
    }

    // Photo chapters leave the map where it is (it's hidden behind the photo).
    if (ch.photo && prev && !instant) return;

    const bearing = ch.bearing ?? 0;
    const pitch = ch.pitch ?? 0;
    // Padding keeps the subject in the part of the screen the text card doesn't cover.
    const pad = id === 'opener' ? { top: 40, bottom: 40, left: 40, right: 40 } : padding();
    let center = ch.center;
    let zoom = ch.zoom;
    if (ch.site) center = site.at[ch.site];
    if (ch.bounds) ({ center, zoom } = fitBounds(ch.bounds, pad, bearing));
    else if (map.getContainer().clientWidth <= 700) zoom -= 0.6; // phones see less; pull back a little
    stopOrbit();
    const target = { center, zoom, bearing, pitch, padding: pad };
    if (instant || !ch.duration) map.jumpTo(target);
    else map.flyTo({ ...target, duration: ch.duration, essential: true, curve: 1.3 });

    if (ch.orbit) {
      if (instant || !ch.duration) startOrbit();
      else map.once('moveend', () => { if (current === id) startOrbit(); });
    }
  }

  const ready = new Promise((done) => map.on('load', () => {
    if (!calibrating) goTo(chapterIds[0], { instant: true });
    done();
  }));
  window.story = { map, config, chapters: chapterIds, goTo, ready, stopOrbit };

  await ready;
  window.story.loaded = true;
  if (calibrating) return startCalibration();
  if (recording) return;

  const scroller = scrollama();
  scroller
    .setup({ step: '.step', offset: 0.6 })
    .onStepEnter(({ element }) => goTo(element.dataset.chapter));

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      scroller.resize();
      const id = current;
      current = null;
      goTo(id, { instant: true });
    }, 200);
  });

  // ── ?calibrate: line the traced site up with the real aerial imagery ────────
  function startCalibration() {
    for (const g of ['aerial', 'plan', 'canal', 'canal-traced', 'nop', 'basemap']) setGroup(g, g === 'basemap' ? 0 : 1);
    map.jumpTo({ center: site.at.plan, zoom: 15.4, pitch: 0, bearing: 0 });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');

    const panel = document.getElementById('calibrate-panel');
    panel.hidden = false;
    panel.innerHTML = `
      <h2>Line up the site</h2>
      <ol>
        <li>The faded picture is the city’s Plan Area map (NOP, Attachment 1) with the red outline traced from it. Underneath is the real aerial imagery.</li>
        <li>Click <b>Snap to canal</b>. It slides everything so the canal traced from the city’s map (dark dashed line) lands on the real canal (light blue line, from OpenStreetMap). Or press the <b>arrow keys</b> to slide by hand (hold <b>Shift</b> for bigger steps). Drag or scroll to look around.</li>
        <li>Copy the line below into <b>js/config.js</b> as <code style="display:inline;padding:0 3px">site.anchor</code>, and set <code style="display:inline;padding:0 3px">placeholder: false</code>.</li>
      </ol>
      <label>Overlay opacity <input id="cal-opacity" type="range" min="0" max="1" step="0.05" value="0.5"></label>
      <code id="cal-out"></code>
      <button id="cal-snap" type="button">Snap to canal</button><button id="cal-copy" type="button">Copy</button><button id="cal-reset" type="button">Reset</button>
      <p id="cal-msg" style="margin:8px 0 0"></p>`;
    const out = panel.querySelector('#cal-out');
    const show = () => { out.textContent = `anchor: [${anchor[0].toFixed(6)}, ${anchor[1].toFixed(6)}],`; };
    const apply = () => {
      site = buildSite(data.site, anchor);
      map.getSource('plan').setData(site.plan);
      map.getSource('canal').setData(site.canal);
      map.getSource('model').setData(site.model);
      map.getSource('nop').setCoordinates(site.imageCorners);
      show();
    };
    const mPerLng = () => 111320 * Math.cos((anchor[1] * Math.PI) / 180);
    window.addEventListener('keydown', (e) => {
      const m = e.shiftKey ? 10 : 2;
      const d = { ArrowLeft: [-m, 0], ArrowRight: [m, 0], ArrowUp: [0, m], ArrowDown: [0, -m] }[e.key];
      if (!d) return;
      e.preventDefault();
      anchor = [anchor[0] + d[0] / mPerLng(), anchor[1] + d[1] / 110540];
      apply();
    });
    panel.querySelector('#cal-opacity').addEventListener('input', (e) => map.setPaintProperty('nop', 'raster-opacity', +e.target.value));
    panel.querySelector('#cal-copy').addEventListener('click', () => navigator.clipboard?.writeText(out.textContent));
    panel.querySelector('#cal-reset').addEventListener('click', () => { anchor = [...config.site.anchor]; apply(); });
    const msg = panel.querySelector('#cal-msg');
    panel.querySelector('#cal-snap').addEventListener('click', () => {
      // OpenStreetMap canal lines currently loaded, in meters from the anchor.
      const toLocal = ([lng, lat]) => [(lng - anchor[0]) * mPerLng(), (lat - anchor[1]) * 110540];
      const lines = [];
      for (const f of map.querySourceFeatures('openmaptiles', { sourceLayer: 'waterway', filter: ['==', ['get', 'class'], 'canal'] })) {
        const g = f.geometry;
        const parts = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
        for (const p of parts) lines.push(p.map(toLocal));
      }
      const result = snapOffset(densify(data.site.canal), lines);
      if (!result || result.matched < 10) {
        msg.textContent = 'Couldn’t find the canal in the map data here. Zoom out a little so the canal is on screen, or line it up with the arrow keys.';
        return;
      }
      anchor = [anchor[0] + result.east / mPerLng(), anchor[1] + result.north / 110540];
      apply();
      msg.textContent = `Moved ${Math.abs(result.east).toFixed(0)} m ${result.east >= 0 ? 'east' : 'west'} and ${Math.abs(result.north).toFixed(0)} m ${result.north >= 0 ? 'north' : 'south'}. The traced canal is now within about ${result.meanError.toFixed(0)} m of the real one on average. Check by eye, then copy.`;
    });
    show();
  }
}

if (isStatic) buildStatic();
else buildInteractive().catch((err) => {
  // If the map can't start (very old browser, WebGL disabled), fall back to the static version.
  console.error(err);
  root.classList.add('static');
  buildStatic();
});
