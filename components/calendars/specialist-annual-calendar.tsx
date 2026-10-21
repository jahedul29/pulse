"use client";

import { AnnualCalendar } from "@abapro-front-end/calendars/annual";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { dirFor } from "@/i18n/routing";
import { annualMessagesFor, noticeToToast } from "@/lib/calendars/map";
import { ADMIN_CALENDAR_THEME } from "@/lib/calendars/theme";
import { AdminRuleSwitches } from "./admin-rule-switches";
import { useSpecialistCalendarRules } from "./use-specialist-calendar-rules";
import { useSpecialistStore, type Specialist } from "@/lib/specialists";

export function SpecialistAnnualCalendar({
  specialist,
  today,
  years,
  adminOverrides = false,
}: {
  specialist: Specialist;
  today?: string;
  years?: number[];
  adminOverrides?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const live =
    useSpecialistStore((state) => state.specialists.find((item) => item.id === specialist.id)) ?? specialist;
  const saveAnnual = useSpecialistStore((state) => state.saveAnnual);
  const { parameters, rules: allRules } = useSpecialistCalendarRules(live, adminOverrides);
  const rules = allRules.annual;
  const messages = useMemo(() => annualMessagesFor(live.role, t), [live.role, t]);

  return (
    <>
      <AnnualCalendar
        value={live.annualOff}
        rules={rules}
        locale={locale}
        dir={dirFor(locale)}
        messages={messages}
        theme={ADMIN_CALENDAR_THEME}
        today={today}
        years={years}
        onChange={(next) => saveAnnual(live.id, next)}
        onNotify={noticeToToast}
      />
      {adminOverrides && <AdminRuleSwitches specialist={live} kind="annual" parameters={parameters} />}
    </>
  );
}
