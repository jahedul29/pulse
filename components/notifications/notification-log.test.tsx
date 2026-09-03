import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { NotificationLog } from "./notification-log";

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

describe("NotificationLog", () => {
  it("opens a read-only detail drawer for a log row", async () => {
    render(<NotificationLog />);

    const row = await screen.findByRole("link", { name: "Layla Haddad EDR_SESSION_MISSED" });
    await userEvent.click(row);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Layla Haddad")).toBeInTheDocument();
    expect(within(dialog).getByText("EDR_SESSION_MISSED")).toBeInTheDocument();
  });
});
