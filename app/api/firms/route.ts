import { NextResponse } from "next/server";
import { fetchAllDetections, groupDetections } from "@/lib/firms";

export async function GET() {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) {
    return NextResponse.json(
      { error: "FIRMS_MAP_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  try {
    const detections = await fetchAllDetections(mapKey);
    const groups = groupDetections(detections);
    return NextResponse.json({ groups, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Failed to fetch FIRMS data" }, { status: 502 });
  }
}
