// Recycled-water fallback ("First to be curtailed"): AVAIO would be last in
// line for Delta Diablo's recycled water, and in a shortage the settlement
// allows other water, with both fallbacks able to end in drinking water.
// Text: data/water-priority.csv.
//
// Deliberately typographic: a numbered list, a hairline rule, then two
// unboxed columns. No boxes, because box sizes would imply shares of the
// supply, and the records give the order of priority, not the amounts.
// Red marks AVAIO's row and nothing else.

export default async function draw(ctx) {
  const { h } = ctx;
  const rows = Object.fromEntries((await ctx.csv('data/water-priority.csv')).map((r) => [r.id, r]));
  const row = (id) => {
    if (!rows[id]) throw new Error(`data/water-priority.csv: no row ${id}`);
    return rows[id];
  };

  // Priority order: who gets the water first. One sentence per row.
  const rank = h('ol', { class: 'wp-rank' }, ['calpine', 'others', 'avaio'].map((id) => {
    const r = row(id);
    return h('li', { class: `wp-rank__row${id === 'avaio' ? ' wp-rank__row--avaio' : ''}` },
      h('span', { class: 'wp-num', 'aria-hidden': 'true', text: r.order }),
      h('p', { class: 'wp-line' }, h('b', { text: r.label }), ` ${r.detail}`));
  }));

  const tank = row('tank'), promise = row('promise');
  ctx.$('.ph-body').replaceChildren(h('div', { class: 'wp' },
    h('p', { class: 'wp-head', text: 'Who gets Delta Diablo’s recycled water first' }),
    rank,
    h('p', { class: 'wp-text', text: row('shortage').detail }),
    h('hr', { class: 'wp-rule' }),
    h('p', { class: 'wp-text wp-text--lead', text: row('settlement').detail }),
    h('div', { class: 'wp-cols' },
      h('div', { class: 'wp-col' },
        h('p', { class: 'wp-head', text: tank.label }),
        h('p', { class: 'wp-text', text: tank.detail })),
      h('div', { class: 'wp-col' },
        h('p', { class: 'wp-head', text: promise.label }),
        h('ol', { class: 'wp-chain' }, ['fallback-1', 'fallback-2', 'fallback-3'].map((id) => h('li', { text: row(id).label }))))),
    h('p', { class: 'ph-caveat', text: 'The records don’t say whether the tank or the city’s promise would come first.' })));
}
