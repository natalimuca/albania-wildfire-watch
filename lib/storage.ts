import type { AlertEntry, SavedLocation } from "./types";

const LOCATIONS_KEY = "awf.savedLocations.v1";
const ALERTS_KEY = "awf.alerts.v2";
const SEEN_KEY = "awf.seenGroups.v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadLocations(): SavedLocation[] {
  return readJson<SavedLocation[]>(LOCATIONS_KEY, []);
}

export function saveLocations(locations: SavedLocation[]) {
  writeJson(LOCATIONS_KEY, locations);
}

export function loadAlerts(): AlertEntry[] {
  return readJson<AlertEntry[]>(ALERTS_KEY, []);
}

export function pushAlerts(newAlerts: AlertEntry[]) {
  if (newAlerts.length === 0) return;
  const existing = loadAlerts();
  writeJson(ALERTS_KEY, [...newAlerts, ...existing].slice(0, 200));
}

export function loadSeenGroupIds(): Record<string, number> {
  return readJson<Record<string, number>>(SEEN_KEY, {});
}

export function saveSeenGroupIds(seen: Record<string, number>) {
  writeJson(SEEN_KEY, seen);
}
