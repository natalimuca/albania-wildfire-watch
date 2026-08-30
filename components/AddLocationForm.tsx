"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { SavedLocation } from "@/lib/types";

interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

export default function AddLocationForm({ onAdd }: { onAdd: (loc: SavedLocation) => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  function addResult(r: GeocodeResult) {
    onAdd({
      id: crypto.randomUUID(),
      name: r.label.split(",").slice(0, 2).join(",").trim(),
      lat: r.lat,
      lon: r.lon,
      alertRadiusKm: 15,
      createdAt: new Date().toISOString(),
    });
    setQuery("");
    setResults([]);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={t("addLocation.placeholder")}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={search}
          disabled={loading}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "…" : t("addLocation.search")}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="rounded-md border border-neutral-200 text-sm dark:border-neutral-800">
          {results.map((r, i) => (
            <li
              key={i}
              onClick={() => addResult(r)}
              className="cursor-pointer px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
