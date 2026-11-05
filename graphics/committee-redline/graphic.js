// Committee email redline ("A committee by design"): the consultant's draft
// purpose and term for the advisory committee, struck through, with the
// replies typed into her email beside them, and how "4 months" became
// "over the next several months."
// Text: data/committee-redline.csv. Plain HTML and CSS (<del>/<ins>).

export default async function draw(ctx) {
  const { h } = ctx;
  const rows = await ctx.csv('data/committee-redline.csv');
  const get = (id) => {
    const r = rows.find((x) => x.id === id);
    if (!r) throw new Error(`data/committee-redline.csv: no row ${id}`);
    return r;
  };
  // Unconfirmed wording is wrapped in a TK mark, which also shows the DRAFT strip.
  const words = (r, wrap) => (r.tk ? h('mark', { class: 'tk', title: `TK: ${r.tk}` }, wrap) : wrap);

  const pair = (draftId, replyId, ellipsis) => {
    const draft = get(draftId), reply = get(replyId);
    const struck = ellipsis ? `…${draft.text}…` : draft.text;
    return h('div', { class: 'rl-part' },
      h('p', { class: 'rl-label', text: draft.part }),
      h('div', { class: 'rl-pair' },
        h('div', { class: 'rl-draft' },
          h('p', { class: 'rl-tag', text: 'The draft' }),
          h('p', { class: 'rl-words' }, words(draft, h('del', { text: struck })))),
        h('div', { class: 'rl-reply' },
          h('p', { class: 'rl-tag', text: 'Reply typed into the email' }),
          h('p', { class: 'rl-words' }, h('ins', { text: `“${reply.text}”` })))));
  };

  const draft = get('purpose-draft');
  const email = h('div', { class: 'rl-email' },
    h('div', { class: 'rl-head' },
      h('p', {}, h('span', { text: 'From' }), draft.who),
      h('p', {}, h('span', { text: 'To' }), 'City Manager Darin Gale'),
      h('p', {}, h('span', { text: 'Sent' }), `${draft.when}, hours before the council meeting`)),
    pair('purpose-draft', 'purpose-reply', true),
    pair('term-draft', 'term-reply', false));

  const sug = get('term-suggestion'), ok = get('term-approval'), rel = get('term-release');
  const after = h('ol', { class: 'rl-after' },
    h('li', {}, h('span', { class: 'rl-when', text: sug.when }), h('span', {}, `${sug.who} suggests `, h('ins', { text: `“${sug.text}.”` }))),
    h('li', {}, h('span', { class: 'rl-when', text: '' }), h('span', {}, `${ok.who}: “${ok.text}”`)),
    h('li', {}, h('span', { class: 'rl-when', text: 'Later' }), h('span', {}, 'The phrase ', h('ins', { text: `“${rel.text}”` }), ` goes into ${rel.who.replace(/^The /, 'the ')}.`)));

  const note = h('p', { class: 'rl-note', text: 'Because the committee advises the city manager, the Brown Act, California’s open-meetings law, does not apply, Gale said.' });

  ctx.$('.ph-body').replaceChildren(email, note, h('p', { class: 'rl-after-title', text: 'Then, the length of service' }), after);
  ctx.flagDrafts();
}
