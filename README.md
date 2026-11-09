# Power hungry: scrollytelling intro

This repository contains the opening interactive for Maximus Kwan's investigation into the AVAIO "Perseus" data center in Pittsburg, Calif., first published by Scot Scoop. As the reader scrolls, the map moves from the national data center boom to California, the Bay Area, Carlmont, Pittsburg, and the former Delta View Golf Course. The sequence ends on an illustrative 3D model of Phase 1 and drone photos of the site.

The intro is a static page built with MapLibre GL JS and Scrollama. It has no build step, needs no API keys, and doesn't depend on a CMS. Scot Scoop loads the page directly into the story with `embed/sno-embed.html`. Republishers embed the same URL in an iframe. For outlets that can't use iframes, the `kit/` directory provides an MP4, stills, and plain text.

The repository also holds the story's six other graphics: a CalEnviroScreen map, the deal timeline, the committee email redline, the water-use chart, the recycled-water fallback, and the approvals still ahead. Each graphic loads into the SNO story the same way as the intro. For details, see [Graphics for the story](docs/GRAPHICS.md).

## Find your way around the repository

| Path | Contents |
|---|---|
| `index.html` | All chapter text |
| `js/config.js` | Camera moves, layers, and labels for each chapter |
| `css/story.css` | Layout and styles. Fonts and colors are in `shared/tokens.css`. |
| `data/` | Map data in GeoJSON, the traced project site (`site-local.json`), and the graphics' CSV files |
| `graphics/` | The story's other graphics, one folder each |
| `shared/` | Fonts, colors, the graphics' frame and kit, and `mount.js`, which loads everything into SNO |
| `embed/` | The SNO blocks: `sno-embed.html` for the intro, and `sno/` for the graphics |
| `media/` | Drone photos, audio, the recorded intro video, and chapter stills |
| `kit/` | The republication kit: embed code, text, video, and a guide |
| `docs/` | Guides for the graphics ([GRAPHICS.md](docs/GRAPHICS.md)) and for SNO ([SNO.md](docs/SNO.md)) |
| `tools/` | Scripts for the preview server, mock SNO page, data fetches, site tracing, video recording, kit building, and graphics snapshots and checks |
| `vendor/` | Local copies of MapLibre, Scrollama, D3, Observable Plot, and fonts. The page loads nothing from a CDN. |

## Preview the page

### Before you begin

Install [Node.js](https://nodejs.org) 20 or later.

### Start the preview server

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm start
   ```

   The server prints the following:

   ```
   Previewing at http://localhost:8080  (Ctrl+C to stop)
   ```

3. Open `http://localhost:8080` in a browser.

To check a specific view, open one of the following URLs:

| URL | What it shows |
|---|---|
| `localhost:8080` | The full interactive |
| `localhost:8080/?static` | The no-map version that reduced-motion users and narrow iframes get |
| `localhost:8080/docs/embed-test.html` | The interactive inside an iframe on a test article page |
| `localhost:8081` | The intro and every graphic in a mock SNO story, served from a second port. Start it with `npm run mock`. |
| `localhost:8080/graphics/water-use/` | One graphic on its own page. Replace `water-use` with any folder name in `graphics/`. |
| `localhost:8080/?offline` | The map without remote tiles or imagery, for testing a tile-server outage |
| `localhost:8080/?calibrate` | A tool for aligning the traced site with the aerial imagery |

If the page has unfinished items, a yellow **DRAFT** banner at the top counts the open TK items and placeholder datasets. The banner disappears when nothing is left.

## Edit the intro

To change the text, edit the `<section class="step">` blocks in `index.html`. Each block is one scroll stop. To flag unfinished text, wrap it in `<mark class="tk">…</mark>`. The page highlights it and adds it to the DRAFT count.

To change the camera and layers, edit `js/config.js`. Each chapter defines the following:

- A camera: `bounds`, or `center` and `zoom`, plus `pitch`, `bearing`, and `duration`.
- The layers to show.
- The labels to show.

The comments at the top of `js/config.js` describe each setting.

To add a chapter, do the following:

1. In `index.html`, copy a `<section class="step">` block.
2. Set a new `data-chapter="name"` attribute on the copy.
3. In `js/config.js`, add a matching `name: { … }` entry.

## Check the project status

The following work is complete and on `main`:

- All chapter text. No TK items remain, so the DRAFT banner doesn't appear.
- The site position on the map, set in `site.anchor` in `js/config.js` with `?calibrate` and **Snap to canal**.
- The Phase 1 model, traced from AVAIO's landscape plans, with the 37 generators on the squares that the plans mark. For details, see [How the site and model are built](#how-the-site-and-model-are-built).
- 1,730 U.S. data centers from OpenStreetMap, fetched with `npm run fetch:datacenters` on Oct. 15, 2026.
- Drone photos by Cara Esten Hurtle, 2400 px wide, resized from the 4000 px originals. They pop out of the map and expand to full screen.
- Scale bars, a Carlmont–Pittsburg distance label, and a **Listen** button that appears when the audio file exists.
- Credits and licenses that name Maximus Kwan as copyright holder, with Scot Scoop publishing under license.
- The SNO embed test.
- The statistics fact check.
- The photo license: CC BY-ND 4.0 from Cara Esten Hurtle.
- The graphics story check and the SNO tests in macOS Safari, iPadOS, and iOS.

The "close to home" chapter is hidden. It contains the Carlmont–Pittsburg line, the 40-mile label, and the MagicSchool text. The section is commented out in `index.html`, and its map settings remain in `js/config.js`. To restore it, delete the comment markers around the section.

The following tasks remain:

1. **Audio.** Save the recording as `media/audio/power-hungry.mp3`. The **Listen** button appears and shows the recording length. For details, see [Add the audio](#add-the-audio).
2. **Article URL.** After the Scot Scoop story has its link, set `storyUrl` in `js/config.js`, and then run `npm run kit`.
3. **Search indexing.** In `index.html`, delete the `<meta name="robots" content="noindex">` line, which is marked `TK: remove at publication`.
4. **Video and stills.** Run `npm run record` after every text or map change, as the last step. For details, see [Record the video and stills](#record-the-video-and-stills).
5. **Photo pin (optional).** Set `popFrom` in `js/config.js` to the exact spot where photo 07 was taken.
6. **Graphics.** Decide the CalEnviroScreen wording. For details, see the checklist in [Graphics for the story](docs/GRAPHICS.md#check-before-publishing).

## Record the video and stills

The recorder builds the video and stills for the kit and the no-map version.

### Before you begin

- Install [ffmpeg](https://ffmpeg.org).
- If this is the first recording on your machine, install Chromium for Playwright:

  ```bash
  npx playwright install chromium
  ```

### Run the recorder

```bash
npm run record
```

The recorder writes the following files:

- `media/intro.mp4` and `media/intro.webm`
- `media/stills/*.jpg`
- `kit/media/intro-captioned.mp4` and `kit/media/intro-captioned.webm`
- `kit/media/hero.jpg`, which is drone photo 02

## Add the audio

The **Listen** button under the byline plays `media/audio/power-hungry.mp3`. The `audio` setting in `js/config.js` sets the path. The button stays hidden until the file loads. It then reads "Listen · 29:50", using the file's actual length, and "Pause" with the time left during playback.

Export the recording as a mono MP3 at 64–96 kbps. A 30-minute file is about 15–20 MB.

## How the site and model are built

- **Outline and canal split.** Traced from Attachments 1 and 2 of the city's Notice of Preparation (NOP), dated Feb. 28, 2024. The trace is within 2% of the NOP's acreage: 21.6 of 22.05 acres north of the canal, and 53.7 of 54.33 acres south of it. `tools/trace-site.py` does the tracing.
- **Position.** Set by `site.anchor` in `js/config.js`. The outline, model, labels, photo pin, Pittsburg dot, and the end of the Carlmont line all move with it. To check or reset the position, open `?calibrate`. The canal on the map comes from OpenStreetMap, so it always sits on the real water.
- **Building, gravel yard, and both substations.** Traced from AVAIO's landscape plans, sheets L-202 to L-205 of the "Pittsburg Data Hub" 90% progress set. The sheets are stitched at their 60 ft = 95 px scale, with north to the right. The traced outline is 22.1 acres. Three floors of the footprint come to about 366,000 sq ft, compared with 347,740 sq ft in the NOP.
- **Generators.** The 37 small squares on the plans. Per the CEC filing, 36 of them are 12 groups of three that back up the servers. The 37th, at the north end, is the "house generator" for offices and life safety.
- **Estimates.** The building height (21 m, about 70 ft) and the 3 m × 8 m generator enclosures are estimates. To change them, edit `BUILDING_HEIGHT` or the `GEN_*` constants in `tools/trace-site.py`, and then run the script:

  ```bash
  python3 tools/trace-site.py
  ```

## Publish on GitHub Pages

GitHub Pages serves the site from the root of `main` at `https://maximuskwan.github.io/pittsburg-data-center/`. To confirm the setting, go to **Settings > Pages** and check that the source is **Deploy from a branch**, `main`, `/ (root)`.

Changes pushed to `main` go live within a few minutes. Test larger changes on a branch or with `npm start` first.

To put the intro in the Scot Scoop story, see [Add the interactive to the SNO story](docs/SNO.md). For republishers, see [Republishing "Power Hungry"](kit/REPUBLISH.md).

## How the interactive behaves

- **Scrolling drives the map.** Zoom, pan, and rotate gestures are disabled, so the reader can't get stuck on the map.
- **Inside an iframe,** the reader scrolls within the frame, which fills the screen height. After the last chapter, the end card says "Continue reading below," and the host page continues.
- **The no-map version** stacks map stills, drone photos, and text. The page shows it when any of the following is true:
  - The reader has reduced motion turned on.
  - The frame is narrower than 700 px, because iOS handles scrolling inside iframes poorly. To change the width, set `staticBelowWidthInIframe` in `js/config.js`.
  - WebGL fails.
  - The URL contains `?static`.
- **The model chapter** orbits the site slowly while the reader stays on it. Labels that would overlap fade out as the camera turns.
- **The first drone photo** pops out of a pin on the map as a framed card, and then expands to fill the screen. Scrolling up reverses the motion. Later photos cross-fade.
- **Scale bars** in miles and feet appear on chapters that set `scale: true` in the config. The national map omits them because its projection distorts distances too much for one bar. The photos omit them too.
- **The Carlmont line** shows its straight-line length, "40 MILES," computed from the map points.
- **If the tile servers are down,** the national and California chapters still render from the bundled Census boundaries.
- **Accessibility.** All text is HTML, so screen readers, search engines, and text-only republishers can read it. Each chapter has a screen-reader description of the map in `data-alt`, which also serves as alt text for the stills and photos. A **Skip the interactive map** link appears at the top.

## Licensing

| Part | License |
|---|---|
| Code | MIT. See `LICENSE`. Other newsrooms can fork the code for their own data center stories. |
| Story text and graphics | © Maximus Kwan, licensed CC BY-ND 4.0. See `CONTENT-LICENSE.md`. Scot Scoop publishes under a license from the author. |
| Drone photos | © Cara Esten Hurtle, licensed CC BY-ND 4.0. Credit her by name wherever the photos run. |
| Map data | © OpenStreetMap contributors (ODbL), OpenFreeMap, and OpenMapTiles. Boundaries: U.S. Census Bureau (public domain). Site boundaries: traced from City of Pittsburg public records. Imagery: USGS The National Map (public domain). The attribution appears in the map corner, so republishers carry it automatically. |
| CalEnviroScreen map data | CalEnviroScreen 5.0, California Office of Environmental Health Hazard Assessment. Roads and water: U.S. Census Bureau TIGER/Line (public domain). |
| MapLibre GL JS (BSD-3), Scrollama (MIT), D3 and Observable Plot (ISC), topojson-client (ISC), Montserrat (SIL OFL) | See the license files in `vendor/`. Body text uses Georgia, which ships with macOS, Windows, and iOS. Android and Linux readers see their default serif font. |

To use sharper Esri imagery at the parcel zoom, set `aerial: 'esri'` in `js/config.js` and update the imagery credit in `index.html`. Esri requires attribution, and its terms are more restrictive than the public-domain USGS imagery.
