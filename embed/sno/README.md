# SNO blocks for the graphics

Each file here is one **Custom HTML** block for the Scot Scoop story. Paste the whole file into one block where the graphic goes. The intro's block is `../sno-embed.html`, and it stays at the top.

| Block | Goes in | Where |
|---|---|---|
| `pollution-map.html` | From Black Diamond to data hub | After the paragraph that cites CalEnviroScreen |
| `deal-timeline.html` | The city's stake | In place of the timeline table |
| `committee-redline.html` | A committee by design | After the paragraph quoting the replies typed into Sovinec's email |
| `water-use.html` | First to be curtailed | After the first paragraph (landscaping vs. 70% for cooling) |
| `water-priority.html` | First to be curtailed | After the paragraph on the settlement and the 2019 fallback order |
| `approvals-ahead.html` | What's left to decide | After the paragraph on the public votes Phase 1 still needs |

Each block holds:

- the placeholder `<div class="ph-graphic" data-graphic="…">`, which `shared/mount.js` fills when the reader is about a screen away;
- a PNG of the graphic inside the placeholder, which shows only where the graphic can't run (no JavaScript: RSS, email, some reader views; or a load failure);
- a caption stating the finding, as plain text, so the story still reads if the graphic doesn't load;
- the import of `shared/mount.js` that every block shares. Because they all go through `window.PH_MOUNT_URL`, the browser loads it once.

The key-record embeds (graphic 3) are DocumentCloud's own embed codes; see `docs/GRAPHICS.md`.

Preview locally with `npm run mock` (mock story on :8081), then test on the real story in macOS Safari, iPadOS and iOS before publishing.
