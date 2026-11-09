# Graphics for the story

The multimedia plan for "Power hungry" calls for seven elements. This repository builds six of them. The seventh, the key-record embeds, uses DocumentCloud documents that SNO embeds natively. For details, see [Embed the key records](#embed-the-key-records).

The story text stays native in SNO. Each graphic loads directly into the story page at its spot in the text, without an iframe.

| # | Graphic | Folder | Story section | Data |
|---|---|---|---|---|
| 1 | CalEnviroScreen map | `graphics/pollution-map/` | "From Black Diamond to data hub" | `data/pollution-map.csv`, `data/pollution-map.topojson` |
| 2 | Deal timeline | `graphics/deal-timeline/` | "The city's stake," in place of the table | `data/deal-timeline.csv` |
| 3 | Key-record embeds | DocumentCloud | Where each record is quoted | None |
| 4 | Committee email redline | `graphics/committee-redline/` | "A committee by design" | `data/committee-redline.csv` |
| 5 | Water-use chart | `graphics/water-use/` | "First to be curtailed" | `data/water-use.csv` |
| 6 | Recycled-water fallback | `graphics/water-priority/` | "First to be curtailed" | `data/water-priority.csv` |
| 7 | Approvals still ahead | `graphics/approvals-ahead/` | "What's left to decide" | `data/approvals-ahead.csv` |

To view a graphic on its own, run `npm start` and open `localhost:8080/graphics/FOLDER/`, replacing FOLDER with the graphic's folder name. The same path works on GitHub Pages.

## Understand how the graphics fit together

Each graphic and its shared code use the following files:

| Path | Purpose |
|---|---|
| `graphics/NAME/index.html` | The frame: headline, one-line explainer, screen-reader description, and source line |
| `graphics/NAME/graphic.js` | Draws into the frame. Exports `default function (ctx)`. |
| `graphics/NAME/graphic.css` | The graphic's own styles |
| `graphics/NAME/png/` | PNG fallbacks at phone and desktop widths, built by `npm run snapshot` |
| `shared/tokens.css` | Fonts and colors, shared with the intro |
| `shared/graphic.css` | The common frame |
| `shared/kit.js` | The `ctx` object that each graphic draws with, and the rules it follows |
| `shared/mount.js` | Loads the intro and every graphic into the SNO page |
| `embed/sno/NAME.html` | The Custom HTML block to paste into SNO for each graphic |
| `data/*.csv` | Every number and quote that a graphic shows, with a `source` column |
| `vendor/d3`, `vendor/plot` | D3 7.9 and Observable Plot 0.6 as single ES modules, built by `npm run vendor` |

### How a graphic loads in SNO

In SNO, each graphic is one Custom HTML block. The block contains the following:

- A placeholder, such as `<div class="ph-graphic" data-graphic="water-use">`.
- A PNG of the graphic inside the placeholder.
- A text caption below the placeholder.
- A one-line import of `shared/mount.js`.

Every block imports `mount.js` through `window.PH_MOUNT_URL`, so the browser loads it once, however many blocks the page has. `mount.js` gives each placeholder its own shadow root and loads the graphic when the reader is about one screen away.

The PNG appears only where the graphic can't run: without JavaScript, as in RSS, email, and some reader views, or when the graphic fails to load. The caption is plain SNO text, so the story reads correctly even if the graphic doesn't load.

The intro loads through `shared/mount.js` as well. `embed/mount.js` forwards to it, so the intro block in SNO works without changes.

## Follow the design rules

`shared/tokens.css` and `shared/graphic.css` implement these rules:

- Each headline states the finding in one line at desktop width.
- The footer runs in this order: **Note:** (optional), **Source:** or **Sources:**, and then "Graphic by Maximus Kwan / Scot Scoop."
- Red marks the one thing to look at. Blue is for water only. Inserted or quoted words use the neutral `--mark` highlight. Underlines mean links, and only links.
- Controls that work only in the live graphic, such as buttons and toggles, use the `.ph-interactive` class, so the PNG fallbacks omit them.
- Section labels are letterspaced capitals (`.ph-label`). Boxes use `--box-border` with square corners.
- Type comes from the named roles in `tokens.css`: `--type-hed`, `--type-dek`, `--type-body`, `--type-data`, `--type-label`, `--type-small`, and `--type-source`. Use serif for prose and quoted records. Use sans serif for labels and data.

The intro (`css/story.css`) follows the same rules:

- Each chapter card is a square box with an even 1 px ink border and no shadow.
- Each card has the same footer (`.ph-foot`): **Note:**, **Source:** or **Sources:**, and then the photo credit.
- The intro's own type roles, `--type-story` and `--type-byline`, are in `tokens.css`.
- Map colors come from `tokens.css` and the `--map-*` colors at the top of `story.css`. `js/story.js` reads these values, so the map code contains no raw hex values.

## Follow the code rules

`shared/kit.js` defines these rules, and `npm run check` enforces them:

1. Find elements through the container with `ctx.$` and `ctx.$$`. Don't use `document`; in SNO, `document` is the story page.
2. Load files with `ctx.csv()`, `ctx.json()`, `ctx.text()`, or `ctx.asset()`, using paths from the site root, such as `'data/water-use.csv'`. Don't use relative paths or `fetch()`.
3. Redraw when the container's width changes (`ctx.onResize`), not the window's width.
4. When `ctx.reducedMotion` is true, show the final state without animation. The shared frame also turns off CSS transitions.
5. Size full-screen layers with `lvh` units.
6. Hide screen-reader-only text with the `.ph-sr-only` class, the visually hidden pattern. Don't hide it by moving it offscreen.

`npm run check` also confirms that each graphic has its frame, a CSV with a `source` column, both PNGs, and an SNO block with a caption. When every graphic passes, the command prints the following:

```
6 graphics pass: approvals-ahead, committee-redline, deal-timeline, pollution-map, water-priority, water-use
```

## Run the commands

| Command | Description |
|---|---|
| `npm start` | Starts the preview server on port 8080. The server sends the same CORS header as GitHub Pages. |
| `npm run mock` | Starts the site on port 8080 and a mock SNO story on port 8081 that contains the intro and every block. The second port matches SNO, which serves the story from a different origin. |
| `npm run check` | Checks every graphic against the rules. Exits with status 1 on any problem. |
| `npm run snapshot` | Builds phone (375 px page) and desktop (760 px page) PNGs of every graphic at 2x, in the final state. To build one graphic, run `npm run snapshot -- water-use`. Requires Chromium: run `npx playwright install chromium` once, or set `CHROMIUM_PATH` to a Chrome binary. |
| `npm run fetch:calenviroscreen` | Rebuilds the map data from OEHHA and the Census Bureau. Downloads about 55 MB and caches it in `node_modules/.cache`. |
| `npm run vendor` | Rebuilds `vendor/` from `node_modules`, including D3, Plot, and topojson-client. |

After you change a graphic, its data, or the shared frame, run `npm run snapshot` and then `npm run check`.

## Add a graphic

1. Copy a folder in `graphics/` and rename it. The redline is the simplest starting point.
2. Make sure `data-graphic` in the new `index.html` matches the folder name.
3. Put the graphic's numbers in a CSV file in `data/` with a `source` column.
4. Copy a block in `embed/sno/`, and then change its name, caption, and alt text.
5. Build the PNGs and run the checks:

   ```bash
   npm run snapshot -- NAME
   npm run check
   ```

To flag anything unconfirmed, wrap it in `<mark class="tk">`, or add a `tk` note to its CSV row, as the redline does. The graphic highlights the item and shows a yellow DRAFT strip until you resolve it.

## Notes on each graphic

### 1. CalEnviroScreen map

- **Version.** The map uses CalEnviroScreen 5.0, final since July 1, 2026, instead of version 4.0, which the plan named. Version 5.0 replaces 4.0 and uses 2020 census tracts.
- **Measure.** The map shows the overall CalEnviroScreen percentile, which is the score that OEHHA ranks communities by. No tract near the site reaches the 90th percentile for pollution burden alone, in either version.
  - Two Pittsburg tracts, 0.8 and 1.4 miles from the plan area, are at the 92nd percentile overall (92.6 and 92.2). Their pollution burden percentiles are 87.4 and 79.9.
  - A tract in neighboring Antioch is at the 90th percentile.
  - The tracts that contain the plan area are at the 44th and 46th percentiles.
- **Switching measures.** To show pollution burden instead, set `MEASURE` in `graphic.js` to `'pollution_burden_percentile'`. The CSV contains both measures.
- **Shading.** The map shades only Contra Costa tracts. Land outside the county, such as the Solano County tract across the river (Suisun Marsh, 90th percentile), is white with gray edges, so readers can't mistake it for the lightest shade.
- **Ring wording.** The explainer says the two 92nd-percentile tracts are *partly* within 1.5 miles, because the ring only clips them.
- **Homes marker.** A marker shows the homes on Golf Club Road, about 800 feet east of the planned data center, which the intro's homes photo shows. The marker sits 245 m east of the building's east wall in `data/site-local.json`. Its position is approximate at this scale.
- **Rounding.** Labels round percentiles down, so no tract appears above a threshold it doesn't meet.

### 2. Deal timeline

- The timeline has 27 entries, from August 2017 to the Oct. 26, 2026, moratorium. A day-by-day box covers Dec. 8–16, 2025.
- Each entry names its record, including the page, in the CSV's `source` column.
- An entry links to its record when the CSV's `url` column has a value. 25 of the 27 entries have one. The other two have no link because their sources won't be published: the CEC's answers to Scot Scoop (Dec. 8, 2025) and the Perkins interview transcript (around May 20, 2026).
- Records stay hidden until the reader selects **Show records** above the list. Printed pages always show them.
- Scrollama highlights the entry at the middle of the screen. With reduced motion on, the timeline shows no highlight.

### 4. Committee email redline

- Each part, Purpose and Length of service, runs in three columns: the draft (p. 41 of the advisory committee emails), the reply typed into the email, and the final wording. All three columns quote the text as typed.
- The graphic uses no strikethrough, because the record shows replies typed into the email, not someone crossing out the draft. The quotes have no highlight.
- The graphic attributes the draft the same way the story does.
- The final wording for Purpose quotes the city's news release: "The committee will review and discuss research and advise the City Manager on matters related to data center policy development." This is the draft's line with the City Manager in place of the City Council.

### 5. Water-use chart

- The chart shows the same four estimates at three scales, with axes to 90,000, 400,000, and 7.5 million gallons a day. Each value sits just past its bar, and the small numbers stay visible as the chart zooms out.
- Each label names its scope from the CSV's `scope` column. The city manager's and engineers' figures cover Phase 1. The 2019 figure covers the whole park, all phases.
- Every panel labels the red cooling share.
- The golf course figure is 300 acre-feet a year, about 267,800 gallons a day. The chart shows it as "roughly 270,000."
- The cooling share is 41,177 of 58,407 gallons, or 70.5%. The chart labels it "about 70%" to match the story.

### 6. Recycled-water fallback

- The headline states the finding: if recycled water runs short, the data center could fall back on drinking water. The evidence is the settlement's "absent a disruption" clause, the tank plumbed for drinking water, and the 2019 promise that ends at the city's own supply.
- The graphic shows the mechanism, "last in line," as a plain numbered list. AVAIO's row is red. The list names Steiner as the speaker of "would also be the first to be curtailed."
- The graphic is typographic, with no boxes. The records give the priority order but not the amounts, and equal boxes would imply equal shares.
- If Delta Diablo's total supply and Calpine's allocation become available, redraw the graphic as proportional bars, one for a normal day and one for a hot day, with AVAIO's segment falling off the end.

### 7. Approvals still ahead

- The graphic has one track for each part of the site. Each approval is a node. A filled node is a public vote. An open node is a decision without one. This distinction is the headline's claim and the only legend.
- Phase 1's three approvals fan into a bracket because they happen in parallel.
- Phases 2–3 run in order: left to right in wide frames, top to bottom on phones. They start with the moratorium, shown as a hatched span with its dates.
- The canal crossing is three steps, in order:
  1. The water district board's consent, which is a public vote.
  2. Federal environmental review.
  3. The Bureau of Reclamation's easement.

  CCWD applies to the bureau only after its board consents (Jewel Jacobson's pre-application email). Only the bureau can grant an easement (Michael Inthavong, May 18, 2026). The easement requires the review (CCWD letters).
- The zoning administrator is the one red node and carries the one annotation, with Gale's caveat below it.
- The footer's Note contains the Center for Biological Diversity line.
- The moratorium's Dec. 10 expiration comes from §7 of the ordinance: effective immediately on Oct. 26, and in effect for 45 days unless extended.

## Embed the key records

The key records are DocumentCloud documents, embedded with SNO's own embed. This repository doesn't build them. All four are on DocumentCloud.

To embed a record, do the following:

1. In DocumentCloud, add a highlight for the quoted passage.
2. Copy the document's embed code from DocumentCloud.
3. In SNO, paste the embed code where the story quotes the record.

| Record | Quote | Story section |
|---|---|---|
| [Delta Diablo–Kimley-Horn emails](https://www.documentcloud.org/documents/28867505-email-correspondence-delta-diablo-kimley-horn-emails/), p. 4 (Ryan Bernal, Feb. 7, 2024) | "will be a data center" | "'Will be a data center'" |
| [FPPC advice letter A-25-154](https://www.documentcloud.org/documents/28867506-final-a-25-154-fppc-advice-letter/) (Feb. 27, 2026) | "in any manner" | "Nine days in December" |
| [FPPC advice request emails](https://www.documentcloud.org/documents/28867509-fw-fair-political-practices-commission-advice-request-25-154/), p. 4 (Donna Mooney, Dec. 10, 2025) | "For business reasons…" | "Nine days in December" |
| [Delta Diablo–AVAIO recycled water emails](https://www.documentcloud.org/documents/28867513-data-center-recycled-water-discussion-delta-diablo-avaio-emails/), p. 9 (Nick Steiner, March 13, 2026) | "would also be the first to be curtailed" | "First to be curtailed" |

## Check before publishing

- [x] Someone other than the builder checks every graphic against the story text. The CSVs list each number's source.
- [x] Test each graphic in SNO on macOS Safari, iPadOS, and iOS, starting with the water-use chart.
- [ ] Decide the CalEnviroScreen wording. For context, see [1. CalEnviroScreen map](#1-calenviroscreen-map).
