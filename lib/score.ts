import { angularDiff, bearingDeg, haversineKm } from "./geo";
import type { Conditions, FireGroup, ReasonEntry, ScoredGroup } from "./types";

export function scoreGroup(
  group: FireGroup,
  loc: { lat: number; lon: number },
  conditions: Conditions | null
): ScoredGroup {
  const distanceKm = haversineKm(loc.lat, loc.lon, group.centerLat, group.centerLon);
  const ageHours = Math.max(0, (Date.now() - new Date(group.lastDetected).getTime()) / 3_600_000);

  const distanceScore = 40 * Math.exp(-distanceKm / 15);
  const ageScore = 25 * Math.exp(-ageHours / 24);
  const confidenceScore = 10 * group.maxConfidence;
  const frpScore = Math.min(10, group.maxFrp / 50);
  const repeatScore = Math.min(10, (group.count - 1) * 2);

  const reasons: ReasonEntry[] = [];
  if (distanceKm < 15) {
    reasons.push({ key: "reason.detectionDistance", params: { km: distanceKm.toFixed(1) } });
  }
  if (ageHours < 24) {
    reasons.push(
      ageHours < 1
        ? { key: "reason.lastDetectedRecent" }
        : { key: "reason.lastDetectedHours", params: { hours: Math.round(ageHours) } }
    );
  }
  if (group.count > 1) {
    reasons.push({
      key: "reason.repeatedDetections",
      params: { count: group.count, sats: group.satellites.length },
    });
  }
  if (group.maxConfidence >= 1) reasons.push({ key: "reason.highConfidence" });

  let windBoost = 0;
  let humidityBoost = 0;
  let pm25Boost = 0;

  if (conditions?.windDirectionDeg != null && conditions.windSpeedKmh != null) {
    const towardDeg = (conditions.windDirectionDeg + 180) % 360;
    const bearingToLoc = bearingDeg(group.centerLat, group.centerLon, loc.lat, loc.lon);
    if (angularDiff(towardDeg, bearingToLoc) < 45) {
      windBoost = Math.min(10, conditions.windSpeedKmh / 3);
      reasons.push({ key: "reason.downwind" });
    }
  }
  if (conditions?.humidityPct != null && conditions.humidityPct < 30) {
    humidityBoost = 3;
    reasons.push({ key: "reason.lowHumidity" });
  }
  if (conditions?.pm25 != null && conditions.pm25 > 35) {
    pm25Boost = 5;
    reasons.push({ key: "reason.elevatedPm25" });
  }

  const score = Math.round(
    Math.min(
      100,
      distanceScore + ageScore + confidenceScore + frpScore + repeatScore + windBoost + humidityBoost + pm25Boost
    )
  );

  return {
    group,
    distanceKm,
    ageHours,
    score,
    confidenceLevel: conditions ? "full" : "limited",
    reasons,
  };
}

export function scoreAllGroups(
  groups: FireGroup[],
  loc: { lat: number; lon: number },
  conditions: Conditions | null,
  maxDistanceKm = 60
): ScoredGroup[] {
  return groups
    .map((g) => scoreGroup(g, loc, conditions))
    .filter((s) => s.distanceKm <= maxDistanceKm)
    .sort((a, b) => b.score - a.score);
}
