"use client";

import { useI18n } from "@/lib/i18n/context";
import type { DangerForecast as DangerForecastData } from "@/lib/types";

const LEVEL_COLOR: Record<string, string> = {
  low: "#9cffc0",
  moderate: "#cde24e",
  high: "#e6ac00",
  veryHigh: "#d97010",
  extreme: "#ad060e",
  veryExtreme: "#3a0015",
};

const DARK_TEXT = new Set(["low", "moderate", "high"]);

export default function DangerForecast({ data }: { data: DangerForecastData | null }) {
  const { t } = useI18n();

  if (!data || !data.current) {
    return <div className="text-xs text-neutral-500">{t("danger.unavailable")}</div>;
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span
          className="rounded px-2 py-0.5 text-xs font-semibold"
          style={{
            background: LEVEL_COLOR[data.current] ?? "#666",
            color: DARK_TEXT.has(data.current) ? "#1c1c1c" : "#ffffff",
          }}
        >
          {t(`danger.level.${data.current}`)}
        </span>
        <span className="text-xs text-neutral-500">{t("danger.today")}</span>
      </div>

      <div className="flex gap-1">
        {data.forecast.map((d) => (
          <div key={d.date} className="flex-1 text-center">
            <div
              className="h-6 rounded"
              style={{ background: d.level ? (LEVEL_COLOR[d.level] ?? "#666") : "#3f3f46" }}
              title={d.level ? t(`danger.level.${d.level}`) : t("danger.unavailable")}
            />
            <div className="mt-0.5 text-[10px] text-neutral-500">
              {t(`danger.weekday.${new Date(`${d.date}T00:00:00Z`).getUTCDay()}`)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 text-[10px] text-neutral-400">{t("danger.source")}</div>
    </div>
  );
}
