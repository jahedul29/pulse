import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import mockMessages from "../../messages/en.json";
import { useAuthStore } from "@/lib/auth/store";
import { toast } from "sonner";
import {
  fetchAdminUserDetail,
  fetchInvitableStaff,
  sendInvitation,
  updateUserStatus,
} from "@/lib/user-management/users-api";
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
  row({ id: "u4", name: "Lina Waitfor", status: "pending", invitableAgainAt: 9_999_999_999_999 }),
];

const pendingInvites: AdminUserRow[] = [
  row({
    id: "inv-9",
    name: "Pending Person",
    status: "pending",
    roleIds: ["3"],
    invitedBy: "u2",
    invitedByName: "Emma Novak",
    invitedByEmail: "emma@abapro.health",
  }),
];

let mockSearch = new URLSearchParams();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearch,
}));

beforeEach(() => {
  mockSearch = new URLSearchParams();
  mockReplace.mockReset();
});

const mockSyncPermissions = jest.fn(async () => ({ roles: [], direct_permissions: [] }));
const mockDirectPermission = {
  id: 7,
  module_id: 4,
  module: { id: 4, code: "CLIENTS", name: "Clients" },
  resource: "clients",
  action: "VIEW",
  code: "CLIENTS.clients.VIEW",
  description: "View Clients module.",
  is_sensitive: false,
  granted_by_admin_id: "u1",
  granted_at: "2026-09-21 12:00:00",
  expires_at: null,
};

jest.mock("../../lib/rbac/queries", () => ({
  useRoles: () => ({ data: { data: [{ id: 3, name: "Administrator" }] }, isPending: false, isError: false }),
  useAdminAccess: (userId: string | null) => ({
    data: userId
      ? {
          roles: [{ id: 3, name: "Administrator", is_system: true, granted_at: "2026-10-11 12:00:00" }],
          permissions: [mockDirectPermission],
          effectivePermissionCount: 2,
        }
      : undefined,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePermissions: () => ({ data: [mockDirectPermission], isError: false, refetch: jest.fn() }),
  useAttachUserRoles: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDetachUserRoles: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSyncUserPermissions: () => ({ mutateAsync: mockSyncPermissions, isPending: false }),
}));

jest.mock("../../lib/user-management/users-api", () => ({
  listAdminUsers: jest.fn(async () => ({ data: mockRows, meta: { total: mockRows.length } })),
  listAllAdminUsers: jest.fn(async () => mockRows),
  fetchPendingInvitations: jest.fn(async () => pendingInvites),
  fetchInvitation: jest.fn(async (id: string) => ({
    ...pendingInvites[0],
    id,
    invitationExpiresAt: Date.parse("2026-10-01T00:00:00.000Z"),
  })),
  fetchAdminUserDetail: jest.fn(async () => ({})),
  updateUserStatus: jest.fn(),
  revokeInvitation: jest.fn(),
  sendInvitation: jest.fn(),
  assignUserRoles: jest.fn(),
  fetchInvitableStaff: jest.fn(async () => []),
  fetchUserDevices: jest.fn(async () => []),
  resendInvitation: jest.fn(),
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
    useTranslations: (ns: string) => {
      const translate = (key: string, vars?: Record<string, unknown>) => {
        const value = resolve(ns, key);
        let str = typeof value === "string" ? value : key;
        if (vars) {
          for (const [varName, varValue] of Object.entries(vars)) {
            if (typeof varValue !== "function") str = str.replace(`{${varName}}`, String(varValue));
          }
        }
        return str;
      };
      translate.rich = (key: string, vars: Record<string, unknown> = {}) => {
        const react = jest.requireActual("react");
        return translate(key, vars)
          .split(/(<link>.*?<\/link>)/)
          .map((part: string, index: number) => {
            const match = part.match(/^<link>(.*)<\/link>$/);
            const link = vars.link as ((chunks: string) => unknown) | undefined;
            return react.createElement(react.Fragment, { key: index }, match && link ? link(match[1]) : part);
          });
      };
      return translate;
    },
  };
});

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("UserManagement", () => {
  it("sends an invite and reports the real link expiry from the response", async () => {
    (fetchInvitableStaff as jest.Mock).mockResolvedValueOnce([
      {
        id: "41",
        name: "Grace Kim",
        email: "grace@abapro.health",
        initials: "GK",
        title: "",
        department: "",
        terminated: false,
      },
    ]);
    (sendInvitation as jest.Mock).mockResolvedValueOnce({
      id: "inv-9",
      staff_id: 41,
      status: "PENDING",
      expires_at: "2026-10-22T12:00:00.000000Z",
    });
    const success = jest.spyOn(toast, "success").mockImplementation(() => "toast");
    renderWithClient(<UserManagement />);
    await screen.findByText("Dana Okonkwo");

    await userEvent.click(screen.getByRole("button", { name: "Invite user" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByText(/expires in/i)).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /Select a staff member/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Grace Kim/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Send invite" }));

    expect(sendInvitation).toHaveBeenCalledWith("41", []);
    expect(success).toHaveBeenCalledWith(
      expect.stringMatching(/^Invitation sent to grace@abapro\.health\. The link expires 22-Oct-2026 \d{2}:\d{2}\.$/),
    );
    success.mockRestore();
  });

  it("shows Suspend + Deactivate icon buttons for an active account, no menu", async () => {
    renderWithClient(<UserManagement />);
    const row = (await screen.findByText("Emma Novak")).closest("tr")!;

    expect(within(row).getByRole("group", { name: "Account actions" })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Suspend" })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Resend invite" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("suspends straight from the row icon button and shows the label as a tooltip", async () => {
    renderWithClient(<UserManagement />);
    const row = (await screen.findByText("Emma Novak")).closest("tr")!;
    const suspend = within(row).getByRole("button", { name: "Suspend" });

    await userEvent.hover(suspend);
    expect(await screen.findByText("Suspend", {}, { timeout: 2000 })).toBeInTheDocument();

    await userEvent.click(suspend);
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByText("Suspend account?")).toBeInTheDocument();
    await userEvent.type(within(confirm).getByLabelText("Reason (optional)"), "Leave of absence");
    await userEvent.click(within(confirm).getByRole("button", { name: "Suspend" }));
    expect(updateUserStatus).toHaveBeenCalledWith("u2", "suspended", "Leave of absence");
  });

  it("splits account and invitation actions by their own backend permissions", async () => {
    const previous = useAuthStore.getState().session;
    useAuthStore.setState({
      session: {
        email: "owner@abapro.health",
        name: "Sam Al-Rashid",
        role: "admin",
        token: "t",
        issuedAt: 0,
        permissions: ["USER_MANAGEMENT.user_management.EDIT"],
      },
    });
    renderWithClient(<UserManagement />);

    const active = (await screen.findByText("Emma Novak")).closest("tr")!;
    expect(within(active).getByRole("button", { name: "Suspend" })).toBeInTheDocument();
    const pending = screen.getByText("Omar Haddad").closest("tr")!;
    expect(within(pending).queryByRole("button", { name: "Resend invite" })).not.toBeInTheDocument();
    expect(within(pending).queryByRole("button", { name: "Revoke invite" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite user" })).toHaveAttribute("aria-disabled", "true");
    useAuthStore.setState({ session: previous });
  });

  it("shows Resend (enabled) + Revoke for a pending account", async () => {
    renderWithClient(<UserManagement />);
    const row = (await screen.findByText("Omar Haddad")).closest("tr")!;

    const resend = within(row).getByRole("button", { name: "Resend invite" });
    expect(resend).not.toHaveAttribute("aria-disabled", "true");
    expect(within(row).getByRole("button", { name: "Revoke invite" })).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
  });

  it("disables Resend while the invitable_again_at cooldown is active", async () => {
    renderWithClient(<UserManagement />);
    const row = (await screen.findByText("Lina Waitfor")).closest("tr")!;

    const resend = within(row).getByRole("button", { name: "Resend invite" });
    expect(resend).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(resend);
    expect(await screen.findByText("Resend invite", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("shows status actions in the account detail drawer footer", async () => {
    renderWithClient(<UserManagement />);
    await userEvent.click(await screen.findByRole("link", { name: "Dana Okonkwo" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByRole("button", { name: "Suspend" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
  });

  it("lists pending invitations in the Pending tab", async () => {
    renderWithClient(<UserManagement />);
    await screen.findByText("Dana Okonkwo");

    await userEvent.click(screen.getByRole("tab", { name: /Pending invitations/i }));
    expect(await screen.findByText("Pending Person")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Invited by" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Last sent" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Last login" })).not.toBeInTheDocument();
  });

  it("opens the invitation detail drawer on row click with invitation fields", async () => {
    renderWithClient(<UserManagement />);
    await screen.findByText("Dana Okonkwo");

    await userEvent.click(screen.getByRole("tab", { name: /Pending invitations/i }));
    await userEvent.click(await screen.findByRole("link", { name: "Pending Person" }));
    expect(await screen.findByText("Invitable again")).toBeInTheDocument();
    expect(screen.getAllByText("Last sent").length).toBeGreaterThan(0);
  });

  it("does not render the MFA column (no mfa key in the API)", async () => {
    renderWithClient(<UserManagement />);
    await screen.findByText("Dana Okonkwo");
    expect(screen.queryByRole("columnheader", { name: "MFA" })).not.toBeInTheDocument();
  });

  it("opens the account drawer from an ?open= deep link for an account outside the current page", async () => {
    mockSearch = new URLSearchParams("open=u-ext");
    (fetchAdminUserDetail as jest.Mock).mockImplementation(async (id: string) =>
      id === "u-ext"
        ? {
            id: "u-ext",
            staff_id: 9,
            email: "zara.linked@abapro.health",
            status: "ACTIVE",
            staff: { id: 9, first_name: "Zara", last_name: "Linked" },
            invited_by_admin_id: "u2",
            roles: [],
            direct_permissions: [
              {
                id: 7,
                module_id: 4,
                module: { id: 4, code: "CLIENTS", name: "Clients" },
                resource: "clients",
                action: "VIEW",
                code: "CLIENTS.clients.VIEW",
                description: "View Clients module.",
                is_sensitive: false,
                granted_by_admin_id: "u1",
                granted_at: "2026-09-21 18:33:32",
                expires_at: null,
              },
            ],
            effective_permissions: ["DASHBOARD.dashboard.VIEW", "CLIENTS.clients.VIEW"],
          }
        : {},
    );
    renderWithClient(<UserManagement />);

    const dialog = await screen.findByRole("dialog", { name: "Zara Linked" });
    expect(within(dialog).queryByRole("button", { name: "Previous record" })).not.toBeInTheDocument();
    expect(await within(dialog).findByRole("link", { name: "Emma Novak" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u2",
    );
    expect(within(dialog).getByText("Roles (1)")).toBeInTheDocument();
    expect(within(dialog).getByText("Direct permissions (1)")).toBeInTheDocument();
    expect(within(dialog).getByText("View Clients module.")).toBeInTheDocument();
    expect(within(dialog).getByText("CLIENTS.clients.VIEW")).toBeInTheDocument();
    expect(within(dialog).getAllByText("No expiry")).toHaveLength(2);
    expect(await within(dialog).findByRole("link", { name: "Dana Okonkwo" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u1",
    );
    expect(within(dialog).getByText(/2 effective permissions in total/)).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(mockReplace).toHaveBeenCalledWith("/admin/user-management");
    (fetchAdminUserDetail as jest.Mock).mockImplementation(async () => ({}));
  });

  it("opens the deep-linked account with the record pager when it is on the current page", async () => {
    mockSearch = new URLSearchParams("open=u2");
    renderWithClient(<UserManagement />);

    const dialog = await screen.findByRole("dialog", { name: "Emma Novak" });
    expect(within(dialog).getByText("2 of 4")).toBeInTheDocument();
  });

  it("opens the Pending tab and the invitation drawer from an ?invite= deep link", async () => {
    mockSearch = new URLSearchParams("invite=inv-9");
    renderWithClient(<UserManagement />);

    const dialog = await screen.findByRole("dialog", { name: "Pending Person" });
    expect(within(dialog).getByRole("link", { name: "Open user account Emma Novak" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u2",
    );
    expect(within(dialog).getByRole("link", { name: "Administrator" })).toHaveAttribute("href", "/admin/roles/3");
    expect(screen.getByRole("tab", { name: /Pending invitations/, hidden: true })).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{Escape}");
    expect(mockReplace).toHaveBeenCalledWith("/admin/user-management");
  });

  it("lets an admin with edit rights manage roles and direct permissions from the drawer", async () => {
    mockSearch = new URLSearchParams("open=u2");
    mockSyncPermissions.mockClear();
    (fetchAdminUserDetail as jest.Mock).mockImplementation(async (id: string) =>
      id === "u2"
        ? {
            id: "u2",
            staff_id: 2,
            email: "emma@abapro.health",
            status: "ACTIVE",
            staff: { id: 2, first_name: "Emma", last_name: "Novak" },
            roles: [],
          }
        : {},
    );
    renderWithClient(<UserManagement />);

    const dialog = await screen.findByRole("dialog", { name: "Emma Novak" });
    expect(within(dialog).getByRole("button", { name: "Grant a role" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add permission" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Revoke Administrator" })).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Remove View Clients module." }));
    const confirm = await screen.findByRole("alertdialog");
    await userEvent.click(within(confirm).getByRole("button", { name: "Remove" }));
    expect(mockSyncPermissions).toHaveBeenCalledWith({ userId: "u2", permissionIds: [] });
    (fetchAdminUserDetail as jest.Mock).mockImplementation(async () => ({}));
  });

  it("disables access edits on your own account, with the reason available", async () => {
    mockSearch = new URLSearchParams("open=u-self");
    (fetchAdminUserDetail as jest.Mock).mockImplementation(async (id: string) =>
      id === "u-self"
        ? {
            id: "u-self",
            staff_id: 1,
            email: "owner@abapro.health",
            status: "ACTIVE",
            staff: { id: 1, first_name: "Sam", last_name: "Al-Rashid" },
            roles: [],
          }
        : {},
    );
    renderWithClient(<UserManagement />);

    const dialog = await screen.findByRole("dialog", { name: "Sam Al-Rashid" });
    expect(within(dialog).getByRole("button", { name: "Add permission" })).toHaveAttribute("aria-disabled", "true");
    expect(within(dialog).getByRole("button", { name: "Revoke Administrator" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    (fetchAdminUserDetail as jest.Mock).mockImplementation(async () => ({}));
  });
});
