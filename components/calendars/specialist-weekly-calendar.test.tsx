import { act, fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { defaultCalendarParameters, useCalendarParameters } from "@/lib/calendars/parameters";
import { useSpecialistStore } from "@/lib/specialists";
import { englishTranslator } from "./calendar-test-utils";
import { SpecialistWeeklyCalendar } from "./specialist-weekly-calendar";

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => englishTranslator(),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() },
}));

const initialState = useSpecialistStore.getState();

beforeEach(() => {
  useSpecialistStore.setState(initialState, true);
  useCalendarParameters.setState({ parameters: defaultCalendarParameters(), specialistOverrides: {}, adminSwitches: {} });
  jest.clearAllMocks();
});

function analyst() {
  const specialist = useSpecialistStore.getState().specialists.find((item) => item.role === "analyst");
  if (!specialist) throw new Error("no analyst seeded");
  return specialist;
}

function cell(container: HTMLElement, day: number, slot: number): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-day="${day}"] [data-slot="${slot}"]`);
  if (!element) throw new Error(`no cell for day ${day} slot ${slot}`);
  return element;
}

function closeCoach() {
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
}

describe("SpecialistWeeklyCalendar", () => {
  it("keeps the calendar's own look and only moves the sticky header under the top bar", () => {
    const { container } = render(<SpecialistWeeklyCalendar specialist={analyst()} />);
    const root = container.querySelector<HTMLElement>(".cal-root");
    expect(root?.style.getPropertyValue("--cal-sticky-top")).toBe("var(--topbar-height, 0px)");
    expect(root?.style.getPropertyValue("--cal-accent")).toBe("");
    expect(root?.style.getPropertyValue("--cal-font")).toBe("");
    expect(screen.getByRole("dialog").style.getPropertyValue("--cal-sticky-top")).toBe("var(--topbar-height, 0px)");
    expect(document.documentElement.style.getPropertyValue("--cal-sticky-top")).toBe("");
  });

  it("shows the role in the title and persists an accepted paint to the store", () => {
    const specialist = analyst();
    const { container } = render(<SpecialistWeeklyCalendar specialist={specialist} />);
    closeCoach();
    expect(screen.getByText("Select your weekly business hours as a Analyst")).toBeInTheDocument();
    const target = cell(container, 0, 0);
    fireEvent.pointerDown(target, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(target, { pointerId: 1 });
    const updated = useSpecialistStore.getState().specialists.find((item) => item.id === specialist.id);
    expect(updated?.weekly.days[0].blocks).toEqual([{ start: 0, end: 1, kind: "unavailable" }]);
    expect(updated?.weekly.days[6].blocks).toEqual([{ start: 0, end: 1, kind: "unavailable" }]);
  });

  it("uses new minimum-block parameters when validating painted availability", () => {
    const specialist = analyst();
    useSpecialistStore.getState().saveWeekly(specialist.id, { weekly: { days: Array.from({ length: 7 }, () => ({ blocks: [{ start: 8, end: 72, kind: "unavailable" as const }] })), daysOff: [], travelTimeMins: null } });
    render(<SpecialistWeeklyCalendar specialist={specialist} />);
    closeCoach();
    const parameters = defaultCalendarParameters();
    parameters.analyst.weekly.minBlockInPersonMins = 180;
    parameters.analyst.weekly.continuousWindowMins = 180;
    act(() => useCalendarParameters.getState().apply(parameters));
    const target = document.querySelector('[data-day="0"] [data-slot="0"]')!;
    fireEvent.pointerDown(target, { button: 0, pointerId: 1 }); fireEvent.pointerUp(target, { pointerId: 1 });
    expect(toast.error).toHaveBeenCalled();
    expect(useSpecialistStore.getState().specialists.find((item) => item.id === specialist.id)?.weekly.days[0].blocks).toEqual([{ start: 8, end: 72, kind: "unavailable" }]);
    parameters.analyst.weekly.minBlockInPersonMins = 60;
    parameters.analyst.weekly.continuousWindowMins = 60;
    act(() => useCalendarParameters.getState().apply(parameters));
    const refreshedTarget = document.querySelector('[data-day="0"] [data-slot="0"]')!;
    fireEvent.pointerDown(refreshedTarget, { button: 0, pointerId: 1 }); fireEvent.pointerUp(refreshedTarget, { pointerId: 1 });
    expect(useSpecialistStore.getState().specialists.find((item) => item.id === specialist.id)?.weekly.days[0].blocks).toContainEqual({ start: 0, end: 1, kind: "unavailable" });
  });

  it("uses changed role parameters immediately for day-off limits", () => {
    render(<SpecialistWeeklyCalendar specialist={analyst()} />);
    closeCoach();
    const parameters = defaultCalendarParameters();
    parameters.analyst.weekly.maxDaysOff = 1;
    act(() => useCalendarParameters.getState().apply(parameters));
    fireEvent.click(screen.getByRole("button", { name: "Mon" }));
    fireEvent.click(screen.getByRole("button", { name: "Tue" }));
    expect(toast.error).toHaveBeenCalledWith("Maximum 1 day off allowed", { style: { whiteSpace: "pre-line" } });
    parameters.analyst.weekly.maxDaysOff = 3;
    act(() => useCalendarParameters.getState().apply(parameters));
    fireEvent.click(screen.getByRole("button", { name: "Tue" }));
    expect(useSpecialistStore.getState().specialists.find((item) => item.role === "analyst")?.weekly.daysOff).toEqual([0, 1]);
  });

  it("sends rule breaks to sonner instead of the inline strip", () => {
    render(<SpecialistWeeklyCalendar specialist={analyst()} />);
    closeCoach();
    for (const label of ["Mon", "Tue", "Wed"]) fireEvent.click(screen.getByRole("button", { name: label }));
    expect(toast.error).toHaveBeenCalledWith("Maximum 2 days off allowed", { style: { whiteSpace: "pre-line" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(useSpecialistStore.getState().specialists.find((item) => item.role === "analyst")?.weekly.daysOff).toEqual([0, 1]);
  });

  it("asks for travel time again when the saved choice is no longer offered", () => {
    const therapist = useSpecialistStore.getState().specialists.find((item) => item.role === "therapist")!;
    useSpecialistStore.getState().saveWeekly(therapist.id, { weekly: { ...therapist.weekly, travelTimeMins: 120 } });
    const { container } = render(<SpecialistWeeklyCalendar specialist={therapist} />);
    closeCoach();
    const target = cell(container, 0, 0);
    fireEvent.pointerDown(target, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(target, { pointerId: 1 });
    expect(screen.getByText(/Please select for the Therapist your preferred/)).toBeInTheDocument();
    const saved = useSpecialistStore.getState().specialists.find((item) => item.id === therapist.id);
    expect(saved?.weekly.travelTimeMins).toBe(120);
    expect(saved?.weekly.days[0].blocks).toEqual([]);
  });
});

