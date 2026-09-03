import { render, screen } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import { LiveAlerts } from "./live-alerts";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], messages[ns]);
  return {
    useLocale: () => "en",
    useTranslations: (ns: string) => (key: string, vars?: Record<string, unknown>) => {
      const value = resolve(ns, key);
      let str = typeof value === "string" ? value : key;
      if (vars) for (const [varName, varValue] of Object.entries(vars)) str = str.replace(`{${varName}}`, String(varValue));
      return str;
    },
  };
});

describe("LiveAlerts", () => {
  it("renders firing alerts grouped by severity", async () => {
    render(<LiveAlerts />);

    expect(await screen.findByText("Session missed")).toBeInTheDocument();
    expect(screen.getByText("Payment failed")).toBeInTheDocument();
    expect(screen.getByText("Treatment plan updated")).toBeInTheDocument();

    const high = screen.getByRole("heading", { name: "High" });
    const medium = screen.getByRole("heading", { name: "Medium" });
    expect(high).toBeInTheDocument();
    expect(medium).toBeInTheDocument();
  });
});
