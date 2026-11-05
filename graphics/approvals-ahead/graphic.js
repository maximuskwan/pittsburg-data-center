// Approvals-still-ahead flowchart ("What's left to decide"): what Phase 1
// still needs before it can be built, and the path for Phases 2 and 3, which
// the moratorium now covers. Each step is tagged with who decides; a filled
// tag means a public vote. Text: data/approvals-ahead.csv. HTML and CSS.

const LANES = {
  phase1: {
    title: 'Phase 1',
    sub: '22 acres north of the canal, approved in December 2025. It still needs all three:',
    end: 'Then Phase 1 can be built',
  },
  phases23: {
    title: 'Phases 2 and 3',
    sub: '54 acres south of the canal, where AVAIO says no project is proposed. A project would need, in order:',
    end: 'Then they can be built',
    notes: [
      'Gale says proposals would go to the Planning Commission and council instead, but the plan hasn’t been amended to require that.',
      'The Center for Biological Diversity, which agreed not to oppose Phase 1, can still oppose these phases.',
    ],
  },
};
const BANNER = 'p23-moratorium';

export default async function draw(ctx) {
  const { h } = ctx;
  const rows = await ctx.csv('data/approvals-ahead.csv');
  const vote = (kind) => /public vote/i.test(kind);
  const tag = (kind) => h('span', { class: `ap-tag${vote(kind) ? ' ap-tag--vote' : ''}`, text: kind });
  const step = (r) => h('li', { class: 'ph-box ap-step' },
    tag(r.kind),
    h('p', { class: 'ap-title', text: r.title }),
    r.who ? h('p', { class: 'ap-who', text: r.who }) : null,
    r.detail ? h('p', { class: 'ap-detail', text: r.detail }) : null);

  const lane = (id) => {
    const L = LANES[id];
    const steps = rows.filter((r) => r.lane === id && r.id !== BANNER).sort((a, b) => a.step - b.step);
    const banner = id === 'phases23' ? rows.find((r) => r.id === BANNER) : null;
    return h('section', { class: `ap-lane ap-lane--${id}` },
      h('h4', { class: 'ap-lane__title', text: L.title }),
      h('p', { class: 'ap-sub', text: L.sub }),
      banner ? h('p', { class: 'ap-banner' }, h('b', { text: 'On hold now: ' }),
        `${banner.title}, adopted by ${banner.who.replace(/^The /, 'the ')} Oct. 26 and effective immediately, covers these phases.`) : null,
      h('ol', { class: `ap-steps${id === 'phase1' ? ' ap-steps--all' : ' ap-steps--order'}` }, steps.map(step)),
      h('p', { class: 'ap-arrow', 'aria-hidden': 'true' }),
      h('p', { class: 'ap-end', text: L.end }),
      ...(L.notes || []).map((n) => h('p', { class: 'ap-note', text: n })));
  };

  ctx.$('.ph-body').replaceChildren(
    h('p', { class: 'ap-key' },
      h('span', { class: 'ap-key__item' }, tag('Public vote'), ' decided by a public vote'),
      h('span', { class: 'ap-key__item' }, tag('Agency'), ' decided without one')),
    h('div', { class: 'ap-lanes' }, lane('phase1'), lane('phases23')));
}
