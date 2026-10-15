// Records the map sequence to video and saves a still of every chapter.
//
//   npm run record              → media/intro.mp4/.webm (no text), media/stills/*.jpg,
//                                 kit/media/intro-captioned.mp4 (chapter text burned in)
//   npm run record -- --quick   → half-size, no captioned version (fast check)
//
// It drives the page with a virtual clock and screenshots every frame, so the
// result is smooth no matter how slow the computer is. Needs ffmpeg installed
// (macOS: `brew install ffmpeg`) and Playwright's browser
// (`npx playwright install chromium`, once). Run it on a machine with internet
// access: the map tiles and imagery load live.
//
// Photo chapters are recorded too (the photos cross-fade over the map), but
// stills are only saved for map chapters; the no-map version uses the photos.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');
const offline = args.has('--offline'); // testing without internet: local layers only
const W = quick ? 960 : 1920;
const H = quick ? 540 : 1080;
const FPS = 30;
const FRAME_MS = 1000 / FPS;
const HOLD_MS = 2200; // how long each chapter rests after its camera move
const PORT = 8091;

const ffmpeg = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch {
  console.error('ffmpeg not found. Install it first (macOS: brew install ffmpeg; Windows: winget install ffmpeg).');
  process.exit(1);
}

const server = await serve(PORT);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

async function record({ captions, framesDir, stillsDir }) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  // Freeze time: the page only moves forward when we advance it one frame at a time.
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  const q = ['record', captions ? 'captions=1' : '', offline ? 'offline' : ''].filter(Boolean).join('&');
  await page.goto(`http://localhost:${PORT}/?${q}`);

  const pump = (ms) => page.clock.runFor(Math.max(1, Math.round(ms)));
  // Wait (in real time) until every tile in view has loaded and drawn.
  const settle = async (limitMs = 20000) => {
    const start = Date.now();
    while (Date.now() - start < limitMs) {
      const done = await page.evaluate(() => {
        const m = window.story?.map;
        return !!m && window.story.loaded && m.isStyleLoaded() && m.areTilesLoaded();
      });
      if (done) return;
      await pump(1);
      await page.waitForTimeout(40);
    }
    console.warn('  (tiles still loading after 20s; continuing)');
  };

  while (!(await page.evaluate(() => !!window.story?.loaded))) { await pump(16); await page.waitForTimeout(20); }
  const chapters = await page.evaluate(() => window.story.chapters.map((id) => [id, window.story.config.chapters[id].duration || 0, !!window.story.config.chapters[id].photo]));

  let frame = 0;
  for (const [index, [id, duration, isPhoto]] of chapters.entries()) {
    process.stdout.write(`  ${id} `);
    await page.evaluate((cid) => window.story.goTo(cid, { instant: cid === 'opener' }), id);
    const hold = index === 0 ? 3000 : HOLD_MS;
    const n = Math.round((duration + hold) / FRAME_MS);
    for (let i = 0; i < n; i++) {
      await pump(FRAME_MS);
      await settle();
      const file = join(framesDir, `${String(frame++).padStart(5, '0')}.jpg`);
      await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
      if (stillsDir && i === n - 1 && id !== 'opener' && !isPhoto) copyFileSync(file, join(stillsDir, `${id}.jpg`));
      if (i % FPS === 0) process.stdout.write('.');
    }
    process.stdout.write('\n');
  }
  await page.close();
  return frame / FPS;
}

function encode(framesDir, outBase) {
  const input = ['-framerate', String(FPS), '-i', join(framesDir, '%05d.jpg')];
  ffmpeg(...input, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', '-an', `${outBase}.mp4`);
  ffmpeg(...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-an', `${outBase}.webm`);
}

try {
  mkdirSync(join(root, 'media/stills'), { recursive: true });
  mkdirSync(join(root, 'kit/media'), { recursive: true });

  console.log(`Recording clean version (${W}×${H})…`);
  let tmp = mkdtempSync(join(tmpdir(), 'scrolly-'));
  let secs = await record({ captions: false, framesDir: tmp, stillsDir: join(root, 'media/stills') });
  encode(tmp, join(root, 'media/intro'));
  rmSync(tmp, { recursive: true, force: true });
  console.log(`  → media/intro.mp4, media/intro.webm (${secs.toFixed(1)}s), media/stills/`);

  if (!quick) {
    console.log('Recording captioned version for republishers…');
    tmp = mkdtempSync(join(tmpdir(), 'scrolly-'));
    secs = await record({ captions: true, framesDir: tmp });
    encode(tmp, join(root, 'kit/media/intro-captioned'));
    rmSync(tmp, { recursive: true, force: true });
    console.log('  → kit/media/intro-captioned.mp4 / .webm');
  }

  // The lead image for republishers: the drone photo from the 'photo-homes' chapter.
  copyFileSync(join(root, 'media/photos/drone-02.jpg'), join(root, 'kit/media/hero.jpg'));
  console.log('  → kit/media/hero.jpg');
} finally {
  await browser.close();
  server.close();
}
