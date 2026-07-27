import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Görev sahiplenme SLA (saat) */
export const CLAIM_SLA_HOURS = 24;

/** Atama onayı bekleyen görevde SLA süresi aşıldı mı? */
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
