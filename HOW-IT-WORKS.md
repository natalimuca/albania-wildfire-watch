# How Albania Wildfire Watch works

A complete explanation of what the app does, where every number comes from, and what it
cannot do. Written to be readable without knowing the codebase.

Live app: https://albania-wildfire-watch.vercel.app

---

## 1. What the app is

An installable web app that watches for wildfire activity near places you save in
Albania. It answers two different questions:

| Question | Answered by | Nature |
|---|---|---|
| Is something burning near me right now? | NASA FIRMS satellites | **Reactive** — detects heat that already exists |
| Are conditions dangerous in the coming days? | EU EFFIS Fire Weather Index | **Predictive** — forecasts fire-favourable weather |

Both are shown together, because neither alone is enough: a satellite can only see a
fire once it is burning and only when it passes overhead, while a danger forecast says
nothing about whether a fire has actually started.

It is **not** an official or emergency system. See section 9.

---

## 2. Where each number comes from

Nothing in the app is invented or simulated. Every value traces to a public source.

| Shown in app | Source | Cost / key |
|---|---|---|
| Fire detections (orange/red circles) | NASA FIRMS, VIIRS instruments on Suomi-NPP, NOAA-20, NOAA-21 | Free key |
| Place search | Nominatim (OpenStreetMap) | Free, no key |
| Wind, humidity | Open-Meteo forecast API | Free, no key |
| PM2.5 air quality | Open-Meteo air quality API (CAMS model) | Free, no key |
| Fire danger class + map layer | EFFIS / Copernicus `ecmwf.fwi` | Free, no key |
| Map background | OpenStreetMap raster tiles | Free |
| Community reports | Postgres database (Neon) | Free tier |

---

## 3. Satellite fire detection

### What a detection actually is

NASA satellites carry infrared sensors that measure surface temperature. When a spot is
far hotter than its surroundings, it is recorded as a **thermal anomaly** — a "hotspot".
Each record contains coordinates, timestamp, satellite, a confidence rating, and **FRP**
(Fire Radiative Power, in megawatts — roughly how much heat is being released).

Critically: **a detection is a heat signature, not a confirmed wildfire.** It could be a
genuine wildfire, agricultural burning (common in Albania), or another strong heat
source. This is NASA's own caveat, not an app limitation.

### Grouping

Raw detections arrive as individual points. One fire typically produces many points
across multiple satellite passes. The app clusters them: points within **2 km** of each
other and within **12 hours** are treated as one fire event. Each group records how many
detections it contains, which satellites saw it, the strongest FRP, and first/last seen
times.

More detections from more satellites means more corroboration — that is why the app
shows the count and satellite list rather than hiding them.

### Refresh

Detections reload every 15 minutes. Satellites only pass over a few times per day, so
new data appears in bursts, not continuously.

---

## 4. The proximity score (0–100)

Each saved location gets a score for the most relevant nearby fire group. The score is
**this app's own heuristic**, not an official rating. It combines:

| Factor | Weight | Reasoning |
|---|---|---|
| Distance | up to 40 | Decays exponentially; closer matters far more |
| Recency | up to 25 | Decays over ~24h; an old detection may be out |
| Confidence | up to 10 | NASA's own confidence rating |
| Fire Radiative Power | up to 10 | Bigger heat output = bigger fire |
| Repeat detections | up to 10 | Multiple sightings = corroboration |
| Downwind position | up to 10 | Only if you are in the wind's path |
| Low humidity | 3 | Dry air helps fire spread |
| Elevated PM2.5 | 5 | Smoke may already be reaching you |

The app always lists **why** it produced a score ("Detection ~4 km away", "Location is
roughly downwind"), so the number is never a black box. If weather or air quality could
not be fetched, the card says "Limited data" rather than silently scoring lower.

### Wind direction detail

Meteorological wind direction is the direction wind blows *from*. To find where smoke is
heading, the app adds 180°, then compares that against the bearing from the fire to your
location. If they align within 45°, you are considered downwind.

---

## 5. Fire danger forecast (EFFIS)

### What FWI is

The **Fire Weather Index** is a standard system (originally Canadian, used across
Europe) that estimates how favourable conditions are for fire to start and spread. It
combines temperature, humidity, wind, and rainfall, plus accumulated dryness of fuel and
soil over preceding days/weeks. The EU's EFFIS runs it and publishes forecasts.

The app does **not** compute FWI. The classification is entirely EFFIS's.

### Official class bands

| Class | FWI range |
|---|---|
| Low | < 11.2 |
| Moderate | 11.2 – 21.3 |
| High | 21.3 – 38.0 |
| Very high | 38.0 – 50.0 |
| Extreme | 50.0 – 70.0 |
| Very extreme | > 70.0 |

### How the app reads it (important caveat)

EFFIS publishes FWI **only as rendered map images**, not as queryable numbers. This was
verified directly: all three FWI layers report `queryable="0"` in the WMS capabilities
document, and a `GetFeatureInfo` request returns `LayerNotDefined`. There is no
point-query API.

So the app:

1. Requests a small map image centred on your location for a given date
2. Reads the pixel colours
3. Matches the dominant colour to the official legend swatches (sampled directly from
   EFFIS's own `GetLegendGraphic` output)
4. Returns the matching class — or `null` if no colour matches within tolerance, rather
   than guessing

**Consequence:** you get the correct danger *class*, not the exact FWI number, and
readings very near a class boundary are approximate. This is documented rather than
hidden because it affects how much precision to read into the result.

### On the map

"Show danger on map" overlays the same official raster across the country at 50%
opacity, with a legend and a day picker. Switching day re-points the layer at a
different forecast date, so you can step through the coming days.

---

## 6. Alerts and notifications

Two independent alert types:

**Proximity alerts** — fire detected inside your alert radius (adjustable 5–60 km).
Fires when a new detection group appears, or an existing one's score jumps by 15+.
Repeated detections of the same fire are grouped so you are not spammed.

**Extreme danger alerts** — when EFFIS forecasts **Extreme** or **Very extreme** danger
at a saved location. Deliberately set high: High and Very high are common in Albanian
summer, so alerting on those would train you to ignore alerts.

Both appear as an in-page banner **and** a browser notification. The banner matters
because notification permission is often denied or never granted — the warning must
still be visible. Each alert fires once per location per day, tracked locally.

**Limitation:** notifications only fire while the app is open in a browser tab. True
background push (alerts with the app fully closed) would require a server-side scheduler
and stored push subscriptions, which is not built.

---

## 7. Community reports

Anyone can drop a pin marking fire or smoke they have seen, with an optional note.
Reports are stored in a shared database, so they are visible to everyone using the app.

**Verification is automatic, with no moderator.** A report shows as **Unverified**
(purple) until a real satellite detection appears within **5 km** of it, at which point
it becomes **Verified by satellite** (green). This deliberately avoids needing accounts
or a moderation queue — the satellites do the verifying.

Report notes are HTML-escaped before display, so a malicious note cannot inject code
into other people's browsers. Submissions are bounds-checked to Albania and capped at
280 characters.

**Limitation:** there is no rate limiting or spam protection beyond that. Fine for
sharing among people you know; not hardened for uncontrolled public abuse.

---

## 8. Technical architecture

```
Browser (React / Next.js)
   │
   ├── /api/firms      → NASA FIRMS       → clusters detections
   ├── /api/conditions → Open-Meteo       → wind, humidity, PM2.5
   ├── /api/danger     → EFFIS WMS        → samples raster → danger class
   ├── /api/geocode    → Nominatim        → place search
   └── /api/reports    → Postgres (Neon)  → community reports
```

External APIs are called **server-side**, never from the browser. This is why the NASA
key and database credentials are never exposed to users.

**Storage split:** saved locations, alert history, and language preference live in the
browser's local storage (private to each device, no account needed). Only community
reports are on the server, because they must be shared.

**Key files**

| File | Role |
|---|---|
| `lib/firms.ts` | Fetches and clusters satellite detections |
| `lib/score.ts` | Proximity scoring |
| `lib/danger.ts` | FWI colour↔class mapping, WMS URLs |
| `lib/geo.ts` | Distance, bearing, radius circles |
| `lib/reports.ts` | Satellite verification of reports |
| `lib/i18n/` | English/Albanian translations |
| `components/MapView.tsx` | Map, markers, danger overlay |
| `app/page.tsx` | Main screen and alert logic |

**Installation:** it is a PWA — a website that installs to a phone home screen via "Add
to Home Screen", with an icon and offline shell caching. No app store, no fee.

**Deployment:** hosted on Vercel; pushing to `master` on GitHub deploys automatically.

---

## 9. Limitations — read before relying on it

1. **Not an emergency service.** For an actual fire, call Albania's emergency number.
   This app has no connection to emergency services.
2. **A detection is not a confirmed wildfire.** It is a heat signature; agricultural
   burning triggers it too.
3. **No detection does not mean no fire.** Satellites pass only a few times daily, cloud
   cover blocks them, and small or early fires may be missed entirely.
4. **The score is a heuristic, not an official rating.** The danger class is official
   (EFFIS), but read as a class band, not an exact value.
5. **Air quality is modelled, not measured.** Albania has very few ground monitors; PM2.5
   comes from a model and is labelled "(modeled)" throughout.
6. **Notifications need the app open.** No true background push.
7. **Community reports are unverified** until satellites confirm them, and carry no
   spam protection.
8. **Point ≠ perimeter.** Detection count does not indicate burnt area.

---

## 10. Attribution

- Fire detections: NASA FIRMS (Suomi-NPP, NOAA-20, NOAA-21 VIIRS)
- Fire danger: EFFIS / Copernicus Emergency Management Service, ECMWF FWI
- Weather & air quality: Open-Meteo (CAMS)
- Geocoding & map tiles: OpenStreetMap contributors
