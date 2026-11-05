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
  title: "Session missed",
  body: "The session was missed by the client.",
  severity: "LOW",
  severity_color: "severity.low",
  error_message: null,
  sent_at: "2026-09-10T15:35:51.000000Z",
  created_at: "2026-09-10T15:35:51.000000Z",
  channel: { id: 1, code: "IN_APP", name: "In-app inbox", is_active: true },
  template: { id: 1, code: "EDR_SESSION_MISSED", name: "Missed", channel_id: 1, subject: { EN: "s" }, body: { EN: "<p>body</p>" }, is_active: true },
  alert_route_id: 3,
  alert_route: { id: 3, code: "SITE_DOWN", name: "Site down" },
  admin_account: { id: "u1", email: "layla@abapro.health", staff: { first_name: "Layla", last_name: "Haddad" } },
};

let mockSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock("../../lib/notifications/queries", () => ({
  useDeliveries: () => ({ data: { data: [delivery], meta: { total: 1 } }, isPending: false, isError: false, refetch: jest.fn() }),
  useDelivery: (id: string | null) =>
    id === "missing"
      ? { data: undefined, isPending: false, isError: true, error: new Error("gone"), refetch: jest.fn() }
      : { data: delivery },
  useChannelSearch: () => ({
    data: { pages: [{ data: [{ id: 1, code: "IN_APP", name: "In-app inbox", is_active: true }], meta: { current_page: 1, last_page: 1 } }] },
    isPending: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
}));

jest.mock("../../lib/user-management/queries", () => ({
  useAdminUserSearch: () => ({
    data: { pages: [{ data: [], meta: { current_page: 1, last_page: 1 } }] },
    isPending: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
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
    expect(within(dialog).getByRole("link", { name: "Open admin account Layla Haddad" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u1",
    );
    expect(within(dialog).getByRole("link", { name: "Open message template Missed" })).toHaveAttribute(
      "href",
      "/admin/notifications/templates?open=1",
    );
    expect(within(dialog).getByRole("link", { name: "Open alert route Site down" })).toHaveAttribute(
      "href",
      "/admin/notifications/routing?open=3",
    );
    expect(within(dialog).getByText("The session was missed by the client.")).toBeInTheDocument();
  });

  it("renders an HTML message body as formatted text, not raw tags", async () => {
    const original = delivery.body;
    delivery.body = '<p>Hello Layla,</p><p>Open <a class="highlight" data-action="open_account_status">account status</a></p>';
    try {
      render(<NotificationLog />);
      await userEvent.click(await screen.findByRole("link", { name: "Layla Haddad EDR_SESSION_MISSED" }));
      const dialog = await screen.findByRole("dialog");

      expect(within(dialog).getByText("Hello Layla,").tagName).toBe("P");
      expect(dialog.querySelector('a.highlight[data-action="open_account_status"]')).toHaveTextContent("account status");
      expect(within(dialog).queryByText(/<p>/)).not.toBeInTheDocument();
    } finally {
      delivery.body = original;
    }
  });

  it("lays the drawer out like the table, with a link to the delivery", async () => {
    const writeText = jest.fn<Promise<void>, [string]>(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<NotificationLog />);

    await userEvent.click(await screen.findByRole("link", { name: "Layla Haddad EDR_SESSION_MISSED" }));
    const dialog = await screen.findByRole("dialog", { name: "Session missed" });

    const strip = within(dialog).getByText("Sent", { selector: "dt" }).closest("dl") as HTMLElement;
    expect(within(strip).getAllByRole("term").map((term) => term.textContent)).toEqual(["Sent", "Severity", "Delivery"]);
    expect(within(dialog).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Recipient",
      "Delivery",
      "Message",
    ]);
    await userEvent.click(within(dialog).getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenLastCalledWith("http://localhost/admin/notifications/log?open=d1");
  });
});

describe("NotificationLog deep link", () => {
  afterEach(() => {
    mockSearch = "";
  });

  it("opens a drawer that says the record is unavailable when ?open= names a missing delivery", async () => {
    mockSearch = "open=missing";
    render(<NotificationLog />);

    expect(await screen.findByText("Record unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
