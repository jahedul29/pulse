import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { NotificationLog } from "./notification-log";

const delivery = {
  id: "d1",
  template_id: 1,
  channel_id: 1,
  campaign_id: null,
  admin_account_id: "u1",
  status: "SENT" as const,
  error_message: null,
  sent_at: "2026-09-10T15:35:51.000000Z",
  created_at: "2026-09-10T15:35:51.000000Z",
  channel: { id: 1, code: "IN_APP", name: "In-app inbox", is_active: true },
  template: { id: 1, code: "EDR_SESSION_MISSED", name: "Missed", channel_id: 1, subject: { EN: "s" }, body: { EN: "<p>body</p>" }, is_active: true },
};

jest.mock("../../lib/notifications/queries", () => ({
  useDeliveries: () => ({ data: { data: [delivery], meta: { total: 1 } }, isPending: false, isError: false, refetch: jest.fn() }),
  useDelivery: () => ({ data: delivery }),
  useChannelSearch: () => ({
    data: { pages: [{ data: [{ id: 1, code: "IN_APP", name: "In-app inbox", is_active: true }], meta: { current_page: 1, last_page: 1 } }] },
    isPending: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
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

describe("NotificationLog", () => {
  it("resolves the recipient and opens a read-only detail drawer", async () => {
    render(<NotificationLog />);

    const row = await screen.findByRole("link", { name: "Layla Haddad EDR_SESSION_MISSED" });
    await userEvent.click(row);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getAllByText("Layla Haddad").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Missed")).toBeInTheDocument();
    expect(within(dialog).getByText("body")).toBeInTheDocument();
  });
});
