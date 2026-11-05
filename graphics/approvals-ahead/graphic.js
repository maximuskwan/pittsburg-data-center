// Approvals-still-ahead flowchart ("What's left to decide"): what Phase 1
// still needs before it can be built, and the longer path for Phases 2 and 3.
// Each step is tagged with who decides. Text: data/approvals-ahead.csv.
// Hand-built SVG.

const LANES = {
  phase1: {
    title: 'Phase 1',
    sub: '22 acres north of the canal. Approved in December 2025 and exempt from the moratorium. It still needs all three:',
    end: 'Then Phase 1 can be built',
  },
  phases23: {
    title: 'Phases 2 and 3',
    sub: '54 acres south of the canal, where AVAIO says no project is proposed. Any project would need, in order:',
    end: 'Then they can be built',
    note: 'The Center for Biological Diversity, which agreed not to oppose Phase 1, can still oppose these phases.',
  },
};

export default async function draw(ctx) {
  const rows = await ctx.csv('data/approvals-ahead.csv');
  await ctx.fontsReady();
  const C = {
    ink: ctx.token('--ink'), muted: ctx.token('--muted'), red: ctx.token('--red'), wash: ctx.token('--gray-wash'),
    rule: ctx.token('--gray-light'), sans: ctx.token('--sans'),
  };
  const F = {
    lane: `800 17px ${C.sans}`, sub: `500 13px ${C.sans}`, chip: `800 10px ${C.sans}`,
    title: `700 14px ${C.sans}`, who: `600 12.5px ${C.sans}`, detail: `500 12.5px ${C.sans}`, end: `700 13px ${C.sans}`,
  };
  const { s } = ctx;

  ctx.onResize((W) => {
    const wide = W >= 620;
    const svg = s('svg', { width: W, height: 10, class: 'ap-chart', 'aria-hidden': 'true' });
    svg.append(s('defs', {}, s('marker', { id: 'ap-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      s('path', { d: 'M0,0L10,5L0,10z', fill: C.ink }))));

    const text = (x, y, w, str, font, fill, lineH) => {
      const lines = ctx.wrap(str, F[font], w);
      const t = s('text', { x, y, fill, class: `ap-${font}`, 'dominant-baseline': 'hanging' });
      lines.forEach((ln, i) => t.append(s('tspan', { x, dy: i ? lineH : 0, text: ln })));
      svg.append(t);
      return lines.length * lineH;
    };
    // Who decides, as a small tag: filled for a public vote, outlined otherwise.
    const chip = (x, y, label) => {
      const vote = /public vote/i.test(label);
      const w = ctx.measure(label.toUpperCase(), F.chip) + label.length * 0.5 + 13; // + letter-spacing
      svg.append(s('rect', { x, y, width: w, height: 17, rx: 8.5, fill: vote ? C.ink : '#fff', stroke: C.ink, 'stroke-width': 1 }));
      svg.append(s('text', { x: x + 6, y: y + 9, dy: '0.35em', class: 'ap-chip', fill: vote ? '#fff' : C.ink, text: label.toUpperCase(), 'letter-spacing': '0.05em' }));
      return 17;
    };
    const step = (x, y, w, r) => {
      const pad = 10;
      const rect = s('rect', { x: x + 0.6, y, width: w - 1.2, height: 10, fill: '#fff', stroke: C.ink, 'stroke-width': 1.2 });
      svg.append(rect);
      let hgt = pad;
      hgt += chip(x + pad, y + hgt, r.kind) + 7;
      hgt += text(x + pad, y + hgt, w - 2 * pad, r.title, 'title', C.ink, 18);
      if (r.who) hgt += 2 + text(x + pad, y + hgt + 2, w - 2 * pad, r.who, 'who', C.ink, 16);
      if (r.detail) hgt += 4 + text(x + pad, y + hgt + 4, w - 2 * pad, r.detail, 'detail', C.muted, 16);
      hgt += pad;
      rect.setAttribute('height', hgt);
      return hgt;
    };
    const arrow = (x, y1, y2) => svg.append(s('path', { d: `M${x},${y1}L${x},${y2}`, stroke: C.ink, 'stroke-width': 1.4, fill: 'none', 'marker-end': 'url(#ap-arrow)' }));
    const end = (x, y, w, label) => {
      const t = text(x + w / 2, y + 9, w - 20, label, 'end', '#fff', 16);
      const box = s('rect', { x, y, width: w, height: t + 18, rx: 3, fill: C.ink });
      svg.insertBefore(box, svg.lastChild);
      svg.lastChild.setAttribute('text-anchor', 'middle');
      return t + 18;
    };

    const lane = (id, x, w, y0) => {
      const L = LANES[id];
      const steps = rows.filter((r) => r.lane === id).sort((a, b) => a.step - b.step);
      let y = y0;
      svg.append(s('rect', { x, y, width: w, height: 4, fill: id === 'phase1' ? C.red : C.ink }));
      y += 12;
      y += text(x, y, w, L.title, 'lane', C.ink, 20) + 4;
      y += text(x, y, w, L.sub, 'sub', C.muted, 17) + 12;
      if (id === 'phase1') {
        // Three needs at once: a bracket on the left ties them together.
        const top = y, gut = 14;
        for (const r of steps) y += step(x + gut, y, w - gut, r) + 8;
        svg.append(s('path', { d: `M${x + 7},${top + 4}H${x + 1}V${y - 12}H${x + 7}`, fill: 'none', stroke: C.ink, 'stroke-width': 1.4 }));
        y -= 8;
      } else {
        steps.forEach((r, i) => {
          y += step(x, y, w, r);
          if (i < steps.length - 1) { arrow(x + w / 2, y + 2, y + 20); y += 24; }
        });
      }
      arrow(x + w / 2, y + 2, y + 20);
      y += 24;
      y += end(x, y, w, L.end);
      if (L.note) { y += 10; y += text(x, y, w, L.note, 'detail', C.ink, 16); }
      return y;
    };

    let height;
    if (wide) {
      const gap = 24, half = (W - gap) / 2;
      height = Math.max(lane('phase1', 0, half, 0), lane('phases23', half + gap, half, 0));
    } else {
      const y = lane('phase1', 0, W, 0);
      height = lane('phases23', 0, W, y + 28);
    }
    height += 2;
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${W} ${height}`);
    ctx.$('.ph-body').replaceChildren(svg);
  });
}
