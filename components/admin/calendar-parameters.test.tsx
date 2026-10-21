import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { englishTranslator } from "@/components/calendars/calendar-test-utils";
import { defaultCalendarParameters, useCalendarParameters } from "@/lib/calendars/parameters";
import { CalendarParametersEditor } from "./calendar-parameters";

jest.setTimeout(15000);

let mockCanEdit = true;
let mockCanViewSpecialists = true;
let mockSearch = new URLSearchParams();
jest.mock("next/navigation", () => ({ useSearchParams: () => mockSearch }));
jest.mock("../../lib/auth/permissions", () => ({
  PERMISSIONS: { TECHNICAL_EDIT: "edit", SPECIALISTS_VIEW: "view-specialists" },
  useHasPermission: (code: string) => (code === "view-specialists" ? mockCanViewSpecialists : mockCanEdit),
}));
jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string | number>) =>
    englishTranslator()(`${namespace}.${key}`, values),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
beforeEach(() => {
  mockCanEdit = true;
  mockCanViewSpecialists = true;
  mockSearch = new URLSearchParams();
  localStorage.clear();
  useCalendarParameters.setState({ parameters: defaultCalendarParameters(), specialistOverrides: {}, adminSwitches: {} });
  jest.clearAllMocks();
});

function panel() {
  return within(screen.getAllByRole("tabpanel")[0]);
}

function input(label: RegExp) {
  return panel().getByLabelText(label, { selector: "input" });
}

function picker(label: RegExp) {
  return panel().getByRole("combobox", { name: label });
}

async function pick(label: RegExp, option: string) {
  await userEvent.click(picker(label));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

async function replace(label: RegExp, value: string) {
  await userEvent.clear(input(label));
  await userEvent.type(input(label), value);
}

it("keeps drafts for both roles and applies all values atomically", async () => {
  render(<CalendarParametersEditor />);
  const apply = screen.getByRole("button", { name: "Apply parameters" });
  expect(apply).toBeDisabled();
  await replace(/^Maximum weekly days off/, "4");
  await userEvent.click(screen.getByRole("tab", { name: "Analyst" }));
  expect(panel().getByText("Analyst defaults")).toBeInTheDocument();
  await replace(/^Maximum consecutive days off/, "7");
  expect(useCalendarParameters.getState().parameters.analyst.annual.maxConsecutiveDays).toBe(28);
  await userEvent.click(apply);
  await waitFor(() => expect(useCalendarParameters.getState().parameters.therapist.weekly.maxDaysOff).toBe(4));
  expect(useCalendarParameters.getState().parameters.analyst.annual.maxConsecutiveDays).toBe(7);
  expect(toast.success).toHaveBeenCalledWith("Calendar parameters applied in this browser");
  expect(apply).toBeDisabled();
});

it("shows field errors without applying, then restores and discards drafts", async () => {
  render(<CalendarParametersEditor />);
  const restore = screen.getByRole("button", { name: "Restore default values" });
  expect(restore).toBeDisabled();
  await pick(/^Continuous availability window/, "30 min");
  await userEvent.click(screen.getByRole("button", { name: "Apply parameters" }));
  expect(await screen.findByText("The continuous window must be at least the minimum in-person block.")).toBeInTheDocument();
  expect(panel().getByText("Correct the highlighted parameters before applying.")).toBeInTheDocument();
  expect(useCalendarParameters.getState().parameters.therapist.weekly.continuousWindowMins).toBe(360);
  await userEvent.click(restore);
  expect(picker(/^Continuous availability window/)).toHaveTextContent("360 min");
  await replace(/^Minimum gap between days off/, "3");
  await userEvent.click(screen.getByRole("button", { name: "Discard edits" }));
  expect(input(/^Minimum gap between days off/)).toHaveValue(0);
});

it("offers durations only in 15-minute steps and applies the picked value", async () => {
  render(<CalendarParametersEditor />);
  await userEvent.click(picker(/^Minimum break/));
  const options = await screen.findAllByRole("option");
  const values = options.map((option) => Number(option.textContent?.replace(" min", "")));
  expect(values[0]).toBe(15);
  expect(values.at(-1)).toBe(1080);
  expect(values).toHaveLength(72);
  expect(values.every((minutes) => minutes % 15 === 0)).toBe(true);
  await userEvent.click(screen.getByRole("option", { name: "45 min" }));
  await userEvent.click(screen.getByRole("button", { name: "Apply parameters" }));
  await waitFor(() => expect(useCalendarParameters.getState().parameters.therapist.weekly.minBreakMins).toBe(45));
});

it("switches to the role that holds the first error", async () => {
  render(<CalendarParametersEditor />);
  await userEvent.click(screen.getByRole("tab", { name: "Analyst" }));
  await replace(/^Maximum weekly days off/, "9");
  await userEvent.click(screen.getByRole("tab", { name: "Therapist" }));
  await userEvent.click(screen.getByRole("button", { name: "Apply parameters" }));
  expect(await screen.findByText("Use 0 to 7 days.")).toBeInTheDocument();
  expect(panel().getByText("Analyst defaults")).toBeInTheDocument();
});

it("shows only the fields that apply to each role", async () => {
  render(<CalendarParametersEditor />);
  expect(panel().queryByRole("combobox", { name: /^Minimum online block/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("switch", { name: "Allow online-only availability" })).not.toBeInTheDocument();
  expect(screen.queryByRole("switch", { name: "Use the same schedule for workdays" })).not.toBeInTheDocument();
  expect(panel().getByText("The chosen travel time replaces this break.")).toBeInTheDocument();
  expect(panel().getByText("Travel time choices")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: "Analyst" }));
  expect(picker(/^Minimum online block/)).toHaveTextContent("30 min");
  expect(screen.queryByRole("heading", { name: "Travel time" })).not.toBeInTheDocument();
  expect(panel().queryByText("Travel time choices")).not.toBeInTheDocument();
  expect(panel().queryByText("The chosen travel time replaces this break.")).not.toBeInTheDocument();
});

it("picks travel time choices from the dropdown and needs at least one", async () => {
  render(<CalendarParametersEditor />);
  const trigger = screen.getByRole("button", { name: /^Travel time choices/ });
  expect(trigger).toHaveTextContent("+2");
  await userEvent.click(trigger);
  expect(await screen.findAllByRole("checkbox")).toHaveLength(16);
  for (const minutes of [45, 60, 75, 90, 105]) await userEvent.click(screen.getByRole("checkbox", { name: `${minutes} min` }));
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: "Apply parameters" }));
  expect(await screen.findByText("Pick at least one travel time.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /^Travel time choices/ }));
  await userEvent.click(await screen.findByRole("checkbox", { name: "120 min" }));
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: "Apply parameters" }));
  await waitFor(() => expect(useCalendarParameters.getState().parameters.therapist.weekly.travelTime?.options).toEqual([120]));
});

it("labels each value with its unit and marks required fields", () => {
  render(<CalendarParametersEditor />);
  expect(picker(/^Minimum in-person block/)).toHaveTextContent("60 min");
  expect(panel().getAllByText("days")).toHaveLength(3);
  expect(panel().getAllByText("weeks")).toHaveLength(1);
  expect(input(/^Maximum annual days off/).closest("div.flex.flex-col")?.textContent).toContain("*");
});

it("disables editing without Technical edit permission", () => {
  mockCanEdit = false;
  render(<CalendarParametersEditor />);
  expect(screen.getByRole("button", { name: "Apply parameters" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Restore default values" })).toBeDisabled();
  expect(input(/^Maximum weekly days off/)).toBeDisabled();
  expect(picker(/^Minimum break/)).toBeDisabled();
  expect(panel().getByText("You can view these settings. Technical edit permission is required to change them.")).toBeInTheDocument();
});

it("overrides one specialist field and can restore its inheritance", async () => {
  render(<CalendarParametersEditor />);
  await userEvent.click(screen.getByRole("tab", { name: "Specialist values" }));
  const save = screen.getByRole("button", { name: "Save specialist values" });
  expect(save).toBeDisabled();
  expect(input(/^Maximum annual days off$/)).toBeDisabled();
  await userEvent.click(screen.getByRole("switch", { name: "Override Maximum annual days off" }));
  await replace(/^Maximum annual days off$/, "75");
  await userEvent.click(save);
  await waitFor(() => expect(useCalendarParameters.getState().specialistOverrides["sp-1"].annual?.maxDaysOffPerYear).toBe(75));
  expect(toast.success).toHaveBeenCalledWith("Specialist parameter values saved");
  await userEvent.click(screen.getByRole("switch", { name: "Override Maximum annual days off" }));
  expect(input(/^Maximum annual days off$/)).toHaveValue(56);
  await userEvent.click(screen.getByRole("button", { name: "Save specialist values" }));
  await waitFor(() =>
    expect(Object.hasOwn(useCalendarParameters.getState().specialistOverrides["sp-1"].annual ?? {}, "maxDaysOffPerYear")).toBe(false),
  );
});

it("overrides a specialist duration with the 15-minute picker", async () => {
  render(<CalendarParametersEditor />);
  await userEvent.click(screen.getByRole("tab", { name: "Specialist values" }));
  expect(picker(/^Minimum break$/)).toBeDisabled();
  await userEvent.click(screen.getByRole("switch", { name: "Override Minimum break" }));
  await pick(/^Minimum break$/, "30 min");
  await userEvent.click(screen.getByRole("button", { name: "Save specialist values" }));
  await waitFor(() => expect(useCalendarParameters.getState().specialistOverrides["sp-1"].weekly?.minBreakMins).toBe(30));
});

it("overrides a therapist's travel time choices and shows none for analysts", async () => {
  render(<CalendarParametersEditor />);
  await userEvent.click(screen.getByRole("tab", { name: "Specialist values" }));
  expect(panel().getByText("Global default: 45, 60, 75, 90, 105 min")).toBeInTheDocument();
  const trigger = screen.getByRole("button", { name: /^Travel time choices/ });
  expect(trigger).toHaveAttribute("aria-disabled", "true");
  await userEvent.click(screen.getByRole("switch", { name: "Override Travel time choices" }));
  expect(trigger).not.toHaveAttribute("aria-disabled", "true");
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole("checkbox", { name: "105 min" }));
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: "Save specialist values" }));
  await waitFor(() =>
    expect(useCalendarParameters.getState().specialistOverrides["sp-1"].weekly?.travelTime).toEqual({ required: true, options: [45, 60, 75, 90] }),
  );
});

it("inherits every global value again in one step", async () => {
  useCalendarParameters.getState().customize("sp-1", "therapist", { weekly: { maxDaysOff: 3 }, annual: { minGapWeeks: 2 } });
  render(<CalendarParametersEditor />);
  await userEvent.click(screen.getByRole("tab", { name: "Specialist values" }));
  expect(input(/^Maximum weekly days off$/)).toHaveValue(3);
  await userEvent.click(screen.getByRole("button", { name: "Inherit all global values" }));
  expect(input(/^Maximum weekly days off$/)).toHaveValue(2);
  expect(input(/^Minimum gap between days off$/)).toHaveValue(0);
  await userEvent.click(screen.getByRole("button", { name: "Save specialist values" }));
  await waitFor(() => expect(useCalendarParameters.getState().specialistOverrides["sp-1"]).toEqual({ weekly: {}, annual: {} }));
});

it("opens a specialist's values from the ?specialist deep link", () => {
  mockSearch = new URLSearchParams("specialist=sp-4");
  render(<CalendarParametersEditor />);
  expect(screen.getByRole("tab", { name: "Specialist values" })).toHaveAttribute("aria-selected", "true");
  expect(panel().getByText("Priya Nair (Analyst)")).toBeInTheDocument();
  expect(panel().getByText("Global default: 30 min")).toBeInTheDocument();
});

it("restores and discards only the role on screen and marks roles with unsaved changes", async () => {
  render(<CalendarParametersEditor />);
  await userEvent.click(screen.getByRole("tab", { name: "Analyst" }));
  await replace(/^Maximum consecutive days off/, "7");
  expect(screen.getByRole("tab", { name: /Analyst.*Unsaved changes/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: /^Therapist/ }));
  await replace(/^Minimum gap between days off/, "3");
  await userEvent.click(screen.getByRole("button", { name: "Restore default values" }));
  expect(input(/^Minimum gap between days off/)).toHaveValue(0);
  await replace(/^Minimum gap between days off/, "5");
  await userEvent.click(screen.getByRole("button", { name: "Discard edits" }));
  expect(input(/^Minimum gap between days off/)).toHaveValue(0);
  expect(screen.getByRole("button", { name: "Discard edits" })).toBeDisabled();
  await userEvent.click(screen.getByRole("tab", { name: /^Analyst/ }));
  expect(input(/^Maximum consecutive days off/)).toHaveValue(7);
  await userEvent.click(screen.getByRole("button", { name: "Apply parameters" }));
  await waitFor(() => expect(useCalendarParameters.getState().parameters.analyst.annual.maxConsecutiveDays).toBe(7));
  expect(useCalendarParameters.getState().parameters.therapist.annual.minGapWeeks).toBe(0);
});

it("keeps unsaved global edits when switching to Specialist values and back", async () => {
  render(<CalendarParametersEditor />);
  await replace(/^Maximum weekly days off/, "4");
  await userEvent.click(screen.getByRole("tab", { name: "Specialist values" }));
  await userEvent.click(screen.getByRole("tab", { name: "Global defaults" }));
  expect(input(/^Maximum weekly days off/)).toHaveValue(4);
  expect(screen.getByRole("button", { name: "Apply parameters" })).toBeEnabled();
});

it("asks before switching specialist with unsaved values", async () => {
  render(<CalendarParametersEditor />);
  await userEvent.click(screen.getByRole("tab", { name: "Specialist values" }));
  await userEvent.click(screen.getByRole("switch", { name: "Override Maximum annual days off" }));
  const specialistPicker = () => panel().getByRole("button", { name: /^Specialist/ });
  expect(specialistPicker()).toHaveTextContent("Alex Rivera (Therapist)");
  await userEvent.click(specialistPicker());
  await userEvent.click(await screen.findByText("Priya Nair (Analyst)"));
  const dialog = await screen.findByRole("alertdialog");
  expect(within(dialog).getByText("Discard unsaved changes?")).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(specialistPicker()).toHaveTextContent("Alex Rivera (Therapist)");
  await userEvent.click(specialistPicker());
  await userEvent.click(await screen.findByText("Priya Nair (Analyst)"));
  await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));
  await waitFor(() => expect(specialistPicker()).toHaveTextContent("Priya Nair (Analyst)"));
});

it("hides specialist values without permission to view specialists", () => {
  mockCanViewSpecialists = false;
  mockSearch = new URLSearchParams("specialist=sp-4");
  render(<CalendarParametersEditor />);
  expect(screen.queryByRole("tab", { name: "Specialist values" })).not.toBeInTheDocument();
  expect(panel().getByText("Therapist defaults")).toBeInTheDocument();
});

it("links each role tab to the panel holding that role's fields", async () => {
  render(<CalendarParametersEditor />);
  const therapist = screen.getByRole("tab", { name: /^Therapist/ });
  const panelId = therapist.getAttribute("aria-controls");
  expect(panelId).toBeTruthy();
  const rolePanel = document.getElementById(panelId ?? "");
  expect(rolePanel).toHaveAttribute("role", "tabpanel");
  expect(within(rolePanel as HTMLElement).getByText("Weekly calendar")).toBeInTheDocument();
});

it("marks the travel dropdown invalid and links its error", async () => {
  render(<CalendarParametersEditor />);
  const trigger = screen.getByRole("button", { name: /^Travel time choices/ });
  await userEvent.click(trigger);
  for (const minutes of [45, 60, 75, 90, 105]) await userEvent.click(screen.getByRole("checkbox", { name: `${minutes} min` }));
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: "Apply parameters" }));
  await screen.findByText("Pick at least one travel time.");
  expect(trigger).toHaveAttribute("aria-invalid", "true");
  expect(document.getElementById(trigger.getAttribute("aria-describedby") ?? "")).toHaveTextContent("Pick at least one travel time.");
});

it("does nothing when Enter is pressed without changes", async () => {
  render(<CalendarParametersEditor />);
  await userEvent.click(input(/^Maximum weekly days off/));
  await userEvent.keyboard("{Enter}");
  expect(toast.success).not.toHaveBeenCalled();
});

it("asks before applying defaults that a specialist's saved values no longer fit", async () => {
  useCalendarParameters.getState().customize("sp-1", "therapist", { weekly: { continuousWindowMins: 120 } });
  render(<CalendarParametersEditor />);
  await pick(/^Minimum in-person block/, "180 min");
  await pick(/^Continuous availability window/, "480 min");
  await userEvent.click(screen.getByRole("button", { name: "Apply parameters" }));
  const dialog = await screen.findByRole("alertdialog");
  expect(within(dialog).getByText(/Alex Rivera/)).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole("button", { name: "Review first" }));
  expect(useCalendarParameters.getState().parameters.therapist.weekly.minBlockInPersonMins).toBe(60);
  await userEvent.click(screen.getByRole("button", { name: "Apply parameters" }));
  await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Apply anyway" }));
  await waitFor(() => expect(useCalendarParameters.getState().parameters.therapist.weekly.minBlockInPersonMins).toBe(180));
});

it("explains why a specialist save no longer fits the global defaults", async () => {
  render(<CalendarParametersEditor />);
  await userEvent.click(screen.getByRole("tab", { name: "Specialist values" }));
  await userEvent.click(screen.getByRole("switch", { name: "Override Continuous availability window" }));
  await pick(/^Continuous availability window$/, "120 min");
  const raised = defaultCalendarParameters();
  raised.therapist.weekly.minBlockInPersonMins = 180;
  raised.therapist.weekly.continuousWindowMins = 480;
  useCalendarParameters.setState({ parameters: raised });
  await userEvent.click(screen.getByRole("button", { name: "Save specialist values" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      "These values don’t fit the current global defaults: The continuous window must be at least the minimum in-person block.",
    ),
  );
  expect(useCalendarParameters.getState().specialistOverrides["sp-1"]).toBeUndefined();
});

it("says when the linked specialist doesn't exist", () => {
  mockSearch = new URLSearchParams("specialist=sp-404");
  render(<CalendarParametersEditor />);
  expect(screen.getByText("Specialist not found. Pick one from the list.")).toBeInTheDocument();
});

