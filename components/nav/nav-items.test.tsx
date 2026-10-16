import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
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

beforeEach(() => {
  useUiStore.setState({ openNavGroups: [] });
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

  it("lists the notification deliveries screen under Notifications", async () => {
    render(<NavItems />);
    await userEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(screen.getByRole("link", { name: "Notification deliveries" })).toHaveAttribute(
      "href",
      "/admin/notifications/log",
    );
  });
});
