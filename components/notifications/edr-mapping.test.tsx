import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { EdrMapping } from "./edr-mapping";

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

describe("EdrMapping", () => {
  it("lists events and opens a role/template drawer with Save gated on dirty", async () => {
    render(<EdrMapping />);

    const row = await screen.findByRole("link", { name: "Session missed" });
    await userEvent.click(row);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Session missed")).toBeInTheDocument();

    const save = within(dialog).getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    const toggles = within(dialog).getAllByRole("switch");
    await userEvent.click(toggles[0]);
    expect(save).toBeEnabled();
  });
});
