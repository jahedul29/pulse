import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import mockMessages from "../../messages/en.json";
import { useAuthStore } from "@/lib/auth/store";
import type { AdminUserRow, AdminUserStatus } from "@/lib/user-management/types";
import { UserManagement } from "./user-management";

function row(partial: Partial<AdminUserRow> & { name: string; status: AdminUserStatus }): AdminUserRow {
  return {
    id: partial.id ?? partial.name,
    staffId: "1",
    email: partial.email ?? `${partial.name.split(" ")[0].toLowerCase()}@abapro.health`,
    initials: "AB",
    lockedUntil: null,
    lastLogin: null,
    roleIds: [],
    roles: [],
    invitedBy: "",
    invitationId: partial.status === "pending" ? "inv-1" : null,
    preferredLanguage: "en",
    invitedAt: 0,
    activatedAt: null,
    lastStatusChangeAt: null,
    lastStatusChangeBy: null,
    registeredDevices: 0,
    lastInviteSentAt: null,
    effectiveStatus: partial.status,
    resendReady: false,
    ...partial,
  };
}

const mockRows: AdminUserRow[] = [
  row({ id: "u1", name: "Dana Okonkwo", status: "active", roles: [{ id: "3", name: "Administrator" }] }),
  row({ id: "u2", name: "Emma Novak", status: "active" }),
  row({ id: "u3", name: "Omar Haddad", status: "pending" }),
];

jest.mock("../../lib/rbac/queries", () => ({
  useRoles: () => ({ data: { data: [] }, isPending: false, isError: false }),
}));

jest.mock("../../lib/user-management/users-api", () => ({
  listAdminUsers: jest.fn(async () => ({ data: mockRows, meta: { total: mockRows.length } })),
  fetchPendingInvitationMap: jest.fn(async () => ({})),
  fetchAdminUserDetail: jest.fn(async () => ({})),
  updateUserStatus: jest.fn(),
  revokeInvitation: jest.fn(),
  sendInvitation: jest.fn(),
  assignUserRoles: jest.fn(),
  fetchInvitableStaff: jest.fn(async () => []),
}));

beforeAll(() => {
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Sam Al-Rashid", role: "Owner", token: "t", issuedAt: 0 },
  });
});

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((accumulator, part) => (accumulator as Record<string, unknown>)?.[part], messages[ns]);
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

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("UserManagement", () => {
  it("opens the invite dialog with a policy-driven expiry note", async () => {
    renderWithClient(<UserManagement />);
    await screen.findByText("Dana Okonkwo");

    await userEvent.click(screen.getByRole("button", { name: "Invite admin" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Staff member")).toBeInTheDocument();
    expect(await within(dialog).findByText(/expires in 3 days/i)).toBeInTheDocument();
  });

  it("shows Suspend + Deactivate for an active account", async () => {
    renderWithClient(<UserManagement />);
    const row = (await screen.findByText("Emma Novak")).closest("tr")!;

    await userEvent.click(within(row).getByRole("button", { name: "Account actions" }));
    expect(await screen.findByRole("menuitem", { name: "Suspend" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Deactivate" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Resend invite" })).not.toBeInTheDocument();
  });

  it("shows Resend (disabled, pending backend) + Revoke for a pending account", async () => {
    renderWithClient(<UserManagement />);
    const row = (await screen.findByText("Omar Haddad")).closest("tr")!;

    await userEvent.click(within(row).getByRole("button", { name: "Account actions" }));
    const resend = await screen.findByRole("menuitem", { name: "Resend invite" });
    expect(resend).toBeInTheDocument();
    expect(resend).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem", { name: "Revoke invite" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Deactivate" })).not.toBeInTheDocument();
  });

  it("does not render the MFA column (no mfa key in the API)", async () => {
    renderWithClient(<UserManagement />);
    await screen.findByText("Dana Okonkwo");
    expect(screen.queryByRole("columnheader", { name: "MFA" })).not.toBeInTheDocument();
  });
});
