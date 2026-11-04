// Loads the scrollytelling intro straight into another page (Scot Scoop),
// with no iframe: the map is pinned by the page's own scrolling, exactly as
// on the standalone site. The intro's markup and CSS go inside a shadow root
// so its styles and the host theme can't affect each other.
//
// Host page markup (see embed/sno-embed.html):
//   <div id="power-hungry-intro"></div>
//   <script type="module">import('https://…/embed/mount.js?v=' + Date.now().toString(36));</script>

const BASE = new URL('../', import.meta.url);
const v = Date.now().toString(36);
const at = (p) => new URL(p, BASE).href;

const host = document.getElementById('power-hungry-intro');
if (host && !host.shadowRoot && !window.PH_MOUNT) mount(host).catch((e) => {
  console.error('Power hungry intro failed to load', e);
  host.hidden = true; // the fallback link under it still works
});

async function mount(host) {
  const get = (p) => fetch(at(p), { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${p}`);
    return r.text();
  });
  const [html, css, mapCss] = await Promise.all([
    get('index.html'), get(`css/story.css?v=${v}`), get('vendor/maplibre-gl/maplibre-gl.css'),
  ]);

  // Fonts declared inside a shadow root are ignored by some browsers, so the
  // intro's @font-face goes on the page itself (under its own family name).
  const cssDir = new URL('css/', BASE);
  const faces = (css.match(/@font-face\s*{[^}]*}/g) || [])
    .map((f) => f.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (_, u) => `url('${new URL(u, cssDir).href}')`));
  if (faces.length) document.head.append(Object.assign(document.createElement('style'), { textContent: faces.join('\n') }));

  // Same mode choice the standalone page makes before first paint.
  const root = document.createElement('div');
  root.className = 'ph-root framed';
  const q = new URLSearchParams(location.search);
  if (q.has('static') || matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('static');

  // The intro's markup, with relative links and images pointed at this site.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of [...doc.body.children]) {
    if (el.tagName === 'SCRIPT' || el.id === 'calibrate-panel') continue;
    root.append(document.importNode(el, true));
  }
  for (const el of root.querySelectorAll('[src], [href]')) {
    for (const attr of ['src', 'href']) {
      const val = el.getAttribute(attr);
      if (val && !val.startsWith('#') && !/^[a-z][a-z0-9+.-]*:/i.test(val)) el.setAttribute(attr, at(val));
    }
  }

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `${mapCss}\n${css.replace(/@font-face\s*{[^}]*}/g, '')}`;
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
