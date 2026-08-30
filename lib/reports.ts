import { haversineKm } from "./geo";
import type { FireGroup } from "./types";

const VERIFY_RADIUS_KM = 5;
const VERIFY_LOOKBACK_MS = 6 * 3600 * 1000;

export function isVerified(reportLat: number, reportLon: number, reportCreatedAt: string, groups: FireGroup[]) {
  const windowStart = new Date(reportCreatedAt).getTime() - VERIFY_LOOKBACK_MS;
  return groups.some((g) => {
    const lastDetectedMs = new Date(g.lastDetected).getTime();
    if (lastDetectedMs < windowStart) return false;
    return haversineKm(reportLat, reportLon, g.centerLat, g.centerLon) <= VERIFY_RADIUS_KM;
  });
}
