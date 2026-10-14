# Putting the interactive in the Scot Scoop (SNO) article

The interactive is hosted outside SNO, so the article only needs to embed it with one iframe. There are no plugins and no scripts in the post.

## Steps

1. Use SNO's long-form / immersive story template so a block can run full width.
2. Make the **first block** of the story a **Custom HTML** block containing the code from `kit/embed.html` (run `npm run kit` first so the URL is filled in):

   ```html
   <iframe src="https://scotscoop.github.io/pittsburg-data-center/"
           title="Interactive map: from the national data center boom to one Pittsburg golf course"
           style="width:100%;height:100vh;border:0;display:block"
           loading="lazy" allow="autoplay; fullscreen" allowfullscreen></iframe>
   <p><a href="https://scotscoop.github.io/pittsburg-data-center/">View the interactive full-screen →</a></p>
   ```

3. In the article body, include the intro's text as regular paragraphs (from `kit/intro-text.html`). Search engines, email newsletters, RSS readers and text-only republishers then get it even if they drop the iframe. Readers who saw the interactive will see the same sentences again. Rephrase those paragraphs into the lede if you like: the article body isn't bound by the interactive's wording.
4. Preview on a phone and on a laptop before publishing.

## If SNO strips the iframe

Use **Flourish** (it's on SNO's approved embed list) to host a simpler version: a Flourish "Story" built from the chapter stills in `media/stills/` with the chapter text. Readers on Scot Scoop lose the cinematic zoom, but the GitHub Pages URL stays the canonical interactive for republishers, judges and national outlets. Alternatively, embed `media/intro.mp4` as a video block with the text beneath.

## Questions to send SNO support

Get these answered in writing well before November:

1. "Does the Custom HTML block pass through `<iframe>` tags for editor/student roles, including inline `style` attributes? If not, is there an allowlist I can add a GitHub Pages domain (`scotscoop.github.io`) to?"
2. "Which story template lets a Custom HTML block run full-width (edge to edge) above the headline or as the first block of the body?"
3. "Is there any supported way to add a small amount of custom CSS to a single story? I'd use it for a full-bleed iframe, and to hide the fallback link once the frame loads."
