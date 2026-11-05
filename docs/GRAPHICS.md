# Graphics for the story

The seven multimedia elements in the plan (Claude Doc "Power hungry", tab "Multimedia plan"). Six are built here. The seventh, the key-record embeds, lives on DocumentCloud and is embedded natively in SNO (see [Key-record embeds](#key-record-embeds)). The story text stays native in SNO. Each graphic loads straight into the story page, with no iframe, at its spot in the text.

| # | Graphic | Folder | Goes in | Data |
|---|---|---|---|---|
| 1 | CalEnviroScreen map | `graphics/pollution-map/` | "From Black Diamond to data hub" | `data/pollution-map.csv`, `data/pollution-map.topojson` |
| 2 | Deal timeline | `graphics/deal-timeline/` | "The city's stake" (replaces the table) | `data/deal-timeline.csv` |
| 3 | Key-record embeds | DocumentCloud, not in the repo | Where each record is quoted | |
| 4 | Committee email redline | `graphics/committee-redline/` | "A committee by design" | `data/committee-redline.csv` |
| 5 | Water-use chart | `graphics/water-use/` | "First to be curtailed" | `data/water-use.csv` |
| 6 | Recycled-water priority diagram | `graphics/water-priority/` | "First to be curtailed" | `data/water-priority.csv` |
| 7 | Approvals still ahead | `graphics/approvals-ahead/` | "What's left to decide" | `data/approvals-ahead.csv` |

Open any graphic on its own at `localhost:8080/graphics/<folder>/` (after `npm start`), or on GitHub Pages at the same path.

## How it fits together

```
graphics/<name>/index.html    the frame: headline, one-line explainer, screen-reader description, source line
graphics/<name>/graphic.js    draws into the frame; exports default function (ctx)
graphics/<name>/graphic.css   its own styles
graphics/<name>/png/          PNG fallbacks at phone and desktop widths (npm run snapshot)
shared/tokens.css             fonts and colors, shared with the intro (moved out of css/story.css)
shared/graphic.css            the common frame
shared/kit.js                 the context each graphic draws with, and the rules below
shared/mount.js               loads the intro and every graphic into the SNO page
embed/sno/<name>.html         the Custom HTML block to paste into SNO for each graphic
data/*.csv                    every number and quote a graphic shows, with a source column
vendor/d3, vendor/plot        D3 7.9 and Observable Plot 0.6 as single ES modules (npm run vendor)
```

**In SNO**, each graphic is one Custom HTML block: a placeholder (`<div class="ph-graphic" data-graphic="water-use">`), a PNG of the graphic inside it, a text caption under it, and the same one-line import of `shared/mount.js`. All the blocks import through `window.PH_MOUNT_URL`, so the browser loads `mount.js` once, however many blocks there are. It gives each placeholder its own shadow root and loads the graphic when it's about a screen away. The PNG shows only where the graphic can't run: no JavaScript (RSS, email, some reader views), or a graphic that failed to load. The caption is plain SNO text, so the story still reads if the graphic doesn't load.

**The intro** now loads through `shared/mount.js` too. `embed/mount.js` forwards to it, so the intro block already pasted into SNO keeps working unchanged. After the move, the intro was checked in headless Chromium, standalone and mounted in a mock SNO page, at phone and desktop sizes, in map and no-map modes. Every element's computed style matched the version before the move, and screenshots differed no more than two runs of the old version differ from each other (map rendering noise). That check doesn't cover Safari or iOS: test those on SNO.

## Design rules (shared/tokens.css, shared/graphic.css)

- Every headline states the finding in one line at desktop width.
- The footer always runs **Note:** (optional), **Source:** or **Sources:**, then "Graphic by Maximus Kwan / Scot Scoop."
- Red has one job: the thing to look at. Blue is for water only. Inserted or quoted words get the neutral `--mark` highlight. Underlines mean links, and only links.
- Section labels are letterspaced caps (`.ph-label`). Boxes use `--box-border` with square corners.
- Type comes from the named roles in `tokens.css` (`--type-hed`, `--type-dek`, `--type-body`, `--type-data`, `--type-label`, `--type-small`, `--type-source`). Serif is for prose and quoted records; sans is for labels and data.

## The rules (shared/kit.js; `npm run check` enforces them)

1. Find elements through the container (`ctx.$`, `ctx.$$`), never through `document`. In SNO, `document` is the story page.
2. Load files with `ctx.csv()`, `ctx.json()`, `ctx.text()` or `ctx.asset()`, with paths from the site root (`'data/water-use.csv'`), never relative paths or `fetch()`.
3. Redraw when the container's width changes (`ctx.onResize`), not the window's.
4. With reduced motion on, show the final state with no animation (`ctx.reducedMotion`). The shared frame turns off CSS transitions too.
5. Size full-screen layers with `lvh`.
6. Hide screen-reader-only text with `.ph-sr-only` (the visually-hidden pattern), never by offsetting it.

`npm run check` also confirms each graphic has its frame, a CSV with a source column, both PNGs and an SNO block with a caption.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Preview server on :8080 (sends the CORS header GitHub Pages sends) |
| `npm run mock` | The site on :8080 plus a mock SNO story on :8081 with the intro and every block pasted in, from a different port, as SNO is |
| `npm run check` | The rules above |
| `npm run snapshot` | PNGs of every graphic, phone (375 px page) and desktop (760 px page) at 2x, in the final state. `npm run snapshot -- water-use` for one. Needs `npx playwright install chromium` once, or `CHROMIUM_PATH` set to a Chrome binary |
| `npm run fetch:calenviroscreen` | Rebuilds the map data from OEHHA and the Census Bureau (~55 MB download, cached in `node_modules/.cache`) |
| `npm run vendor` | Rebuilds `vendor/` from `node_modules` (now also D3, Plot and topojson-client) |

Run `npm run snapshot` after any change to a graphic, its data or the shared frame. Then run `npm run check`.

## Adding a graphic

Copy a folder in `graphics/` (the redline is the simplest), rename it, and keep `data-graphic` in `index.html` matching the folder name. Put its numbers in a CSV in `data/` with a `source` column. Copy one of the `embed/sno/` blocks and change the name, caption and alt text. Then run `npm run snapshot -- <name>` and `npm run check`. Wrap anything unconfirmed in `<mark class="tk">` (or give its CSV row a `tk` note, as the redline does). It's highlighted, and the graphic shows a yellow DRAFT strip until it's resolved.

## Notes on each graphic

**1. CalEnviroScreen map.** It uses CalEnviroScreen **5.0**, OEHHA's current version, final since July 1, 2026, rather than 4.0 as the plan said. 5.0 replaced 4.0 and uses 2020 census tracts. It shows the **overall CalEnviroScreen percentile**, the score OEHHA ranks communities by, because no tract near the site reaches the 90th percentile for pollution burden alone in either version. Two Pittsburg tracts 0.8 and 1.4 miles from the plan area are at the 92nd percentile overall (92.6 and 92.2; pollution burden 87.4 and 79.9). A tract in neighboring Antioch is at the 90th. The tracts the plan area sits in are at the 44th and 46th. To show pollution burden instead, change `MEASURE` in `graphic.js` to `'pollution_burden_percentile'`; the CSV has both. Only Contra Costa tracts are shaded. A Solano County tract across the river (Suisun Marsh, 90th percentile) is drawn as plain land. Labels show the percentile rounded down, so no tract is shown above a threshold it doesn't meet.

**2. Deal timeline.** It has 27 entries, from August 2017 to the Oct. 26, 2026, moratorium, with Dec. 8–16, 2025, in a day-by-day box. Each entry names its record, page included, in the CSV's `source` column. An entry links to the record when the CSV's `url` column has one. Five do now: CEQAnet, the notice of determination (two entries), AVAIO's press release and the city's moratorium release. Fill in the rest (for example, DocumentCloud links) and the links appear. Scrollama highlights the entry at mid-screen. Reduced motion leaves the highlight off.

**4. Committee redline.** The draft's full purpose line (p. 41 of the advisory committee emails) is struck through, with the replies typed into the email beside it, quoted as typed. The draft is attributed as the story attributes it.

**5. Water-use chart.** The same four estimates are shown at three scales (up to 60,000, 300,000 and 5 million gallons a day), so the small numbers stay visible as it zooms out. The golf course figure is 300 acre-feet a year (≈267,800 gallons a day), shown as "roughly 270,000". The cooling share is 41,177 of 58,407 gallons, or 70.5%, labeled "about 70%" to match the story.

**6 and 7. Diagrams.** HTML and CSS boxes (like the redline), so text wraps at any width and follows the reader's font size. The approvals chart marks who decides each step with a tag, filled for a public vote and outlined otherwise, explained in a key above it. The moratorium is shown as a banner over Phases 2 and 3, since it isn't a step a project takes.

## Key-record embeds

These are DocumentCloud documents, embedded with SNO's own embed. They aren't built in this repo. Upload them, note a highlight for the quoted passage, and paste DocumentCloud's embed code where each is quoted:

| Record | Quote | Section |
|---|---|---|
| Delta Diablo–Kimley-Horn emails, p. 4 (Ryan Bernal, Feb. 7, 2024) | "will be a data center" | "'Will be a data center'" |
| FPPC advice letter A-25-154 (Feb. 27, 2026) | "in any manner" | "Nine days in December" |
| FPPC advice request emails, p. 4 (Donna Mooney, Dec. 10, 2025) | "For business reasons…" | "Nine days in December" |
| Delta Diablo–AVAIO recycled water emails, p. 9 (Nick Steiner, March 13, 2026) | "would also be the first to be curtailed" | "First to be curtailed" |

Once they're up, put their URLs in `data/deal-timeline.csv` too.

## Before it counts as done

- [ ] Someone other than the builder checks every graphic against the story text (the CSVs list each number's source).
- [ ] Test each graphic in SNO on macOS Safari, iPadOS and iOS. The water-use chart goes first, per the plan.
- [ ] Decide the CalEnviroScreen wording (see the map notes above).
