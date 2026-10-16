import { act, fireEvent, render, screen } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import { formatCountdown, IDLE_SIGN_OUT_KEY, IDLE_TIMEOUT_MS, IDLE_WARNING_MS, IDLE_WARNING_SECONDS, LAST_ACTIVITY_KEY } from "@/lib/auth/idle";
import { useAuthStore } from "@/lib/auth/store";
import { IdleLogout } from "./idle-logout";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  return {
    useTranslations: (ns: string) => (key: string) => {
      const value = messages[ns]?.[key];
      return typeof value === "string" ? value : key;
    },
  };
});

const WARNING_AT = IDLE_TIMEOUT_MS - IDLE_WARNING_MS;
const QUIET = WARNING_AT - 1000;

function signIn() {
  useAuthStore.setState({
    session: { email: "owner@abapro.health", name: "Owner", role: "admin", token: "t", issuedAt: 0 },
  });
}

function advance(milliseconds: number) {
  act(() => {
    jest.advanceTimersByTime(milliseconds);
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-16T08:00:00Z") });
  localStorage.clear();
  mockReplace.mockClear();
  signIn();
  window.history.replaceState(null, "", "/admin/roles?page=2");
});

afterEach(() => {
  jest.useRealTimers();
});

describe("IdleLogout", () => {
  it("warns before signing out and lets the admin stay signed in", () => {
    render(<IdleLogout />);
    advance(WARNING_AT);
    expect(screen.getByRole("alertdialog", { name: "Are you still there?" })).toBeInTheDocument();
    expect(screen.getByText(formatCountdown(IDLE_WARNING_SECONDS))).toBeInTheDocument();
    advance(10_000);
    expect(screen.getByText(formatCountdown(IDLE_WARNING_SECONDS - 10))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stay signed in" }));
    advance(QUIET);
    expect(useAuthStore.getState().session).not.toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("signs out completely after the idle timeout and remembers where the admin was", () => {
    render(<IdleLogout />);
    advance(IDLE_TIMEOUT_MS);
    expect(useAuthStore.getState().session).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/login?reason=idle&returnTo=%2Fadmin%2Froles%3Fpage%3D2");
    expect(localStorage.getItem(IDLE_SIGN_OUT_KEY)).not.toBeNull();
  });

  it("treats input as activity", () => {
    render(<IdleLogout />);
    advance(QUIET);
    fireEvent.keyDown(document.body, { key: "a" });
    advance(QUIET);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(useAuthStore.getState().session).not.toBeNull();
  });

  it("keeps the admin signed in while another tab is in use", () => {
    render(<IdleLogout />);
    advance(QUIET);
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    advance(QUIET);
    expect(useAuthStore.getState().session).not.toBeNull();
  });

  it("signs out when another tab signs out for inactivity", () => {
    render(<IdleLogout />);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: IDLE_SIGN_OUT_KEY, newValue: String(Date.now()) }));
    });
    expect(useAuthStore.getState().session).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("/login?reason=idle"));
  });

  it("signs out straight away when the page is reopened after a long break", () => {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now() - 3 * IDLE_TIMEOUT_MS));
    render(<IdleLogout />);
    advance(10);
    expect(useAuthStore.getState().session).toBeNull();
  });
});
