import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import mockMessages from "../../messages/en.json";
import { useAuthStore } from "@/lib/auth/store";
import { toast } from "sonner";
import {
  fetchAdminUserDetail,
  fetchInvitableStaff,
  fetchUserDevices,
  listAdminUsers,
  listAllAdminUsers,
  sendInvitation,
  updateUserStatus,
} from "@/lib/user-management/users-api";
import type { AdminUserRow, AdminUserStatus } from "@/lib/user-management/types";
import { ADMIN_ACTION_LOGS_PATH } from "@/lib/api/audit-paths";
import { useAccessProbes } from "@/lib/auth/access-probes";
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

const revokedInvites: AdminUserRow[] = [
  row({
    id: "inv-r1",
    name: "Revoked Person",
    email: "revoked@abapro.health",
    status: "revoked",
    staffId: "7",
    roleIds: ["3"],
    invitedBy: "u2",
    invitedByName: "Emma Novak",
    invitedByEmail: "emma@abapro.health",
    invitedAt: Date.parse("2026-10-16T18:40:31.000Z"),
    revokedAt: Date.parse("2026-10-16T21:52:09.000Z"),
    revokedBy: "u1",
    revokedByName: "Dana Okonkwo",
    revokedByEmail: "dana@abapro.health",
  }),
];

const mockHistory = [
  {
    id: "18",
    createdAt: Date.parse("2026-10-16T21:52:09.000Z"),
    actorId: "u1",
    actorName: "Dana Okonkwo",
    actionName: "Revoked an invitation",
  },
];

jest.mock("../../lib/admin-actions/audit-api", () => ({
  listTargetHistory: jest.fn(async () => ({ entries: mockHistory, total: mockHistory.length })),
}));

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
  fetchRevokedInvitations: jest.fn(async () => revokedInvites),
  fetchInvitation: jest.fn(async (id: string) =>
    id === "inv-r1"
      ? revokedInvites[0]
      : {
          ...pendingInvites[0],
          id,
          invitationExpiresAt: Date.parse("2026-10-01T00:00:00.000Z"),
        },
  ),
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
    await userEvent.type(within(confirm).getByLabelText("Reason"), "Leave of absence");
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
        permissions: [
          "USER_MANAGEMENT.user_management.VIEW",
          "USER_MANAGEMENT.user_management.EDIT",
          "USER_MANAGEMENT.invitations.VIEW",
        ],
      },
    });
    try {
      renderWithClient(<UserManagement />);

      const active = (await screen.findByText("Emma Novak")).closest("tr")!;
      expect(within(active).getByRole("button", { name: "Suspend" })).toBeInTheDocument();
      const pending = screen.getByText("Omar Haddad").closest("tr")!;
      expect(within(pending).queryByRole("button", { name: "Resend invite" })).not.toBeInTheDocument();
      expect(within(pending).queryByRole("button", { name: "Revoke invite" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Invite user" })).toHaveAttribute("aria-disabled", "true");
    } finally {
      act(() => useAuthStore.setState({ session: previous }));
    }
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

  describe("revoked invitations", () => {
    beforeEach(() => {
      useAccessProbes.setState({ owner: "owner@abapro.health", results: { [ADMIN_ACTION_LOGS_PATH]: true } });
    });
    afterEach(() => {
      useAccessProbes.setState({ owner: null, results: {} });
    });

    it("lists revoked invitations in their own tab, with who revoked them and when", async () => {
      renderWithClient(<UserManagement />);
      await screen.findByText("Dana Okonkwo");

      await userEvent.click(screen.getByRole("tab", { name: "Revoked invitations (1)" }));
      const revokedRow = await screen.findByRole("link", { name: "Revoked Person" });
      const headers = screen.getAllByRole("columnheader").map((header) => header.textContent?.trim());
      expect(headers).toEqual(["Name", "Email", "Roles", "Revoked", "Revoked by", ""]);
      expect(within(revokedRow).getByText("Dana Okonkwo")).toBeInTheDocument();
      expect(within(revokedRow).queryByText("Emma Novak")).not.toBeInTheDocument();
      expect(screen.queryByText("Pending Person")).not.toBeInTheDocument();
    });

    it("shows - for the revoke date and revoker until the backend sends them", async () => {
      const original = { ...revokedInvites[0] };
      Object.assign(revokedInvites[0], { revokedAt: null, revokedBy: null, revokedByName: null, revokedByEmail: null });
      try {
        renderWithClient(<UserManagement />);
        await screen.findByText("Dana Okonkwo");
        await userEvent.click(screen.getByRole("tab", { name: "Revoked invitations (1)" }));
        const revokedRow = await screen.findByRole("link", { name: "Revoked Person" });
        expect(within(revokedRow).getAllByText("-")).toHaveLength(2);

        await userEvent.click(revokedRow);
        const drawer = await screen.findByRole("dialog", { name: "Revoked Person" });
        const revokedBySection = within(drawer).getByRole("heading", { name: "Revoked by" }).closest("section");
        expect(revokedBySection).not.toBeNull();
        expect(within(revokedBySection as HTMLElement).getByText("-")).toBeInTheDocument();
      } finally {
        Object.assign(revokedInvites[0], original);
      }
    });

    it("opens a revoked invitation with who revoked it and its history, and invites the person again", async () => {
      renderWithClient(<UserManagement />);
      await screen.findByText("Dana Okonkwo");
      await userEvent.click(screen.getByRole("tab", { name: "Revoked invitations (1)" }));
      await userEvent.click(await screen.findByRole("link", { name: "Revoked Person" }));

      const drawer = await screen.findByRole("dialog", { name: "Revoked Person" });
      expect(within(drawer).getByText("Revoked", { selector: "dt" })).toBeInTheDocument();
      expect(within(drawer).getByRole("link", { name: "Open user account Dana Okonkwo" })).toHaveAttribute(
        "href",
        "/admin/user-management?open=u1",
      );
      expect(await within(drawer).findByRole("link", { name: "Revoked an invitation" })).toHaveAttribute(
        "href",
        "/admin/audit/log?open=18",
      );
      expect(within(drawer).queryByRole("button", { name: "Resend invite" })).not.toBeInTheDocument();

      (fetchInvitableStaff as jest.Mock).mockResolvedValueOnce([
        { id: "7", name: "Revoked Person", email: "revoked@abapro.health", initials: "RP", title: "Nurse", department: "Care", terminated: false },
      ]);
      await userEvent.click(within(drawer).getByRole("button", { name: "Invite again" }));
      const invite = await screen.findByRole("dialog", { name: "Invite user" });
      expect(within(invite).getByText("Revoked Person")).toBeInTheDocument();
      expect(within(invite).getByDisplayValue("revoked@abapro.health")).toBeInTheDocument();
    });

    it("refuses Invite again for someone who can no longer be invited", async () => {
      const error = jest.spyOn(toast, "error").mockImplementation(() => "toast");
      (fetchInvitableStaff as jest.Mock).mockResolvedValueOnce([]);
      renderWithClient(<UserManagement />);
      await screen.findByText("Dana Okonkwo");
      await userEvent.click(screen.getByRole("tab", { name: "Revoked invitations (1)" }));
      const revokedRow = await screen.findByRole("link", { name: "Revoked Person" });
      await userEvent.click(within(revokedRow).getByRole("button", { name: "Invite again" }));

      await waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringContaining("can't be invited any more")));
      expect(screen.queryByRole("dialog", { name: "Invite user" })).not.toBeInTheDocument();
      error.mockRestore();
    });

    it("blocks Invite again for someone who already has an account", async () => {
      const original = revokedInvites[0].staffId;
      revokedInvites[0].staffId = mockRows[0].staffId;
      try {
        renderWithClient(<UserManagement />);
        await screen.findByText("Dana Okonkwo");
        await userEvent.click(screen.getByRole("tab", { name: "Revoked invitations (1)" }));
        const revokedRow = await screen.findByRole("link", { name: "Revoked Person" });
        await waitFor(() =>
          expect(within(revokedRow).getByRole("button", { name: "Invite again" })).toHaveAttribute("aria-disabled", "true"),
        );
      } finally {
        revokedInvites[0].staffId = original;
      }
    });

    it("blocks Invite again while the person already has a pending invitation", async () => {
      const original = revokedInvites[0].staffId;
      revokedInvites[0].staffId = pendingInvites[0].staffId;
      try {
        renderWithClient(<UserManagement />);
        await screen.findByText("Dana Okonkwo");
        await userEvent.click(screen.getByRole("tab", { name: "Revoked invitations (1)" }));
        const revokedRow = await screen.findByRole("link", { name: "Revoked Person" });
        expect(within(revokedRow).getByRole("button", { name: "Invite again" })).toHaveAttribute("aria-disabled", "true");
      } finally {
        revokedInvites[0].staffId = original;
      }
    });

    it("opens the Revoked tab from an ?invite= link to a revoked invitation", async () => {
      mockSearch = new URLSearchParams("invite=inv-r1");
      renderWithClient(<UserManagement />);

      expect(await screen.findByRole("dialog", { name: "Revoked Person" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Revoked invitations (1)", hidden: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
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
    const effective = within(dialog).getByText("Effective permissions").closest("div");
    expect(effective).toHaveTextContent("2");

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

  it("shows access read-only in the drawer and sends changes to User access", async () => {
    mockSearch = new URLSearchParams("open=u2");
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
    expect(await within(dialog).findByRole("link", { name: "Manage access" })).toHaveAttribute(
      "href",
      "/admin/access?user=u2",
    );
    expect(within(dialog).getByText("View Clients module.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Grant a role" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Add permission" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Revoke Administrator" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Remove View Clients module." })).not.toBeInTheDocument();
    (fetchAdminUserDetail as jest.Mock).mockImplementation(async () => ({}));
  });

  it("counts registered devices in the heading and scrolls a long list", async () => {
    mockSearch = new URLSearchParams("open=u2");
    (fetchAdminUserDetail as jest.Mock).mockImplementation(async (id: string) =>
      id === "u2"
        ? { id: "u2", staff_id: 2, email: "emma@abapro.health", status: "ACTIVE", staff: { id: 2, first_name: "Emma", last_name: "Novak" }, roles: [] }
        : {},
    );
    (fetchUserDevices as jest.Mock).mockImplementation(async () =>
      Array.from({ length: 9 }, (_, index) => ({ id: index, device_name: `Device ${index + 1}`, last_used_at: null })),
    );
    try {
      renderWithClient(<UserManagement />);
      const dialog = await screen.findByRole("dialog", { name: "Emma Novak" });

      expect(await within(dialog).findByText("Registered devices (9)")).toBeInTheDocument();
      const devices = within(dialog).getByRole("region", { name: "Registered devices" });
      expect(within(devices).getAllByRole("listitem")).toHaveLength(9);
      expect(devices).toHaveAttribute("tabindex", "0");
      expect(devices).toHaveClass("max-h-60");
    } finally {
      (fetchUserDevices as jest.Mock).mockImplementation(async () => []);
      (fetchAdminUserDetail as jest.Mock).mockImplementation(async () => ({}));
    }
  });

  it("hides Manage access on your own account", async () => {
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
    expect(await within(dialog).findByText("View Clients module.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: "Manage access" })).not.toBeInTheDocument();
    (fetchAdminUserDetail as jest.Mock).mockImplementation(async () => ({}));
  });

  it("won't suspend or deactivate the last active Super Admin", async () => {
    const withSuperadmin = mockRows.map((user) =>
      user.id === "u1" ? { ...user, roles: [{ id: "4", name: "superadmin", expiresAt: null }] } : user,
    );
    (listAdminUsers as jest.Mock).mockImplementation(async () => ({ data: withSuperadmin, meta: { total: withSuperadmin.length } }));
    (listAllAdminUsers as jest.Mock).mockImplementation(async () => withSuperadmin);
    try {
      renderWithClient(<UserManagement />);
      const dana = (await screen.findByText("Dana Okonkwo")).closest("tr")!;
      const emma = screen.getByText("Emma Novak").closest("tr")!;

      await waitFor(() =>
        expect(within(dana).getByRole("button", { name: "Suspend" })).toHaveAttribute("aria-disabled", "true"),
      );
      expect(within(dana).getByRole("button", { name: "Deactivate" })).toHaveAttribute("aria-disabled", "true");
      expect(within(emma).getByRole("button", { name: "Suspend" })).not.toHaveAttribute("aria-disabled", "true");
    } finally {
      (listAdminUsers as jest.Mock).mockImplementation(async () => ({ data: mockRows, meta: { total: mockRows.length } }));
      (listAllAdminUsers as jest.Mock).mockImplementation(async () => mockRows);
    }
  });

  describe("with partial permissions", () => {
    async function withPermissions(permissions: string[], check: () => Promise<void>) {
      const previous = useAuthStore.getState().session;
      useAuthStore.setState({
        session: { email: "owner@abapro.health", name: "Sam", role: "admin", token: "t", issuedAt: 0, permissions },
      });
      try {
        await check();
      } finally {
        act(() => useAuthStore.setState({ session: previous }));
      }
    }

    it("shows only the Pending tab, with Invite, to an invitations-only admin", async () => {
      await withPermissions(
        ["USER_MANAGEMENT.invitations.VIEW", "USER_MANAGEMENT.invitations.EDIT", "PERSONNEL.staff.VIEW"],
        async () => {
          renderWithClient(<UserManagement />);
          expect(await screen.findByRole("tab", { name: /Pending invitations/ })).toBeInTheDocument();
          expect(screen.queryByRole("tab", { name: "User accounts" })).not.toBeInTheDocument();
          expect(await screen.findByRole("button", { name: "Invite user" })).not.toHaveAttribute("aria-disabled", "true");
        },
      );
    });

    it("hides the Pending tab from an accounts-only admin", async () => {
      await withPermissions(["USER_MANAGEMENT.user_management.VIEW"], async () => {
        renderWithClient(<UserManagement />);
        expect(await screen.findByText("Emma Novak")).toBeInTheDocument();
        expect(screen.queryByRole("tab", { name: /Pending invitations/ })).not.toBeInTheDocument();
      });
    });

    it("disables Invite when the staff list can't be viewed", async () => {
      await withPermissions(
        ["USER_MANAGEMENT.user_management.VIEW", "USER_MANAGEMENT.invitations.VIEW", "USER_MANAGEMENT.invitations.EDIT"],
        async () => {
          renderWithClient(<UserManagement />);
          await screen.findByText("Emma Novak");
          expect(screen.getByRole("button", { name: "Invite user" })).toHaveAttribute("aria-disabled", "true");
        },
      );
    });
  });
});
