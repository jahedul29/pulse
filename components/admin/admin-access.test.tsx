import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { AdminAccess } from "./admin-access";
import { useAuthStore } from "@/lib/auth/store";

const mockAdmins = [
  { id: "u1", name: "Dana Okonkwo", email: "dana@abapro.health", initials: "DO" },
  { id: "u2", name: "Emma Novak", email: "emma@abapro.health", initials: "EN" },
];

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
            {
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
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Owner", role: "superadmin", token: "t", issuedAt: 0 },
  });
});

describe("AdminAccess", () => {
  it("links the picked admin and the admin who granted each role", async () => {
    render(<AdminAccess />);

    await userEvent.click(screen.getByRole("button", { name: /Choose a user/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Dana Okonkwo/ }));

    expect(await screen.findByRole("link", { name: "Open user account Dana Okonkwo" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u1",
    );
    const granterLinks = screen.getAllByRole("link", { name: "Emma Novak" });
    expect(granterLinks).toHaveLength(2);
    expect(granterLinks.every((link) => link.getAttribute("href") === "/admin/user-management?open=u2")).toBe(true);
  });

  it("shows each permission overlay with its grant date, granter and expiry after loading", async () => {
    render(<AdminAccess />);

    await userEvent.click(screen.getByRole("button", { name: /Choose a user/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Dana Okonkwo/ }));

    expect(await screen.findByText("View Clients module.")).toBeInTheDocument();
    expect(screen.getByText("CLIENTS.clients.VIEW")).toBeInTheDocument();
    expect(screen.getByText("Expires 31-Dec-2026")).toBeInTheDocument();
    expect(screen.getAllByText(/Granted 21-Sep-2026/)).toHaveLength(2);
  });

  it("uses labelled actions, links the role, shows No expiry, and confirms before removing an overlay", async () => {
    render(<AdminAccess />);

    await userEvent.click(screen.getByRole("button", { name: /Choose a user/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Dana Okonkwo/ }));

    expect(await screen.findByRole("link", { name: "Administrator" })).toHaveAttribute("href", "/admin/roles/3");
    expect(screen.getByRole("button", { name: "Revoke Administrator" })).toHaveTextContent("Revoke");
    expect(screen.getByRole("button", { name: "Remove View Clients module." })).toHaveTextContent("Remove");
    expect(screen.getByText("No expiry")).toBeInTheDocument();
    expect(screen.queryByText("Permanent")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove View Clients module." }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });
});
