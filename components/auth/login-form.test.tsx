import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import type { AttemptOutcome } from "@/lib/auth/types";
import { LoginForm } from "./login-form";

const mockAttempt = jest.fn<Promise<AttemptOutcome>, [string, string, boolean?]>();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock("./hero-panel", () => ({ HeroPanel: () => null }));

jest.mock("../../lib/auth/store", () => ({
  useAuthStore: (selector: (state: { attempt: typeof mockAttempt; verify: jest.Mock }) => unknown) =>
    selector({ attempt: mockAttempt, verify: jest.fn() }),
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

async function submit(email = "admin@ababro.ai", password = "secret") {
  await userEvent.type(screen.getByLabelText(/^Email/), email);
  await userEvent.type(screen.getByLabelText(/^Password/), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign In" }));
}

describe("LoginForm server errors", () => {
  beforeEach(() => mockAttempt.mockReset());

  it("shows a persistent alert banner with the backend message instead of a toast", async () => {
    mockAttempt.mockResolvedValue({
      result: "SERVER_ERROR",
      email: "admin@ababro.ai",
      serverError: { kind: "unavailable", message: "User management service is unavailable. Please try again later." },
    });
    render(<LoginForm />);

    await submit();

    const banner = await screen.findByRole("alert");
    expect(within(banner).getByText("Sign-in is temporarily unavailable")).toBeInTheDocument();
    expect(within(banner).getByText("User management service is unavailable. Please try again later.")).toBeInTheDocument();
    expect(within(banner).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("falls back to a kind-specific explanation when the backend sends no message", async () => {
    mockAttempt.mockResolvedValue({ result: "SERVER_ERROR", email: "admin@ababro.ai", serverError: { kind: "network" } });
    render(<LoginForm />);

    await submit();

    const banner = await screen.findByRole("alert");
    expect(within(banner).getByText("Can't reach the server")).toBeInTheDocument();
    expect(within(banner).getByText("Check your internet connection and try again.")).toBeInTheDocument();
  });

  it("retries with the same credentials and clears the banner when the user edits a field", async () => {
    mockAttempt.mockResolvedValue({ result: "SERVER_ERROR", email: "admin@ababro.ai", serverError: { kind: "server" } });
    render(<LoginForm />);

    await submit();
    await userEvent.click(within(await screen.findByRole("alert")).getByRole("button", { name: "Try again" }));
    expect(mockAttempt).toHaveBeenCalledTimes(2);
    expect(mockAttempt).toHaveBeenLastCalledWith("admin@ababro.ai", "secret", false);

    await screen.findByRole("alert");
    await userEvent.type(screen.getByLabelText(/^Password/), "x");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the banner content through the collapse and hides it from focus and assistive tech", async () => {
    mockAttempt.mockResolvedValue({ result: "SERVER_ERROR", email: "admin@ababro.ai", serverError: { kind: "server" } });
    render(<LoginForm />);

    await submit();
    const banner = await screen.findByRole("alert");
    const collapse = banner.closest("[class*=grid-rows]");
    expect(collapse).toHaveClass("grid-rows-[1fr]");
    expect(collapse).not.toHaveAttribute("inert");

    await userEvent.type(screen.getByLabelText(/^Password/), "x");
    expect(screen.getByText("Something went wrong on our side")).toBeInTheDocument();
    expect(collapse).toHaveClass("grid-rows-[0fr]");
    expect(collapse).toHaveAttribute("inert");
    expect(collapse).toHaveAttribute("aria-hidden", "true");
  });

  it("re-announces the alert when the same error happens again", async () => {
    mockAttempt.mockResolvedValue({ result: "SERVER_ERROR", email: "admin@ababro.ai", serverError: { kind: "server" } });
    render(<LoginForm />);

    await submit();
    const first = await screen.findByRole("alert");
    await userEvent.click(within(first).getByRole("button", { name: "Try again" }));

    const second = await screen.findByRole("alert");
    expect(second).not.toBe(first);
  });

  it("shows invalid credentials in the banner, not under the password field, with no retry", async () => {
    mockAttempt.mockResolvedValue({ result: "INVALID_CREDENTIALS", email: "admin@ababro.ai" });
    render(<LoginForm />);

    await submit();

    const banner = await screen.findByRole("alert");
    expect(within(banner).getByText("Incorrect email or password")).toBeInTheDocument();
    expect(within(banner).getByText("Check your email and password, then sign in again.")).toBeInTheDocument();
    expect(within(banner).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Incorrect email or password")).toHaveLength(1);
    expect(screen.getByLabelText(/^Password/)).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText(/^Password/)).toHaveFocus();
  });
});
