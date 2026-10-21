"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fmtList } from "@/lib/format";
import { PARAMETER_UNITS, type NumericKey, type RoleParameters } from "./parameters";

type TravelTime = RoleParameters["weekly"]["travelTime"];

export function useParameterValueLabel() {
  const t = useTranslations("calendarSettings");
  const locale = useLocale();
  return useCallback(
    (key: NumericKey | "travelTime", value: number | TravelTime) => {
      if (typeof value === "number") return t(`values.${PARAMETER_UNITS[key as NumericKey]}`, { value });
      return value ? t("values.minutes", { value: fmtList(value.options.map(String), locale, "unit") }) : "-";
    },
    [t, locale],
  );
}
