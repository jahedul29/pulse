import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { AlertRoutingEditor } from "./alert-routing";

const route = {
  id: 7,
  code: "SECURITY_INCIDENT",
  name: "Security incident routing",
  channel_id: 1,
  template_id: 1,
  audience_type: "ALL_ADMINS" as const,
  audience_filter: [],
  priority: 100,
  is_active: true,
  created_at: "2026-09-10T15:36:49.000000Z",
  channel: { id: 1, code: "WEBHOOK", name: "Webhook", is_active: true },
  template: { id: 1, code: "WELCOME", name: "Welcome", channel_id: 1, subject: { EN: "s" }, body: { EN: "b" }, is_active: true },
};

const createMock = jest.fn();

const infinite = (data: unknown[]) => ({
  data: { pages: [{ data, meta: { current_page: 1, last_page: 1 } }] },
  isPending: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: jest.fn(),
});

jest.mock("../../lib/notifications/queries", () => ({
  useAlertRoutes: () => ({ data: { data: [route], meta: { total: 1 } }, isPending: false, isError: false, refetch: jest.fn() }),
  useAlertRoute: () => ({ data: route, isPending: false, isError: false, refetch: jest.fn() }),
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

describe("AlertRoutingEditor", () => {
  afterEach(() => createMock.mockReset());

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

  it("blocks create and shows required errors on empty submit", async () => {
    render(<AlertRoutingEditor />);

    await userEvent.click(await screen.findByRole("button", { name: "New route" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create route" }));

    expect(await within(dialog).findByText("A route code is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("A name is required.")).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });
});
