// Shared helpers for the graphics in graphics/. Each graphic's graphic.js
// exports a default function that gets a context (`ctx`) from here and uses it
// for everything that touches the page. The same code then runs on the
// graphic's own page and inside a shadow root in the SNO story
// (shared/mount.js), where `document` is the story page, not the graphic.
//
// The rules (tools/check-graphics.mjs checks every graphic.js and graphic.css):
//   1. Find elements through the container (ctx.$, ctx.$$), never through `document`.
//   2. Load files with ctx.asset() / ctx.csv() / ctx.json(), never relative paths.
//   3. Redraw when the container's width changes (ctx.onResize), not the window's.
//   4. With reduced motion on, show the final state with no animation (ctx.reducedMotion).
//   5. Size full-screen layers with lvh.
//   6. Hide screen-reader-only text with the visually-hidden pattern (.ph-sr-only).

/** The site root on GitHub Pages (or wherever the repo is served). */
export const SITE = new URL('../', import.meta.url);
/** Per-visit version, so our own CSS, JS and data are never served stale. */
export const V = new URL(import.meta.url).searchParams.get('v') || Date.now().toString(36);

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Absolute URL of a file in this repo, e.g. asset('data/water-use.csv'). */
export const asset = (p) => new URL(p, SITE).href;
const fresh = (p) => {
  const u = new URL(asset(p));
  u.searchParams.set('v', V);
  return u.href;
};

/** Parses CSV text (RFC 4180 quoting) into an array of objects keyed by the header row. */
export function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((f) => f.trim() !== ''));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/** "58,407" → 58407; "" → NaN */
export const num = (s) => (s === '' || s == null ? NaN : Number(String(s).replace(/[,$\s]/g, '')));

/** Creates an HTML element: h('p', { class: 'x' }, 'text', child). */
export function h(tag, attrs = {}, ...kids) {
  return build(document.createElement(tag), attrs, kids);
}
/** Creates an SVG element: s('rect', { x: 0, width: 10 }). */
export function s(tag, attrs = {}, ...kids) {
  return build(document.createElementNS(SVG_NS, tag), attrs, kids);
}
function build(el, attrs, kids) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

// Text measuring for SVG labels, which don't wrap on their own.
let measurer = null;
/** Width in px of `text` set in a CSS font shorthand, e.g. measure('Hi', '700 14px sans-serif'). */
export function measure(text, font) {
  measurer ||= document.createElement('canvas').getContext('2d');
  measurer.font = font;
  return measurer.measureText(text).width;
}
/** Breaks `text` into lines no wider than `width` px. */
export function wrap(text, font, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, font) > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

let scrollamaLoading = null;
function loadScrollama() {
  if (window.scrollama) return Promise.resolve();
  scrollamaLoading ||= new Promise((done, fail) => {
    const tag = Object.assign(document.createElement('script'), { src: asset('vendor/scrollama/scrollama.min.js') });
    tag.onload = done;
    tag.onerror = () => fail(new Error('Scrollama failed to load'));
    document.head.append(tag);
  });
  return scrollamaLoading;
}

/**
 * The context a graphic draws with. `root` is the graphic's frame element
 * (.ph-root); `scope` is the shadow root (mounted) or the document (standalone).
 */
export function createContext({ root, scope = root.getRootNode(), name, mounted = false }) {
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const params = new URLSearchParams(location.search);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('still');

  const text = async (p) => {
    const r = await fetch(fresh(p), { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
    return r.text();
  };

  return {
    name, root, scope, mounted, reducedMotion, $, $$, h, s, num, asset, measure, wrap,
    text,
    /** Resolves once the shared fonts are ready, so text measures true. */
    fontsReady: () => Promise.all(['400 14px', '600 14px', '700 14px', '800 14px'].map((w) => document.fonts.load(`${w} 'PH Montserrat'`))).catch(() => {}),
    csv: async (p) => parseCSV(await text(p)),
    json: async (p) => JSON.parse(await text(p)),

    /** Calls fn(width) now and whenever the container's width changes. */
    onResize(fn) {
      let last = -1, frame = 0;
      const run = () => {
        frame = 0;
        const w = Math.round(root.clientWidth);
        if (w > 0 && w !== last) { last = w; fn(w); }
      };
      const ro = new ResizeObserver(() => { frame ||= requestAnimationFrame(run); });
      ro.observe(root);
      run();
      return () => ro.disconnect();
    },

    /** A Scrollama instance; pass it the step elements (not a selector), as the intro does. */
    async scrollama() {
      await loadScrollama();
      return window.scrollama();
    },

    /** A color or font token from shared/tokens.css, e.g. token('--red'). */
    token(name) {
      return getComputedStyle(root).getPropertyValue(name).trim();
    },

    /** Sets the screen-reader description of the graphic. */
    describe(textContent) {
      const desc = $('.ph-desc');
      if (desc) desc.textContent = textContent;
    },

    /** Shows a DRAFT strip while anything is wrapped in <mark class="tk">. Returns the count. */
    flagDrafts() {
      const n = root.querySelectorAll('mark.tk').length;
      let strip = $('.ph-draft');
      if (!n) { strip?.remove(); return 0; }
      if (!strip) { strip = h('p', { class: 'ph-draft' }); root.prepend(strip); }
      strip.textContent = `DRAFT: ${n} TK item${n === 1 ? '' : 's'} to resolve before publication`;
      return n;
    },
  };
}

/** Runs a graphic on its own page (graphics/<name>/index.html). */
export async function standalone() {
  const root = document.querySelector('.ph-root');
  const name = root.dataset.graphic;
  try {
    const mod = await import(new URL(`graphics/${name}/graphic.js?v=${V}`, SITE).href);
    await mod.default(createContext({ root, scope: document, name }));
    root.dataset.ready = 'true';
  } catch (err) {
    console.error(err);
    root.dataset.ready = 'error';
    root.append(h('p', { class: 'ph-error', text: `This graphic failed to load (${err.message}).` }));
  }
}
