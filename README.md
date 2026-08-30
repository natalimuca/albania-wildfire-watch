# Albania Wildfire Watch

Installable web app (PWA) that tracks NASA-satellite fire detections near saved
locations in Albania, with weather/air-quality context and a scored, explained alert.
Full project spec: [SPEC.md](./SPEC.md).

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Get a free FIRMS `MAP_KEY` (email signup, no payment) at
https://firms.modaps.eosdis.nasa.gov/api/map_key/ and put it in `.env.local`.

```bash
npm run dev
```

Open http://localhost:3000. Data sources used, all free / no-key except FIRMS:

- **Fire detections** — NASA FIRMS VIIRS (Suomi NPP, NOAA-20, NOAA-21), area API
- **Geocoding** — Nominatim (OpenStreetMap)
- **Weather** — Open-Meteo forecast API
- **Air quality** — Open-Meteo air quality API (CAMS-based, modeled — Albania has very
  few ground monitors, see SPEC.md's limitations section)
- **Map tiles** — OpenStreetMap raster tiles
- **Fire danger forecast** — EFFIS / Copernicus `ecmwf.fwi` WMS layer (Fire Weather Index)
- **Community fire reports** — Postgres (Neon, via Vercel Marketplace); `DATABASE_URL`
  is auto-injected by `vercel install neon`, no manual setup needed

## Fire danger forecast

Each saved location shows today's EFFIS Fire Weather Index class plus a 5-day outlook,
using the official Copernicus class breaks (Low <11.2, Moderate 11.2–21.3, High
21.3–38, Very high 38–50, Extreme 50–70, Very extreme >70).

"Show danger on map" overlays the same FWI raster across the whole country as a
half-opacity WMS layer (EPSG:3857 tiles, so it scales with zoom) with a colour legend.

This complements the FIRMS layer rather than duplicating it: FIRMS is *reactive* (a fire
is burning now), FWI is *predictive* (conditions favour fire over the coming days).

**Implementation caveat:** EFFIS publishes FWI only as rendered WMS raster tiles — all
three FWI layers report `queryable="0"`, and `GetFeatureInfo` returns `LayerNotDefined`,
so there is no point-query API. `app/api/danger/route.ts` therefore requests a small
GetMap PNG centred on the location and matches the dominant pixel colour against the
official legend swatches (sampled from `GetLegendGraphic`, see `lib/danger.ts`). Colours
are matched by nearest-RGB within a tolerance and return `null` rather than guessing when
nothing matches. This yields the danger *class*, not the raw numeric FWI value.

## Language

English/Albanian toggle (top of the sidebar), covering all UI text, generated score
reasons, map popups, and notifications. Preference is stored per-browser.

## Community fire reports

Anyone using the app can drop an unverified "I saw smoke/fire here" pin (optional note,
280 char cap). Reports are shared across all users via Postgres, not per-device
localStorage. A report is auto-marked **verified** the moment a real FIRMS satellite
detection shows up within 5 km of it — no moderation queue, no accounts; the
verification is just "did the satellites confirm it." Report notes are HTML-escaped
before rendering in map popups to prevent stored XSS.

## Installing it on a phone

Once deployed to a real HTTPS domain (see Deploy below), open the site in Chrome
(Android) or Safari (iOS) and use "Add to Home Screen" / the install prompt. It runs
as a standalone app with its own icon — no app store needed.

## Deploy

Hosted on Vercel at https://albania-wildfire-watch.vercel.app, connected to this repo —
**pushing to `master` deploys to production automatically**, no command needed:

```bash
git push
```

To deploy manually without a push (e.g. from a dirty working tree):

```bash
npx vercel --prod
```

Environment variables are set in the Vercel project settings, not in the repo:
`FIRMS_MAP_KEY` (same value as `.env.local`) and `DATABASE_URL` (auto-injected by the
Neon integration).

## Notes / known limitations

- Alerts fire via the in-page Notification API while the app is open in a tab —true
  background push (alerts while the app/browser is fully closed) needs a server-side
  cron job plus stored push subscriptions and isn't built yet. Saved locations and
  alert history still live in browser `localStorage` (personal, per-device by design) —
  only community fire reports are server-shared.
- EFFIS **burnt-area perimeter** cross-referencing (from the spec) still isn't wired in —
  only the Fire Weather Index layer is. Location cards link out to the official EFFIS
  viewer for perimeters, and show the full raw FIRMS detail (satellites, confidence, FRP,
  timestamps) alongside.
- The danger forecast is read from rendered map tiles (see caveat above), so it gives a
  class band, not an exact FWI number. Treat a class boundary as approximate.
- OpenStreetMap's public tile server has a usage policy meant for light traffic; swap in
  a provider like MapTiler or Stadia Maps (free tiers available) before any real
  distribution.
- Community reports have no rate limiting or abuse prevention beyond a bounding-box and
  note-length check — fine for sharing with people you know, not hardened against
  public abuse at scale.
