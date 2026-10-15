// ─────────────────────────────────────────────────────────────────────────────
// STORY CONFIG — the file you edit to change camera moves and what's on the map.
//
// Chapter TEXT lives in index.html (so search engines, screen readers and
// republishers can read it). This file only controls the map for each chapter.
// The keys under `chapters` must match the data-chapter="…" names in index.html.
//
// Camera: give one of
//   bounds: [[west, south], [east, north]]  (a box the map fits to; adapts to phones)
//   center: [longitude, latitude] + zoom
//   site: 'plan' | 'phase1'  + zoom         (centers on the traced site; see `site` below)
// plus
//   pitch:    0 = straight down, 60 = tilted toward the horizon
//   bearing:  0 = north up; positive rotates the map counter-clockwise
//   duration: milliseconds the move takes (bigger = slower)
//
// layers: name → opacity (0 to 1). Any layer not listed is hidden.
//   states, california, counties, contra-costa, basemap, aerial,
//   datacenters, sites, route, plan, canal, model
// labels: which on-map labels to show (defined in `labels` below).
// photo:  a photo that fades in over the map for this chapter.
// popFrom: optional point the photo pops out of (map → photo transitions only).
// scale:  true shows a miles/feet scale bar (skip it on the national view,
//         where the map projection stretches distances too much for one bar).
// ─────────────────────────────────────────────────────────────────────────────

export default {
  // Where the published interactive lives, and where the article lives.
  siteUrl: 'https://maximuskwan.github.io/pittsburg-data-center/',
  storyUrl: 'https://scotscoop.com/', // TK: replace with the article URL once it's live

  // Map tiles. OpenFreeMap needs no key and has no usage caps.
  vectorTiles: 'https://tiles.openfreemap.org/planet',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',

  // Aerial imagery for the Pittsburg chapters.
  //   'usgs' = USGS National Map imagery (NAIP; public domain, no terms to manage)
  //   'esri' = Esri World Imagery (sharper at parcel zoom; attribution required)
  aerial: 'usgs',

  // The project site, traced from the city's Feb. 28, 2024 Notice of
  // Preparation (see data/site-local.json and tools/trace-site.py).
  // `anchor` is the point where the Contra Costa Canal crosses the plan
  // area's straight east boundary.
  site: {
    anchor: [-121.909298, 38.008833],
    placeholder: false,
  },

  // When embedded in an iframe narrower than this (px), show the stacked
  // stills/photos version instead of the live map (iOS handles scrolling
  // inside iframes inconsistently). Set to 0 to always use the live map.
  staticBelowWidthInIframe: 700,

  chapters: {
    opener: {
      bounds: [[-125, 24.5], [-66.9, 49.4]],
      pitch: 0, bearing: 0, duration: 0,
      layers: { states: 1, basemap: 0.6, datacenters: 0.35 },
    },
    national: {
      bounds: [[-125, 24.5], [-66.9, 49.4]],
      pitch: 0, bearing: 0, duration: 1500,
      layers: { states: 1, basemap: 0.8, datacenters: 1 },
    },
    california: {
      bounds: [[-124.5, 32.5], [-114.1, 42.0]],
      pitch: 20, bearing: 0, duration: 3500,
      layers: { states: 0.6, california: 1, counties: 0.6, basemap: 1, datacenters: 1 },
      scale: true,
    },
    'bay-area': {
      bounds: [[-122.55, 37.25], [-121.7, 38.12]],
      pitch: 30, bearing: -10, duration: 3500,
      layers: { california: 0.4, counties: 1, basemap: 1, sites: 1 },
      scale: true,
      labels: ['santa-clara', 'pittsburg-city'],
    },
    'close-to-home': {
      bounds: [[-122.4, 37.45], [-121.85, 38.08]],
      pitch: 35, bearing: -20, duration: 2500,
      layers: { counties: 0.6, 'contra-costa': 1, basemap: 1, sites: 1, route: 1 },
      scale: true,
      labels: ['carlmont', 'pittsburg-city'],
    },
    pittsburg: {
      site: 'plan', zoom: 13.2,
      pitch: 45, bearing: -20, duration: 4000,
      layers: { aerial: 1, basemap: 0.5, plan: 0.5 },
      scale: true,
      labels: ['pittsburg-city', 'hwy-4'],
    },
    site: {
      site: 'plan', zoom: 15.2,
      pitch: 35, bearing: -15, duration: 3500,
      layers: { aerial: 1, plan: 1, canal: 1 },
      scale: true,
      labels: ['phase1', 'future', 'canal'],
    },
    model: {
      site: 'phase1', zoom: 17.1,
      pitch: 62, bearing: 55, duration: 4000,
      layers: { aerial: 1, plan: 0.6, canal: 1, model: 1 },
      scale: true,
      labels: ['building', 'generators', 'house', 'substation'],
      orbit: true, // slow rotation while the reader lingers
    },
    'photo-towers': {
      site: 'phase1', zoom: 16.7, pitch: 62, bearing: -60, duration: 0,
      layers: { aerial: 1, plan: 0.6, canal: 1, model: 1 },
      photo: 'media/photos/drone-07.jpg',
      // The photo pops out of this point on the map, then fills the screen.
      // { site: [metersEast, metersNorth] } from the site anchor, or [lng, lat].
      popFrom: { site: [-28, 480] },
    },
    'photo-homes': {
      site: 'phase1', zoom: 16.7, pitch: 62, bearing: -60, duration: 0,
      layers: { aerial: 1, plan: 0.6, canal: 1, model: 1 },
      photo: 'media/photos/drone-02.jpg',
    },
    'photo-ruins': {
      site: 'phase1', zoom: 16.7, pitch: 62, bearing: -60, duration: 0,
      layers: { aerial: 1, plan: 0.6, canal: 1, model: 1 },
      photo: 'media/photos/drone-04.jpg',
    },
  },

  // On-map labels. `anchor` is the edge of the label that touches the point:
  // 'left' puts the text to the right of the point, 'bottom' puts it above.
  // lngLat can be a coordinate; { site: [metersEast, metersNorth] } relative to
  // the site anchor; or { at: 'phase1' | 'future' | 'building' | 'generators' |
  // 'substation' } for the center of a traced shape (these move with calibration).
  labels: {
    'santa-clara': { lngLat: [-121.9630, 37.3746], text: 'Santa Clara', sub: 'Silicon Valley’s data center hub', anchor: 'left' },
    'pittsburg-city': { lngLat: [-121.8847, 38.0280], text: 'Pittsburg', anchor: 'left' },
    carlmont: { lngLat: [-122.2963, 37.5136], text: 'Carlmont High School', sub: 'Belmont', anchor: 'top' },
    'hwy-4': { lngLat: { site: [-450, 1180] }, text: 'Highway 4', anchor: 'top', minor: true },
    phase1: { lngLat: { at: 'phase1' }, text: 'Phase 1', sub: '22 acres north of the canal', anchor: 'left', accent: true },
    future: { lngLat: { at: 'future' }, text: 'Future phases', sub: '54 acres south of the canal', anchor: 'left' },
    canal: { lngLat: { site: [220, -40] }, text: 'Contra Costa Canal', anchor: 'left', minor: true },
    building: { lngLat: { at: 'building' }, text: 'Data center', sub: 'Three stories', anchor: 'left' },
    generators: { lngLat: { at: 'generators' }, text: '36 diesel generators', sub: 'Backup power for the servers', anchor: 'right' },
    house: { lngLat: { at: 'house' }, text: 'House generator', sub: 'Offices and life safety', anchor: 'left' },
    substation: { lngLat: { at: 'substation' }, text: 'Substation', anchor: 'top' },
  },
};
