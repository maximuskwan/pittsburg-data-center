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

  const pair = (draftId, replyId, ellipsis, after) => {
    const draft = get(draftId), reply = get(replyId);
    const struck = ellipsis ? `…${draft.text}…` : draft.text;
    return h('div', { class: 'rl-part' },
      h('p', { class: 'ph-label rl-label', text: draft.part }),
      h('div', { class: 'rl-pair' },
        h('div', { class: 'rl-draft' },
          h('p', { class: 'rl-tag', text: 'The draft' }),
          h('p', { class: 'rl-words' }, words(draft, h('del', { text: struck })))),
        h('div', { class: 'rl-reply' },
          h('p', { class: 'rl-tag', text: 'Reply typed into the email' }),
          h('p', { class: 'rl-words' }, h('ins', { text: `“${reply.text}”` })))),
      after || null);
  };

  // What became of "4 months", inside the same row, so the card reads as one before-and-after.
  const sug = get('term-suggestion'), ok = get('term-approval'), rel = get('term-release');
  const became = h('div', { class: 'rl-became' },
    h('p', { class: 'rl-tag', text: 'What it became' }),
    h('p', { class: 'rl-words' }, h('ins', { text: `“${sug.text}”` })),
    h('ol', { class: 'rl-steps' },
      h('li', {}, h('b', { text: `${sug.when} ` }), `${sug.who} suggests it.`),
      h('li', {}, `${ok.who}: “${ok.text}”`),
      h('li', {}, `The phrase goes into ${rel.who.replace(/^The /, 'the ')}.`)));

  const draft = get('purpose-draft');
  const email = h('div', { class: 'rl-email' },
    h('div', { class: 'rl-head' },
      h('p', {}, h('span', { text: 'From' }), draft.who),
      h('p', {}, h('span', { text: 'To' }), 'City Manager Darin Gale'),
      h('p', {}, h('span', { text: 'Sent' }), `${draft.when}, hours before the council meeting`)),
    pair('purpose-draft', 'purpose-reply', true),
    pair('term-draft', 'term-reply', false, became));

  const note = h('p', { class: 'ph-text rl-note', text: 'Because the committee advises the city manager, the Brown Act, California’s open-meetings law, does not apply, Gale said.' });

  ctx.$('.ph-body').replaceChildren(email, note);
  ctx.flagDrafts();
}
