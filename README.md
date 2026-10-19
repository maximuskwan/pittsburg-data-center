# Power hungry: scrollytelling intro

The opening interactive for Maximus Kwan's investigation into the AVAIO "Perseus" data center in Pittsburg, Calif., first published by Scot Scoop. Readers scroll and the map flies from the national data center boom to California, the Bay Area, Carlmont, Pittsburg and the former Delta View Golf Course. It ends on an illustrative 3D model of Phase 1 and drone photos of the site.

It's a standalone static page (MapLibre GL JS + Scrollama) with no build step, no API keys and no CMS dependency. Scot Scoop and every republisher embed the same URL in an iframe. Outlets that can't use iframes get an MP4, stills and plain text from `kit/`.

```
index.html          ← ALL chapter text lives here
js/config.js        ← camera moves, layers and labels for each chapter
css/story.css       ← look and feel
data/               ← map data (GeoJSON; site-local.json is the traced project site)
media/              ← drone photos, audio, recorded intro video, chapter stills
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
| `localhost:8080/?calibrate` | Line the traced site up with the aerial imagery |

If anything is left unfinished, a yellow **DRAFT** banner across the top counts the open TK items and placeholder datasets. When it disappears, the page is ready.

## Editing

**Text:** edit the `<section class="step">` blocks in `index.html`. Each one is a scroll stop. Wrap anything unfinished in `<mark class="tk">…</mark>` and it'll be highlighted and counted.

**Camera and layers:** edit `js/config.js`. Each chapter has a camera (`bounds` or `center`/`zoom`, plus `pitch`, `bearing` and `duration`), the layers to show, and the labels to show. The comments at the top of the file explain each setting.

**Adding a chapter:** copy a `<section class="step">` in `index.html`, give it a new `data-chapter="name"`, and add a matching `name: { … }` entry in `js/config.js`.

Plain-English requests work well in Claude Code: "the California zoom is too fast," "make the text boxes narrower," "hold the last chapter for two scroll lengths."

## Status

**Done and on `main`:**
- All chapter text filled in. No TKs remain, so the DRAFT banner is gone.
- Site pinned to the map (`site.anchor` in `js/config.js`, set with `?calibrate` → **Snap to canal**).
- Phase 1 model traced from AVAIO's landscape plans, with the 37 generators on the squares the plans mark (see "The site and the model" below).
- 1,730 U.S. data centers from OpenStreetMap (`npm run fetch:datacenters`, retrieved Oct. 15, 2026).
- Drone photos by Cara Esten Hurtle (2400 px wide, from the 4000 px originals), popping out of the map and expanding to full screen.
- Scale bars, a Carlmont–Pittsburg distance label, and a Listen button waiting for the audio.
- Credits and licenses name Maximus Kwan as copyright holder, with Scot Scoop publishing under license.
- Embed tested on SNO.
- Statistics fact-checked.
- Photos licensed CC BY-ND 4.0 by Cara Esten Hurtle.

**Hidden for now:** the "close to home" chapter (Carlmont → Pittsburg line, 40-mile label, MagicSchool text). It's commented out in `index.html`; delete the comment markers around that section to bring it back. Its map settings stay in `js/config.js`.

**Still to do before Nov. 7:**
1. **Audio:** save the recording as `media/audio/power-hungry.mp3`. The Listen button appears on its own and shows the length (see "Audio" below).
2. **Article URL:** set `storyUrl` in `js/config.js` once the Scot Scoop story has its link, then run `npm run kit`.
3. **Search engines:** delete the `<meta name="robots" content="noindex">` line near the top of `index.html` (marked "TK: remove at publication").
4. **Videos and stills for the kit and the no-map version:** run `npm run record`. It needs [ffmpeg](https://ffmpeg.org) and, the first time, `npx playwright install chromium`. It writes `media/intro.mp4`, `media/stills/*.jpg`, `kit/media/intro-captioned.mp4` and `kit/media/hero.jpg` (drone photo 02). Run it last, after every text or map change.
5. **Optional:** the exact spot photo 07 was taken from, for the pin (`popFrom` in `js/config.js`).

## The site and the model

- **Outline and canal split:** traced from the city's Notice of Preparation (Feb. 28, 2024), Attachments 1 and 2. The trace is within 2% of the NOP's acreage: 21.6 of 22.05 acres north of the canal, 53.7 of 54.33 south. `tools/trace-site.py` does the tracing.
- **Position:** set by `site.anchor` in `js/config.js`. Everything on the site moves with it: the outline, the model, the labels, the photo pin, the Pittsburg dot and the end of the Carlmont line. To check or redo it, open `?calibrate`. The canal on the map comes from OpenStreetMap, so it always sits on the real water.
- **Building, gravel yard and both substations:** traced from AVAIO's landscape plans, sheets L-202 to L-205 of the "Pittsburg Data Hub" 90% progress set. The sheets are stitched at their 60 ft = 95 px scale, with north to the right. Two checks: the traced outline is 22.1 acres, and three floors of the footprint come to ~366,000 sq ft (the NOP says 347,740).
- **Generators:** the plans' 37 small squares. That's 12 groups of three (the 36 that back up the servers) plus the lone "house generator" for offices and life safety at the north end, per the CEC filing.
- **Estimates:** building height (21 m / ~70 ft) and the 3 m × 8 m generator enclosures. To change them, edit `BUILDING_HEIGHT` or `GEN_*` in `tools/trace-site.py` and run `python3 tools/trace-site.py`.

## Audio

The Listen button under the byline plays `media/audio/power-hungry.mp3` (path set by `audio:` in `js/config.js`). It stays hidden until that file loads, then reads "Listen · 29:50" using the file's real length, and "Pause · time left" while playing. Export mono MP3 at 64–96 kbps: a 30-minute file comes to roughly 15–20 MB.

## Publishing on GitHub Pages

The site publishes from `main` (**Settings → Pages → Deploy from a branch**, `main`, `/ (root)`) at `https://maximuskwan.github.io/pittsburg-data-center/`. Anything pushed to `main` goes live within a minute or two, so try bigger changes on a branch first, or preview locally with `npm start`.

For SNO, see **[docs/SNO.md](docs/SNO.md)**. For republishers, see **[kit/REPUBLISH.md](kit/REPUBLISH.md)**.

## How it behaves

- **Scrolling drives the map.** All map gestures (zoom, pan, rotate) are disabled so the reader can't get stuck.
- **Inside an iframe** the reader scrolls within the frame, which is 100% of the screen height. When the chapters end, the end card says "Continue reading below" and the host page carries on.
- **No-map version** (stacked map stills, drone photos and text) is shown when:
  - the reader has reduced motion turned on;
  - the frame is narrower than 700px, since iOS handles scrolling inside iframes badly. Change this with `staticBelowWidthInIframe` in the config;
  - WebGL fails;
  - the URL has `?static`.
- **The model chapter** slowly orbits the site while the reader lingers. Labels that would cover each other fade out as the camera turns.
- **Map to photos:** the first drone photo pops out of a pin on the map as a framed card, then expands to fill the screen. Scrolling back up reverses it. The next photos cross-fade.
- **Scale bars** (miles/feet) appear on chapters with `scale: true` in the config. They're left off the national map, where the projection stretches distances too much for one bar, and off the photos.
- **Carlmont line:** carries its straight-line length ("40 MILES"), computed from the map points.
- **If the tile servers are down**, the national and California chapters still render from the bundled Census boundaries.
- **Accessibility:** all text is real HTML (readable by screen readers, search engines and text-only republishers). Each chapter also has a screen-reader description of the map (`data-alt`), which doubles as alt text for the stills and photos. A "Skip the interactive map" link sits at the top.

## Licensing

| Part | License |
|---|---|
| Code in this repo | MIT (see `LICENSE`). Other newsrooms can fork it for their own data center stories. |
| Story text and graphics | © Maximus Kwan, licensed CC BY-ND 4.0 (see `CONTENT-LICENSE.md`). Scot Scoop publishes under a license from the author. |
| Drone photos | © Cara Esten Hurtle, licensed CC BY-ND 4.0. Credit her by name wherever they run. |
| Map data | © OpenStreetMap contributors (ODbL), OpenFreeMap / OpenMapTiles. Boundaries: U.S. Census Bureau (public domain); site boundaries traced from City of Pittsburg public records. Imagery: USGS The National Map (public domain). The attribution sits in the map corner, so republishers inherit it automatically. |
| MapLibre GL JS (BSD-3), Scrollama (MIT), Montserrat (SIL OFL) | Their licenses are in `vendor/`. Body text uses Georgia, which ships with Mac, Windows and iOS; Android and Linux readers get their default serif. |

To switch to sharper Esri imagery at the parcel zoom, set `aerial: 'esri'` in the config and update the imagery credit in `index.html`. Esri requires attribution, and its terms are less simple than USGS's public-domain imagery.
