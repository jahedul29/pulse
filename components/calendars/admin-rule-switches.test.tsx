import { act, fireEvent, render, screen } from "@testing-library/react";
import { englishTranslator } from "./calendar-test-utils";
import { defaultCalendarParameters, useCalendarParameters } from "@/lib/calendars/parameters";
import { useSpecialistStore } from "@/lib/specialists";
import { SpecialistAnnualCalendar } from "./specialist-annual-calendar";
import { SpecialistWeeklyCalendar } from "./specialist-weekly-calendar";

let mockCanOverride = true;
jest.mock("../../lib/auth/permissions", () => ({ PERMISSIONS: { TECHNICAL_EDIT: "edit" }, useHasPermission: () => mockCanOverride }));
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: (namespace?: string) => namespace ? (key: string, values?: Record<string, string | number>) => englishTranslator()(`${namespace}.${key}`, values) : englishTranslator() }));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));
const seed = useSpecialistStore.getState();
beforeEach(() => {
  mockCanOverride = true;
  localStorage.clear();
  useSpecialistStore.setState(seed, true);
  useCalendarParameters.setState({ parameters: defaultCalendarParameters(), specialistOverrides: {}, adminSwitches: {} });
});

function therapist() { return useSpecialistStore.getState().specialists.find((person) => person.role === "therapist")!; }
function openSwitches() {
  fireEvent.click(screen.getByRole("button", { name: /^Calendar rule switches/ }));
}

function closeSwitches() {
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
}

function select(container: HTMLElement, day: string) {
  const target = container.querySelector(`[data-iso="${day}"]`)!;
  fireEvent.pointerDown(target, { pointerType: "mouse", button: 0 }); fireEvent.pointerUp(window);
}

it("switches off enforcement without modifying specialist values, then restores the latest value", () => {
  const specialist = therapist();
  useCalendarParameters.getState().customize(specialist.id, specialist.role, { annual: { maxDaysOffPerYear: 1 } });
  const { container } = render(<SpecialistAnnualCalendar specialist={specialist} today="2026-01-01" years={[2026]} adminOverrides />);
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  select(container, "2026-03-20"); select(container, "2026-03-21");
  expect(useSpecialistStore.getState().specialists.find((person) => person.id === specialist.id)?.annualOff).toHaveLength(1);
  openSwitches();
  fireEvent.click(screen.getByRole("switch", { name: "Enforce Maximum annual days off" }));
  closeSwitches();
  expect(screen.getByRole("button", { name: /^Calendar rule switches, / })).toHaveTextContent("1");
  select(container, "2026-03-21");
  expect(useSpecialistStore.getState().specialists.find((person) => person.id === specialist.id)?.annualOff).toHaveLength(2);
  expect(useCalendarParameters.getState().specialistOverrides[specialist.id].annual?.maxDaysOffPerYear).toBe(1);
  act(() => useCalendarParameters.getState().customize(specialist.id, specialist.role, { annual: { maxDaysOffPerYear: 2 } }));
  openSwitches();
  fireEvent.click(screen.getByRole("switch", { name: "Enforce Maximum annual days off" }));
  closeSwitches();
  select(container, "2026-03-22");
  expect(useSpecialistStore.getState().specialists.find((person) => person.id === specialist.id)?.annualOff).toHaveLength(2);
  expect(container.querySelectorAll("input[type=number]")).toHaveLength(0);
});

it.each([false, true])("never applies admin switches outside the privileged editor (adminOverrides=%s)", (editor) => {
  const specialist = therapist();
  const parameters = defaultCalendarParameters(); parameters.therapist.annual.maxDaysOffPerYear = 1;
  useCalendarParameters.getState().apply(parameters);
  useCalendarParameters.getState().setRuleEnabled(specialist.id, "annual.maxDaysOffPerYear", false);
  mockCanOverride = !editor;
  const { container } = render(<SpecialistAnnualCalendar specialist={specialist} today="2026-01-01" years={[2026]} adminOverrides={editor} />);
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  expect(container.querySelector("[data-admin-rule-switches]")).toBeNull();
  select(container, "2026-03-20"); select(container, "2026-03-21");
  expect(useSpecialistStore.getState().specialists.find((person) => person.id === specialist.id)?.annualOff).toHaveLength(1);
});

it("opens the switches from the floating button and turns every bypassed rule back on", () => {
  const specialist = therapist();
  useCalendarParameters.getState().setRuleEnabled(specialist.id, "annual.maxConsecutiveDays", false);
  render(<SpecialistAnnualCalendar specialist={specialist} today="2026-01-01" years={[2026]} adminOverrides />);
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  expect(screen.queryByRole("switch", { name: "Enforce Maximum consecutive days off" })).not.toBeInTheDocument();
  const gear = screen.getByRole("button", { name: /^Calendar rule switches/ });
  expect(gear).toHaveAttribute("aria-expanded", "false");
  expect(gear).toHaveTextContent("1");
  openSwitches();
  const gap = screen.getByRole("switch", { name: "Enforce Minimum gap between days off" });
  expect(gap).toBeDisabled();
  expect(gap).not.toBeChecked();
  expect(screen.getByText("Off, set to 0")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Manage values" })).toHaveAttribute("href", `/calendar-settings?specialist=${specialist.id}`);
  fireEvent.click(screen.getByRole("button", { name: "Turn all rules on" }));
  expect(useCalendarParameters.getState().adminSwitches[specialist.id]).toEqual({});
  expect(screen.getByRole("switch", { name: "Enforce Maximum consecutive days off" })).toBeChecked();
  expect(screen.getByRole("button", { name: "Turn all rules on" })).toBeDisabled();
});

it("lets an admin bypass the weekly days-off limit while editing", () => {
  const analyst = useSpecialistStore.getState().specialists.find((person) => person.role === "analyst")!;
  const parameters = defaultCalendarParameters();
  parameters.analyst.weekly.maxDaysOff = 1;
  useCalendarParameters.getState().apply(parameters);
  render(<SpecialistWeeklyCalendar specialist={analyst} adminOverrides />);
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  fireEvent.click(screen.getByRole("button", { name: /^Calendar rule switches/ }));
  const daysOff = screen.getByRole("switch", { name: "Enforce Maximum weekly days off" });
  expect(daysOff).toBeChecked();
  fireEvent.click(daysOff);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  for (const day of ["Mon", "Tue", "Wed"]) fireEvent.click(screen.getByRole("button", { name: day }));
  expect(useSpecialistStore.getState().specialists.find((person) => person.id === analyst.id)?.weekly.daysOff).toEqual([0, 1, 2]);
  expect(useCalendarParameters.getState().parameters.analyst.weekly.maxDaysOff).toBe(1);
});

it("overrides every rule of the calendar at once and turns them back on", () => {
  const specialist = therapist();
  render(<SpecialistAnnualCalendar specialist={specialist} today="2026-01-01" years={[2026]} adminOverrides />);
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  openSwitches();
  const overrideAll = screen.getByRole("switch", { name: "Override all rules" });
  expect(overrideAll).not.toBeChecked();
  fireEvent.click(overrideAll);
  expect(useCalendarParameters.getState().adminSwitches[specialist.id]).toEqual({
    "annual.maxDaysOffPerYear": false,
    "annual.maxConsecutiveDays": false,
  });
  expect(screen.getByRole("switch", { name: "Enforce Maximum annual days off" })).not.toBeChecked();
  expect(screen.getByRole("switch", { name: "Enforce Maximum consecutive days off" })).not.toBeChecked();
  expect(overrideAll).toBeChecked();
  fireEvent.click(screen.getByRole("switch", { name: "Enforce Maximum annual days off" }));
  expect(overrideAll).not.toBeChecked();
  fireEvent.click(overrideAll);
  fireEvent.click(overrideAll);
  expect(useCalendarParameters.getState().adminSwitches[specialist.id]).toEqual({});
});
