import type { TranslationMap } from "./types";

export function localizedName(name: string | TranslationMap, translations: TranslationMap | undefined, locale: string): string {
  const preferred = locale === "ar" ? translations?.ar : translations?.en;
  if (preferred?.trim()) return preferred;
  if (typeof name === "string") return name;
  return (locale === "ar" ? name.ar : name.en) || name.en || name.ar || "";
}

export function alternateName(name: string | TranslationMap, translations: TranslationMap | undefined, locale: string): string | null {
  const shown = localizedName(name, translations, locale);
  const other = locale === "ar" ? translations?.en : translations?.ar;
  const fallback = typeof name === "string" ? null : locale === "ar" ? name.en : name.ar;
  const candidate = (other ?? fallback ?? "").trim();
  return candidate && candidate !== shown ? candidate : null;
}

export function translatedNames(record: { name: string | TranslationMap; name_translations?: TranslationMap }): {
  en: string;
  ar: string;
} {
  const fromName = typeof record.name === "string" ? { en: record.name } : record.name;
  return {
    en: (record.name_translations?.en ?? fromName.en ?? "").trim(),
    ar: (record.name_translations?.ar ?? fromName.ar ?? "").trim(),
  };
}
