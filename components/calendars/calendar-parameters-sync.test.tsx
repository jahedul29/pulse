import { act, render } from "@testing-library/react";
import { CALENDAR_PARAMETERS_STORAGE_KEY, defaultCalendarParameters, useCalendarParameters } from "@/lib/calendars/parameters";
import { useAuthStore } from "@/lib/auth/store";
import { CalendarParametersSync } from "./calendar-parameters-sync";

function storeFromAnotherTab(maxDaysOff: number) {
  const parameters = defaultCalendarParameters();
  parameters.analyst.weekly.maxDaysOff = maxDaysOff;
  const value = JSON.stringify({ version: 2, state: { parameters, specialistOverrides: {}, adminSwitches: {} } });
  localStorage.setItem(CALENDAR_PARAMETERS_STORAGE_KEY, value);
  return value;
}

beforeEach(() => {
  localStorage.clear();
  useCalendarParameters.setState({ parameters: defaultCalendarParameters(), specialistOverrides: {}, adminSwitches: {} });
});

it("loads settings another tab saved", async () => {
  render(<CalendarParametersSync />);
  const value = storeFromAnotherTab(1);
  await act(async () => {
    window.dispatchEvent(new StorageEvent("storage", { key: CALENDAR_PARAMETERS_STORAGE_KEY, newValue: value }));
  });
  expect(useCalendarParameters.getState().parameters.analyst.weekly.maxDaysOff).toBe(1);
});

it("ignores changes to other storage keys", async () => {
  render(<CalendarParametersSync />);
  storeFromAnotherTab(1);
  await act(async () => {
    window.dispatchEvent(new StorageEvent("storage", { key: "abapro-auth", newValue: "{}" }));
  });
  expect(useCalendarParameters.getState().parameters.analyst.weekly.maxDaysOff).toBe(2);
});

it("clears the rule switches when the signed-in admin changes or signs out", () => {
  useAuthStore.setState({ session: { email: "first@abapro.ai", name: "First", role: "admin", token: "t", issuedAt: 0, adminId: "u-1", permissions: [] } });
  render(<CalendarParametersSync />);
  act(() => useCalendarParameters.getState().setRuleEnabled("sp-1", "annual.minGapWeeks", false));
  act(() => useAuthStore.setState({ session: { email: "first@abapro.ai", name: "First", role: "admin", token: "t2", issuedAt: 1, adminId: "u-1", permissions: [] } }));
  expect(useCalendarParameters.getState().adminSwitches["sp-1"]).toEqual({ "annual.minGapWeeks": false });
  act(() => useAuthStore.setState({ session: null }));
  expect(useCalendarParameters.getState().adminSwitches).toEqual({});
});

