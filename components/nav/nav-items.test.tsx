import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH } from "@/lib/api/audit-paths";
import { useAccessProbes } from "@/lib/auth/access-probes";
import { useAuthStore } from "@/lib/auth/store";
import { useUiStore } from "@/lib/ui-store";
import { NavItems } from "./nav-items";

jest.mock("next/navigation", () => ({ usePathname: () => "/admin/roles" }));

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((accumulator, part) => (accumulator as Record<string, unknown>)?.[part], messages[ns]);
  return {
    useTranslations: (ns: string) => (key: string) => {
      const value = resolve(ns, key);
      return typeof value === "string" ? value : key;
    },
  };
});

function signIn(permissions: string[]) {
  useAuthStore.setState({
    session: { email: "admin@abapro.ai", name: "Admin", role: "admin", token: "t", issuedAt: 0, permissions },
  });
}

beforeEach(() => {
  useUiStore.setState({ openNavGroups: [] });
  useAccessProbes.setState({ owner: null, results: {} });
  signIn(Object.values(PERMISSIONS));
});

describe("NavItems parent group", () => {
  it("shows the active pill on a closed active parent and hands it off when open", async () => {
    render(<NavItems />);

    const parent = screen.getByRole("button", { name: /RBAC & Audit/i });

    expect(parent).toHaveAttribute("aria-expanded", "true");
    expect(parent).not.toHaveClass("bg-sidebar-accent");

    await userEvent.click(parent);

    expect(parent).toHaveAttribute("aria-expanded", "false");
    expect(parent).toHaveClass("bg-sidebar-accent");
  });

  it("lets several groups stay open at once", async () => {
    render(<NavItems />);

    const rbac = screen.getByRole("button", { name: /RBAC & Audit/i });
    const notifications = screen.getByRole("button", { name: /Notifications/i });
    const locations = screen.getByRole("button", { name: /Locations/i });

    expect(rbac).toHaveAttribute("aria-expanded", "true");
    expect(notifications).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(notifications);
    await userEvent.click(locations);

    expect(rbac).toHaveAttribute("aria-expanded", "true");
    expect(notifications).toHaveAttribute("aria-expanded", "true");
    expect(locations).toHaveAttribute("aria-expanded", "true");
  });

  it("remembers which groups are open, including the current page's group", async () => {
    const { unmount } = render(<NavItems />);
    await userEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(useUiStore.getState().openNavGroups).toEqual(expect.arrayContaining(["rbacGroup", "notificationsGroup"]));
    unmount();

    render(<NavItems />);
    expect(screen.getByRole("button", { name: /Notifications/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("lists Calendar settings under RBAC & Audit Logs", () => {
    render(<NavItems />);
    const rbac = screen.getByRole("button", { name: /RBAC & Audit/i });
    const link = screen.getByRole("link", { name: "Calendar settings" });
    expect(link).toHaveAttribute("href", "/calendar-settings");
    expect(rbac.parentElement).toContainElement(link);
    expect(screen.getAllByRole("link", { name: "Calendar settings" })).toHaveLength(1);
  });

  it("lists the notification deliveries screen under Notifications", async () => {
    render(<NavItems />);
    await userEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(screen.getByRole("link", { name: "Notification deliveries" })).toHaveAttribute(
      "href",
      "/admin/notifications/log",
    );
  });

  it("hides items the user can't open and groups left empty", async () => {
    signIn([PERMISSIONS.ROLES_VIEW, PERMISSIONS.NOTIFICATION_TEMPLATES_VIEW]);
    render(<NavItems />);

    expect(screen.queryByRole("link", { name: "Specialists" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /User management/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Locations/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roles" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Security policy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Action log" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(screen.getByRole("link", { name: "Message templates" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Notification deliveries" })).not.toBeInTheDocument();
  });

  it("shows the audit logs only after the backend allows them", () => {
    useAccessProbes.setState({
      owner: "admin@abapro.ai",
      results: { [ADMIN_ACTION_LOGS_PATH]: true, [CHANGE_LOGS_PATH]: false },
    });
    render(<NavItems />);
    expect(screen.getByRole("link", { name: "Action log" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Change log" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login audit" })).not.toBeInTheDocument();
  });
});
