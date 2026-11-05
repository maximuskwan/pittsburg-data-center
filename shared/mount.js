// Loads Power hungry's interactive pieces straight into another page (the
// Scot Scoop story on SNO), with no iframes:
//
//   - the scrollytelling intro:   <div id="power-hungry-intro"></div>
//   - each graphic:               <div class="ph-graphic" data-graphic="water-use"></div>
//
// Each goes into its own shadow root, so its styles and the host theme can't
// affect each other. The intro mounts right away; a graphic loads only when it
// is about a screen away, so the page doesn't fetch everything at once.
//
// Every SNO block imports this file with the same line (see embed/sno/), and
// the shared URL in window.PH_MOUNT_URL means the browser loads it once:
//   <script type="module">import(window.PH_MOUNT_URL ||= 'https://…/shared/mount.js?v=' + Date.now().toString(36));</script>
// embed/mount.js, which the intro block already pasted into SNO imports, now
// just forwards here.

const SITE = new URL('../', import.meta.url);
const v = new URL(import.meta.url).searchParams.get('v') || Date.now().toString(36);
const at = (p) => new URL(p, SITE).href;
const get = (p) => fetch(at(p), { cache: 'no-cache' }).then((r) => {
  if (!r.ok) throw new Error(`${r.status} ${p}`);
  return r.text();
});
const FACE = /@font-face\s*{[^}]*}/g;

// Shared CSS, fetched once for the whole page.
const once = {};
const shared = (p) => (once[p] ||= get(`${p}?v=${v}`));

// Fonts declared inside a shadow root are ignored by some browsers, so the
// @font-face rules go on the page itself (under their own family name).
let fontsAdded = false;
function addFonts(css, cssDir) {
  if (fontsAdded) return;
  fontsAdded = true;
  const faces = (css.match(FACE) || [])
    .map((f) => f.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (_, u) => `url('${new URL(u, new URL(cssDir, SITE)).href}')`));
  if (faces.length) document.head.append(Object.assign(document.createElement('style'), { textContent: faces.join('\n') }));
}

// A page's markup (minus scripts), with relative links and images pointed at this site.
function importBody(html, baseDir, into, skip = () => false) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of [...doc.body.children]) {
    if (el.tagName === 'SCRIPT' || skip(el)) continue;
    into.append(document.importNode(el, true));
  }
  const base = new URL(baseDir, SITE);
  for (const el of into.querySelectorAll('[src], [href]')) {
    for (const attr of ['src', 'href']) {
      const val = el.getAttribute(attr);
      if (val && !val.startsWith('#') && !/^[a-z][a-z0-9+.-]*:/i.test(val)) el.setAttribute(attr, new URL(val, base).href);
    }
  }
  return into;
}

// ── The intro ────────────────────────────────────────────────────────────────
async function mountIntro(host) {
  const [html, tokens, css, mapCss] = await Promise.all([
    get('index.html'), shared('shared/tokens.css'), get(`css/story.css?v=${v}`), get('vendor/maplibre-gl/maplibre-gl.css'),
  ]);
  addFonts(tokens, 'shared/');

  // Same mode choice the standalone page makes before first paint.
  const root = document.createElement('div');
  root.className = 'ph-root framed';
  const q = new URLSearchParams(location.search);
  if (q.has('static') || matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('static');
  importBody(html, '', root, (el) => el.id === 'calibrate-panel');

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `${mapCss}\n${tokens.replace(FACE, '')}\n${css.replace(FACE, '')}`;
  shadow.append(style, root);

  window.STORY_V = v;
  window.PH_MOUNT = { root, scope: shadow };
  if (!window.scrollama) await new Promise((done, fail) => {
    const s = Object.assign(document.createElement('script'), { src: at('vendor/scrollama/scrollama.min.js') });
    s.onload = done; s.onerror = fail;
    document.head.append(s);
  });
  await import(at(`js/story.js?v=${v}`));
}

// ── Graphics ─────────────────────────────────────────────────────────────────
let kit = null;
async function mountGraphic(host) {
  const name = host.dataset.graphic;
  if (!/^[a-z0-9-]+$/.test(name || '')) throw new Error(`bad data-graphic "${name}"`);
  const dir = `graphics/${name}/`;
  const [html, tokens, frame, css, k] = await Promise.all([
    get(`${dir}index.html?v=${v}`), shared('shared/tokens.css'), shared('shared/graphic.css'), get(`${dir}graphic.css?v=${v}`),
    kit ||= import(at(`shared/kit.js?v=${v}`)),
  ]);
  addFonts(tokens, 'shared/');

  const holder = document.createElement('div');
  importBody(html, dir, holder);
  const root = holder.querySelector('.ph-root');
  if (!root) throw new Error(`${dir}index.html has no .ph-root`);
  root.classList.add('ph-mounted');

  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `${tokens.replace(FACE, '')}\n${frame}\n${css}`;
  shadow.replaceChildren(style, root);

  const mod = await import(at(`${dir}graphic.js?v=${v}`));
  await mod.default(k.createContext({ root, scope: shadow, name, mounted: true }));
}

function load(host) {
  host.dataset.phState = 'loading';
  const intro = host.id === 'power-hungry-intro';
  (intro ? mountIntro(host) : mountGraphic(host)).then(() => { host.dataset.phState = 'ready'; }, (err) => {
    host.dataset.phState = 'error';
    console.error(`Power hungry ${host.dataset.graphic || 'intro'} failed to load`, err);
    if (intro) host.hidden = true; // the fallback link under it still works
    // A graphic shows its block's own content again (the PNG fallback) instead of a half-drawn graphic.
    else host.shadowRoot?.replaceChildren(document.createElement('slot'));
  });
}

// Graphics load when they're about a screen away.
const near = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      near.unobserve(e.target);
      load(e.target);
    }
  }, { rootMargin: '100% 0px 100% 0px' })
  : { observe: load, unobserve() {} };

function scan() {
  const intro = document.getElementById('power-hungry-intro');
  if (intro && !intro.dataset.phState && !intro.shadowRoot && !window.PH_MOUNT) load(intro);
  for (const host of document.querySelectorAll('.ph-graphic[data-graphic]')) {
    if (host.dataset.phState) continue;
    host.dataset.phState = 'waiting';
    // An empty shadow root hides the block's PNG fallback (for readers without
    // JavaScript, RSS and email) before it downloads; on failure it shows again.
    if (!host.shadowRoot) host.attachShadow({ mode: 'open' });
    near.observe(host);
  }
}

if (window.PH_MOUNTER) window.PH_MOUNTER.scan(); // a copy under another URL already runs the page
else {
  window.PH_MOUNTER = { scan, version: v };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  scan();
}
