"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Conditions, SavedLocation, ScoredGroup } from "@/lib/types";

const EFFIS_VIEWER_URL = "https://forest-fire.emergency.copernicus.eu/apps/effis_current_situation_test/";

function scoreColor(score: number) {
  if (score >= 60) return "bg-red-600";
  if (score >= 30) return "bg-orange-500";
  if (score >= 10) return "bg-yellow-500";
  return "bg-green-600";
}

interface LocationCardProps {
  location: SavedLocation;
  conditions: Conditions | null;
  topGroup: ScoredGroup | null;
  loading: boolean;
  onRemove: () => void;
  onRadiusChange: (km: number) => void;
}

export default function LocationCard({
  location,
  conditions,
  topGroup,
  loading,
  onRemove,
  onRadiusChange,
}: LocationCardProps) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);
  const score = topGroup?.score ?? 0;

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{location.name}</div>
          <div className="text-xs text-neutral-500">
            {location.lat.toFixed(3)}, {location.lon.toFixed(3)}
          </div>
        </div>
        <button onClick={onRemove} className="text-xs text-neutral-400 hover:text-red-500">
          {t("locationCard.remove")}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${scoreColor(score)}`}>
          {loading ? "…" : score}
        </span>
        <span className="text-xs text-neutral-500">
          {topGroup
            ? t("locationCard.nearestDetection", { km: topGroup.distanceKm.toFixed(1) })
            : loading
              ? t("locationCard.checking")
              : t("locationCard.noNearby")}
        </span>
      </div>

      {topGroup && topGroup.reasons.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-xs text-neutral-600 dark:text-neutral-400">
          {topGroup.reasons.map((r, i) => (
            <li key={i}>{t(r.key, r.params)}</li>
          ))}
        </ul>
      )}

      {topGroup?.confidenceLevel === "limited" && (
        <div className="mt-2 text-xs text-amber-600">{t("locationCard.limitedData")}</div>
      )}

      {conditions && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-neutral-500">
          <div>{t("locationCard.wind")} {conditions.windSpeedKmh?.toFixed(0) ?? "—"} km/h</div>
          <div>{t("locationCard.humidity")} {conditions.humidityPct ?? "—"}%</div>
          <div>{t("locationCard.pm25")} {conditions.pm25?.toFixed(0) ?? "—"} {t("locationCard.modeled")}</div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
        <label htmlFor={`radius-${location.id}`}>{t("locationCard.alertRadius")}</label>
        <input
          id={`radius-${location.id}`}
          type="range"
          min={5}
          max={60}
          value={location.alertRadiusKm}
          onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
          className="flex-1"
        />
        <span>{location.alertRadiusKm} km</span>
      </div>

      {topGroup && (
        <div className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs font-medium text-blue-600"
          >
            {showDetails ? "▾" : "▸"} {t("locationCard.detailsToggle")}
          </button>
          {showDetails && (
            <div className="mt-2 space-y-1 text-xs text-neutral-500">
              <div>{t("locationCard.detail.count")}: {topGroup.group.count}</div>
              <div>{t("locationCard.detail.satellites")}: {topGroup.group.satellites.join(", ")}</div>
              <div>{t("locationCard.detail.confidence")}: {Math.round(topGroup.group.maxConfidence * 100)}%</div>
              <div>{t("locationCard.detail.frp")}: {topGroup.group.maxFrp.toFixed(1)} MW</div>
              <div>{t("locationCard.detail.firstDetected")}: {new Date(topGroup.group.firstDetected).toLocaleString()}</div>
              <div>{t("locationCard.detail.lastDetected")}: {new Date(topGroup.group.lastDetected).toLocaleString()}</div>
              <div>{t("locationCard.detail.coordinates")}: {topGroup.group.centerLat.toFixed(4)}, {topGroup.group.centerLon.toFixed(4)}</div>
              <a
                href={EFFIS_VIEWER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-blue-600 hover:underline"
              >
                {t("locationCard.effisLink")}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
