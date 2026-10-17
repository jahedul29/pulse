import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { UserAccessEditor } from "./user-access-editor";
import { useAuthStore } from "@/lib/auth/store";

const mockPermission = {
  id: 7,
  module_id: 4,
  action: "VIEW",
  code: "CLIENTS.clients.VIEW",
  description: "View Clients module.",
  is_sensitive: true,
  granted_by_admin_id: "u2",
  granted_at: "2026-09-21 12:00:00",
  expires_at: "2026-12-31 12:00:00",
};

const mutation = () => ({ mutateAsync: jest.fn(), isPending: false });

jest.mock("../../lib/rbac/queries", () => ({
  useAdminAccess: () => ({
    data: {
      roles: [{ id: 3, name: "admin", is_system: false, granted_at: "2026-10-11 12:00:00", granted_by_admin_id: "u2" }],
      permissions: [mockPermission],
      effectivePermissionCount: 13,
    },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useRoles: () => ({ data: { data: [{ id: 3, name: "admin", is_system: false }] } }),
  usePermissions: () => ({ data: [mockPermission] }),
  useAttachUserRoles: () => mutation(),
  useDetachUserRoles: () => mutation(),
  useSyncUserPermissions: () => mutation(),
}));

jest.mock("../../lib/user-management/queries", () => ({
  useAllAdminUsers: () => ({ data: [{ id: "u2", name: "Emma Novak", email: "emma@abapro.health" }] }),
}));

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], messages[ns]);
  return {
    useLocale: () => "en",
    useTranslations: (ns: string) => {
      const translate = (key: string, vars?: Record<string, unknown>) => {
        const value = resolve(ns, key);
        let str = typeof value === "string" ? value : key;
        if (vars) {
          for (const [name, val] of Object.entries(vars)) {
            if (typeof val !== "function") str = str.replace(`{${name}}`, String(val));
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

function signIn(permissions?: string[]) {
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Owner", role: "Owner", token: "t", issuedAt: 0, permissions },
  });
}

describe("UserAccessEditor", () => {
  beforeEach(() => signIn());

  it("drawer variant without edit rights shows full access details but no edit controls", () => {
    render(<UserAccessEditor userId="u-5" userName="Test Operator" variant="drawer" canEdit={false} />);

    expect(screen.getByText("Roles (1)")).toBeInTheDocument();
    expect(screen.getByText("Direct permissions (1)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "admin" })).toHaveAttribute("href", "/admin/roles/3");
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("Sensitive")).toBeInTheDocument();
    expect(screen.getByText("Expires 31-Dec-2026")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Emma Novak" })).toHaveLength(2);
    expect(screen.getByText(/13 effective permissions in total/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers an optional expiry when granting a role, defaulting to no expiry", async () => {
    render(<UserAccessEditor userId="u-5" userName="Test Operator" variant="page" canEdit />);

    await userEvent.click(screen.getByRole("button", { name: "Grant a role" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Expiry")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /No expiry/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Remove expiry" })).not.toBeInTheDocument();
  });

  it("disables Grant a role when the user can't view the roles catalogue", () => {
    signIn(["USER_MANAGEMENT.user_management.EDIT", "PERMISSIONS.permissions.VIEW"]);
    render(<UserAccessEditor userId="u-5" userName="Test Operator" variant="page" canEdit />);

    expect(screen.getByRole("button", { name: "Grant a role" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Add permission" })).not.toHaveAttribute("aria-disabled");
  });

  it("page variant renders card headers with the action on the title row", () => {
    render(<UserAccessEditor userId="u-5" userName="Test Operator" variant="page" canEdit />);

    expect(screen.getByText("Direct permissions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add permission" }).closest("[data-slot=card-action]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Grant a role" })).toBeInTheDocument();
  });
});
