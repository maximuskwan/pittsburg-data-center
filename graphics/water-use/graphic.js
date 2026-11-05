// Water-use chart ("First to be curtailed"): the same estimates at three
// scales, zooming out from the city manager's number to the 2019 agreement's.
// Numbers: data/water-use.csv. Drawn with Observable Plot.
import * as Plot from '../../vendor/plot/plot.mjs';

const fmt = new Intl.NumberFormat('en-US');
const about = (x, step) => fmt.format(Math.round(x / step) * step);

export default async function draw(ctx) {
  const data = Object.fromEntries((await ctx.csv('data/water-use.csv')).map((r) => [r.id, r]));
  const get = (id, key = 'high') => {
    const value = ctx.num(data[id]?.[key]);
    if (!Number.isFinite(value)) throw new Error(`data/water-use.csv: no ${key} for ${id}`);
    return value;
  };
  const cm = { low: get('city-manager', 'low'), high: get('city-manager', 'high') };
  const eng = get('engineers');
  const cool = get('engineers-cooling');
  const golf = get('golf-course');
  const ultimate = get('ultimate');
  // 41,177 of 58,407 is 70.5%; the story says 70%, so round to the nearest 5 and say "about".
  const share = Math.round((cool / eng) * 20) * 5;
  // "About 10 to 15 times": against the city manager's high and low ends.
  const times = [Math.round(eng / cm.high), Math.round(eng / cm.low)];

  const C = {
    ink: ctx.token('--ink'), muted: ctx.token('--muted'), red: ctx.token('--red'), redLight: '#f3b3be',
    gray: ctx.token('--gray'), grayDark: ctx.token('--gray-dark'), wash: ctx.token('--gray-wash'), rule: ctx.token('--gray-light'),
    sans: ctx.token('--sans'),
  };

  // Each label carries its scope ("Phase 1" or "whole park, all phases"), so the
  // zoom-out never compares Phase 1 numbers to the whole park unlabeled.
  const label = (id) => (data[id].scope ? `${data[id].label} (${data[id].scope.replace(/^Phase /, 'Phase\u00a0')})` : data[id].label);
  // One row per estimate: label, value text, bar segments, optional note under the bar.
  const ROWS = {
    'city-manager': {
      label: label('city-manager'), value: `${fmt.format(cm.low)}–${fmt.format(cm.high)}`,
      // A range, not a share: solid to the low end, outlined to the high end.
      segments: [{ x1: 0, x2: cm.low, fill: C.ink }, { x1: cm.low, x2: cm.high, fill: '#fff', outline: true }],
    },
    engineers: {
      label: label('engineers'), value: `About ${about(eng, 1000)}`,
      segments: [{ x1: 0, x2: cool, fill: C.red }, { x1: cool, x2: eng, fill: C.redLight }],
    },
    'golf-course': {
      label: label('golf-course'), value: `About ${about(golf, 10000)}`,
      segments: [{ x1: 0, x2: golf, fill: C.gray }],
    },
    ultimate: {
      label: label('ultimate'), value: `About ${fmt.format(ultimate / 1e6)} million`,
      segments: [{ x1: 0, x2: ultimate, fill: C.grayDark }],
    },
  };

  // The cooling share keeps its label in every panel, not just the first.
  const cooling = { at: 0, text: `Red: about ${share}% for cooling the data halls`, color: C.red, strong: true };

  const PANELS = [
    {
      kicker: 'Up close',
      title: `About ${share}% of the engineers’ estimate is for cooling, not landscaping`,
      scale: 'Gallons a day',
      max: 90000, ticks: [0, 30000, 60000, 90000], tick: (d) => fmt.format(d),
      rows: ['city-manager', 'engineers'],
      notes: {
        'city-manager': [{ at: 0, text: 'Gale said it would mostly go to landscaping.' }],
        engineers: [cooling, { at: 0, text: 'The recycled water contract allows about the same.', line: 1 }],
      },
    },
    {
      kicker: 'Zoom out',
      title: 'The golf course used far more when it was green',
      scale: 'Gallons a day. Shaded: the previous scale',
      max: 400000, prev: 90000, ticks: [0, 100000, 200000, 300000, 400000], tick: (d) => fmt.format(d),
      rows: ['city-manager', 'engineers', 'golf-course'],
      notes: { engineers: [cooling] },
    },
    {
      kicker: 'Zoom out again',
      title: 'What a 2019 city agreement anticipated for the whole park',
      scale: 'Gallons a day. Shaded: the previous scale',
      max: 7500000, prev: 400000, ticks: [0, 2500000, 5000000, 7500000], tick: (d) => (d ? `${fmt.format(d / 1e6)} million` : '0'),
      rows: ['city-manager', 'engineers', 'golf-course', 'ultimate'],
      notes: { engineers: [cooling] },
    },
  ];

  // Text measuring, so labels wrap before they run into the value on the right.
  const canvas = document.createElement('canvas').getContext('2d');
  const measure = (text, font) => { canvas.font = font; return canvas.measureText(text).width; };
  const wrap = (text, font, width) => {
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next, font) > width) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const FONT = { label: `600 12.5px ${C.sans}`, value: `700 14px ${C.sans}`, note: `500 11.5px ${C.sans}` };
  const TEXT = {
    label: { textAnchor: 'start', fontSize: 12.5, fontWeight: 600, dx: 6 }, // clear of the axis line
    valueOut: { textAnchor: 'start', fontSize: 13.5, fontWeight: 700, lineAnchor: 'middle', dx: 6 },
    valueTop: { textAnchor: 'end', fontSize: 13.5, fontWeight: 700, lineAnchor: 'top' },
    note: { textAnchor: 'start', fontSize: 11.5, fontWeight: 500, dx: 6 },
    strong: { textAnchor: 'start', fontSize: 11.5, fontWeight: 700, dx: 6 },
  };
  await Promise.all([document.fonts.load(FONT.label), document.fonts.load(FONT.value)]).catch(() => {});

  function panel(p, width) {
    const marginRight = Math.ceil(measure(p.tick(p.ticks[p.ticks.length - 1]), `11px ${C.sans}`) / 2) + 2; // room for the last tick label
    const right = width - marginRight;
    const marks = [];
    const texts = [];
    let y = 4;
    for (const id of p.rows) {
      const row = ROWS[id];
      const lines = wrap(row.label, FONT.label, right);
      texts.push({ x: 0, y, text: lines.join('\n'), kind: 'label', fill: C.ink });
      y += lines.length * 15.5 + 4;
      // The value sits at the end of its bar: outside if it fits, else inside.
      const last = row.segments[row.segments.length - 1];
      const endPx = (Math.min(p.max, last.x2) / p.max) * (right - 5) + 5;
      const fits = endPx + 6 + measure(row.value, FONT.value) <= width;
            // A bar that runs (nearly) full width gets its value at the end of the label line, right above the bar's end.
      if (fits) texts.push({ x: Math.min(p.max, last.x2), y: y + 8, text: row.value, kind: 'valueOut', fill: C.ink });
      else texts.push({ x: Math.min(p.max, last.x2), y: y - 15.5 - 4, text: row.value, kind: 'valueTop', fill: C.ink }); // on the label's last line
      if (!fits && measure(lines[lines.length - 1], FONT.label) + measure(row.value, FONT.value) + 12 > endPx) {
        // Label and value would collide: wrap the label shorter and redo this row's height.
        const short = wrap(row.label, FONT.label, endPx - measure(row.value, FONT.value) - 12);
        texts[texts.length - 2].text = short.join('\n');
        y += (short.length - lines.length) * 15.5;
        texts[texts.length - 1].y = y - 15.5 - 4;
      }
      // Bars too thin to see at this scale still get 2px, so their label has something to attach to.
      const minW = (2 / (right - 5)) * p.max;
      for (const sgm of row.segments) {
        const x2 = Math.min(p.max, sgm.x2);
        if (sgm.outline && x2 - sgm.x1 < minW) continue; // an outline that thin would just be a smudge
        marks.push({ ...sgm, x2: sgm.outline ? x2 : Math.max(x2, sgm.x1 + minW), y1: y, y2: y + 16 });
      }
      y += 16;
      const notes = p.notes?.[id] || [];
      const noteLines = Math.max(0, ...notes.map((n) => (n.line || 0) + 1));
      for (const n of notes) texts.push({ x: n.at, y: y + 5 + (n.line || 0) * 15, text: n.text, kind: n.strong ? 'strong' : 'note', fill: n.color || C.muted });
      y += noteLines * 15 + (noteLines ? 6 : 0) + 16;
    }
    const height = y + 18;
    const svg = Plot.plot({
      width, height, marginLeft: 4, marginRight, marginTop: 0, marginBottom: 22,
      style: { fontFamily: C.sans, color: C.muted, overflow: 'visible' },
      x: { domain: [0, p.max], range: [5, right] },
      y: { type: 'identity', axis: null },
      marks: [
        p.prev ? Plot.rect([{ x1: 0, x2: p.prev, y1: 0, y2: height - 22 }], { x1: 'x1', x2: 'x2', y1: 'y1', y2: 'y2', fill: C.wash }) : null,
        Plot.gridX(p.ticks, { stroke: C.rule, strokeOpacity: 1, y1: 0, y2: height - 22 }),
        Plot.rect(marks.filter((m) => !m.outline), { x1: 'x1', x2: 'x2', y1: 'y1', y2: 'y2', fill: 'fill' }),
        Plot.rect(marks.filter((m) => m.outline), { x1: 'x1', x2: 'x2', y1: 'y1', y2: 'y2', fill: '#fff', stroke: C.ink, strokeWidth: 1.2, inset: 0.6 }),
        Plot.ruleX([0], { stroke: C.ink, y1: 0, y2: height - 22 }),
        // Plot takes one anchor, size and weight per mark, so one text mark per kind.
        ...Object.entries(TEXT).map(([kind, style]) => Plot.text(texts.filter((t) => t.kind === kind), {
          x: 'x', y: 'y', text: 'text', fill: 'fill', lineAnchor: 'top', lineHeight: 1.24, ...style,
        })),
        Plot.axisX(p.ticks, { tickFormat: p.tick, tickSize: 0, tickPadding: 6, fontSize: 11, fontWeight: 400, fill: C.muted, anchor: 'bottom' }),
      ].filter(Boolean),
    });
    svg.setAttribute('aria-hidden', 'true');
    return ctx.h('section', { class: 'wu-panel' },
      ctx.h('p', { class: 'ph-label wu-kicker', text: p.kicker }),
      ctx.h('p', { class: 'wu-title', text: p.title }),
      ctx.h('p', { class: 'wu-scale', text: p.scale }),
      svg);
  }

  const body = ctx.$('.ph-body');
  ctx.onResize((width) => {
    body.replaceChildren(...PANELS.map((p) => panel(p, width)));
  });
}
