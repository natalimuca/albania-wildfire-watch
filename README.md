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
- **Community fire reports** — Postgres (Neon, via Vercel Marketplace); `DATABASE_URL`
  is auto-injected by `vercel install neon`, no manual setup needed

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

Easiest path is Vercel (same team as Next.js, free tier, automatic HTTPS):

```bash
npx vercel
```

Set the `FIRMS_MAP_KEY` environment variable in the Vercel project settings (same value
as `.env.local`).

## Notes / known limitations

- Alerts fire via the in-page Notification API while the app is open in a tab —true
  background push (alerts while the app/browser is fully closed) needs a server-side
  cron job plus stored push subscriptions and isn't built yet. Saved locations and
  alert history still live in browser `localStorage` (personal, per-device by design) —
  only community fire reports are server-shared.
- EFFIS official-perimeter cross-referencing (from the spec) isn't implemented as a live
  data integration — their WFS endpoints timed out on every test query during
  development. Instead, each location card links out to the official EFFIS viewer and
  shows the full raw FIRMS detail (satellites, confidence, FRP, timestamps) we already
  have. FIRMS detections stand alone otherwise, same fallback the spec calls for when no
  official source is available.
- OpenStreetMap's public tile server has a usage policy meant for light traffic; swap in
  a provider like MapTiler or Stadia Maps (free tiers available) before any real
  distribution.
- Community reports have no rate limiting or abuse prevention beyond a bounding-box and
  note-length check — fine for sharing with people you know, not hardened against
  public abuse at scale.
