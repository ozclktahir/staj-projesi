import type { Locale } from "@/i18n/config";

/** UI tarihleri için seçili dil (tr → tr-TR, en → en-US). */
export function dateLocaleTag(locale: Locale | string | undefined): string {
  return locale === "en" ? "en-US" : "tr-TR";
}

export function formatAppDate(
  value: string | number | Date,
  locale: Locale | string | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(
    dateLocaleTag(locale),
    options ?? { day: "2-digit", month: "short", year: "numeric" },
  );
}

export function formatAppDateTime(
  value: string | number | Date,
  locale: Locale | string | undefined,
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(dateLocaleTag(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
