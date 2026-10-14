# Power Hungry: scrollytelling intro

The opening interactive for Scot Scoop's investigation into the AVAIO "Perseus" data center in Pittsburg, Calif. Readers scroll and the map flies from the national data center boom to California, the Bay Area, Carlmont, Pittsburg and the former Delta View Golf Course, then fades into drone footage.

It's a standalone static page (MapLibre GL JS + Scrollama) with no build step, no API keys and no CMS dependency. Scot Scoop and every republisher embed the same URL in an iframe. Outlets that can't use iframes get an MP4, stills and plain text from `kit/`.

```
index.html          ← ALL chapter text lives here
js/config.js        ← camera moves, layers and labels for each chapter
css/story.css       ← look and feel
data/               ← map data (GeoJSON)
media/              ← drone video, recorded intro video, chapter stills
kit/                ← republication kit (embed code, text, video, guide)
docs/SNO.md         ← how to put it in the SNO article, and questions for SNO support
tools/              ← scripts (preview server, data fetch, video recorder, kit builder)
vendor/             ← MapLibre, Scrollama and fonts, copied in so nothing loads from a CDN
```

## Preview it

You need [Node.js](https://nodejs.org) 20 or newer.

```sh
npm install
npm start            # then open http://localhost:8080
```

Useful URLs while previewing:

| URL | What it shows |
|---|---|
| `localhost:8080` | The full interactive |
| `localhost:8080/?static` | The no-map version (what reduced-motion users and narrow iframes get) |
| `localhost:8080/docs/embed-test.html` | The interactive inside an iframe on a fake article page |
| `localhost:8080/?offline` | Map without remote tiles or imagery (for testing if a tile server is down) |

While anything is unfinished, a yellow **DRAFT** banner across the top counts the open TK items and placeholder datasets. When it disappears, the page is ready.

## Editing

**Text:** edit the `<section class="step">` blocks in `index.html`. Each one is a scroll stop. Wrap anything unfinished in `<mark class="tk">…</mark>` and it'll be highlighted and counted.

**Camera and layers:** edit `js/config.js`. Each chapter has a camera (`bounds` or `center`/`zoom`, plus `pitch`, `bearing` and `duration`), the layers to show, and the labels to show. The comments at the top of the file explain each setting.

**Adding a chapter:** copy a `<section class="step">` in `index.html`, give it a new `data-chapter="name"`, and add a matching `name: { … }` entry in `js/config.js`.

Plain-English requests work well in Claude Code: "the California zoom is too fast," "make the text boxes narrower," "hold the last chapter for two scroll lengths."

## Before publishing: replace the placeholders

Every item below is flagged by the DRAFT banner or by `npm run kit`.

1. **Site boundary** (`data/parcel.geojson`). Right now it's a 76-acre square at an *approximate* location. Replace it with the real parcel(s) on Golf Club Rd. from Contra Costa County GIS (export as GeoJSON), or trace the boundary from the Nov. 2024 Vesting Tentative Map at [geojson.io](https://geojson.io) and save the result over this file.
2. **Site coordinates.** Once you have the boundary, put its center point in four places: `js/config.js` (the `parcel` and `discovered` chapters' `center` and the `perseus` label), `data/bay-area-sites.geojson` (the `perseus` point), and the end of the line in `data/carlmont-route.geojson`. Remove `"placeholder": true` from each data file as you verify it.
3. **National data centers** (`data/datacenters.geojson`). Now it holds placeholder dots for about 25 well-known data center *markets*. Run `npm run fetch:datacenters` to replace them with every U.S. data center mapped in OpenStreetMap, then update the "as of" date in the national chapter's source line.
4. **Drone footage.** Save Cara's clip as `media/drone.mp4`. A WebM copy (`media/drone.webm`) is optional; it makes the file smaller in Chrome and Firefox. Keep it under about 20 MB: 1080p, 15–30 seconds, no audio. Get her written license first (see Licensing below).
5. **Record the videos and stills:** `npm run record`. It needs [ffmpeg](https://ffmpeg.org) and, the first time, `npx playwright install chromium`. It writes `media/intro.mp4`, `media/stills/*.jpg` (used by the no-map version), `kit/media/intro-captioned.mp4` and `kit/media/hero.jpg`. Re-run it any time the map or text changes.
6. **URLs:** set `storyUrl` (the article) and `siteUrl` (where this is hosted) in `js/config.js`, and update the code link in the credits in `index.html`.
7. **Kit:** `npm run kit` rebuilds the embed code and plain-text intro, and lists any TK still open.

### Facts in the intro text to verify against primary sources

- LBNL 2024 report: data centers used ~4.4% of U.S. electricity in 2023, and could reach 6.7%–12% by 2028.
- Pittsburg population "about 76,000" (2020 Census: 76,416).
- Delta View closure vote, May 2018; "technology park" process begins, June 2018 (East County Today clips; confirm against the minutes).
- Nov. 2024 vote, 5–0 (agenda packet + CivicClerk video).
- 92 MW and $800 million are the *developer's* figures (AVAIO release, Dec. 3, 2024). The text attributes the dollar figure; keep it that way.
- "About 19 months": Nov. 2024 → June 2026. Pin the approval date and the first public meeting date.
- "About an hour's drive from Carlmont," and Santa Clara as the Bay Area's data center hub.

## Publishing on GitHub Pages

1. Create a GitHub organization or account for Scot Scoop, and a repository named `pittsburg-data-center`.
2. Push this folder to it (Claude Code can do this for you).
3. In the repo, go to **Settings → Pages**, set **Source: Deploy from a branch**, branch `main`, folder `/ (root)`, and save. The site appears at `https://<account>.github.io/pittsburg-data-center/` within a minute or two.
4. Work on a branch and merge into `main` only when it's right. `main` is the live site.

For SNO, see **[docs/SNO.md](docs/SNO.md)**. For republishers, see **[kit/REPUBLISH.md](kit/REPUBLISH.md)**.

## How it behaves

- **Scrolling drives the map.** All map gestures (zoom, pan, rotate) are disabled so the reader can't get stuck.
- **Inside an iframe** the reader scrolls within the frame, which is 100% of the screen height. When the chapters end, the end card says "Continue reading below" and the host page carries on.
- **No-map version** (stacked stills, drone video and text) is shown when:
  - the reader has reduced motion turned on;
  - the frame is narrower than 700px, since iOS handles scrolling inside iframes badly. Change this with `staticBelowWidthInIframe` in the config;
  - WebGL fails;
  - the URL has `?static`.
- **If the drone video is missing**, the last chapter slowly orbits the site on the map instead.
- **If the tile servers are down**, the national and California chapters still render from the bundled Census boundaries.
- **Accessibility:** all text is real HTML (readable by screen readers, search engines and text-only republishers). Each chapter also has a screen-reader description of the map (`data-alt`), which doubles as alt text for the stills. A "Skip the interactive map" link sits at the top.

## Licensing

| Part | License |
|---|---|
| Code in this repo | MIT (see `LICENSE`). Other newsrooms can fork it for their own data center stories. |
| Story text, Scot Scoop photos and graphics | CC BY-ND 4.0 (see `CONTENT-LICENSE.md`) |
| Drone footage | © Cara Esten Hurtle. Ask for a written license covering "use within this article and its authorized republications, in any medium." It is *not* CC-licensed unless she chooses that. |
| Map data | © OpenStreetMap contributors (ODbL), OpenFreeMap / OpenMapTiles. Boundaries: U.S. Census Bureau (public domain). Imagery: USGS The National Map (public domain). The attribution sits in the map corner, so republishers inherit it automatically. |
| MapLibre GL JS (BSD-3), Scrollama (MIT), Inter Tight and Newsreader fonts (SIL OFL) | Their licenses are in `vendor/`. |

To switch to sharper Esri imagery at the parcel zoom, set `aerial: 'esri'` in the config and update the imagery credit in `index.html`. Esri requires attribution, and its terms are less simple than USGS's public-domain imagery.
