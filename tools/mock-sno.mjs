// A stand-in for the Scot Scoop story page, for testing the SNO blocks locally:
//   npm run mock   → the site on http://localhost:8080 and the mock story on http://localhost:8081
//
// The mock story pastes in embed/sno-embed.html (the intro) and every block in
// embed/sno/, in story order, with the GitHub Pages address swapped for
// localhost:8080. The two ports make it a different site, as SNO is, so it
// tests the cross-origin loading too (tools/serve.mjs sends the CORS header
// GitHub Pages sends). Add ?offline to skip the map tiles.
//
// It runs in Chromium-based browsers only as well as the real thing does:
// still test macOS Safari, iPadOS and iOS on the real SNO story before calling
// a change done.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_PORT = Number(process.env.PORT || 8080);
const HOST_PORT = SITE_PORT + 1;
const ORIGIN = 'https://maximuskwan.github.io/pittsburg-data-center/';

// Story order: [section heading, block]
const STORY = [
  ['From Black Diamond to data hub', 'pollution-map'],
  ['The city’s stake', 'deal-timeline'],
  ['A committee by design', 'committee-redline'],
  ['First to be curtailed', 'water-use'],
  ['First to be curtailed (continued)', 'water-priority'],
  ['What’s left to decide', 'approvals-ahead'],
];

const block = async (rel) => (await readFile(join(root, rel), 'utf8')).split(ORIGIN).join(`http://localhost:${SITE_PORT}/`);
const filler = (n) => Array.from({ length: n }, () =>
  '<p>Story text. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>').join('\n');

await serve(SITE_PORT);
createServer(async (req, res) => {
  if (!['/', '/index.html'].includes(new URL(req.url, 'http://x').pathname)) return res.writeHead(404).end();
  let body = `${await block('embed/sno-embed.html')}\n${filler(4)}`;
  for (const [heading, name] of STORY) {
    const rel = `embed/sno/${name}.html`;
    if (!existsSync(join(root, rel))) continue;
    body += `\n<h2>${heading}</h2>\n${filler(3)}\n${await block(rel)}\n${filler(5)}`;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Mock SNO story</title>
<style>
  body { margin: 0; font: 18px/1.65 Georgia, serif; color: #222; background: #fff; }
  .bar { background: #8b1a1a; color: #fff; font: 600 15px system-ui; padding: 14px 16px; }
  article { max-width: 760px; margin: 0 auto; padding: 24px 16px 80px; }
  h1 { font: 800 34px/1.15 system-ui; } h2 { font: 700 24px/1.2 system-ui; margin: 48px 0 12px; }
  .ph-caption { font-size: 15px; color: #555; }
</style></head><body>
<div class="bar">Scot Scoop (mock story page)</div>
<article><h1>Power hungry (mock)</h1>
${body}
</article></body></html>`);
}).listen(HOST_PORT);
console.log(`Site: http://localhost:${SITE_PORT}   Mock SNO story: http://localhost:${HOST_PORT}  (Ctrl+C to stop)`);
