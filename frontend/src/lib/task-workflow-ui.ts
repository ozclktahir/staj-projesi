/** Client-safe SLA helpers (server action dosyasından import etme) */

export const CLAIM_SLA_HOURS = 24;

export function isAssignmentClaimOverdue(
  pendingAt: string | null | undefined,
  createdAt?: string | null,
  hours = CLAIM_SLA_HOURS,
): boolean {
  const raw = pendingAt || createdAt;
  if (!raw) return false;
  const ms = new Date(raw).getTime();
  if (Number.isNaN(ms)) return false;
  return Date.now() - ms > hours * 60 * 60 * 1000;
}
