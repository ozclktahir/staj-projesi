"use client";

import { useTranslation } from "@/i18n/use-translation";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSelector() {
  const { locale, setLocale, t } = useTranslation();

  const options: { value: Locale; label: string; description: string }[] = [
    {
      value: "tr",
      label: t("settings.turkish"),
      description: "Türkçe arayüz",
    },
    {
      value: "en",
      label: t("settings.english"),
      description: "English interface",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map(({ value, label, description }) => {
        const selected = locale === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
            )}
            aria-pressed={selected}
          >
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">{description}</span>
            {selected ? (
              <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                Aktif / Active
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
