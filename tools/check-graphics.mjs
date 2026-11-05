// Checks every graphic in graphics/ against the shared rules (see shared/kit.js)
// and the plan's checklist, so a graphic that would break inside the SNO story
// is caught before it goes up. Run `npm run check`; exits 1 on any problem.
//
//   - find elements through the container, never through `document`
//   - load files with ctx.asset()/csv()/json()/text(), never relative paths or fetch()
//   - redraw when the container's width changes (ctx.onResize), not the window's
//   - reduced motion: JS animation must check ctx.reducedMotion
//   - full-screen layers use lvh, never vh/svh/dvh
//   - hidden text uses .ph-sr-only, not an offset
//   - each graphic has its frame (headline, explainer, body, description, and a
//     footer of Note, Source, credit), no underlines but links,
//     a CSV with a source column, PNG fallbacks and an SNO snippet with a caption
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const problems = [];
const report = (name, msg) => problems.push(`${name}: ${msg}`);
const strip = (js) => js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'); // drop comments

const names = readdirSync(join(root, 'graphics'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
for (const name of names) {
  const dir = `graphics/${name}`;
  for (const f of ['index.html', 'graphic.js', 'graphic.css']) if (!existsSync(join(root, dir, f))) report(name, `missing ${dir}/${f}`);
  if (problems.some((p) => p.startsWith(`${name}: missing`))) continue;
  const js = strip(read(`${dir}/graphic.js`));
  const css = read(`${dir}/graphic.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  const html = read(`${dir}/index.html`);

  // 1. Elements through the container.
  for (const m of js.matchAll(/document\.(querySelector(All)?|getElementById|getElementsBy\w+|body|documentElement|head)\b/g)) report(name, `uses document.${m[1]}; find elements with ctx.$ / ctx.$$`);
  // 2. Files through ctx loaders.
  if (/\bfetch\s*\(/.test(js)) report(name, 'calls fetch(); load files with ctx.csv / ctx.json / ctx.text');
  for (const m of js.matchAll(/(?:src|href)\s*[:=]\s*['"`](\.{1,2}\/[^'"`]*)/g)) report(name, `relative URL ${m[1]}; use ctx.asset()`);
  for (const m of js.matchAll(/ctx\.(?:csv|json|text|asset)\(\s*['"`](\.{0,2}\/[^'"`]*)/g)) report(name, `path ${m[1]} should be relative to the site root, like 'data/x.csv'`);
  for (const m of js.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
    if (!m[1].startsWith('../../vendor/')) report(name, `imports ${m[1]}; graphics import only from ../../vendor/ (kit comes in through ctx)`);
  }
  // 3. Container width, not window.
  if (/addEventListener\(\s*['"]resize['"]|\bonresize\b|\binnerWidth\b|\bouterWidth\b/.test(js)) report(name, 'listens to the window size; use ctx.onResize');
  // 4. Reduced motion.
  if (/requestAnimationFrame|setInterval|\.animate\(|\.transition\(/.test(js) && !/reducedMotion/.test(js)) report(name, 'animates in JS without checking ctx.reducedMotion');
  // 5. lvh for full-screen layers.
  for (const m of css.matchAll(/[\d.]+(vh|svh|dvh)\b/g)) report(name, `CSS uses ${m[0]}; size full-screen layers with lvh`);
  // 6. Hidden text.
  if (/(?:top|left|text-indent)\s*:\s*-\d{3,}/.test(css)) report(name, 'hides something by offsetting it; use .ph-sr-only');

  // The frame.
  if (!new RegExp(`class="ph-root"[^>]*data-graphic="${name}"`).test(html)) report(name, `index.html needs <figure class="ph-root" data-graphic="${name}">`);
  for (const cls of ['ph-hed', 'ph-dek', 'ph-body', 'ph-desc', 'ph-foot', 'ph-source', 'ph-credit']) if (!html.includes(cls)) report(name, `index.html has no .${cls}`);
  // Footer order: Note (optional), Source, credit.
  const order = ['ph-note', 'ph-source', 'ph-credit'].map((c) => html.indexOf(`class="${c}"`)).filter((i) => i >= 0);
  if (order.some((v, i) => i && v < order[i - 1])) report(name, 'footer must run Note, Source, credit');
  // Underlines mean links: no text-decoration underline outside a links rule.
  if (/text-decoration[^;]*underline/.test(css)) report(name, 'CSS underlines something; underlines are for links only (shared/graphic.css)');
  if (!/export default/.test(js)) report(name, 'graphic.js must export a default function(ctx)');

  // Data with sources.
  for (const m of js.matchAll(/ctx\.csv\(\s*['"`]([^'"`]+)['"`]/g)) {
    if (!existsSync(join(root, m[1]))) { report(name, `${m[1]} does not exist`); continue; }
    const header = read(m[1]).replace(/^﻿/, '').split(/\r?\n/)[0].split(',');
    if (!header.includes('source')) report(name, `${m[1]} has no source column`);
  }

  // PNG fallbacks and the SNO snippet.
  for (const size of ['phone', 'desktop']) if (!existsSync(join(root, dir, 'png', `${name}-${size}.png`))) report(name, `no PNG ${dir}/png/${name}-${size}.png (npm run snapshot -- ${name})`);
  const snip = `embed/sno/${name}.html`;
  if (!existsSync(join(root, snip))) report(name, `no SNO snippet ${snip}`);
  else {
    const sn = read(snip);
    if (!sn.includes(`data-graphic="${name}"`)) report(name, `${snip} has no placeholder for ${name}`);
    if (!/window\.PH_MOUNT_URL \|\|= 'https:\/\/[^']+\/shared\/mount\.js\?v='/.test(sn)) report(name, `${snip} must import shared/mount.js through window.PH_MOUNT_URL`);
    if (!/class="ph-caption"/.test(sn)) report(name, `${snip} has no text caption`);
    if (!sn.includes(`png/${name}-phone.png`)) report(name, `${snip} has no PNG fallback`);
  }
}

if (problems.length) {
  console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`${names.length} graphics pass: ${names.join(', ')}`);
