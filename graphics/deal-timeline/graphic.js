// Deal timeline ("The city's stake"), replacing the table there: August 2017
// to the Oct. 26, 2026, moratorium, with the nine days in December 2025
// spelled out day by day. Each entry links to its source record when the
// CSV has a URL for it. As the reader scrolls, Scrollama highlights the entry
// in the middle of the screen.
// Data: data/deal-timeline.csv. Plain HTML and CSS.

const NINE = { first: '2025-12-08', last: '2025-12-16' };
const SHORT = { // labels for the day-by-day strip
  '2025-12-08': 'Generators exempted',
  '2025-12-10': 'FPPC pressed',
  '2025-12-11': 'Design approved, suit paused',
  '2025-12-15': 'Loan rewritten',
  '2025-12-16': 'Settlement filed',
};

export default async function draw(ctx) {
  const { h } = ctx;
  const rows = (await ctx.csv('data/deal-timeline.csv')).sort((a, b) => a.date_iso.localeCompare(b.date_iso));

  // Each entry's record (a link once the CSV has a URL) stays hidden until the
  // reader presses the one "Show records" toggle above the list.
  const entry = (r) => h('li', { class: `tl-entry${r.key ? ' tl-entry--key' : ''}`, 'data-date': r.date_iso },
    h('p', { class: 'tl-date', text: r.date }),
    h('div', { class: 'tl-what' },
      h('p', { class: 'tl-text', text: r.text }),
      h('p', { class: 'tl-record' }, h('span', { class: 'ph-sr-only', text: 'Record: ' }),
        r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener', text: r.source }) : r.source)));

  // Day-by-day strip for Dec. 8–16, 2025.
  const days = [];
  for (let d = new Date(`${NINE.first}T12:00:00Z`); d <= new Date(`${NINE.last}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  const weekday = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const strip = h('div', { class: 'tl-days', 'aria-hidden': 'true' }, days.map((iso) => {
    const has = rows.some((r) => r.date_iso === iso);
    return h(has ? 'button' : 'div', { class: `tl-day${has ? ' tl-day--event' : ''}`, 'data-date': iso, type: has ? 'button' : null,
      'aria-label': has ? `Go to Dec. ${Number(iso.slice(8))}` : null },
      h('span', { class: 'tl-day__dow', text: weekday(iso) }),
      h('span', { class: 'tl-day__num', text: Number(iso.slice(8)) }),
      h('span', { class: 'tl-day__dot' }),
      has ? h('span', { class: 'tl-day__what', text: SHORT[iso] || '' }) : null);
  }));

  // Group by year; the nine days get their own box inside 2025.
  const list = h('div', { class: 'tl' });
  const years = [...new Set(rows.map((r) => r.date_iso.slice(0, 4)))];
  for (const year of years) {
    const inYear = rows.filter((r) => r.date_iso.startsWith(year));
    const before = inYear.filter((r) => r.group !== 'nine-days');
    const nine = inYear.filter((r) => r.group === 'nine-days');
    const ol = h('ol', { class: 'tl-list' }, before.map(entry));
    const section = h('section', { class: 'tl-year' }, h('h4', { class: 'tl-year__label', text: year }), ol);
    if (nine.length) {
      section.append(h('div', { class: 'tl-nine' },
        h('p', { class: 'tl-nine__title', text: 'Nine days in December' }),
        h('p', { class: 'tl-nine__dek', text: 'The generator exemption, the design approval, the loan rewrite and the lawsuit settlement all came within nine days, the month Gale took over as city manager.' }),
        strip,
        h('ol', { class: 'tl-list' }, nine.map(entry))));
    }
    list.append(section);
  }
  const toggle = h('button', { class: 'tl-toggle', type: 'button', 'aria-pressed': 'false', text: 'Show records' });
  toggle.addEventListener('click', () => {
    const on = !ctx.root.classList.contains('tl-records');
    ctx.root.classList.toggle('tl-records', on);
    toggle.setAttribute('aria-pressed', String(on));
    toggle.textContent = on ? 'Hide records' : 'Show records';
  });
  ctx.$('.ph-body').replaceChildren(h('p', { class: 'tl-tools' }, toggle), list);
  // A day with events jumps to its entry.
  for (const cell of ctx.$$('button.tl-day')) {
    cell.addEventListener('click', () => ctx.$(`.tl-entry[data-date="${cell.dataset.date}"]`)?.scrollIntoView({ behavior: ctx.reducedMotion ? 'auto' : 'smooth', block: 'center' }));
  }

  // Scroll highlighting. With reduced motion (or ?still), every entry stays as is.
  if (ctx.reducedMotion) return;
  const steps = ctx.$$('.tl-entry');
  const dayCells = ctx.$$('.tl-day');
  const setActive = (el) => {
    for (const s of steps) s.classList.toggle('is-active', s === el);
    for (const c of dayCells) c.classList.toggle('is-active', !!el && c.dataset.date === el.dataset.date);
  };
  const scroller = await ctx.scrollama();
  scroller
    .setup({ step: steps, offset: 0.55 })
    .onStepEnter(({ element }) => setActive(element))
    .onStepExit(({ element, direction, index }) => {
      // Leaving the first entry upward or the last downward clears the highlight.
      if ((index === 0 && direction === 'up') || (index === steps.length - 1 && direction === 'down')) {
        if (element.classList.contains('is-active')) setActive(null);
      }
    });
  ctx.root.classList.add('tl-live');
  ctx.onResize(() => scroller.resize());
}
