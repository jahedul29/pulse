import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { useAuthStore } from "@/lib/auth/store";
import { UserManagement } from "./user-management";

beforeAll(() => {
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Sam Al-Rashid", role: "Owner", token: "t", issuedAt: 0 },
  });
});

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

describe("UserManagement", () => {
  it("opens the invite dialog with a policy-driven expiry note", async () => {
    render(<UserManagement />);
    await screen.findByText("Dana Okonkwo");

    await userEvent.click(screen.getByRole("button", { name: "Invite admin" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Staff member")).toBeInTheDocument();
    expect(await within(dialog).findByText(/expires in 3 days/i)).toBeInTheDocument();
  });

  it("shows Suspend + Deactivate for an active account", async () => {
    render(<UserManagement />);
    const row = (await screen.findByText("Emma Novak")).closest("tr")!;

    await userEvent.click(within(row).getByRole("button", { name: "Account actions" }));
    expect(await screen.findByRole("menuitem", { name: "Suspend" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Deactivate" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Resend invite" })).not.toBeInTheDocument();
  });

  it("shows Resend + Revoke for a pending account", async () => {
    render(<UserManagement />);
    const row = (await screen.findByText("Omar Haddad")).closest("tr")!;

    await userEvent.click(within(row).getByRole("button", { name: "Account actions" }));
    expect(await screen.findByRole("menuitem", { name: "Resend invite" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Revoke invite" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Deactivate" })).not.toBeInTheDocument();
  });
});
