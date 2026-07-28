import en from "./dictionaries/en.json";
import tr from "./dictionaries/tr.json";

export type Locale = "tr" | "en";

export const LOCALES: Locale[] = ["tr", "en"];
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_STORAGE_KEY = "app-locale";

export type Dictionary = typeof tr;

const dictionaries: Record<Locale, Dictionary> = {
  tr,
  en,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function resolveLocale(value: string | null | undefined): Locale {
  if (value === "en" || value === "tr") return value;
  return DEFAULT_LOCALE;
}

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<Dictionary>;

function getByPath(obj: Dictionary, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function translate(
  locale: Locale,
  key: TranslationKey | string,
  vars?: Record<string, string | number>,
): string {
  const dict = getDictionary(locale);
  let text = getByPath(dict, key) ?? getByPath(getDictionary("en"), key) ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
