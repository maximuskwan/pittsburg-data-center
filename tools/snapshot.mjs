// Saves a PNG of every graphic (or only the ones named) at phone and desktop widths:
//
//   graphics/<name>/png/<name>-phone.png     page 375 px wide, at 2x
//   graphics/<name>/png/<name>-desktop.png   page 760 px wide, at 2x
//
// They're for republishers, social posts, print and contest entries, and each
// SNO block shows its PNG to readers without JavaScript (RSS, email).
// Graphics are captured in their final state, with reduced motion on.
//
//   npm run snapshot                  every graphic
//   npm run snapshot -- water-use     just one
//
// Needs Playwright's Chromium (`npx playwright install chromium`, once), or set
// CHROMIUM_PATH to a Chrome or Chromium binary. Run it after any change to a
// graphic, its data or the shared frame.
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8093;
const WIDTHS = { phone: 375, desktop: 760 };
const PAD = 16; // white margin around the frame

const all = readdirSync(join(root, 'graphics'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(root, 'graphics', d.name, 'index.html')))
  .map((d) => d.name);
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const names = wanted.length ? wanted : all;
for (const n of names) if (!all.includes(n)) { console.error(`No graphic "${n}". Graphics: ${all.join(', ')}`); process.exit(1); }

const server = await serve(PORT);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
let failed = 0;
try {
  for (const name of names) {
    mkdirSync(join(root, 'graphics', name, 'png'), { recursive: true });
    for (const [size, width] of Object.entries(WIDTHS)) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
      const problems = [];
      page.on('pageerror', (e) => problems.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
      await page.goto(`http://localhost:${PORT}/graphics/${name}/?still`, { waitUntil: 'load' });
      const state = await page.waitForFunction(() => document.querySelector('.ph-root')?.dataset.ready, null, { timeout: 30000 })
        .then((h) => h.jsonValue()).catch(() => 'timeout');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      if (state !== 'true') {
        console.error(`✗ ${name} (${size}): ${state}. ${problems.join(' | ')}`);
        failed++;
        await page.close();
        continue;
      }
      const box = await page.$eval('.ph-root', (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
      });
      const x = Math.max(0, box.x - PAD);
      const clip = { x, y: Math.max(0, box.y - PAD), width: Math.min(width - x, box.width + 2 * PAD), height: box.height + 2 * PAD };
      const file = join(root, 'graphics', name, 'png', `${name}-${size}.png`);
      await page.screenshot({ path: file, clip, fullPage: true });
      console.log(`✓ graphics/${name}/png/${name}-${size}.png  ${Math.round(clip.width * 2)}×${Math.round(clip.height * 2)}${problems.length ? `  (console: ${problems.join(' | ')})` : ''}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
