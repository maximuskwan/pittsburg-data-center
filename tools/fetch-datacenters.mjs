// Replaces data/datacenters.geojson (currently placeholder city markers) with
// every U.S. data center mapped in OpenStreetMap. Run: `npm run fetch:datacenters`
//
// OSM is free (ODbL — the map credits "OpenStreetMap contributors") but
// incomplete. Say so in the chapter's source line and date-stamp it.
// Don't scrape commercial trackers (Data Center Map, Baxtel); their data is proprietary.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const query = `
[out:json][timeout:240];
area["ISO3166-1"="US"][admin_level=2]->.us;
(
  nwr["telecom"="data_center"](area.us);
  nwr["building"="data_center"](area.us);
);
out center tags;`;

const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
let json;
for (const url of endpoints) {
  try {
    console.log(`Querying ${url} (can take a minute)…`);
    const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), headers: { 'User-Agent': 'pittsburg-data-center' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
    break;
  } catch (err) {
    console.warn(`  failed: ${err.message}`);
  }
}
if (!json) { console.error('All Overpass servers failed; try again later.'); process.exit(1); }

const seen = new Set();
const features = [];
for (const el of json.elements) {
  const lon = el.lon ?? el.center?.lon;
  const lat = el.lat ?? el.center?.lat;
  if (lon == null || lat == null) continue;
  // A campus is often mapped as both a site and its buildings; keep one point per ~100 m.
  const key = `${lon.toFixed(3)},${lat.toFixed(3)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const t = el.tags || {};
  features.push({
    type: 'Feature',
    properties: { name: t.name || null, operator: t.operator || null, osm: `${el.type}/${el.id}` },
    geometry: { type: 'Point', coordinates: [+lon.toFixed(5), +lat.toFixed(5)] },
  });
}

const retrieved = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, 'data/datacenters.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  name: 'U.S. data centers mapped in OpenStreetMap (telecom=data_center or building=data_center)',
  source: '© OpenStreetMap contributors, ODbL',
  retrieved,
  features,
}));
console.log(`Wrote ${features.length} points to data/datacenters.geojson (retrieved ${retrieved}).`);
console.log(`Update the source line in index.html: "Map: OpenStreetMap contributors (incomplete), as of ${retrieved}".`);
