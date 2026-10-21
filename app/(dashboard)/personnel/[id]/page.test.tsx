import { Suspense } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { englishTranslator } from "@/components/calendars/calendar-test-utils";
import { defaultCalendarParameters, useCalendarParameters } from "@/lib/calendars/parameters";
import SpecialistAvailabilityPage from "./page";

jest.setTimeout(15000);

let mockCanEdit = true;
jest.mock("../../../../lib/auth/permissions", () => ({ PERMISSIONS: { TECHNICAL_EDIT: "edit" }, useHasPermission: () => mockCanEdit }));
jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace?: string) =>
    namespace
      ? (key: string, values?: Record<string, string | number>) => englishTranslator()(`${namespace}.${key}`, values)
      : englishTranslator(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));

beforeEach(() => {
  mockCanEdit = true;
  useCalendarParameters.setState({ parameters: defaultCalendarParameters(), specialistOverrides: {}, adminSwitches: {} });
});

async function renderPage() {
  await act(async () => {
    render(
      <Suspense>
        <SpecialistAvailabilityPage params={Promise.resolve({ id: "sp-1" })} />
      </Suspense>,
    );
  });
  await userEvent.click(await screen.findByRole("button", { name: "Got it" }));
}

it("shows the weekly and annual calendars as tabs with the rule switches button for editors", async () => {
  await renderPage();
  expect(screen.getByRole("tab", { name: "Weekly calendar" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("button", { name: /^Calendar rule switches/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: "Annual calendar" }));
  const gotIt = screen.queryByRole("button", { name: "Got it" });
  if (gotIt) await userEvent.click(gotIt);
  expect(screen.getByRole("tab", { name: "Annual calendar" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("button", { name: /^Calendar rule switches/ })).toBeInTheDocument();
});

it("hides the rule switches button without Technical edit permission", async () => {
  mockCanEdit = false;
  await renderPage();
  expect(screen.getByRole("tab", { name: "Weekly calendar" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Calendar rule switches/ })).not.toBeInTheDocument();
});
