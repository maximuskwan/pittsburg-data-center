// Recycled-water priority diagram ("First to be curtailed"): who gets Delta
// Diablo's recycled water first, why AVAIO would be cut off first, and what
// it would fall back on. Text: data/water-priority.csv. HTML and CSS, so the
// text wraps at any width.

export default async function draw(ctx) {
  const { h } = ctx;
  const rows = Object.fromEntries((await ctx.csv('data/water-priority.csv')).map((r) => [r.id, r]));
  const row = (id) => {
    if (!rows[id]) throw new Error(`data/water-priority.csv: no row ${id}`);
    return rows[id];
  };
  const box = (cls, r, ...extra) => h('div', { class: `ph-box wp-box ${cls}` },
    h('p', { class: 'wp-title', text: r.label }),
    r.detail ? h('p', { class: 'wp-detail', text: r.detail }) : null, ...extra);

  const queue = h('ol', { class: 'wp-queue' }, ['calpine', 'others', 'avaio'].map((id) => {
    const r = row(id);
    return h('li', { class: `ph-box wp-box wp-step${id === 'avaio' ? ' wp-step--avaio' : ''}` },
      h('span', { class: 'wp-badge', 'aria-hidden': 'true', text: r.order }),
      h('div', {}, h('p', { class: 'wp-title', text: r.label }), h('p', { class: 'wp-detail', text: r.detail })));
  }));

  const chain = h('ol', { class: 'wp-chain' }, ['fallback-1', 'fallback-2', 'fallback-3'].map((id) => h('li', {}, h('span', { text: row(id).label }))));
  const tank = row('tank'), settle = row('settlement');

  ctx.$('.ph-body').replaceChildren(h('div', { class: 'wp' },
    box('wp-supply', row('supply')),
    h('p', { class: 'wp-arrow', 'aria-hidden': 'true' }),
    h('p', { class: 'ph-label', text: 'Who gets it first' }),
    queue,
    h('p', { class: 'wp-arrow', 'aria-hidden': 'true' }),
    box('wp-shortage', row('shortage')),
    h('p', { class: 'wp-arrow', 'aria-hidden': 'true' }),
    // The rule comes before the fallbacks: "absent a disruption" is why they're allowed.
    h('div', { class: 'ph-box wp-box wp-rule' },
      h('p', { class: 'wp-kicker', text: settle.label }),
      h('p', { class: 'wp-detail wp-detail--ink', text: `${settle.detail[0].toUpperCase()}${settle.detail.slice(1)}. So during a shortage, other water is allowed.` })),
    h('p', { class: 'ph-label wp-gap', text: 'If AVAIO is cut off' }),
    h('div', { class: 'wp-fallbacks' },
      h('div', { class: 'ph-box wp-box' },
        h('p', { class: 'wp-kicker', text: 'On site' }),
        h('p', { class: 'wp-title', text: tank.label }),
        h('p', { class: 'wp-detail', text: tank.detail })),
      h('div', { class: 'ph-box wp-box' },
        h('p', { class: 'wp-kicker', text: 'The city’s 2019 promise' }),
        h('p', { class: 'wp-title', text: 'Find the water elsewhere, in this order' }),
        chain)),
    h('p', { class: 'ph-caveat', text: 'The records don’t say whether the tank or the city’s promise would come first.' })));
}
