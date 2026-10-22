import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { AdminAccess } from "./admin-access";
import { useAuthStore } from "@/lib/auth/store";

const mockAdmins = [
  { id: "u1", name: "Dana Okonkwo", email: "dana@abapro.health", initials: "DO", status: "active", roles: [{ id: "3", name: "Administrator" }] },
  { id: "u2", name: "Emma Novak", email: "emma@abapro.health", initials: "EN", status: "active", roles: [{ id: "4", name: "superadmin" }] },
];

const mockReplace = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const mutation = () => ({ mutateAsync: jest.fn(), isPending: false });

jest.mock("../../lib/user-management/queries", () => ({
  useAdminUsers: () => ({ data: { data: mockAdmins }, isPending: false, isError: false, refetch: jest.fn() }),
  useAllAdminUsers: () => ({ data: mockAdmins }),
}));

jest.mock("../../lib/rbac/queries", () => ({
  useAdminAccess: (userId: string | null) => ({
    data: userId
      ? {
          roles: [
            userId === "u2"
              ? { id: 4, name: "superadmin", is_system: true, granted_at: "2026-09-21T13:10:35.000000Z" }
              : {
                  id: 3,
                  name: "Administrator",
                  is_system: true,
                  granted_at: "2026-09-21T13:10:35.000000Z",
                  granted_by_admin_id: "u2",
                },
          ],
          permissions: [
            {
              id: 7,
              module_id: 4,
              action: "VIEW",
              code: "CLIENTS.clients.VIEW",
              description: "View Clients module.",
              is_sensitive: false,
              granted_by_admin_id: "u2",
              granted_at: "2026-09-21 12:00:00",
              expires_at: "2026-12-31 12:00:00",
            },
          ],
        }
      : undefined,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useRoles: () => ({ data: { data: [{ id: 3, name: "Administrator", is_system: true }] } }),
  usePermissions: () => ({ data: [] }),
  useAttachUserRoles: () => mutation(),
  useDetachUserRoles: () => mutation(),
  useSyncUserPermissions: () => mutation(),
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


beforeEach(() => {
  mockSearch = "";
  mockReplace.mockClear();
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Owner", role: "superadmin", token: "t", issuedAt: 0 },
  });
});

describe("AdminAccess", () => {
  it("links the picked admin and the admin who granted each role", async () => {
    mockSearch = "user=u1";
    render(<AdminAccess />);

    expect(await screen.findByRole("link", { name: "Open user account Dana Okonkwo" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u1",
    );
    const granterLinks = screen.getAllByRole("link", { name: "Emma Novak" });
    expect(granterLinks).toHaveLength(2);
    expect(granterLinks.every((link) => link.getAttribute("href") === "/admin/user-management?open=u2")).toBe(true);
  });

  it("shows each permission overlay with its grant date, granter and expiry after loading", async () => {
    mockSearch = "user=u1";
    render(<AdminAccess />);

    expect(await screen.findByText("View Clients module.")).toBeInTheDocument();
    expect(screen.getByText("CLIENTS.clients.VIEW")).toBeInTheDocument();
    expect(screen.getByText("Expires 31-Dec-2026")).toBeInTheDocument();
    expect(screen.getAllByText(/Granted 21-Sep-2026/)).toHaveLength(2);
  });

  it("uses labelled actions, links the role, shows No expiry, and confirms before removing an overlay", async () => {
    mockSearch = "user=u1";
    render(<AdminAccess />);

    expect(await screen.findByRole("link", { name: "Administrator" })).toHaveAttribute("href", "/admin/roles/3");
    expect(screen.getByRole("button", { name: "Revoke Administrator" })).toHaveTextContent("Revoke");
    expect(screen.getByRole("button", { name: "Remove View Clients module." })).toHaveTextContent("Remove");
    expect(screen.getByText("No expiry")).toBeInTheDocument();
    expect(screen.queryByText("Permanent")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove View Clients module." }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("puts the picked user in the address so the page can be linked", async () => {
    render(<AdminAccess />);

    await userEvent.click(screen.getByRole("button", { name: /Choose a user/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Dana Okonkwo/ }));

    expect(mockReplace).toHaveBeenCalledWith("/admin/access?user=u1", { scroll: false });
  });

  it("opens the user named in ?user= straight away", async () => {
    mockSearch = "user=u1";
    render(<AdminAccess />);

    expect(await screen.findByRole("link", { name: "Open user account Dana Okonkwo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke Administrator" })).not.toHaveAttribute("aria-disabled", "true");
  });

  it("leaves your own account out of the user list and ignores a link to it", async () => {
    useAuthStore.setState({
      session: { email: "dana@abapro.health", name: "Dana", role: "superadmin", token: "t", issuedAt: 0 },
    });
    const { unmount } = render(<AdminAccess />);

    await userEvent.click(screen.getByRole("button", { name: /Choose a user/ }));
    expect(await screen.findByRole("button", { name: /Emma Novak/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Dana Okonkwo/ })).not.toBeInTheDocument();
    unmount();

    mockSearch = "user=u1";
    render(<AdminAccess />);
    expect(screen.getByText("This user couldn't be found. Pick a user from the list.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke Administrator" })).not.toBeInTheDocument();
  });

  it("follows the address: clearing ?user= clears the selection", () => {
    mockSearch = "user=u1";
    const { rerender } = render(<AdminAccess />);
    expect(screen.getByRole("link", { name: "Open user account Dana Okonkwo" })).toBeInTheDocument();

    mockSearch = "";
    rerender(<AdminAccess />);
    expect(screen.getByText("Pick a user to view and manage their access.")).toBeInTheDocument();
  });

  it("keeps the Super Admin role on the last active Super Admin", async () => {
    mockSearch = "user=u2";
    render(<AdminAccess />);

    expect(await screen.findByRole("button", { name: "Revoke superadmin" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Remove View Clients module." })).not.toHaveAttribute("aria-disabled", "true");
  });
});
