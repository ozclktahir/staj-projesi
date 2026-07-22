/** Bağıntılı zaman: "5 dakika önce", "2 saat önce" */
export function formatRelativeTime(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSec < 45) return "az önce";

  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} dakika önce`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;

  const years = Math.floor(days / 365);
  return `${years} yıl önce`;
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
