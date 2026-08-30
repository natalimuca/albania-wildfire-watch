import { NextRequest, NextResponse } from "next/server";
import type { Conditions } from "@/lib/types";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m,relative_humidity_2m&timezone=UTC`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5&timezone=UTC`;

  const [weatherRes, aqRes] = await Promise.allSettled([
    fetch(weatherUrl, { next: { revalidate: 1800 } }),
    fetch(airQualityUrl, { next: { revalidate: 1800 } }),
  ]);

  const weather =
    weatherRes.status === "fulfilled" && weatherRes.value.ok ? await weatherRes.value.json() : null;
  const aq = aqRes.status === "fulfilled" && aqRes.value.ok ? await aqRes.value.json() : null;

  const pm25 = aq?.current?.pm2_5 ?? null;

  const conditions: Conditions = {
    windSpeedKmh: weather?.current?.wind_speed_10m ?? null,
    windDirectionDeg: weather?.current?.wind_direction_10m ?? null,
    humidityPct: weather?.current?.relative_humidity_2m ?? null,
    pm25,
    pm25Source: pm25 != null ? "modeled" : null,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(conditions);
}
