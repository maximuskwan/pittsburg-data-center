# Add the interactive to the SNO story

The intro and the graphics are hosted on GitHub Pages and load directly into the Scot Scoop story page, without iframes. The story needs no plugins. Each piece is one Custom HTML block that contains a placeholder and a one-line script.

## Before you begin

- Choose SNO's long-form or immersive story template, so that a block can run full width.
- Make sure the site is live on GitHub Pages. For details, see [Publish on GitHub Pages](../README.md#publish-on-github-pages).

## Add the intro and graphics

1. Make the first block of the story a **Custom HTML** block, and paste the full contents of `embed/sno-embed.html` into it.

   The block loads the intro into the story page through `embed/mount.js`. The map pins as the page scrolls, the same as on the standalone site. Republishers use the iframe in `kit/embed.html` instead.

2. In the article body, add the intro's text from `kit/intro-text.html` as regular paragraphs.

   Search engines, email newsletters, RSS readers, and text-only republishers then get the text even if they drop the interactive. Readers who saw the interactive see the same sentences again, so you can rephrase these paragraphs into the lede. The article body doesn't need to match the interactive's wording.

3. Paste each graphic's block from `embed/sno/` at its spot in the text. For the placement of each block, see [SNO blocks for the graphics](../embed/sno/README.md).

   All the blocks share one loader, `shared/mount.js`, which the browser loads once.

4. Preview the story before you publish it. Check it in Chrome and in macOS Safari, iPadOS, and iOS, on both a phone and a laptop.

## Troubleshoot

If SNO strips the script or the intro doesn't load, use one of these fallbacks:

- **Flourish.** Flourish is on SNO's approved embed list. Build a Flourish "Story" from the chapter stills in `media/stills/` and the chapter text. Scot Scoop readers lose the zoom animation, but the GitHub Pages URL remains the canonical interactive for republishers, judges, and national outlets.
- **Video.** Embed `media/intro.mp4` as a video block, with the intro text below it.
