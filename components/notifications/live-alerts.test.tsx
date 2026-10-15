import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { LiveAlerts } from "./live-alerts";

const alerts = [
  {
    id: "a1",
    severity: "HIGH",
    status: "SENT",
    title: "Session missed",
    body: "The session was missed.",
    sent_at: "2026-09-21T10:00:00.000000Z",
    created_at: "2026-09-21T10:00:00.000000Z",
    channel: { id: 3, code: "SMS", name: "SMS", is_active: true },
    admin_account_id: "u1",
    alert_route_id: 1,
    alert_route: { id: 1, code: "SEED_SITE_DOWN", name: "Site down" },
    admin_account: {
      id: "u1",
      email: "ops@abapro.ai",
      full_name: "Ops Lead",
      username: "SUID-0009",
      staff: { first_name: "Ops", last_name: "Lead" },
    },
  },
  {
    id: "a2",
    severity: "MEDIUM",
    status: "PENDING",
    title: "Treatment plan updated",
    body: "A plan changed.",
    sent_at: "2026-09-21T09:00:00.000000Z",
    created_at: "2026-09-21T09:00:00.000000Z",
    channel: null,
    admin_account: null,
  },
];

jest.mock("../../lib/notifications/queries", () => ({
  useLiveAlerts: () => ({
    data: { data: alerts, meta: { total: 2 }, severityCounts: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0 } },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useDelivery: (id: string | null) => ({
    data: alerts.find((alert) => alert.id === id),
    isPending: false,
    isError: false,
    refetch: jest.fn(),
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

describe("LiveAlerts", () => {
  it("lists firing alerts with severity in a server-driven table", async () => {
    render(<LiveAlerts />);

    expect(await screen.findByText("Session missed")).toBeInTheDocument();
    expect(screen.getByText("Treatment plan updated")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("links the recipient and alert route in the detail drawer and never shows raw ids", async () => {
    render(<LiveAlerts />);

    await userEvent.click(await screen.findByRole("link", { name: "Session missed" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByRole("link", { name: "Open admin account Ops Lead" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u1",
    );
    expect(within(dialog).getByText("SUID-0009 · ops@abapro.ai")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Open alert route Site down" })).toHaveAttribute(
      "href",
      "/admin/notifications/routing?open=1",
    );
    expect(within(dialog).queryByText(/^#/)).not.toBeInTheDocument();
  });
});
