// Committee email ("A committee by design"): the consultant's draft purpose
// and term for the advisory committee, the replies typed into her email, and
// what each became. Three columns per part, in reading order: the draft, the
// reply, what it became. No strikethrough: the record shows replies typed
// into the email, not anyone crossing the draft out.
// Text: data/committee-redline.csv. Plain HTML and CSS.

export default async function draw(ctx) {
  const { h } = ctx;
  const rows = await ctx.csv('data/committee-redline.csv');
  const get = (id) => {
    const r = rows.find((x) => x.id === id);
    if (!r) throw new Error(`data/committee-redline.csv: no row ${id}`);
    return r;
  };
  // Unconfirmed wording is wrapped in a TK mark, which also shows the DRAFT strip.
  const words = (r, text) => (r.tk ? h('mark', { class: 'tk', title: `TK: ${r.tk}` }, text || `TK: ${r.tk}`) : text);
  const quote = (r) => (r.text ? `“${r.text}”` : '');
  const col = (tag, ...kids) => h('div', { class: 'rl-col' }, h('p', { class: 'rl-tag', text: tag }), ...kids);

  const part = (name, draftId, replyId, became) => {
    const draft = get(draftId), reply = get(replyId);
    return h('div', { class: 'rl-part' },
      h('p', { class: 'ph-label rl-label', text: name }),
      h('div', { class: 'rl-cols' },
        col('The draft', h('p', { class: 'rl-words rl-words--draft' }, words(draft, quote(draft)))),
        col('Reply typed into the email', h('p', { class: 'rl-words' }, words(reply, quote(reply)))),
        col('What it became', ...became)));
  };

  // Purpose: the city's news release, the draft's line with the City Manager in place of the council.
  const purpose = get('purpose-release');
  const purposeBecame = [
    h('p', { class: 'rl-words' }, words(purpose, quote(purpose))),
    h('p', { class: 'rl-attr', text: `— ${purpose.who}` }),
  ];

  // Length of service: how "4 months" became "over the next several months".
  const sug = get('term-suggestion'), ok = get('term-approval'), rel = get('term-release');
  const termBecame = [
    h('p', { class: 'rl-words' }, words(sug, quote(sug))),
    h('ol', { class: 'rl-steps' },
      h('li', {}, h('b', { text: `${sug.when} ` }), `${sug.who} suggests it.`),
      h('li', {}, `${ok.who}: “${ok.text}”`),
      h('li', {}, `The phrase goes into ${rel.who.replace(/^The /, 'the ')}.`)),
  ];

  const draft = get('purpose-draft');
  ctx.$('.ph-body').replaceChildren(h('div', { class: 'rl-email' },
    h('div', { class: 'rl-head' },
      h('p', {}, h('span', { text: 'From' }), draft.who),
      h('p', {}, h('span', { text: 'To' }), 'City Manager Darin Gale'),
      h('p', {}, h('span', { text: 'Sent' }), `${draft.when}, hours before the council meeting`)),
    part(draft.part, 'purpose-draft', 'purpose-reply', purposeBecame),
    part(get('term-draft').part, 'term-draft', 'term-reply', termBecame)));
  ctx.flagDrafts();
}
