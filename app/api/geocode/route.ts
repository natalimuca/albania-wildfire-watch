import { NextRequest, NextResponse } from "next/server";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=al&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "albania-wildfire-watch/0.1 (contact: ntlmuca@gmail.com)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = (await res.json()) as NominatimResult[];
    return NextResponse.json({
      results: data.map((r) => ({
        label: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
      })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
