"use client";

import { useI18n } from "@/lib/i18n/context";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-neutral-700 text-xs">
      {(["en", "sq"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 font-medium ${
            lang === l ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
