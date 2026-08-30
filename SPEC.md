# Albania Wildfire Watch — Project Spec

Adapted from a US-focused wildfire tracking spec. Same mechanism, sources swapped for
ones that actually have Balkan/Mediterranean coverage.

## Overview

Build an app that tracks possible wildfires near places a user saves in Albania — home,
family village, a rental property, a hiking area. The app pulls recent satellite fire
detections, plots them on a map, checks the weather and air quality around them, and
sends an alert when a new detection appears nearby or conditions get worse.

## Getting fire detections from NASA (unchanged — already global)

NASA's FIRMS system publishes thermal anomalies detected by satellites. Each detection
includes its coordinates, the time it was recorded, the satellite that recorded it, a
confidence level, and fire radiative power (how much heat the satellite detected).

Use the VIIRS near-real-time feeds (Suomi NPP, NOAA-20, NOAA-21) at ~375m resolution.
The FIRMS Area API takes a bounding box and returns detections from the past 1–5 days.
Needs a free FIRMS `MAP_KEY`. Albania's bounding box is roughly
`19.28,39.62,21.06,42.66` (lon/lat), so this part needs zero conceptual change from the
US version — just point the box at Albania.

Group detections that appear close together within a similar period into one fire
instead of treating every point separately. Each group stores its center, first
detection, latest detection, detection count, highest confidence, and strongest fire
radiative power.

## Geocoding — swap Census Geocoder → Nominatim (OpenStreetMap)

The US Census Geocoder is US-only. Use **Nominatim** to turn a saved address into
lat/lon — it's free, global, and OSM's Albania coverage (roads, villages, addresses) is
decent, especially in and around cities. Self-host or respect Nominatim's public usage
policy (1 req/sec, custom User-Agent) if using the public instance at scale.

## Weather — swap NWS → Open-Meteo

The National Weather Service API is US-only. **Open-Meteo** is a free, no-API-key,
global weather API with hourly wind speed, wind direction, and relative humidity —
functionally a drop-in replacement. (ECMWF open data is a fallback if you want raw
model output instead.)

Same logic as the original: wind direction is where wind comes *from*; add 180° to get
where it's heading, compare against the user's location to determine if they're
downwind. Wind speed and humidity feed the score the same way.

## Air quality — swap AirNow → CAMS (Copernicus) + WAQI/OpenAQ as ground-truth check

This is the weakest link, and worth being upfront about. AirNow relies on the EPA's
dense US ground-monitor network — Albania doesn't have an equivalent. Two
complementary sources:

- **CAMS (Copernicus Atmosphere Monitoring Service)** — European air quality forecast,
  modeled (not measured), but has full Balkan coverage including PM2.5. This is your
  reliable fallback everywhere in the country.
- **WAQI (World Air Quality Index) API** or **OpenAQ** — aggregate whatever real ground
  stations exist. Tirana has a handful of monitors (via Albania's National
  Environmental Agency / IQAir-fed sensors); rural areas near actual fire risk mostly
  won't. Use these when available, fall back to CAMS modeled data otherwise, and mark
  which one a reading came from.

Match readings by location + time, keep timestamps in UTC, store each source's update
time so the app can show data freshness — same as the original.

## Calculating the score (unchanged logic)

Score from distance, age, confidence, fire radiative power, repeat-detection count,
wind direction, wind speed, humidity, and nearby PM2.5. Distance and recency dominate;
multiple satellites confirming, downwind position, and elevated PM2.5 push it up.

Show the reasons behind the score, and mark it as "limited data" rather than silently
zeroing out a missing weather/AQ reading — this matters more here than in the US
version, since AQ data holes will be common outside Tirana.

This is a context score, not an official danger rating — don't present it as a fire
spread prediction.

## Alerts and the timeline (unchanged)

Per-location alert radius. Alert on a new detection group inside the radius, a second
satellite confirming, or a meaningful score jump. Group repeated detections into one
alert. Store raw detections on a 24-hour replayable timeline, described as a change in
*detected activity*, not confirmed fire spread (cloud cover and satellite pass timing
distort the point count).

## Official wildfire info — swap WFIGS/NIFC → EFFIS

The US version cross-references NIFC's WFIGS for official incident perimeters and
containment %. Albania has no equivalent domestic system, but it's covered by
**EFFIS** (European Forest Fire Information System, run by the EU's Joint Research
Centre / Copernicus Emergency Management Service) — EFFIS explicitly covers the wider
European and Mediterranean neighborhood, including the Western Balkans. It provides:

- Active fire perimeters and burnt-area mapping
- A daily **Fire Danger Forecast** layer (this didn't exist in the US original — worth
  adding as its own feature, since it's genuinely useful pre-fire, not just reactive)

Match a FIRMS detection group to an EFFIS perimeter the same way the US version matched
to WFIGS: check if points fall inside/near an official perimeter, and let FIRMS work
standalone when nothing matches (most detections won't have an official perimeter yet).

## Limitations (same caveats, plus one Albania-specific one)

A FIRMS point is a satellite-detected heat anomaly, not a confirmed wildfire — could be
a prescribed burn, agricultural burning (common in Albania), or another heat source.
Point ≠ fire perimeter, and point count ≠ acreage.

Weather forecasts cover an area, not the exact fire spot. Air quality readings are
sparse outside Tirana — most of the country will be running on modeled CAMS data rather
than a real nearby monitor, which is less accurate than the US version's ground-monitor
coverage. Say so in the UI rather than presenting a modeled PM2.5 value as measured.

This is an informational project, not an evacuation tool or emergency warning system —
for that, point users to Albania's General Directorate of Civil Emergencies (Drejtoria e
Përgjithshme e Emergjencave Civile), if and when it publishes anything programmatically
accessible.

## Links

- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
- FIRMS Area API: https://firms.modaps.eosdis.nasa.gov/api/area/
- Free FIRMS MAP_KEY: https://firms.modaps.eosdis.nasa.gov/api/map_key/
- FIRMS data fields: https://www.earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs
- Nominatim: https://nominatim.org/release-docs/latest/api/Overview/
- Open-Meteo: https://open-meteo.com/en/docs
- Copernicus CAMS: https://atmosphere.copernicus.eu/
- WAQI API: https://aqicn.org/api/
- OpenAQ: https://docs.openaq.org/
- EFFIS: https://effis.jrc.ec.europa.eu/
- EFFIS data/API access: https://effis.jrc.ec.europa.eu/applications/data-and-services
