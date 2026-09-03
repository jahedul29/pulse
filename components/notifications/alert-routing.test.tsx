import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { AlertRoutingEditor } from "./alert-routing";

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

  it("blocks save with a recipient error when every recipient is off", async () => {
    render(<AlertRoutingEditor />);

    await userEvent.click(await screen.findByRole("link", { name: "Session missed" }));
    const dialog = await screen.findByRole("dialog");

    for (const sw of within(dialog).getAllByRole("switch")) {
      if (sw.getAttribute("aria-checked") === "true") await userEvent.click(sw);
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText("Select at least one recipient.")).toBeInTheDocument();
  });
});
