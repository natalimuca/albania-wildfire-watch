"use client";

import { FWI_CLASSES } from "@/lib/danger";
import { useI18n } from "@/lib/i18n/context";

interface DangerLegendProps {
  dates: string[];
  selected: string;
  onSelect: (date: string) => void;
}

export default function DangerLegend({ dates, selected, onSelect }: DangerLegendProps) {
  const { t } = useI18n();

  return (
    <div className="absolute bottom-2 left-2 z-10 rounded-md bg-black/75 px-2 py-1.5 text-white backdrop-blur-sm">
      <div className="mb-1 text-[10px] font-semibold">{t("danger.legendTitle")}</div>

      <div className="mb-1.5 flex gap-1">
        {dates.map((d, i) => {
          const day = new Date(`${d}T00:00:00Z`).getUTCDay();
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                d === selected ? "bg-white text-black" : "bg-white/15 text-neutral-200 hover:bg-white/25"
              }`}
            >
              {i === 0 ? t("danger.today") : t(`danger.weekday.${day}`)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        {FWI_CLASSES.map((c) => (
          <div key={c.key} className="text-center">
            <div
              className="h-2.5 w-7"
              style={{ background: `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})` }}
            />
            <div className="mt-0.5 text-[8px] leading-tight text-neutral-300">
              {t(`danger.level.${c.key}`)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
