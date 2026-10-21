"use client";

import { effectiveRules, WeeklyCalendar } from "@abapro-front-end/calendars/weekly";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { dirFor } from "@/i18n/routing";
import { noticeToToast, weeklyMessagesFor } from "@/lib/calendars/map";
import { ADMIN_CALENDAR_THEME } from "@/lib/calendars/theme";
import { AdminRuleSwitches } from "./admin-rule-switches";
import { useSpecialistCalendarRules } from "./use-specialist-calendar-rules";
import { useSpecialistStore, type Specialist } from "@/lib/specialists";

export function SpecialistWeeklyCalendar({ specialist, adminOverrides = false }: { specialist: Specialist; adminOverrides?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const live =
    useSpecialistStore((state) => state.specialists.find((item) => item.id === specialist.id)) ?? specialist;
  const saveWeekly = useSpecialistStore((state) => state.saveWeekly);
  const { parameters, rules: allRules } = useSpecialistCalendarRules(live, adminOverrides);
  const rules = allRules.weekly;
  const value = useMemo(() => {
    const chosenTravel = live.weekly.travelTimeMins;
    return chosenTravel !== null && rules.travelTime && !rules.travelTime.options.includes(chosenTravel)
      ? { ...live.weekly, travelTimeMins: null } : live.weekly;
  }, [live.weekly, rules.travelTime]);
  const messages = useMemo(() => weeklyMessagesFor(live.role, t, effectiveRules(rules, value), locale), [live.role, t, rules, value, locale]);

  return (
    <>
      <WeeklyCalendar
        value={value}
        rules={rules}
        baseRules={rules}
        locale={locale}
        dir={dirFor(locale)}
        messages={messages}
        theme={ADMIN_CALENDAR_THEME}
        onChange={(next) => saveWeekly(live.id, { weekly: next })}
        onNotify={noticeToToast}
      />
      {adminOverrides && <AdminRuleSwitches specialist={live} kind="weekly" parameters={parameters} />}
    </>
  );
}
