import { act, fireEvent, render, screen } from "@testing-library/react";
import { defaultCalendarParameters, useCalendarParameters } from "@/lib/calendars/parameters";
import { useSpecialistStore } from "@/lib/specialists";
import { englishTranslator } from "./calendar-test-utils";
import { SpecialistAnnualCalendar } from "./specialist-annual-calendar";

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
});

describe("SpecialistAnnualCalendar", () => {
  it("uses the package look and the package legend copy", () => {
    const therapist = useSpecialistStore.getState().specialists.find((item) => item.role === "therapist")!;
    const { container } = render(<SpecialistAnnualCalendar specialist={therapist} today="2026-03-10" years={[2026]} />);
    const root = container.querySelector<HTMLElement>(".cal-root");
    expect(root?.style.getPropertyValue("--cal-sticky-top")).toBe("var(--topbar-height, 0px)");
    expect(root?.style.getPropertyValue("--cal-surface")).toBe("");
    expect(screen.getByText("Clients who need your services during these days will be able to find and book you")).toBeInTheDocument();
  });

  it("rechecks new annual edits against applied limits without deleting saved dates", () => {
    const therapist = useSpecialistStore.getState().specialists.find((item) => item.role === "therapist")!;
    const { container } = render(<SpecialistAnnualCalendar specialist={therapist} today="2026-03-10" years={[2026]} />);
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    const parameters = defaultCalendarParameters();
    parameters.therapist.annual.maxDaysOffPerYear = 1;
    act(() => useCalendarParameters.getState().apply(parameters));
    const select = (date: string) => { const day = container.querySelector(`[data-iso="${date}"]`)!; fireEvent.pointerDown(day, { button: 0, pointerType: "mouse" }); fireEvent.pointerUp(window); };
    select("2026-03-20");
    select("2026-03-21");
    expect(useSpecialistStore.getState().specialists.find((item) => item.id === therapist.id)?.annualOff).toEqual(["2026-03-20"]);
    parameters.therapist.annual.maxDaysOffPerYear = 2;
    act(() => useCalendarParameters.getState().apply(parameters));
    select("2026-03-21");
    expect(useSpecialistStore.getState().specialists.find((item) => item.id === therapist.id)?.annualOff).toEqual(["2026-03-20", "2026-03-21"]);
  });

  it("shows the two-line role title and persists a day off to the store", () => {
    const therapist = useSpecialistStore.getState().specialists.find((item) => item.role === "therapist");
    if (!therapist) throw new Error("no therapist seeded");
    const { container } = render(
      <SpecialistAnnualCalendar specialist={therapist} today="2026-03-10" years={[2026]} />,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("How to edit your annual calendar");
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Select your annual work calendar as a Therapist");
    const day = container.querySelector<HTMLElement>('[data-iso="2026-03-20"]');
    if (!day) throw new Error("no cell for 2026-03-20");
    fireEvent.pointerDown(day, { button: 0, pointerType: "mouse", pointerId: 1 });
    fireEvent.pointerUp(window);
    const updated = useSpecialistStore.getState().specialists.find((item) => item.id === therapist.id);
    expect(updated?.annualOff).toEqual(["2026-03-20"]);
  });
});
