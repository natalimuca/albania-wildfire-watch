"use client";

import { useI18n } from "@/lib/i18n/context";
import type { AlertEntry } from "@/lib/types";

export default function AlertsPanel({ alerts }: { alerts: AlertEntry[] }) {
  const { t } = useI18n();

  if (alerts.length === 0) {
    return <p className="text-sm text-neutral-500">{t("alerts.none")}</p>;
  }
  return (
    <ul className="space-y-2">
      {alerts.slice(0, 30).map((a) => (
        <li key={a.id} className="rounded-md border border-neutral-200 p-2 text-xs dark:border-neutral-800">
          <div className="flex justify-between">
            <span className="font-medium">{a.locationName}</span>
            <span className="text-neutral-400">{new Date(a.createdAt).toLocaleString()}</span>
          </div>
          <div className="text-neutral-500">
            {t("alerts.scoreLine", { score: a.score, km: a.distanceKm.toFixed(1) })}
          </div>
          {a.reasons.length > 0 && (
            <div className="text-neutral-500">{a.reasons.map((r) => t(r.key, r.params)).join(" · ")}</div>
          )}
        </li>
      ))}
    </ul>
  );
}
