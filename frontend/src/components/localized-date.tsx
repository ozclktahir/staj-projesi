"use client";

import { useTranslation } from "@/i18n/use-translation";
import { formatAppDate } from "@/lib/date-locale";

export function LocalizedDate({ iso }: { iso: string }) {
  const { locale } = useTranslation();
  return <>{formatAppDate(iso, locale)}</>;
}
