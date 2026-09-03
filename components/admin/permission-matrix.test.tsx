import { render, screen } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import { PermissionMatrix } from "./permission-matrix";

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

describe("PermissionMatrix", () => {
  it("renders the module group with its real permissions and a pristine Save disabled", async () => {
    render(<PermissionMatrix roleId="1" />);

    expect(await screen.findByText("Clients")).toBeInTheDocument();
    expect(screen.getAllByText("client:read").length).toBeGreaterThan(0);
    expect(screen.getAllByText("client:update").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});
