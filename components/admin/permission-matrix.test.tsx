import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { PermissionMatrix } from "./permission-matrix";
import { useAuthStore } from "@/lib/auth/store";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const sync = { mutateAsync: jest.fn().mockResolvedValue(undefined), isPending: false };

jest.mock("../../lib/rbac/queries", () => ({
  useRole: () => ({
    data: { id: 1, name: "Support", is_system: false, permissions: [{ id: 2 }] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePermissionModules: () => ({
    data: [{ id: 1, code: "clients", name: "Clients", display_order: 1 }],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePermissions: () => ({
    data: [
      { id: 2, module_id: 1, resource: "client", action: "read", is_sensitive: false },
      { id: 3, module_id: 1, resource: "client", action: "update", is_sensitive: true },
    ],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useSyncRolePermissions: () => sync,
}));

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


beforeEach(() => {
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Owner", role: "superadmin", token: "t", issuedAt: 0 },
  });
});

describe("PermissionMatrix", () => {
  it("renders the module group with its real permissions and a pristine Save disabled", async () => {
    render(<PermissionMatrix roleId="1" />);

    expect(await screen.findByText("Clients")).toBeInTheDocument();
    expect(screen.getAllByText("client:read").length).toBeGreaterThan(0);
    expect(screen.getAllByText("client:update").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("lays a module's permissions out two per row on wide screens", async () => {
    render(<PermissionMatrix roleId="1" />);

    const [code] = await screen.findAllByText("client:read");
    expect(code.closest("label")?.parentElement).toHaveClass("lg:grid-cols-2");
  });

  it("gives each permission a light background until it is granted", async () => {
    render(<PermissionMatrix roleId="1" />);

    const [granted] = await screen.findAllByText("client:read");
    const [open] = screen.getAllByText("client:update");
    expect(granted.closest("label")).toHaveClass("bg-primary/[0.06]");
    expect(open.closest("label")).toHaveClass("bg-muted/60");
  });

  it("collapses and expands every module at once", async () => {
    const user = userEvent.setup();
    render(<PermissionMatrix roleId="1" />);
    const clients = await screen.findByRole("button", { name: /^Clients/ });

    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(clients).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(clients).toHaveAttribute("aria-expanded", "true");
  });

  it("locks the matrix for an admin without the roles edit permission", async () => {
    useAuthStore.setState({
      session: { email: "viewer@abapro.health", name: "Viewer", role: "admin", token: "t", issuedAt: 0, permissions: ["ROLES.roles.VIEW"] },
    });
    render(<PermissionMatrix roleId="1" />);

    expect(await screen.findByText("You don't have permission to do this.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });
});
