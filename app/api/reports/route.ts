import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { fetchAllDetections, groupDetections } from "@/lib/firms";
import { ALBANIA_BBOX } from "@/lib/geo";
import { isVerified } from "@/lib/reports";
import type { FireReport } from "@/lib/types";

const MAX_NOTE_LENGTH = 280;

interface ReportRow {
  id: string;
  lat: number;
  lon: number;
  note: string | null;
  created_at: string;
}

export async function GET() {
  await ensureSchema();
  const rows = (await sql`
    SELECT id, lat, lon, note, created_at
    FROM reports
    WHERE created_at > now() - interval '5 days'
    ORDER BY created_at DESC
    LIMIT 200
  `) as unknown as ReportRow[];

  let groups: Awaited<ReturnType<typeof groupDetections>> = [];
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (mapKey) {
    try {
      groups = groupDetections(await fetchAllDetections(mapKey));
    } catch {
      groups = [];
    }
  }

  const reports: FireReport[] = rows.map((r) => ({
    id: r.id,
    lat: r.lat,
    lon: r.lon,
    note: r.note,
    createdAt: r.created_at,
    verified: isVerified(r.lat, r.lon, r.created_at, groups),
  }));

  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const lat = Number(body?.lat);
  const lon = Number(body?.lon);
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : null;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < ALBANIA_BBOX.minLat - 0.5 ||
    lat > ALBANIA_BBOX.maxLat + 0.5 ||
    lon < ALBANIA_BBOX.minLon - 0.5 ||
    lon > ALBANIA_BBOX.maxLon + 0.5
  ) {
    return NextResponse.json({ error: "Location must be within Albania" }, { status: 400 });
  }

  await ensureSchema();
  const rows = (await sql`
    INSERT INTO reports (lat, lon, note)
    VALUES (${lat}, ${lon}, ${note})
    RETURNING id, lat, lon, note, created_at
  `) as unknown as ReportRow[];

  const r = rows[0];
  const report: FireReport = {
    id: r.id,
    lat: r.lat,
    lon: r.lon,
    note: r.note,
    createdAt: r.created_at,
    verified: false,
  };

  return NextResponse.json({ report }, { status: 201 });
}
