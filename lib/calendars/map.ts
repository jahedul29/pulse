import { formatGuidelineDuration, formatMessage, messagesFor } from "@abapro-front-end/calendars";
import type { WeeklyRules, CalendarMessages, CalendarNotice, DeepPartial } from "@abapro-front-end/calendars";
import { toast } from "sonner";
import type { SpecialistType } from "@/lib/specialists";

export type Translate = ((key: string, values?: Record<string, string | number>) => string) & {
  raw: (key: string) => string;
};

export function weeklyMessagesFor(role: SpecialistType, t: Translate, rules?: WeeklyRules, locale = "en"): DeepPartial<CalendarMessages> {
  const duration = (mins: number) => formatGuidelineDuration(mins, locale);
  const raw = (key: string) => {
    const template = t.raw(key);
    if (!rules) return template;
    const minTravel = rules.travelTime ? Math.min(...rules.travelTime.options) : 0;
    const labels = messagesFor(locale).common;
    return formatMessage(template, {
      window: duration(rules.continuousWindowMins),
      minBlock: duration(rules.minBlockInPersonMins), minOnline: duration(rules.minBlockOnlineMins), minBreak: duration(rules.minBreakMins),
      travelMin: `${String(Math.floor(minTravel / 60)).padStart(2, "0")}${labels.hourShort}${String(minTravel % 60).padStart(2, "0")}${labels.minuteShort}`,
    });
  };
  const therapist = role === "therapist";
  const care = t(therapist ? "availability.care.therapy" : "availability.care.supervision");
  return {
    weekly: {
      title: t("availability.title", { role: t(`common.role.${role}`) }),
      controls: {
        availableDesc: t("availability.controls.availableInpersonDesc", { care }),
        unavailableDesc: t("availability.controls.unavailableDesc", { care }),
        onlineDesc: t("availability.controls.onlineDesc"),
      },
      ...(therapist ? { notice: { travelBody1: raw("availability.notice.travelBody1") } } : {}),
      ...(rules ? { saveBar: { daysOffMax: t("availability.daysOffMax", { max: rules.maxDaysOff }) } } : {}),
      guidelines: {
        title: t(therapist ? "guidelines.weeklyTitleTherapist" : "guidelines.weeklyTitleAnalyst"),
        intro: raw(therapist ? "guidelines.weekly.p1" : "guidelines.weekly.analystP1"),
        daysOff: raw(therapist ? "guidelines.weekly.therapistP3" : "guidelines.weekly.analystP3"),
        cardWindow: raw(therapist ? "guidelines.weekly.therapistCard1" : "guidelines.weekly.analystCard1"),
        ...(therapist
          ? {
              travel: raw("guidelines.weekly.therapistP2"),
              cardBlocksTravel: raw("guidelines.weekly.therapistCard2"),
              cardBookingTravel: raw("guidelines.weekly.therapistCard3"),
            }
          : {
              online: raw("guidelines.weekly.analystP2"),
              cardBlocksOnline: raw("guidelines.weekly.analystCard2"),
              cardBooking: raw("guidelines.weekly.analystCard3"),
            }),
      },
    },
  };
}

export function annualMessagesFor(role: SpecialistType, t: Translate): DeepPartial<CalendarMessages> {
  const analyst = role === "analyst";
  const guidelineKey = analyst ? "guidelines.annualAnalyst" : "guidelines.annual";
  return {
    annual: {
      title: `${t("annual.titleTop")}\n${t("annual.titleRole", { role: t(`annual.headerRole.${role}`) })}`,
      guidelines: {
        title: t(analyst ? "guidelines.annualTitleAnalyst" : "guidelines.annualTitleTherapist"),
        intro: t.raw(`${guidelineKey}.intro`),
        cardConsecutive: t.raw(`${guidelineKey}.cardConsecutive`),
        cardInterval: t.raw(`${guidelineKey}.cardInterval`),
        cardBookings: t.raw(`${guidelineKey}.cardBookings`),
        cardDiscuss: t.raw(`${guidelineKey}.cardDiscuss`),
      },
    },
  };
}

export function noticeToToast(notice: CalendarNotice): void {
  if (notice.kind === "error") {
    toast.error(notice.message, { style: { whiteSpace: "pre-line" } });
    return;
  }
  if (notice.kind === "info") {
    toast.info(notice.message);
    return;
  }
  toast.success(notice.message);
}
