// Scrollytelling engine. You shouldn't need to edit this file to change the
// story: chapter text is in index.html and camera moves are in js/config.js.
import * as maplibregl from '../vendor/maplibre-gl/maplibre-gl.mjs';
import config from './config.js';

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const framed = window.self !== window.top;
const recording = root.classList.contains('record');
const offline = params.has('offline'); // skip remote tiles (testing, or if a tile host is down)

if (framed && !params.has('static') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  root.classList.toggle('static', window.innerWidth < config.staticBelowWidthInIframe);
}
const isStatic = root.classList.contains('static');

const steps = [...document.querySelectorAll('.step')];
const chapterIds = steps.map((s) => s.dataset.chapter);
for (const id of chapterIds) {
  if (!config.chapters[id]) console.warn(`index.html has chapter "${id}" but js/config.js does not`);
}

for (const a of document.querySelectorAll('#story-link')) a.href = config.storyUrl;

// Screen-reader description of what the map shows at each step.
for (const step of steps) {
  if (!step.dataset.alt) continue;
  const p = document.createElement('p');
  p.className = 'sr-only';
  p.textContent = `Map: ${step.dataset.alt}`;
  step.querySelector('.card').prepend(p);
}

const DATA = {
  states: 'data/states.geojson',
  counties: 'data/ca-counties.geojson',
  datacenters: 'data/datacenters.geojson',
  sites: 'data/bay-area-sites.geojson',
  route: 'data/carlmont-route.geojson',
  parcel: 'data/parcel.geojson',
};
const loadJSON = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
});

// ── Draft banner: unresolved TKs and placeholder data are impossible to miss ──
async function updateDraftBanner(data) {
  const tks = document.querySelectorAll('mark.tk').length;
  const placeholders = Object.entries(data)
    .filter(([, fc]) => fc?.features?.some((f) => f.properties?.placeholder))
    .map(([name]) => name);
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
  await Promise.all(['datacenters', 'sites', 'route', 'parcel'].map(async (k) => {
    data[k] = await loadJSON(DATA[k]).catch(() => null);
  }));
  updateDraftBanner(data);

  for (const step of steps) {
    const id = step.dataset.chapter;
    const chapter = config.chapters[id] || {};
    if (id === 'opener') continue;
    const fig = document.createElement('figure');
    fig.className = 'still';
    if (chapter.video && config.droneVideo) {
      const v = document.createElement('video');
      Object.assign(v, { controls: true, muted: true, playsInline: true, preload: 'metadata' });
      v.poster = config.droneVideo.poster;
      v.setAttribute('aria-label', step.dataset.alt || '');
      for (const [type, src] of [['video/webm', config.droneVideo.webm], ['video/mp4', config.droneVideo.mp4]]) {
        if (!src) continue;
        const s = document.createElement('source');
        Object.assign(s, { src, type });
        v.append(s);
      }
      v.lastElementChild?.addEventListener('error', () => fig.remove());
      fig.append(v);
    } else {
      const img = new Image();
      img.src = `media/stills/${id}.jpg`;
      img.alt = step.dataset.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => fig.remove());
      fig.append(img);
    }
    step.prepend(fig);
  }
}

// ── Map style ─────────────────────────────────────────────────────────────────
const C = {
  land: '#0e131a',
  us: '#18202a',
  water: '#05080c',
  stateLine: '#3a4553',
  county: '#4a5666',
  road: '#36404c',
  roadMajor: '#4d5866',
  accent: '#ffb22e',
  hot: '#ff6b3d',
  white: '#f4f6f8',
};
const fade = { duration: 900, delay: 0 };

// Every layer belongs to a group; config.js turns groups on/off by name.
// `opacity` lists each paint property to fade and its full-strength value.
function buildLayers() {
  const L = [];
  const add = (group, opacity, layer) => {
    for (const prop of Object.keys(opacity)) layer.paint[`${prop}-transition`] = fade;
    for (const [prop] of Object.entries(opacity)) layer.paint[prop] = 0;
    layer.layout = { ...(layer.layout || {}), visibility: 'none' };
    L.push({ group, opacity, layer });
  };

  add('states', { 'fill-opacity': 1 }, { id: 'states-fill', type: 'fill', source: 'states', paint: { 'fill-color': C.us } });
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
    add('aerial', { 'raster-opacity': 1 }, {
      id: 'aerial', type: 'raster', source: 'aerial',
      paint: { 'raster-saturation': -0.1, 'raster-brightness-max': 0.92, 'raster-contrast': 0.05 },
    });
  }
  add('states', { 'line-opacity': 1 }, { id: 'states-line', type: 'line', source: 'states', paint: { 'line-color': C.stateLine, 'line-width': 0.8 } });
  add('california', { 'fill-opacity': 0.5 }, { id: 'ca-fill', type: 'fill', source: 'states', filter: ['==', ['get', 'name'], 'California'], paint: { 'fill-color': '#243243' } });
  add('california', { 'line-opacity': 1 }, { id: 'ca-line', type: 'line', source: 'states', filter: ['==', ['get', 'name'], 'California'], paint: { 'line-color': C.white, 'line-width': 1.5 } });
  add('counties', { 'line-opacity': 0.7 }, { id: 'counties-line', type: 'line', source: 'counties', paint: { 'line-color': C.county, 'line-width': 0.7, 'line-dasharray': [3, 2] } });
  add('contra-costa', { 'fill-opacity': 0.1 }, { id: 'cc-fill', type: 'fill', source: 'counties', filter: ['==', ['get', 'name'], 'Contra Costa'], paint: { 'fill-color': C.accent } });
  add('contra-costa', { 'line-opacity': 0.9 }, { id: 'cc-line', type: 'line', source: 'counties', filter: ['==', ['get', 'name'], 'Contra Costa'], paint: { 'line-color': C.accent, 'line-width': 1.2 } });
  if (!offline) {
    add('basemap', { 'text-opacity': 0.85 }, {
      id: 'bm-places', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', minzoom: 8.5,
      filter: ['all',
        ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        ['!', ['in', ['get', 'name'], ['literal', ['Pittsburg', 'Santa Clara', 'Belmont']]]]],
      layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 12 },
      paint: { 'text-color': '#8995a3', 'text-halo-color': '#000', 'text-halo-width': 1.2 },
    });
  }
  add('datacenters', { 'circle-opacity': 0.25 }, {
    id: 'dc-glow', type: 'circle', source: 'datacenters',
    paint: { 'circle-color': C.accent, 'circle-blur': 1, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 9, 8, 16] },
  });
  add('datacenters', { 'circle-opacity': 0.95 }, {
    id: 'dc-dot', type: 'circle', source: 'datacenters',
    paint: { 'circle-color': C.accent, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.6, 8, 5] },
  });
  add('sites', { 'circle-opacity': 0.35 }, {
    id: 'sites-glow', type: 'circle', source: 'sites',
    paint: { 'circle-color': ['match', ['get', 'id'], 'perseus', C.hot, C.accent], 'circle-blur': 1, 'circle-radius': ['match', ['get', 'id'], 'santa-clara', 30, 18] },
  });
  add('sites', { 'circle-opacity': 1, 'circle-stroke-opacity': 1 }, {
    id: 'sites-dot', type: 'circle', source: 'sites',
    paint: { 'circle-color': ['match', ['get', 'id'], 'perseus', C.hot, C.accent], 'circle-radius': 6, 'circle-stroke-color': '#000', 'circle-stroke-width': 1.5 },
  });
  add('route', { 'line-opacity': 0.9 }, {
    id: 'route-line', type: 'line', source: 'route', filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round' }, paint: { 'line-color': C.white, 'line-width': 2.5, 'line-dasharray': [1, 2] },
  });
  add('route', { 'circle-opacity': 1, 'circle-stroke-opacity': 1 }, {
    id: 'route-end', type: 'circle', source: 'route', filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-color': C.white, 'circle-radius': 5, 'circle-stroke-color': '#000', 'circle-stroke-width': 1.5 },
  });
  add('parcel', { 'fill-opacity': 0.14 }, { id: 'parcel-fill', type: 'fill', source: 'parcel', paint: { 'fill-color': C.hot } });
  add('parcel', { 'line-opacity': 0.45 }, { id: 'parcel-glow', type: 'line', source: 'parcel', paint: { 'line-color': C.hot, 'line-width': 10, 'line-blur': 6 } });
  add('parcel', { 'line-opacity': 1 }, { id: 'parcel-line', type: 'line', source: 'parcel', paint: { 'line-color': C.hot, 'line-width': 2.5 } });
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
  const fullRoute = data.route.features.find((f) => f.geometry.type === 'LineString')?.geometry.coordinates;

  const aerial = AERIAL[config.aerial] || AERIAL.usgs;
  const layers = buildLayers();
  const sources = {
    states: { type: 'geojson', data: data.states, attribution: 'Boundaries: U.S. Census Bureau' },
    counties: { type: 'geojson', data: data.counties },
    datacenters: { type: 'geojson', data: data.datacenters, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
    sites: { type: 'geojson', data: data.sites },
    route: { type: 'geojson', data: data.route },
    parcel: { type: 'geojson', data: data.parcel },
  };
  if (!offline) {
    sources.openmaptiles = { type: 'vector', url: config.vectorTiles };
    sources.aerial = { type: 'raster', tiles: aerial.tiles, tileSize: 256, maxzoom: aerial.maxzoom, attribution: aerial.attribution };
  }

  const first = config.chapters[chapterIds[0]];
  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      glyphs: config.glyphs,
      sources,
      layers: [{ id: 'background', type: 'background', paint: { 'background-color': C.land } }, ...layers.map((l) => l.layer)],
    },
    bounds: first.bounds, center: first.center, zoom: first.zoom ?? 3,
    interactive: false, // scrolling drives the story, never the map
    attributionControl: { compact: true, customAttribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">© OpenMapTiles</a>' },
    fadeDuration: 300,
    preserveDrawingBuffer: recording,
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
  const OFFSET = { left: [12, 0], right: [-12, 0], top: [0, 12], bottom: [0, -14] };
  const labels = {};
  for (const [id, l] of Object.entries(config.labels)) {
    // MapLibre sets inline opacity on the marker element itself, so fade an inner element.
    const el = document.createElement('div');
    const inner = document.createElement('div');
    inner.className = `label${l.minor ? ' label--minor' : ''}${id === 'perseus' ? ' label--accent' : ''}`;
    inner.innerHTML = `<b></b>${l.sub ? '<small></small>' : ''}`;
    el.append(inner);
    el.querySelector('b').textContent = l.text;
    if (l.sub) el.querySelector('small').textContent = l.sub;
    const anchor = l.anchor || 'left';
    labels[id] = new maplibregl.Marker({ element: el, anchor, offset: OFFSET[anchor] || [0, 0] }).setLngLat(l.lngLat).addTo(map);
  }

  // Animated route line from Carlmont to the site.
  let routeAnim = 0;
  const drawRoute = (instant) => {
    cancelAnimationFrame(routeAnim);
    if (!fullRoute) return;
    const set = (t) => {
      const [a, b] = fullRoute;
      const end = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      map.getSource('route').setData({
        ...data.route,
        features: data.route.features.map((f) => (f.geometry.type === 'LineString' ? { ...f, geometry: { ...f.geometry, coordinates: [a, end] } } : f)),
      });
    };
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

  // Slow orbit for the last chapter.
  let orbiting = false;
  let orbitFrame = 0;
  const startOrbit = () => {
    if (orbiting) return;
    orbiting = true;
    let last = performance.now();
    const spin = (now) => {
      if (!orbiting) return;
      map.setBearing(map.getBearing() - (now - last) * 0.0025); // ~2.5°/sec
      last = now;
      orbitFrame = requestAnimationFrame(spin);
    };
    orbitFrame = requestAnimationFrame(spin);
  };
  const stopOrbit = () => { orbiting = false; cancelAnimationFrame(orbitFrame); };

  // Drone video cross-fade.
  const videoLayer = document.getElementById('video-layer');
  const video = document.getElementById('drone');
  let videoFailed = !config.droneVideo || recording;
  const showVideo = (on) => {
    if (videoFailed) return;
    if (on) {
      if (!video.childElementCount) {
        video.poster = config.droneVideo.poster || '';
        for (const [type, src] of [['video/webm', config.droneVideo.webm], ['video/mp4', config.droneVideo.mp4]]) {
          if (!src) continue;
          const s = document.createElement('source');
          Object.assign(s, { src, type });
          video.append(s);
        }
        video.lastElementChild.addEventListener('error', () => { videoFailed = true; videoLayer.classList.remove('on'); });
        video.load();
      }
      video.play().then(() => videoLayer.classList.add('on')).catch(() => {});
    } else {
      videoLayer.classList.remove('on');
      setTimeout(() => { if (!videoLayer.classList.contains('on')) video.pause(); }, 1700);
    }
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
    if (ch.layers?.route && prev !== id) drawRoute(instant);

    const bearing = ch.bearing ?? 0;
    const pitch = ch.pitch ?? 0;
    // Padding keeps the subject in the part of the screen the text card doesn't cover.
    const pad = id === 'opener' ? { top: 40, bottom: 40, left: 40, right: 40 } : padding();
    let { center, zoom } = ch;
    if (ch.bounds) ({ center, zoom } = fitBounds(ch.bounds, pad, bearing));
    else if (map.getContainer().clientWidth <= 700) {
      zoom -= 0.6; // phones see less; pull back a little
    }
    stopOrbit();
    const target = { center, zoom, bearing, pitch, padding: pad };
    if (instant || !ch.duration) map.jumpTo(target);
    else map.flyTo({ ...target, duration: ch.duration, essential: true, curve: 1.3 });

    if (ch.orbit) {
      if (instant || !ch.duration) startOrbit();
      else map.once('moveend', () => { if (current === id) startOrbit(); });
    }
    showVideo(!!ch.video);

    if (recording) {
      const step = steps.find((s) => s.dataset.chapter === id);
      caption.className = id === 'opener' ? 'title on' : 'on';
      caption.innerHTML = step.querySelector('.card').innerHTML;
    }
  }

  const ready = new Promise((resolve) => map.on('load', () => {
    goTo(chapterIds[0], { instant: true });
    resolve();
  }));
  window.story = { map, config, chapters: chapterIds, goTo, ready, stopOrbit };

  await ready;
  window.story.loaded = true;
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
}

if (isStatic) buildStatic();
else buildInteractive().catch((err) => {
  // If the map can't start (very old browser, WebGL disabled), fall back to the static version.
  console.error(err);
  root.classList.add('static');
  buildStatic();
});
