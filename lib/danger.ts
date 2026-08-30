export const FWI_CLASSES = [
  { key: "low", rgb: [156, 255, 192], min: 0, max: 11.2 },
  { key: "moderate", rgb: [205, 226, 78], min: 11.2, max: 21.3 },
  { key: "high", rgb: [230, 172, 0], min: 21.3, max: 38 },
  { key: "veryHigh", rgb: [217, 112, 16], min: 38, max: 50 },
  { key: "extreme", rgb: [173, 6, 14], min: 50, max: 70 },
  { key: "veryExtreme", rgb: [58, 0, 21], min: 70, max: Infinity },
] as const;

export type DangerKey = (typeof FWI_CLASSES)[number]["key"];

const MATCH_TOLERANCE = 40;

export const FWI_WMS_BASE = "https://maps.effis.emergency.copernicus.eu/gwis";
export const FWI_LAYER = "ecmwf.fwi";

export function fwiTileUrl(date: string = today()) {
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetMap",
    layers: FWI_LAYER,
    styles: "default",
    crs: "EPSG:3857",
    format: "image/png",
    transparent: "true",
    width: "256",
    height: "256",
    time: date,
  });
  return `${FWI_WMS_BASE}?${params.toString()}&bbox={bbox-epsg-3857}`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export const DANGER_MAP_DAYS = 5;

export function dangerDates(count = DANGER_MAP_DAYS) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function buildGetMapUrl(lat: number, lon: number, date: string, span = 0.08, size = 9) {
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetMap",
    layers: FWI_LAYER,
    styles: "default",
    crs: "EPSG:4326",
    bbox: `${lat - span},${lon - span},${lat + span},${lon + span}`,
    width: String(size),
    height: String(size),
    format: "image/png",
    transparent: "true",
    time: date,
  });
  return `${FWI_WMS_BASE}?${params.toString()}`;
}

export function classifyRgb(r: number, g: number, b: number): DangerKey | null {
  let best: DangerKey | null = null;
  let bestDist = Infinity;
  for (const c of FWI_CLASSES) {
    const d = Math.hypot(r - c.rgb[0], g - c.rgb[1], b - c.rgb[2]);
    if (d < bestDist) {
      bestDist = d;
      best = c.key;
    }
  }
  return bestDist <= MATCH_TOLERANCE ? best : null;
}
