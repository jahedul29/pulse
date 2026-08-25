export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const TIME_ZONE = "Asia/Dubai";

export const RTL_LOCALES: Locale[] = ["ar"];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export function dirFor(locale: string): "rtl" | "ltr" {
  return (RTL_LOCALES as string[]).includes(locale) ? "rtl" : "ltr";
}
