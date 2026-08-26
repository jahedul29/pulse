import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { AlertRoutingEditor } from "./alert-routing";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages[ns]);
  return {
    useLocale: () => "en",
    useTranslations: (ns: string) => (key: string, vars?: Record<string, unknown>) => {
      const value = resolve(ns, key);
      let str = typeof value === "string" ? value : key;
      if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, String(v));
      return str;
    },
  };
});

describe("AlertRoutingEditor", () => {
  it("shows the urgency badge and opens a drawer with Save gated on dirty", async () => {
    render(<AlertRoutingEditor />);

    const row = await screen.findByRole("link", { name: "Session missed" });
    await userEvent.click(row);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Generates a trouble ticket")).toBeInTheDocument();

    const save = within(dialog).getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    const toggles = within(dialog).getAllByRole("switch");
    await userEvent.click(toggles[0]);
    expect(save).toBeEnabled();
  });
});
