import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { RolesList } from "./roles-list";
import { useAuthStore } from "@/lib/auth/store";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock("../../lib/rbac/queries", () => ({
  useRoles: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useCreateRole: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateRole: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteRole: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

describe("RolesList create validation", () => {
  it("blocks create and shows a required error on an empty name", async () => {
    render(<RolesList />);

    await userEvent.click(await screen.findByRole("button", { name: "New role" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create role" }));

    expect(await within(dialog).findByText("Enter a role name")).toBeInTheDocument();
  });

  it("disables New role for an admin without the roles edit permission", async () => {
    useAuthStore.setState({
      session: { email: "viewer@abapro.health", name: "Viewer", role: "admin", token: "t", issuedAt: 0, permissions: ["ROLES.roles.VIEW"] },
    });
    render(<RolesList />);

    const create = await screen.findByRole("button", { name: "New role" });
    expect(create).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(create);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
