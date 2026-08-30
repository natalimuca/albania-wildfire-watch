"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MapView from "@/components/MapView";
import AddLocationForm from "@/components/AddLocationForm";
import LocationCard from "@/components/LocationCard";
import AlertsPanel from "@/components/AlertsPanel";
import ReportsPanel from "@/components/ReportsPanel";
import LanguageToggle from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n/context";
import { scoreAllGroups } from "@/lib/score";
import {
  loadAlerts,
  loadLocations,
  loadSeenGroupIds,
  pushAlerts,
  saveLocations,
  saveSeenGroupIds,
} from "@/lib/storage";
import type { AlertEntry, Conditions, FireGroup, FireReport, SavedLocation, ScoredGroup } from "@/lib/types";

const REFRESH_MS = 15 * 60 * 1000;
const ALERT_SCORE_JUMP = 15;

export default function Home() {
  const { t } = useI18n();
  const [groups, setGroups] = useState<FireGroup[]>([]);
  const [groupsError, setGroupsError] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [conditionsByLocation, setConditionsByLocation] = useState<Record<string, Conditions | null>>({});
  const [scoredByLocation, setScoredByLocation] = useState<Record<string, ScoredGroup[]>>({});
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [reports, setReports] = useState<FireReport[]>([]);
  const [reportMode, setReportMode] = useState(false);
  const [pendingReport, setPendingReport] = useState<{ lat: number; lon: number } | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  useEffect(() => {
    setLocations(loadLocations());
    setAlerts(loadAlerts());
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission("unsupported");
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    setGroupsError(false);
    try {
      const res = await fetch("/api/firms");
      if (!res.ok) throw new Error("Failed to load fire detections");
      const data = await res.json();
      setGroups(data.groups ?? []);
    } catch {
      setGroupsError(true);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    const id = setInterval(fetchGroups, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchGroups]);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) return;
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch {
      // keep last known reports on transient failure
    }
  }, []);

  useEffect(() => {
    fetchReports();
    const id = setInterval(fetchReports, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchReports]);

  async function submitReport() {
    if (!pendingReport) return;
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pendingReport.lat, lon: pendingReport.lon, note: reportNote.trim() || undefined }),
      });
      if (res.ok) {
        setPendingReport(null);
        setReportNote("");
        await fetchReports();
      }
    } finally {
      setSubmittingReport(false);
    }
  }

  function cancelReport() {
    setPendingReport(null);
    setReportNote("");
    setReportMode(false);
  }

  const refreshConditionsAndScores = useCallback(async () => {
    const currentLocations = locationsRef.current;
    if (currentLocations.length === 0) return;
    setLoadingConditions(true);

    const entries = await Promise.all(
      currentLocations.map(async (loc) => {
        try {
          const res = await fetch(`/api/conditions?lat=${loc.lat}&lon=${loc.lon}`);
          const conditions: Conditions | null = res.ok ? await res.json() : null;
          return [loc.id, conditions] as const;
        } catch {
          return [loc.id, null] as const;
        }
      })
    );
    const conditionsMap = Object.fromEntries(entries);
    setConditionsByLocation(conditionsMap);

    const scoredMap: Record<string, ScoredGroup[]> = {};
    const seen = loadSeenGroupIds();
    const newAlerts: AlertEntry[] = [];

    for (const loc of currentLocations) {
      const conditions = conditionsMap[loc.id] ?? null;
      const scored = scoreAllGroups(groups, loc, conditions, Math.max(60, loc.alertRadiusKm));
      scoredMap[loc.id] = scored;

      for (const s of scored.filter((g) => g.distanceKm <= loc.alertRadiusKm)) {
        const key = `${loc.id}:${s.group.id}`;
        const previousScore = seen[key];
        if (previousScore === undefined || s.score - previousScore >= ALERT_SCORE_JUMP) {
          newAlerts.push({
            id: crypto.randomUUID(),
            locationId: loc.id,
            locationName: loc.name,
            groupId: s.group.id,
            createdAt: new Date().toISOString(),
            score: s.score,
            distanceKm: s.distanceKm,
            confidence: s.group.maxConfidence,
            reasons: s.reasons,
          });
        }
        seen[key] = s.score;
      }
    }

    setScoredByLocation(scoredMap);
    saveSeenGroupIds(seen);
    if (newAlerts.length > 0) {
      pushAlerts(newAlerts);
      setAlerts(loadAlerts());
      if (typeof window !== "undefined" && Notification.permission === "granted") {
        for (const a of newAlerts) {
          new Notification(t("notifications.title", { name: a.locationName }), {
            body: t("notifications.body", { score: a.score, km: a.distanceKm.toFixed(1) }),
          });
        }
      }
    }
    setLoadingConditions(false);
  }, [groups, t]);

  useEffect(() => {
    refreshConditionsAndScores();
  }, [refreshConditionsAndScores, locations.length]);

  function addLocation(loc: SavedLocation) {
    const next = [...locations, loc];
    setLocations(next);
    saveLocations(next);
  }

  function removeLocation(id: string) {
    const next = locations.filter((l) => l.id !== id);
    setLocations(next);
    saveLocations(next);
  }

  function updateRadius(id: string, km: number) {
    const next = locations.map((l) => (l.id === id ? { ...l, alertRadiusKm: km } : l));
    setLocations(next);
    saveLocations(next);
  }

  function clearLocations() {
    setLocations([]);
    saveLocations([]);
  }

  function addFromMapClick(lat: number, lon: number) {
    addLocation({
      id: crypto.randomUUID(),
      name: t("addLocation.pinnedName", { lat: lat.toFixed(3), lon: lon.toFixed(3) }),
      lat,
      lon,
      alertRadiusKm: 15,
      createdAt: new Date().toISOString(),
    });
  }

  function handleMapClick(lat: number, lon: number) {
    if (reportMode) {
      setPendingReport({ lat, lon });
      setReportMode(false);
    } else {
      addFromMapClick(lat, lon);
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <div className="h-[45vh] w-full md:h-full md:w-2/3">
        <MapView
          groups={groups}
          locations={locations}
          reports={reports}
          reportMode={reportMode}
          onMapClick={handleMapClick}
        />
      </div>

      <div className="flex w-full flex-1 flex-col gap-4 overflow-y-auto p-4 md:w-1/3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-semibold">{t("app.title")}</h1>
            <LanguageToggle />
          </div>
          <p className="text-xs text-neutral-500">{t("app.subtitle")}</p>
          {groupsError && <p className="mt-1 text-xs text-red-600">{t("app.errorLoadingDetections")}</p>}
          {loadingGroups && <p className="mt-1 text-xs text-neutral-400">{t("app.loadingDetections")}</p>}
        </div>

        {notifPermission !== "granted" && notifPermission !== "unsupported" && (
          <button
            onClick={enableNotifications}
            className="rounded-md border border-blue-600 px-3 py-2 text-xs font-medium text-blue-600"
          >
            {t("app.enableNotifications")}
          </button>
        )}

        {!pendingReport && (
          <button
            onClick={() => setReportMode((v) => !v)}
            className={`rounded-md border px-3 py-2 text-xs font-medium ${
              reportMode
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-violet-600 text-violet-600"
            }`}
          >
            {reportMode ? t("reports.toggleActive") : t("reports.toggleOn")}
          </button>
        )}

        {pendingReport && (
          <div className="space-y-2 rounded-md border border-violet-600 p-3">
            <div className="text-xs text-neutral-500">
              {pendingReport.lat.toFixed(3)}, {pendingReport.lon.toFixed(3)}
            </div>
            <textarea
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              placeholder={t("reports.notePlaceholder")}
              maxLength={280}
              rows={2}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <div className="flex gap-2">
              <button
                onClick={submitReport}
                disabled={submittingReport}
                className="rounded-md bg-violet-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {submittingReport ? t("reports.submitting") : t("reports.submit")}
              </button>
              <button
                onClick={cancelReport}
                className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-500 dark:border-neutral-700"
              >
                {t("reports.cancel")}
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">{t("savedLocations.heading")}</h2>
            {locations.length > 0 && (
              <button
                onClick={clearLocations}
                className="text-xs text-neutral-400 hover:text-red-500"
              >
                {t("savedLocations.clearAll")}
              </button>
            )}
          </div>
          <AddLocationForm onAdd={addLocation} />
          <p className="mt-1 text-xs text-neutral-400">{t("addLocation.hint")}</p>
        </div>

        <div className="space-y-2">
          {locations.length === 0 && (
            <p className="text-sm text-neutral-500">{t("savedLocations.none")}</p>
          )}
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              conditions={conditionsByLocation[loc.id] ?? null}
              topGroup={scoredByLocation[loc.id]?.[0] ?? null}
              loading={loadingConditions}
              onRemove={() => removeLocation(loc.id)}
              onRadiusChange={(km) => updateRadius(loc.id, km)}
            />
          ))}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium">{t("alerts.heading")}</h2>
          <AlertsPanel alerts={alerts} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium">{t("reports.heading")}</h2>
          <ReportsPanel reports={reports} />
        </div>
      </div>
    </div>
  );
}
