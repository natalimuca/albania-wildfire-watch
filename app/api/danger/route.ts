import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { buildGetMapUrl, classifyRgb, today, type DangerKey } from "@/lib/danger";

const FORECAST_DAYS = 5;

function dateOffset(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function sampleDanger(lat: number, lon: number, date: string): Promise<DangerKey | null> {
  const res = await fetch(buildGetMapUrl(lat, lon, date), { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());

  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const counts = new Map<DangerKey, number>();
  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = info.channels === 4 ? data[i + 3] : 255;
    if (alpha < 128) continue;
    const key = classifyRgb(data[i], data[i + 1], data[i + 2]);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const dates = Array.from({ length: FORECAST_DAYS }, (_, i) => dateOffset(i));
    const values = await Promise.all(dates.map((d) => sampleDanger(lat, lon, d)));
    const forecast = dates.map((date, i) => ({ date, level: values[i] }));

    return NextResponse.json({
      current: forecast[0]?.level ?? null,
      forecast,
      source: "EFFIS / Copernicus ECMWF Fire Weather Index",
      fetchedAt: today(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load fire danger" }, { status: 502 });
  }
}
