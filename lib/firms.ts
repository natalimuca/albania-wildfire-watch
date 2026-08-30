import { ALBANIA_BBOX, haversineKm } from "./geo";
import type { FirmsDetection, FireGroup } from "./types";

const SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"];
const CLUSTER_DISTANCE_KM = 2;
const CLUSTER_WINDOW_MS = 12 * 3600 * 1000;

function bboxParam() {
  const { minLon, minLat, maxLon, maxLat } = ALBANIA_BBOX;
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

function parseConfidence(raw: string): number {
  const v = raw.trim().toLowerCase();
  if (v === "h" || v === "high") return 1;
  if (v === "n" || v === "nominal") return 0.7;
  if (v === "l" || v === "low") return 0.4;
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0.5 : n / 100;
}

function parseCsv(text: string, source: string): FirmsDetection[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const latI = col("latitude");
  const lonI = col("longitude");
  const dateI = col("acq_date");
  const timeI = col("acq_time");
  const confI = col("confidence");
  const frpI = col("frp");
  const satI = col("satellite");
  const dnI = col("daynight");

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",");
      const time = (cols[timeI] ?? "0").padStart(4, "0");
      const acquiredAt = `${cols[dateI]}T${time.slice(0, 2)}:${time.slice(2)}:00Z`;
      return {
        lat: parseFloat(cols[latI]),
        lon: parseFloat(cols[lonI]),
        acquiredAt,
        satellite: cols[satI] || source,
        confidence: parseConfidence(cols[confI] ?? ""),
        frp: parseFloat(cols[frpI]) || 0,
        daynight: cols[dnI] || "",
      };
    })
    .filter((d) => !Number.isNaN(d.lat) && !Number.isNaN(d.lon));
}

async function fetchSource(mapKey: string, source: string, days: number): Promise<FirmsDetection[]> {
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bboxParam()}/${days}`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  const text = await res.text();
  if (text.trim().toLowerCase().startsWith("invalid")) return [];
  return parseCsv(text, source);
}

export async function fetchAllDetections(mapKey: string, days = 2): Promise<FirmsDetection[]> {
  const results = await Promise.all(SOURCES.map((s) => fetchSource(mapKey, s, days)));
  return results.flat();
}

function average(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function groupDetections(detections: FirmsDetection[]): FireGroup[] {
  const buckets: { detections: FirmsDetection[] }[] = [];

  for (const d of detections) {
    const dTime = new Date(d.acquiredAt).getTime();
    const bucket = buckets.find((b) =>
      b.detections.some(
        (e) =>
          haversineKm(e.lat, e.lon, d.lat, d.lon) <= CLUSTER_DISTANCE_KM &&
          Math.abs(new Date(e.acquiredAt).getTime() - dTime) <= CLUSTER_WINDOW_MS
      )
    );
    if (bucket) {
      bucket.detections.push(d);
    } else {
      buckets.push({ detections: [d] });
    }
  }

  return buckets.map((b, i) => {
    const ds = b.detections;
    const sorted = [...ds].sort((a, b2) => a.acquiredAt.localeCompare(b2.acquiredAt));
    return {
      id: `grp_${i}_${sorted[0].acquiredAt}`,
      centerLat: average(ds.map((d) => d.lat)),
      centerLon: average(ds.map((d) => d.lon)),
      firstDetected: sorted[0].acquiredAt,
      lastDetected: sorted[sorted.length - 1].acquiredAt,
      count: ds.length,
      maxConfidence: Math.max(...ds.map((d) => d.confidence)),
      maxFrp: Math.max(...ds.map((d) => d.frp)),
      satellites: [...new Set(ds.map((d) => d.satellite))],
    };
  });
}
