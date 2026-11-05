// Builds the data for the CalEnviroScreen map (graphics/pollution-map):
//
//   data/pollution-map.topojson   tract outlines, water, Highway 4, the canal,
//                                 city limits and the plan area (WGS84)
//   data/pollution-map.csv        one row per tract: its percentiles, with a source column
//
// Sources:
//   CalEnviroScreen 5.0, OEHHA (final, released July 1, 2026), shapefile from
//     https://data.ca.gov/dataset/calenviroscreen-5-0
//   U.S. Census Bureau TIGER/Line 2025: roads and water for Contra Costa,
//     Solano and Sacramento counties; California places (city limits)
//   The plan area: data/site-local.json placed at site.anchor in js/config.js,
//     the same outline the intro draws.
//
// Run `npm run fetch:calenviroscreen`. Downloads ~55 MB into
// node_modules/.cache/power-hungry/ the first time; pass --refresh to re-download.
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import mapshaper from 'mapshaper';
import config from '../js/config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, 'node_modules/.cache/power-hungry');
mkdirSync(cache, { recursive: true });
const refresh = process.argv.includes('--refresh');

const CES = {
  url: 'https://publish.data.ca.gov/dataset/72b28c84-ceac-4886-9f71-d422470d2223/resource/e3d16016-1828-424f-85a6-f7731033d338/download/calenviroscreen50results_f_070126.shp.zip',
  page: 'https://data.ca.gov/dataset/calenviroscreen-5-0',
  label: 'CalEnviroScreen 5.0, OEHHA (final, July 1, 2026)',
};
const TIGER = 'https://www2.census.gov/geo/tiger/TIGER2025';
const FILES = {
  ces: CES.url,
  roads: `${TIGER}/ROADS/tl_2025_06013_roads.zip`,
  canal: `${TIGER}/LINEARWATER/tl_2025_06013_linearwater.zip`,
  waterCC: `${TIGER}/AREAWATER/tl_2025_06013_areawater.zip`,
  waterSol: `${TIGER}/AREAWATER/tl_2025_06095_areawater.zip`,
  waterSac: `${TIGER}/AREAWATER/tl_2025_06067_areawater.zip`,
  places: `${TIGER}/PLACE/tl_2025_06_place.zip`,
};

// What the map can show: west, south, east, north. Pittsburg, Bay Point and
// west Antioch, from the river to the hills.
const BBOX = [-122.0, 37.955, -121.79, 38.075];

async function download(key) {
  const url = FILES[key];
  const file = join(cache, url.split('/').pop());
  if (existsSync(file) && !refresh) return file;
  process.stdout.write(`Downloading ${url} … `);
  const res = await fetch(url, { headers: { 'User-Agent': 'power-hungry-graphics (newsroom data script)' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  if (!/zip|octet-stream/.test(res.headers.get('content-type') || '')) throw new Error(`${url}: expected a zip, got ${res.headers.get('content-type')}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
  console.log('done');
  return file;
}

const f = {};
for (const key of Object.keys(FILES)) f[key] = await download(key);

// OEHHA's zip keeps the shapefile in a folder whose name ends in ".shp", which
// mapshaper mistakes for the shapefile itself, so unpack it first.
function unpackShapefile(zip, dir) {
  const parts = unzipSync(readFileSync(zip), { filter: (e) => /\.(shp|shx|dbf|prj|cpg)$/i.test(e.name) });
  mkdirSync(dir, { recursive: true });
  let shp = null;
  for (const [name, bytes] of Object.entries(parts)) {
    const out = join(dir, name.split('/').pop());
    writeFileSync(out, bytes);
    if (/\.shp$/i.test(out)) shp = out;
  }
  if (!shp) throw new Error(`${zip}: no .shp inside`);
  return shp;
}
f.ces = unpackShapefile(f.ces, join(cache, 'ces5'));

const tmp = (name) => join(cache, name);
const bbox = BBOX.join(',');
const run = (cmd) => mapshaper.runCommands(`${cmd} -quiet`);

// Water: the river and bay in all three counties that meet here; skip ponds.
await run(`-i combine-files "${f.waterCC}" "${f.waterSol}" "${f.waterSac}" -merge-layers force name=water -proj wgs84 -clip bbox=${bbox} -filter 'AWATER > 40000' -dissolve -o "${tmp('water-full.json')}" format=geojson precision=0.000001`);
await run(`-i "${tmp('water-full.json')}" name=water -simplify 25% -o "${tmp('water.json')}" format=geojson precision=0.00001`);
// Tracts, clipped to the view and to land (tracts along the shore reach into the river).
await run(`-i "${f.ces}" name=tracts -proj wgs84 -clip bbox=${bbox} -erase "${tmp('water-full.json')}" -filter-fields tract,approx_loc,county,CIscoreP,PollutionP,PopCharP,ACS2024Pop -simplify 25% keep-shapes -o "${tmp('tracts.json')}" format=geojson precision=0.00001`);
await run(`-i "${f.roads}" name=roads -proj wgs84 -filter 'MTFCC == "S1100"' -clip bbox=${bbox} -dissolve FULLNAME -simplify 25% -o "${tmp('roads.json')}" format=geojson precision=0.00001`);
await run(`-i "${f.canal}" name=canal -proj wgs84 -filter '/^Contra? Costa Cnl$/.test(FULLNAME)' -clip bbox=${bbox} -dissolve -simplify 25% -o "${tmp('canal.json')}" format=geojson precision=0.00001`);
await run(`-i "${f.places}" name=places -proj wgs84 -filter '["Pittsburg", "Antioch", "Bay Point", "Concord"].includes(NAME)' -clip bbox=${bbox} -filter-fields NAME -simplify 25% keep-shapes -o "${tmp('places.json')}" format=geojson precision=0.00001`);

// The plan area, placed exactly where the intro draws it.
const local = JSON.parse(readFileSync(join(root, 'data/site-local.json')));
const [lng0, lat0] = config.site.anchor;
const mPerLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
const ll = ([e, n]) => [+(lng0 + e / mPerLng).toFixed(6), +(lat0 + n / 110540).toFixed(6)];
const site = {
  type: 'FeatureCollection',
  features: local.parcels.map((p) => ({ type: 'Feature', properties: { name: p.name, phase: p.phase }, geometry: { type: 'Polygon', coordinates: [p.ring.map(ll)] } })),
};
writeFileSync(tmp('site.json'), JSON.stringify(site));

await run(`-i combine-files "${tmp('tracts.json')}" "${tmp('water.json')}" "${tmp('roads.json')}" "${tmp('canal.json')}" "${tmp('places.json')}" "${tmp('site.json')}" -o "${join(root, 'data/pollution-map.topojson')}" format=topojson quantization=20000 target=*`);

// ── The CSV: every number the map shows, with its source ─────────────────────
// Distance from the plan area to the nearest edge of each tract, in miles,
// measured on a local flat projection (fine at this scale).
const toM = ([lng, lat]) => [(lng - lng0) * mPerLng, (lat - lat0) * 110540];
const rings = (g) => (g.type === 'Polygon' ? g.coordinates : g.coordinates.flat());
const segDist = ([ax, ay], [bx, by], [px, py]) => {
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
};
const inside = ([px, py], ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const planPts = site.features.flatMap((ft) => ft.geometry.coordinates[0].map(toM));
function milesFromPlan(geom) {
  const rs = rings(geom).map((r) => r.map(toM));
  if (planPts.some((p) => rs.some((r) => inside(p, r)))) return 0;
  let best = Infinity;
  for (const r of rs) for (let i = 1; i < r.length; i++) for (const p of planPts) best = Math.min(best, segDist(r[i - 1], r[i], p));
  // and the other way round (a tract corner close to a plan-area edge)
  const planRings = site.features.map((ft) => ft.geometry.coordinates[0].map(toM));
  for (const pr of planRings) for (let i = 1; i < pr.length; i++) for (const r of rs) for (const p of r) best = Math.min(best, segDist(pr[i - 1], pr[i], p));
  return best / 1609.344;
}

// Distances use the unclipped tract shapes.
await run(`-i "${f.ces}" -proj wgs84 -clip bbox=${bbox} -filter-fields tract -o "${tmp('tract-ids.json')}" format=geojson`);
const clipped = JSON.parse(readFileSync(tmp('tract-ids.json')));
const ids = clipped.features.map((ft) => String(ft.properties.tract)).join(',');
await run(`-i "${f.ces}" -filter '"${ids}".split(",").includes(String(tract))' -proj wgs84 -o "${tmp('tracts-full.json')}" format=geojson precision=0.000001`);
const full = JSON.parse(readFileSync(tmp('tracts-full.json')));

const r1 = (x) => (x == null || x < 0 ? '' : (Math.round(x * 10) / 10).toFixed(1));
const quote = (s) => (/[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : s);
const rows = full.features
  .map((ft) => ({ p: ft.properties, miles: milesFromPlan(ft.geometry) }))
  .sort((a, b) => a.miles - b.miles);
const header = ['tract', 'place', 'county', 'ces_percentile', 'pollution_burden_percentile', 'population_characteristics_percentile', 'population', 'miles_from_plan_area', 'source'];
const csv = [header.join(',')].concat(rows.map(({ p, miles }) => [
  `0${p.tract}`.slice(-11), p.approx_loc, p.county, r1(p.CIscoreP), r1(p.PollutionP), r1(p.PopCharP), p.ACS2024Pop ?? '', miles.toFixed(2),
  `${CES.label}, ${CES.page}`,
].map((v) => quote(String(v))).join(','))).join('\n') + '\n';
writeFileSync(join(root, 'data/pollution-map.csv'), csv);

const top = rows.filter(({ p }) => p.CIscoreP >= 90);
console.log(`data/pollution-map.topojson and data/pollution-map.csv: ${rows.length} tracts, ${top.length} at or above the 90th percentile overall:`);
for (const { p, miles } of top) console.log(`  ${p.tract} ${p.approx_loc}: ${r1(p.CIscoreP)} overall, ${r1(p.PollutionP)} pollution burden, ${miles.toFixed(1)} mi from the plan area`);
