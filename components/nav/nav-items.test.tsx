import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
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

  it("keeps only one group open at a time", async () => {
    render(<NavItems />);

    const rbac = screen.getByRole("button", { name: /RBAC & Audit/i });
    const notifications = screen.getByRole("button", { name: /Notifications/i });

    expect(rbac).toHaveAttribute("aria-expanded", "true");
    expect(notifications).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(notifications);

    expect(notifications).toHaveAttribute("aria-expanded", "true");
    expect(rbac).toHaveAttribute("aria-expanded", "false");
    expect(rbac).toHaveClass("bg-sidebar-accent");
  });
});
