# Power hungry: scrollytelling intro

The opening interactive for Scot Scoop's investigation into the AVAIO "Perseus" data center in Pittsburg, Calif. Readers scroll and the map flies from the national data center boom to California, the Bay Area, Carlmont, Pittsburg and the former Delta View Golf Course. It ends on an illustrative 3D model of Phase 1 and drone photos of the site.

It's a standalone static page (MapLibre GL JS + Scrollama) with no build step, no API keys and no CMS dependency. Scot Scoop and every republisher embed the same URL in an iframe. Outlets that can't use iframes get an MP4, stills and plain text from `kit/`.

```
index.html          ← ALL chapter text lives here
js/config.js        ← camera moves, layers and labels for each chapter
css/story.css       ← look and feel
data/               ← map data (GeoJSON; site-local.json is the traced project site)
media/              ← drone photos, recorded intro video, chapter stills
kit/                ← republication kit (embed code, text, video, guide)
docs/SNO.md         ← how to put it in the SNO article, and questions for SNO support
tools/              ← scripts (preview server, data fetch, site tracing, video recorder, kit builder)
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

1. **Pin the site to the map.** The plan area, canal, Phase 1 parcel and the 3D model are traced from the city's Notice of Preparation (Feb. 28, 2024). Attachment 1 is the Plan Area aerial and Attachment 2 the Conceptual Site Plan; see `tools/trace-site.py`. The traced shapes match the NOP's acreage within 2% (21.6 of 22.05 acres north of the canal, 53.7 of 54.33 south). Their *position* on the globe, though, is an estimate. To fix it:
   - Run `npm start` and open `localhost:8080/?calibrate`. You'll see the city's own map, faded, over live aerial imagery.
   - Click **Snap to canal**. It slides the site so the canal traced from the city's map lands on OpenStreetMap's canal. Or press the arrow keys until Highway 4, the canal and the roads line up.
   - Copy the `anchor: [...]` line into `site` in `js/config.js` and set `placeholder: false`.

   Everything that sits on the site moves with that one setting: the outline, the model, the labels, the Pittsburg dot and the Carlmont line. The canal on the map always comes from OpenStreetMap, so it sits on the real water whatever the anchor is.
2. **Check the model against the record.** The model's footprint comes from the conceptual site plan. Three floors of building add up to the NOP's 347,740 sq ft of Phase I development, with 37 generator enclosures in two rows on the west side, per the Draft EIR. The 21 m (about 70 ft) height and the generator enclosure size are assumptions. If the Dec. 11, 2025 design approval or the CEC filing gives a building height or a generator layout, change `height` and the generator dimensions in `tools/trace-site.py`, then re-run `python3 tools/trace-site.py`. Remove `placeholder: true` from `data/bay-area-sites.geojson` once you've checked the Santa Clara point.
3. **National data centers** (`data/datacenters.geojson`). Now it holds placeholder dots for about 25 well-known data center *markets*. Run `npm run fetch:datacenters` to replace them with every U.S. data center mapped in OpenStreetMap, then update the "as of" date in the national chapter's source line.
4. **Drone photos.** All nine are in `media/photos/` (`drone-01.jpg` … `drone-09.jpg`). The last three chapters use 07, 02 and 04; swap them with the `photo:` lines in `js/config.js`. They're 1125–1500 px wide, which looks soft full-screen on a large monitor, so replace them with full-resolution exports (at least 2400 px wide, JPEG quality ~80) under the same names. Fill in the photographer credit in `index.html`, and get a written license if the photographer isn't on staff.
5. **Record the videos and stills:** `npm run record`. It needs [ffmpeg](https://ffmpeg.org) and, the first time, `npx playwright install chromium`. It writes `media/intro.mp4`, `media/stills/*.jpg` (used by the no-map version), `kit/media/intro-captioned.mp4` and `kit/media/hero.jpg` (drone photo 02). Re-run it any time the map or text changes.
6. **URLs:** set `storyUrl` (the article) and `siteUrl` (where this is hosted) in `js/config.js`, and update the code link in the credits in `index.html`.
7. **Kit:** `npm run kit` rebuilds the embed code and plain-text intro, and lists any TK still open.

### Facts in the intro text to verify against primary sources

The intro text follows the article draft, but check each of these:

- LBNL 2024 report: data centers used ~4.4% of U.S. electricity in 2023, and could reach 6.7%–12% by 2028.
- Pittsburg population "about 76,000" (2020 Census: 76,416).
- Course closure vote May 8, 2018; technology park planning begins a month later.
- 76 / 22 / 54 acres, and the canal split (NOP p. 3).
- Three stories, 37 generators at 3 MW each, on the building's west side (Draft EIR / CEC filing).
- PG&E transmission towers along the east edge, and homes about 85 feet from the property line (field reporting; how was 85 ft measured?).
- Final city approval Dec. 11, 2025, by the zoning administrator.
- "About an hour's drive from Carlmont when the traffic is light," and Santa Clara as the Bay Area's data center hub.
- The intro's last card repeats the article's second and third paragraphs nearly word for word. Trim one or the other so readers don't read it twice.

## Publishing on GitHub Pages

GitHub Pages can't publish from a **private** repo on a free account; it needs GitHub Pro (or Team) for that. Even then, the published site itself is public; only the code stays private. Until you're ready, preview locally with `npm start`. The page carries `<meta name="robots" content="noindex">` so search engines skip it if it does go up early; remove that line at publication.

1. In the repo, go to **Settings → Pages**, set **Source: Deploy from a branch**, branch `main`, folder `/ (root)`, and save. The site appears at `https://<account>.github.io/pittsburg-data-center/` within a minute or two.
2. Work on a branch and merge into `main` only when it's right. `main` is the live site.

For SNO, see **[docs/SNO.md](docs/SNO.md)**. For republishers, see **[kit/REPUBLISH.md](kit/REPUBLISH.md)**.

## How it behaves

- **Scrolling drives the map.** All map gestures (zoom, pan, rotate) are disabled so the reader can't get stuck.
- **Inside an iframe** the reader scrolls within the frame, which is 100% of the screen height. When the chapters end, the end card says "Continue reading below" and the host page carries on.
- **No-map version** (stacked map stills, drone photos and text) is shown when:
  - the reader has reduced motion turned on;
  - the frame is narrower than 700px, since iOS handles scrolling inside iframes badly. Change this with `staticBelowWidthInIframe` in the config;
  - WebGL fails;
  - the URL has `?static`.
- **The model chapter** slowly orbits the site while the reader lingers. The photos then cross-fade over the map.
- **If the tile servers are down**, the national and California chapters still render from the bundled Census boundaries.
- **Accessibility:** all text is real HTML (readable by screen readers, search engines and text-only republishers). Each chapter also has a screen-reader description of the map (`data-alt`), which doubles as alt text for the stills and photos. A "Skip the interactive map" link sits at the top.

## Licensing

| Part | License |
|---|---|
| Code in this repo | MIT (see `LICENSE`). Other newsrooms can fork it for their own data center stories. |
| Story text, Scot Scoop photos and graphics | CC BY-ND 4.0 (see `CONTENT-LICENSE.md`) |
| Drone photos | © the photographer. If they aren't Scot Scoop staff, get a written license covering "use within this article and its authorized republications, in any medium." |
| Map data | © OpenStreetMap contributors (ODbL), OpenFreeMap / OpenMapTiles. Boundaries: U.S. Census Bureau (public domain); site boundaries traced from City of Pittsburg public records. Imagery: USGS The National Map (public domain). The attribution sits in the map corner, so republishers inherit it automatically. |
| MapLibre GL JS (BSD-3), Scrollama (MIT), Montserrat (SIL OFL) | Their licenses are in `vendor/`. Body text uses Georgia, which ships with Mac, Windows and iOS; Android and Linux readers get their default serif. |

To switch to sharper Esri imagery at the parcel zoom, set `aerial: 'esri'` in the config and update the imagery credit in `index.html`. Esri requires attribution, and its terms are less simple than USGS's public-domain imagery.
