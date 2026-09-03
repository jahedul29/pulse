"use client";

import { useTranslations } from "next-intl";

export function I18nText({
  ns,
  k,
  values,
}: {
  ns: string;
  k: string;
  values?: Record<string, string | number>;
}) {
  const t = useTranslations(ns);
  return <>{t(k, values)}</>;
}
