// ─────────────────────────────────────────────────────────────────────────────
// STORY CONFIG — the file you edit to change camera moves and what's on the map.
//
// Chapter TEXT lives in index.html (so search engines, screen readers and
// republishers can read it). This file only controls the map for each chapter.
// The keys under `chapters` must match the data-chapter="…" names in index.html.
//
// Camera: give either `bounds` (a box the map fits to — best, because it adapts
// to phones and desktops) or `center` + `zoom`.
//   bounds:  [[west, south], [east, north]]   (longitude, latitude)
//   pitch:   0 = straight down, 60 = tilted toward the horizon
//   bearing: 0 = north up; positive rotates the map counter-clockwise
//   duration: milliseconds the move takes (bigger = slower)
//
// layers: name → opacity (0 to 1). Any layer not listed is hidden.
//   states, california, counties, contra-costa, basemap, aerial,
//   datacenters, sites, route, parcel
// labels: which on-map labels to show (defined in `labels` below).
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

  // Drone footage for the last chapter. If the file is missing, the map slowly
  // orbits the site instead, so the page still works before the footage arrives.
  droneVideo: { mp4: 'media/drone.mp4', webm: 'media/drone.webm', poster: 'media/drone-poster.jpg' },

  // When embedded in an iframe narrower than this (px), show the stacked
  // video/stills version instead of the live map (iOS handles scrolling
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
    },
    'bay-area': {
      bounds: [[-122.55, 37.25], [-121.7, 38.12]],
      pitch: 30, bearing: -10, duration: 3500,
      layers: { california: 0.4, counties: 1, basemap: 1, sites: 1 },
      labels: ['santa-clara', 'pittsburg-city'],
    },
    'close-to-home': {
      bounds: [[-122.4, 37.45], [-121.85, 38.08]],
      pitch: 35, bearing: -20, duration: 2500,
      layers: { counties: 0.6, 'contra-costa': 1, basemap: 1, sites: 1, route: 1 },
      labels: ['carlmont', 'pittsburg-city'],
    },
    pittsburg: {
      center: [-121.92, 38.012], zoom: 12.6,
      pitch: 45, bearing: -25, duration: 4000,
      layers: { aerial: 1, basemap: 0.5, parcel: 0.35 },
      labels: ['pittsburg-city', 'hwy-4'],
    },
    parcel: {
      center: [-121.9330, 38.0045], zoom: 15.2,
      pitch: 55, bearing: -35, duration: 4000,
      layers: { aerial: 1, parcel: 1 },
      labels: ['perseus'],
    },
    discovered: {
      center: [-121.9330, 38.0045], zoom: 15.6,
      pitch: 60, bearing: -60, duration: 3000,
      layers: { aerial: 1, parcel: 0.8 },
      orbit: true,   // slow rotation while waiting / if no drone video
      video: true,   // cross-fade to the drone footage
    },
  },

  // On-map labels. `anchor` is the edge of the label that touches the point:
  // 'left' puts the text to the right of the point, 'bottom' puts it above.
  labels: {
    'santa-clara': { lngLat: [-121.9630, 37.3746], text: 'Santa Clara', sub: 'Silicon Valley’s data center hub', anchor: 'left' },
    'pittsburg-city': { lngLat: [-121.8847, 38.0280], text: 'Pittsburg', anchor: 'left' },
    carlmont: { lngLat: [-122.2963, 37.5136], text: 'Carlmont High School', sub: 'Belmont', anchor: 'top' },
    'hwy-4': { lngLat: [-121.95, 38.022], text: 'Highway 4', anchor: 'top', minor: true },
    perseus: { lngLat: [-121.9330, 38.0045], text: 'Proposed “Perseus” data center', sub: 'Former Delta View Golf Course', anchor: 'bottom' },
  },
};
