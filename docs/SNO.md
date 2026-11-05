# Putting the interactive in the Scot Scoop (SNO) article

The interactive and the graphics are hosted on GitHub Pages and load straight into the story page, with no iframes. The post needs no plugins: each piece is one Custom HTML block with a placeholder and a one-line script. The graphics' blocks, and where each goes, are in [`embed/sno/`](../embed/sno/README.md).

## Steps

1. Use SNO's long-form / immersive story template so a block can run full width.
2. Make the **first block** of the story a **Custom HTML** block containing everything in `embed/sno-embed.html`. It loads the intro straight into the story page (no iframe) via `embed/mount.js`, so the map pins with the page's own scrolling, as on the standalone site. The plain iframe in `kit/embed.html` is still the one for republishers.

3. In the article body, include the intro's text as regular paragraphs (from `kit/intro-text.html`). Search engines, email newsletters, RSS readers and text-only republishers then get it even if they drop the iframe. Readers who saw the interactive will see the same sentences again. Rephrase those paragraphs into the lede if you like: the article body isn't bound by the interactive's wording.
4. Paste each graphic's block from `embed/sno/` at its spot in the text (the table in `embed/sno/README.md`). The blocks share one loader, `shared/mount.js`, which the browser loads once.
5. Preview on a phone and on a laptop before publishing, in macOS Safari, iPadOS and iOS as well as Chrome.

## If SNO strips the iframe

Use **Flourish** (it's on SNO's approved embed list) to host a simpler version: a Flourish "Story" built from the chapter stills in `media/stills/` with the chapter text. Readers on Scot Scoop lose the cinematic zoom, but the GitHub Pages URL stays the canonical interactive for republishers, judges and national outlets. Alternatively, embed `media/intro.mp4` as a video block with the text beneath.

## Questions to send SNO support

Get these answered in writing well before November:

1. "Does the Custom HTML block pass through `<iframe>` tags for editor/student roles, including inline `style` attributes? If not, is there an allowlist I can add a GitHub Pages domain (`maximuskwan.github.io`) to?"
2. "Which story template lets a Custom HTML block run full-width (edge to edge) above the headline or as the first block of the body?"
3. "Is there any supported way to add a small amount of custom CSS to a single story? I'd use it for a full-bleed iframe, and to hide the fallback link once the frame loads."
