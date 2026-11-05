// Approvals still ahead ("What's left to decide"): one track per part of the
// site, read left to right. Each approval is a node: filled for a public vote,
// open for a decision made without one. That encoding is the headline, so the
// key above the tracks is the only legend.
//   Phase 1: three approvals in parallel, fanning into a bracket.
//   Phases 2-3: the moratorium (a hatched span with its dates), then the
//   approvals in order, ending with one city official. That node carries the
//   graphic's one annotation.
// Text: data/approvals-ahead.csv (vote = yes for a public vote; tk = unconfirmed).

const MORATORIUM = 'p23-moratorium';
const REVEAL = 'p23-za';

export default async function draw(ctx) {
  const { h } = ctx;
  const rows = await ctx.csv('data/approvals-ahead.csv');
  const get = (id) => {
    const r = rows.find((x) => x.id === id);
    if (!r) throw new Error(`data/approvals-ahead.csv: no row ${id}`);
    return r;
  };
  const vote = (r) => r.vote === 'yes';
  // Unconfirmed text is wrapped in a TK mark, which also shows the DRAFT strip.
  const tk = (r, text) => (r.tk ? h('mark', { class: 'tk', title: `TK: ${r.tk}` }, text) : text);
  const node = (r, extra = '') => h('span', { class: `ap-node${vote(r) ? ' ap-node--vote' : ''}${extra}`, 'aria-hidden': 'true' });
  const sr = (r) => h('span', { class: 'ph-sr-only', text: vote(r) ? 'Public vote: ' : 'No public vote: ' });
  const label = (r) => h('div', { class: 'ap-label' },
    h('p', { class: 'ap-title' }, sr(r), r.title),
    h('p', { class: 'ap-who', text: r.who }),
    r.detail ? h('p', { class: 'ap-detail', text: r.detail }) : null);

  // Phase 1: parallel. Three nodes stacked, joined by a bracket, then the end.
  const p1 = rows.filter((r) => r.lane === 'phase1');
  const phase1 = h('section', { class: 'ap-track ap-track--p1' },
    h('h4', { class: 'ap-track__title' }, 'Phase 1 ', h('span', { text: '22 acres north of the canal, approved in December 2025. It still needs all three, in any order.' })),
    h('div', { class: 'ap-fan' },
      h('ol', { class: 'ap-par' }, p1.map((r) => h('li', { class: 'ap-item' }, node(r), label(r)))),
      h('span', { class: 'ap-bracket', 'aria-hidden': 'true' }),
      h('p', { class: 'ap-end', text: 'Construction' })));

  // Phases 2-3: the moratorium span, then the approvals in order.
  const m = get(MORATORIUM);
  const steps = rows.filter((r) => r.lane === 'phases23' && r.id !== MORATORIUM && r.title).sort((a, b) => a.step - b.step);
  const caveat = get('p23-za-caveat');
  const item = (r) => {
    const reveal = r.id === REVEAL;
    return h('li', { class: `ap-item${reveal ? ' ap-item--reveal' : ''}` },
      node(r, reveal ? ' ap-node--reveal' : ''),
      h('div', { class: 'ap-label' },
        h('p', { class: 'ap-title' }, sr(r), r.title),
        h('p', { class: 'ap-who', text: r.who }),
        reveal ? null : h('p', { class: 'ap-detail', text: r.detail }),
        // The one annotation: what the last step means.
        reveal ? h('div', { class: 'ap-note' },
          h('p', { class: 'ap-note__quote' }, h('b', { text: 'No public vote. ' }), r.detail),
          h('p', { class: 'ap-note__caveat', text: caveat.detail })) : null));
  };
  const phases23 = h('section', { class: 'ap-track ap-track--p23' },
    h('h4', { class: 'ap-track__title' }, 'Phases 2 and 3 ', h('span', { text: '54 acres south of the canal, where AVAIO says no project is proposed. A project would need, in order:' })),
    h('ol', { class: 'ap-seq' },
      h('li', { class: 'ap-hold' },
        h('span', { class: 'ap-hatch', 'aria-hidden': 'true' }),
        h('div', { class: 'ap-label' },
          h('p', { class: 'ap-title', text: 'Moratorium' }),
          h('p', { class: 'ap-who' }, 'Oct.\u00a026 to ', tk(m, 'Dec.\u00a010')),
          h('p', { class: 'ap-detail' }, `${m.title.replace(/ on new data centers$/, '')}, adopted unanimously. `, tk(m, 'Ends Dec.\u00a010 unless extended.')))),
      ...steps.map(item),
      h('li', { class: 'ap-endstep' }, h('p', { class: 'ap-end', text: 'Construction' }))));

  ctx.$('.ph-body').replaceChildren(
    h('p', { class: 'ap-key', 'aria-hidden': 'true' },
      h('span', { class: 'ap-key__item' }, h('span', { class: 'ap-node ap-node--vote' }), 'Decided by a public vote'),
      h('span', { class: 'ap-key__item' }, h('span', { class: 'ap-node' }), 'Decided without one')),
    phase1, phases23);
  ctx.flagDrafts();

  // The bracket runs from the first node to the last, whatever the labels' heights.
  const fan = ctx.$('.ap-fan'), bracket = ctx.$('.ap-bracket'), items = ctx.$$('.ap-par .ap-item');
  ctx.onResize(() => {
    const top = items[0].offsetTop + 8, bottom = items[items.length - 1].offsetTop + 8;
    bracket.style.top = `${top}px`;
    bracket.style.height = `${bottom - top}px`;
    fan.style.setProperty('--mid', `${(top + bottom) / 2}px`);
  });
}
