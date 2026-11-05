// Recycled-water priority diagram ("First to be curtailed"): who gets Delta
// Diablo's recycled water first, why AVAIO would be cut off first, and what
// it would fall back on. Text: data/water-priority.csv. Hand-built SVG.

export default async function draw(ctx) {
  const rows = Object.fromEntries((await ctx.csv('data/water-priority.csv')).map((r) => [r.id, r]));
  const row = (id) => {
    if (!rows[id]) throw new Error(`data/water-priority.csv: no row ${id}`);
    return rows[id];
  };
  await ctx.fontsReady();

  const C = {
    ink: ctx.token('--ink'), muted: ctx.token('--muted'), red: ctx.token('--red'), redDark: ctx.token('--red-dark'),
    water: ctx.token('--water'), blue: ctx.token('--blue'), wash: ctx.token('--gray-wash'), rule: ctx.token('--gray-light'),
    sans: ctx.token('--sans'),
  };
  const F = {
    title: `700 14.5px ${C.sans}`, detail: `500 13px ${C.sans}`, head: `800 11.5px ${C.sans}`, num: `800 12px ${C.sans}`,
  };
  const LINE = { title: 18, detail: 17 };
  const { s } = ctx;

  ctx.onResize((W) => {
    const wide = W >= 560;
    const svg = s('svg', { viewBox: `0 0 ${W} 10`, width: W, height: 10, class: 'wp-diagram', 'aria-hidden': 'true' });
    svg.append(s('defs', {}, s('marker', { id: 'wp-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      s('path', { d: 'M0,0L10,5L0,10z', fill: C.ink }))));

    // Text block at (x, y) wrapped to width w. Returns its height.
    const text = (x, y, w, str, font, fill, lineH, extra = {}) => {
      const lines = ctx.wrap(str, F[font], w);
      const t = s('text', { x, y, fill, class: `wp-${font}`, ...extra });
      lines.forEach((ln, i) => t.append(s('tspan', { x, dy: i ? lineH : 0, text: ln })));
      t.setAttribute('dominant-baseline', 'hanging');
      svg.append(t);
      return lines.length * lineH;
    };
    // A box with a title, optional detail and optional number badge. Returns its height.
    const box = (x, y, w, { title, detail, badge, fill = '#fff', stroke = C.ink, color = C.ink, sub = C.muted, dash }) => {
      const pad = 10, left = badge ? 36 : pad;
      const g = s('g');
      svg.append(g);
      const rect = s('rect', { x: x + 0.6, y, width: w - 1.2, height: 10, fill, stroke, 'stroke-width': 1.2, 'stroke-dasharray': dash || null });
      g.append(rect);
      let hgt = pad;
      hgt += text(x + left, y + hgt, w - left - pad, title, 'title', color, LINE.title);
      if (detail) hgt += 3 + text(x + left, y + hgt + 3, w - left - pad, detail, 'detail', sub, LINE.detail);
      hgt += pad;
      rect.setAttribute('height', hgt);
      if (badge) {
        svg.append(s('circle', { cx: x + 19, cy: y + hgt / 2, r: 11, fill: color === '#fff' ? '#fff' : C.ink }));
        svg.append(s('text', { x: x + 19, y: y + hgt / 2, dy: '0.36em', 'text-anchor': 'middle', class: 'wp-num', fill: color === '#fff' ? C.red : '#fff', text: badge }));
      }
      return hgt;
    };
    const arrow = (x1, y1, x2, y2) => svg.append(s('path', { d: `M${x1},${y1}L${x2},${y2}`, stroke: C.ink, 'stroke-width': 1.4, fill: 'none', 'marker-end': 'url(#wp-arrow)' }));
    const head = (x, y, w, str) => text(x, y, w, str, 'head', C.ink, 15, { 'letter-spacing': '0.06em' });

    const supply = row('supply'), calpine = row('calpine'), others = row('others'), avaio = row('avaio');
    let y = 0;
    y += box(0, y, W, { title: supply.label, detail: supply.detail, fill: C.water, stroke: C.blue });
    arrow(W / 2, y + 2, W / 2, y + 24);
    y += 30;
    y += head(0, y, W, 'WHO GETS IT FIRST') + 6;
    const queueTop = y;
    y += box(0, y, W, { title: calpine.label, detail: calpine.detail, badge: '1' }) + 6;
    y += box(0, y, W, { title: others.label, detail: others.detail, badge: '2' }) + 6;
    const avaioTop = y;
    y += box(0, y, W, { title: avaio.label, detail: avaio.detail, badge: '3', fill: C.red, stroke: C.redDark, color: '#fff', sub: '#fff' });
    // A rail tying the queue together, behind the badges.
    svg.insertBefore(s('path', { d: `M19,${queueTop + 12}L19,${avaioTop + 10}`, stroke: C.rule, 'stroke-width': 2 }), svg.children[1]);

    const shortage = row('shortage');
    arrow(W / 2, y + 2, W / 2, y + 24);
    y += 30;
    y += box(0, y, W, { title: shortage.label, detail: shortage.detail, fill: C.wash, stroke: C.muted, dash: '4 3' });

    y += 18;
    y += head(0, y, W, 'IF AVAIO IS CUT OFF') + 6;
    const tank = row('tank');
    const fallbacks = ['fallback-1', 'fallback-2', 'fallback-3'].map(row);
    const promise = { title: 'The city’s 2019 promise, in order', detail: fallbacks.map((f) => `${f.order}. ${f.label}`).join(' ') };
    if (wide) {
      const half = (W - 12) / 2;
      const yy = y;
      const h1 = box(0, yy, half, { title: tank.label, detail: tank.detail });
      const h2 = listBox(half + 12, yy, half, promise);
      // Equal heights side by side.
      const tallest = Math.max(h1, h2);
      for (const r of svg.querySelectorAll('rect')) if (+r.getAttribute('y') === yy) r.setAttribute('height', tallest);
      y += tallest;
    } else {
      y += box(0, y, W, { title: tank.label, detail: tank.detail }) + 6;
      y += listBox(0, y, W, promise);
    }

    const settle = row('settlement');
    y += 14;
    y += text(0, y, W, `${settle.label}: ${settle.detail}.`, 'detail', C.ink, LINE.detail);
    y += 4;

    svg.setAttribute('viewBox', `0 0 ${W} ${y}`);
    svg.setAttribute('height', y);
    ctx.$('.ph-body').replaceChildren(svg);

    // A box whose detail is a numbered list, one item per line.
    function listBox(x, y0, w, { title, detail }) {
      const pad = 10;
      const rect = s('rect', { x: x + 0.6, y: y0, width: w - 1.2, height: 10, fill: '#fff', stroke: C.ink, 'stroke-width': 1.2 });
      svg.append(rect);
      let hgt = pad + text(x + pad, y0 + pad, w - 2 * pad, title, 'title', C.ink, LINE.title) + 4;
      for (const item of detail.split(' ')) hgt += text(x + pad, y0 + hgt, w - 2 * pad, item, 'detail', C.ink, LINE.detail) + 2;
      hgt += pad - 2;
      rect.setAttribute('height', hgt);
      return hgt;
    }
  });
}
