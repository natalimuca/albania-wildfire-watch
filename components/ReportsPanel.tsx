"use client";

import { useI18n } from "@/lib/i18n/context";
import type { FireReport } from "@/lib/types";

export default function ReportsPanel({ reports }: { reports: FireReport[] }) {
  const { t } = useI18n();

  if (reports.length === 0) {
    return <p className="text-sm text-neutral-500">{t("reports.none")}</p>;
  }

  return (
    <ul className="space-y-2">
      {reports.slice(0, 30).map((r) => (
        <li key={r.id} className="rounded-md border border-neutral-200 p-2 text-xs dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${
                r.verified ? "bg-green-600" : "bg-violet-600"
              }`}
            >
              {r.verified ? t("reports.verified") : t("reports.unverified")}
            </span>
            <span className="text-neutral-400">{new Date(r.createdAt).toLocaleString()}</span>
          </div>
          <div className="mt-1 text-neutral-500">
            {r.lat.toFixed(3)}, {r.lon.toFixed(3)}
          </div>
          {r.note && <div className="mt-1 text-neutral-600 dark:text-neutral-400">“{r.note}”</div>}
        </li>
      ))}
    </ul>
  );
}
