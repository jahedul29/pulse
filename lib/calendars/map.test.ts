import { englishTranslator } from "@/components/calendars/calendar-test-utils";
import { WEEKLY_RULES } from "./presets";
import { toast } from "sonner";
import { annualMessagesFor, noticeToToast, weeklyMessagesFor, type Translate } from "./map";

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() },
}));

const translate: Translate = Object.assign(
  (key: string, values?: Record<string, string | number>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  { raw: (key: string) => key },
);

describe("weeklyMessagesFor", () => {
  it("formats parameterized guideline durations rather than stale default numbers", () => {
    const copy = weeklyMessagesFor("analyst", englishTranslator(), { ...WEEKLY_RULES.analyst, continuousWindowMins: 240, minBlockInPersonMins: 120, minBlockOnlineMins: 60, minBreakMins: 30 });
    expect(copy.weekly?.guidelines?.cardWindow).toContain("continuous window of at least 4 hours");
    expect(copy.weekly?.guidelines?.cardBlocksOnline).toContain("2 hours");
    expect(copy.weekly?.guidelines?.cardBlocksOnline).toContain("30 min");
  });

  it("words the days-off limit with the right plural and the analyst window as a duration", () => {
    const one = weeklyMessagesFor("analyst", englishTranslator(), { ...WEEKLY_RULES.analyst, maxDaysOff: 1, continuousWindowMins: 165 });
    expect(one.weekly?.saveBar?.daysOffMax).toBe("Maximum 1 day off allowed");
    expect(one.weekly?.guidelines?.cardWindow).toContain("continuous window of at least 2 hours 45 min");
    const two = weeklyMessagesFor("analyst", englishTranslator(), WEEKLY_RULES.analyst);
    expect(two.weekly?.saveBar?.daysOffMax).toBe("Maximum 2 days off allowed");
  });

  it("keeps the days-off rich tags and placeholder for the package to fill", () => {
    const copy = weeklyMessagesFor("therapist", englishTranslator(), WEEKLY_RULES.therapist);
    expect(copy.weekly?.guidelines?.daysOff).toContain("<hl>DAYS OFF</hl>");
    expect(copy.weekly?.guidelines?.daysOff).toContain("{maxDaysOff}");
    expect(weeklyMessagesFor("analyst", translate).weekly?.guidelines?.daysOff).toBe("guidelines.weekly.analystP3");
  });

  it("builds the therapist title, legend wording and guideline copy from the admin keys", () => {
    const messages = weeklyMessagesFor("therapist", translate);
    expect(messages.weekly?.title).toBe('availability.title:{"role":"common.role.therapist"}');
    expect(messages.weekly?.controls?.availableDesc).toBe(
      'availability.controls.availableInpersonDesc:{"care":"availability.care.therapy"}',
    );
    expect(messages.weekly?.notice?.travelBody1).toBe("availability.notice.travelBody1");
    expect(messages.weekly?.guidelines?.title).toBe("guidelines.weeklyTitleTherapist");
    expect(messages.weekly?.guidelines?.travel).toBe("guidelines.weekly.therapistP2");
    expect(messages.weekly?.guidelines?.cardBlocksTravel).toBe("guidelines.weekly.therapistCard2");
    expect(messages.weekly?.guidelines?.cardBookingTravel).toBe("guidelines.weekly.therapistCard3");
  });

  it("uses the analyst keys for analysts", () => {
    const messages = weeklyMessagesFor("analyst", translate);
    expect(messages.weekly?.controls?.unavailableDesc).toBe(
      'availability.controls.unavailableDesc:{"care":"availability.care.supervision"}',
    );
    expect(messages.weekly?.guidelines?.title).toBe("guidelines.weeklyTitleAnalyst");
    expect(messages.weekly?.guidelines?.online).toBe("guidelines.weekly.analystP2");
    expect(messages.weekly?.guidelines?.cardBlocksOnline).toBe("guidelines.weekly.analystCard2");
    expect(messages.weekly?.guidelines?.cardBooking).toBe("guidelines.weekly.analystCard3");
    expect(messages.weekly?.notice).toBeUndefined();
    expect(messages.weekly?.guidelines?.travel).toBeUndefined();
    expect(messages.weekly?.guidelines?.cardBlocksTravel).toBeUndefined();
    expect(messages.weekly?.guidelines?.cardBookingTravel).toBeUndefined();
  });
});

describe("annualMessagesFor", () => {
  it("joins the two title lines and picks the role guidelines title", () => {
    const messages = annualMessagesFor("analyst", translate);
    expect(messages.annual?.title).toBe('annual.titleTop\nannual.titleRole:{"role":"annual.headerRole.analyst"}');
    expect(messages.annual?.guidelines?.title).toBe("guidelines.annualTitleAnalyst");
    expect(messages.annual?.guidelines?.cardBookings).toBe("guidelines.annualAnalyst.cardBookings");
    expect(annualMessagesFor("therapist", translate).annual?.guidelines?.cardBookings).toBe("guidelines.annual.cardBookings");
    expect(messages.annual?.legend).toBeUndefined();
  });
});

describe("noticeToToast", () => {
  it("routes each notice kind to sonner and keeps line breaks on errors", () => {
    noticeToToast({ kind: "error", message: "first\nsecond" });
    expect(toast.error).toHaveBeenCalledWith("first\nsecond", { style: { whiteSpace: "pre-line" } });
    noticeToToast({ kind: "info", message: "info" });
    expect(toast.info).toHaveBeenCalledWith("info");
    noticeToToast({ kind: "success", message: "done" });
    expect(toast.success).toHaveBeenCalledWith("done");
  });
});
