import { translate, type Locale, DEFAULT_LOCALE } from "@/i18n/config";

/** Bağıntılı zaman: "5 dakika önce" / "5 minutes ago" */
export function formatRelativeTime(
  iso: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
  nowMs: number = Date.now(),
): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSec < 45) return t("relative.justNow");

  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return t("relative.minutesAgo", { n: mins });

  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("relative.hoursAgo", { n: hours });

  const days = Math.floor(hours / 24);
  if (days < 30) return t("relative.daysAgo", { n: days });

  const months = Math.floor(days / 30);
  if (months < 12) return t("relative.monthsAgo", { n: months });

  const years = Math.floor(days / 365);
  return t("relative.yearsAgo", { n: years });
}

export function formatFileSize(bytes: number | string | null | undefined): string {
  const n =
    typeof bytes === "number"
      ? bytes
      : typeof bytes === "string"
        ? Number(bytes)
        : NaN;
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
