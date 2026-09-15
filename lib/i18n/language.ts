"use client";

import { useTranslations } from "next-intl";

export function useLanguageLabel() {
  const t = useTranslations("common");
  return (code: string | null | undefined) => {
    if (!code) return "-";
    const key = `lang_${code.toUpperCase()}`;
    return t.has(key) ? t(key) : code.toUpperCase();
  };
}
