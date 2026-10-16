import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { AlertRoutingEditor } from "./alert-routing";
import { useAuthStore } from "@/lib/auth/store";

const route = {
  id: 7,
  code: "SECURITY_INCIDENT",
  name: "Security incident routing",
  channel_id: 1,
  template_id: 1,
  audience_type: "ALL_ADMINS" as const,
  audience_filter: [],
  priority: 100,
  severity: "HIGH",
  severity_color: "severity.high",
  is_active: true,
  created_at: "2026-09-10T15:36:49.000000Z",
  channel: { id: 1, code: "WEBHOOK", name: "Webhook", is_active: true },
  template: { id: 1, code: "WELCOME", name: "Welcome", channel_id: 1, subject: { EN: "s" }, body: { EN: "b" }, is_active: true },
};

let mockDetailRoute: Record<string, unknown> = route;
const createMock = jest.fn();

const infinite = (data: unknown[]) => ({
  data: { pages: [{ data, meta: { current_page: 1, last_page: 1 } }] },
  isPending: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: jest.fn(),
});

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

jest.mock("../../lib/notifications/queries", () => ({
  useAlertRoutes: () => ({ data: { data: [route], meta: { total: 1 } }, isPending: false, isError: false, refetch: jest.fn() }),
  useAlertRoute: () => ({ data: mockDetailRoute, isPending: false, isError: false, refetch: jest.fn() }),
  useChannels: () => ({ data: [{ id: 1, code: "WEBHOOK", name: "Webhook", is_active: true }] }),
  useAllTemplates: () => ({ data: [{ id: 1, code: "WELCOME", name: "Welcome", channel_id: 1, subject: {}, body: {}, is_active: true }] }),
  useChannelSearch: () => infinite([{ id: 1, code: "WEBHOOK", name: "Webhook", is_active: true }]),
  useTemplateSearch: () => infinite([{ id: 1, code: "WELCOME", name: "Welcome", channel_id: 1, subject: {}, body: {}, is_active: true }]),
  useCreateAlertRoute: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateAlertRoute: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteAlertRoute: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("../../lib/rbac/queries", () => ({
  useRoles: () => ({ data: { data: [{ id: 1, name: "Administrator" }], meta: { total: 1 } } }),
}));

jest.mock("../../lib/user-management/queries", () => ({
  useAllAdminUsers: () => ({ data: [{ id: "u1", name: "Layla Haddad", email: "layla@abapro.health" }] }),
}));

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], messages[ns]);
  return {
    useLocale: () => "en",
    useTranslations: (ns: string) => (key: string, vars?: Record<string, unknown>) => {
      const value = resolve(ns, key);
      let str = typeof value === "string" ? value : key;
      if (vars) for (const [name, val] of Object.entries(vars)) str = str.replace(`{${name}}`, String(val));
      return str;
    },
  };
});


beforeEach(() => {
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Owner", role: "superadmin", token: "t", issuedAt: 0 },
  });
});

describe("AlertRoutingEditor", () => {
  afterEach(() => {
    createMock.mockReset();
    mockDetailRoute = route;
  });

  it("opens a read-only detail drawer on row click", async () => {
    render(<AlertRoutingEditor />);

    await userEvent.click(await screen.findByRole("link", { name: "Security incident routing" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("SECURITY_INCIDENT")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("edits via the row action with Save gated on dirty", async () => {
    render(<AlertRoutingEditor />);

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Route code")).toHaveValue("SECURITY_INCIDENT");

    const save = within(dialog).getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    await userEvent.click(within(dialog).getByRole("switch"));
    expect(save).toBeEnabled();
  });

  it("loads the route severity into the edit form and defaults a new route to Medium", async () => {
    render(<AlertRoutingEditor />);

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const editDialog = await screen.findByRole("dialog");
    expect(within(editDialog).getByLabelText(/^Severity/)).toHaveTextContent("High");
    await userEvent.click(within(editDialog).getByRole("button", { name: "Cancel" }));

    await userEvent.click(await screen.findByRole("button", { name: "New route" }));
    const createDialog = await screen.findByRole("dialog");
    expect(within(createDialog).getByLabelText(/^Severity/)).toHaveTextContent("Medium");
  });

  it("is read-only without the alert routes edit permission", async () => {
    useAuthStore.setState({
      session: { email: "viewer@abapro.health", name: "Viewer", role: "admin", token: "t", issuedAt: 0, permissions: [] },
    });
    render(<AlertRoutingEditor />);

    expect(await screen.findByRole("button", { name: "New route" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("aria-disabled", "true");
  });

  it("blocks create and shows required errors on empty submit", async () => {
    render(<AlertRoutingEditor />);

    await userEvent.click(await screen.findByRole("button", { name: "New route" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create route" }));

    expect(await within(dialog).findByText("A route code is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("A name is required.")).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("links the template and opens from an ?open= deep link", async () => {
    mockSearch = new URLSearchParams("open=7");
    render(<AlertRoutingEditor />);

    const dialog = await screen.findByRole("dialog", { name: "Security incident routing" });
    expect(within(dialog).getByRole("link", { name: "Welcome" })).toHaveAttribute(
      "href",
      "/admin/notifications/templates?open=1",
    );

    await userEvent.keyboard("{Escape}");
    expect(mockReplace).toHaveBeenCalledWith("/admin/notifications/routing");
  });

  it("links role and admin audience members to their records", async () => {
    mockDetailRoute = { ...route, audience_type: "ROLE", audience_filter: { role_ids: [1] } };
    mockSearch = new URLSearchParams("open=7");
    const { unmount } = render(<AlertRoutingEditor />);
    const roleDialog = await screen.findByRole("dialog", { name: "Security incident routing" });
    expect(within(roleDialog).getByRole("link", { name: "Administrator" })).toHaveAttribute("href", "/admin/roles/1");
    unmount();

    mockDetailRoute = { ...route, audience_type: "USER_IDS", audience_filter: { user_ids: ["u1"] } };
    render(<AlertRoutingEditor />);
    const userDialog = await screen.findByRole("dialog", { name: "Security incident routing" });
    expect(within(userDialog).getByRole("link", { name: "Layla Haddad" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u1",
    );
  });
});
