export interface FirmsDetection {
  lat: number;
  lon: number;
  acquiredAt: string;
  satellite: string;
  confidence: number;
  frp: number;
  daynight: string;
}

export interface FireGroup {
  id: string;
  centerLat: number;
  centerLon: number;
  firstDetected: string;
  lastDetected: string;
  count: number;
  maxConfidence: number;
  maxFrp: number;
  satellites: string[];
}

export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  alertRadiusKm: number;
  createdAt: string;
}

export interface Conditions {
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  humidityPct: number | null;
  pm25: number | null;
  pm25Source: "modeled" | null;
  updatedAt: string;
}

export interface ReasonEntry {
  key: string;
  params?: Record<string, string | number>;
}

export interface ScoredGroup {
  group: FireGroup;
  distanceKm: number;
  ageHours: number;
  score: number;
  confidenceLevel: "limited" | "full";
  reasons: ReasonEntry[];
}

export interface AlertEntry {
  id: string;
  locationId: string;
  locationName: string;
  groupId: string;
  createdAt: string;
  score: number;
  distanceKm: number;
  confidence: number;
  reasons: ReasonEntry[];
}

export interface DangerForecastDay {
  date: string;
  level: string | null;
}

export interface DangerForecast {
  current: string | null;
  forecast: DangerForecastDay[];
  source: string;
  fetchedAt: string;
}

export interface FireReport {
  id: string;
  lat: number;
  lon: number;
  note: string | null;
  createdAt: string;
  verified: boolean;
}
