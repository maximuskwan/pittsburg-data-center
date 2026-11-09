# SNO blocks for the graphics

Each file in this directory is one **Custom HTML** block for the Scot Scoop story. The intro's block is `../sno-embed.html`, and it stays at the top of the story.

## Paste the blocks

For each graphic, create one Custom HTML block at the spot in the following table, and paste the full contents of the file into it.

| Block | Story section | Position |
|---|---|---|
| `pollution-map.html` | "From Black Diamond to data hub" | After the paragraph that cites CalEnviroScreen |
| `deal-timeline.html` | "The city's stake" | In place of the timeline table |
| `committee-redline.html` | "A committee by design" | After the paragraph that quotes the replies typed into Sovinec's email |
| `water-use.html` | "First to be curtailed" | After the first paragraph, which compares landscaping with the 70% for cooling |
| `water-priority.html` | "First to be curtailed" | After the paragraph on the settlement and the 2019 fallback order |
| `approvals-ahead.html` | "What's left to decide" | After the paragraph on the public votes that Phase 1 still needs |

The key-record embeds (graphic 3) use DocumentCloud's own embed codes. For details, see [Embed the key records](../../docs/GRAPHICS.md#embed-the-key-records).

## What each block contains

- **A placeholder,** `<div class="ph-graphic" data-graphic="…">`. `shared/mount.js` fills it when the reader is about one screen away.
- **A PNG of the graphic** inside the placeholder. The PNG appears only where the graphic can't run: without JavaScript, as in RSS, email, and some reader views, or when the graphic fails to load.
- **A caption** that states the finding in plain text, so the story reads correctly if the graphic doesn't load.
- **An import of `shared/mount.js`.** Every block imports it through `window.PH_MOUNT_URL`, so the browser loads it once.

## Test the blocks

1. Preview the blocks locally in a mock SNO story:

   ```bash
   npm run mock
   ```

   The command prints the following:

   ```
   Site: http://localhost:8080   Mock SNO story: http://localhost:8081  (Ctrl+C to stop)
   ```

2. Open `http://localhost:8081` and check each graphic.
3. Before you publish, test the real story in macOS Safari, iPadOS, and iOS.
