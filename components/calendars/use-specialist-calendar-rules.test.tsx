import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { defaultCalendarParameters, useCalendarParameters } from "@/lib/calendars/parameters";
import { useSpecialistStore } from "@/lib/specialists";
import { useSpecialistCalendarRules } from "./use-specialist-calendar-rules";

jest.mock("../../lib/auth/permissions", () => ({ PERMISSIONS: { TECHNICAL_EDIT: "edit" }, useHasPermission: () => true }));

function Probe() {
  const specialist = useSpecialistStore.getState().specialists.find((person) => person.role === "therapist")!;
  const { rules } = useSpecialistCalendarRules(specialist, false);
  return <span>{rules.weekly.travelTime?.options.join(",")}</span>;
}

beforeEach(() => {
  const parameters = defaultCalendarParameters();
  parameters.therapist.weekly.travelTime = { required: true, options: [30] };
  useCalendarParameters.setState({ parameters, specialistOverrides: {}, adminSwitches: {} });
});

it("renders the default rules on the server so hydration matches", () => {
  expect(renderToString(<Probe />)).toContain("45,60,75,90,105");
});

it("uses the saved settings once running in the browser", () => {
  const { container } = render(<Probe />);
  expect(container).toHaveTextContent("30");
});
