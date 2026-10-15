// Builds the text parts of the republication kit from index.html, so the kit
// can never drift from what's on the page. Run: `npm run kit`
//   kit/intro-text.html  — the intro's text as plain paragraphs, for pasting
//                           into any CMS above the article body
//   kit/intro-text.txt   — same, plain text
//   kit/embed.html       — the iframe snippet with the live URL filled in
//   kit/CREDITS.txt, kit/media/hero-alt.txt
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import config from '../js/config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = parse(readFileSync(join(root, 'index.html'), 'utf8'));

const tks = doc.querySelectorAll('mark.tk').map((m) => m.text.trim());
const paragraphs = [];
for (const step of doc.querySelectorAll('.step')) {
  if (step.getAttribute('data-chapter') === 'opener') continue;
  for (const p of step.querySelectorAll('.card p')) {
    if (p.classList.contains('source') || p.classList.contains('scroll-cue')) continue;
    paragraphs.push(p.innerHTML.replace(/<mark class="tk">(.*?)<\/mark>/g, '[$1]').trim());
  }
}
const credits = doc.querySelector('.credits').innerHTML.replace(/<mark class="tk">(.*?)<\/mark>/g, '[$1]').replace(/\s+/g, ' ').trim();

const html = `<!-- Intro text for "Power Hungry" (Scot Scoop). Paste above the article body
     when you can't embed the interactive. Licensed CC BY-ND 4.0: do not edit. -->
${paragraphs.map((p) => `<p>${p}</p>`).join('\n')}
<p><em>Interactive version: <a href="${config.siteUrl}">${config.siteUrl}</a></em></p>
<p><small>${credits}</small></p>
`;
const text = paragraphs.map((p) => p.replace(/<[^>]+>/g, '')).join('\n\n') + `\n\nInteractive version: ${config.siteUrl}\n`;
const embed = `<iframe src="${config.siteUrl}"
        title="Interactive map: from the national data center boom to one Pittsburg golf course"
        style="width:100%;height:100vh;border:0;display:block"
        loading="lazy" allow="autoplay; fullscreen" allowfullscreen></iframe>
<p><a href="${config.siteUrl}">View the interactive full-screen →</a></p>
`;
const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const heroStep = doc.querySelector('.step[data-chapter="photo-homes"]');
mkdirSync(join(root, 'kit/media'), { recursive: true });
writeFileSync(join(root, 'kit/media/hero-alt.txt'), `${heroStep.getAttribute('data-alt')}\n`);
writeFileSync(join(root, 'kit/CREDITS.txt'), `${plain(credits)}\n\nThis story was originally published by Scot Scoop (${config.storyUrl}), the student newsroom of Carlmont High School in Belmont, Calif. It is republished under a Creative Commons BY-ND 4.0 license.\n`);
writeFileSync(join(root, 'kit/intro-text.html'), html);
writeFileSync(join(root, 'kit/intro-text.txt'), text);
writeFileSync(join(root, 'kit/embed.html'), embed);
console.log('Wrote kit/intro-text.html, intro-text.txt, embed.html, CREDITS.txt, media/hero-alt.txt');
if (tks.length) {
  console.warn(`\n⚠ ${tks.length} TK item(s) still in index.html — resolve before sending the kit out:`);
  for (const t of tks) console.warn(`  • ${t}`);
}
