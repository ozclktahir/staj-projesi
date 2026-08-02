"use client";

import { useTranslation } from "@/i18n/use-translation";

/** Server Component içinde locale bilinemediğinde metin göstermek için. */
export function I18nText({
  k,
  vars,
  as: Tag = "span",
  className,
}: {
  k: string;
  vars?: Record<string, string | number>;
  as?: "span" | "p" | "div" | "h1" | "h2";
  className?: string;
}) {
  const { t } = useTranslation();
  return <Tag className={className}>{t(k, vars)}</Tag>;
}
