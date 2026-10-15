// Copies browser libraries out of node_modules into vendor/ and builds the
// offline boundary layers in data/. Run with `npm run vendor` after
// `npm install` or after upgrading a library. The outputs are committed, so
// the published site never needs a build step or a CDN.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (p) => join(root, 'node_modules', p);
const out = (p) => join(root, p);

const copies = [
  ['maplibre-gl/dist/maplibre-gl.mjs', 'vendor/maplibre-gl/maplibre-gl.mjs'],
  ['maplibre-gl/dist/maplibre-gl-worker.mjs', 'vendor/maplibre-gl/maplibre-gl-worker.mjs'],
  ['maplibre-gl/dist/maplibre-gl-shared.mjs', 'vendor/maplibre-gl/maplibre-gl-shared.mjs'],
  ['maplibre-gl/dist/maplibre-gl.css', 'vendor/maplibre-gl/maplibre-gl.css'],
  ['maplibre-gl/LICENSE.txt', 'vendor/maplibre-gl/LICENSE.txt'],
  ['scrollama/build/scrollama.min.js', 'vendor/scrollama/scrollama.min.js'],
  ['scrollama/LICENSE', 'vendor/scrollama/LICENSE'],
  ['@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2', 'vendor/fonts/montserrat-latin-wght-normal.woff2'],
  ['@fontsource-variable/montserrat/LICENSE', 'vendor/fonts/LICENSE-montserrat.txt'],
];
for (const [from, to] of copies) {
  mkdirSync(dirname(out(to)), { recursive: true });
  try {
    copyFileSync(nm(from), out(to));
  } catch (err) {
    // A few packages ship LICENSE under a different name; don't fail the build over it.
    if (!from.includes('LICENSE')) throw err;
  }
}

// --- Boundaries (US Census cartographic boundaries via us-atlas; public domain)
const round = (digits) => {
  const f = 10 ** digits;
  const walk = (c) => (typeof c[0] === 'number' ? c.map((n) => Math.round(n * f) / f) : c.map(walk));
  return (fc) => {
    for (const ft of fc.features) ft.geometry.coordinates = walk(ft.geometry.coordinates);
    return fc;
  };
};

const statesTopo = JSON.parse(readFileSync(nm('us-atlas/states-10m.json')));
const states = round(3)(feature(statesTopo, statesTopo.objects.states));
for (const f of states.features) f.properties = { name: f.properties.name, fips: f.id };
writeFileSync(out('data/states.geojson'), JSON.stringify(states));

const countiesTopo = JSON.parse(readFileSync(nm('us-atlas/counties-10m.json')));
const counties = round(4)(feature(countiesTopo, countiesTopo.objects.counties));
counties.features = counties.features
  .filter((f) => String(f.id).startsWith('06'))
  .map((f) => ({ ...f, properties: { name: f.properties.name, fips: f.id } }));
writeFileSync(out('data/ca-counties.geojson'), JSON.stringify(counties));

console.log(`vendor/ updated; ${states.features.length} states, ${counties.features.length} CA counties written to data/`);
