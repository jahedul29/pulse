import { act, render, screen } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import { ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH, LOGIN_AUDIT_LOGS_PATH } from "@/lib/api/audit-paths";
import { useAccessProbes } from "@/lib/auth/access-probes";
import { useAuthStore } from "@/lib/auth/store";
import { AccessGuard } from "./access-guard";

let mockPathname = "/admin/roles";
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock("next-intl", () => {
  const { translate } = jest.requireActual("../locations/test-intl");
  return {
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
      translate(mockMessages, `${ns}.${key}`, values),
  };
});

function signIn(permissions: string[]) {
  useAuthStore.setState({
    session: { email: "admin@abapro.ai", name: "Admin", role: "admin", token: "t", issuedAt: 0, permissions },
  });
}

describe("AccessGuard", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    useAccessProbes.setState({ owner: null, results: {} });
  });

  it("renders the page when the user may open it", () => {
    mockPathname = "/admin/roles";
    signIn(["ROLES.roles.VIEW"]);
    render(<AccessGuard>page content</AccessGuard>);
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("replaces the page with the not-authorized view when the permission is missing", () => {
    mockPathname = "/admin/settings/security";
    signIn(["ROLES.roles.VIEW"]);
    render(<AccessGuard>page content</AccessGuard>);
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You're not authorized to view this page" })).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("sends the user from a default landing page they can't open to their first allowed page", () => {
    mockPathname = "/personnel";
    signIn(["ROLES.roles.VIEW"]);
    render(<AccessGuard>page content</AccessGuard>);
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/admin/roles");
  });

  it("lets a probed page render while the probe is pending and blocks it once the backend refuses", () => {
    mockPathname = "/admin/audit/actions";
    signIn(["ROLES.roles.VIEW"]);
    const { rerender } = render(<AccessGuard>page content</AccessGuard>);
    expect(screen.getByText("page content")).toBeInTheDocument();

    act(() => useAccessProbes.setState({ owner: "admin@abapro.ai", results: { [ADMIN_ACTION_LOGS_PATH]: false } }));
    rerender(<AccessGuard>page content</AccessGuard>);
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You're not authorized to view this page" })).toBeInTheDocument();
  });

  it("tells a user with no openable page that their account has no access yet", () => {
    mockPathname = "/admin/roles";
    signIn([]);
    useAccessProbes.setState({
      owner: "admin@abapro.ai",
      results: { [ADMIN_ACTION_LOGS_PATH]: false, [CHANGE_LOGS_PATH]: false, [LOGIN_AUDIT_LOGS_PATH]: false },
    });
    render(<AccessGuard>page content</AccessGuard>);
    expect(screen.getByRole("heading", { name: "Your account has no access yet" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Go to your start page" })).not.toBeInTheDocument();
  });

  it("keeps the page while signing out instead of flashing the no-access view", () => {
    mockPathname = "/admin/roles";
    useAuthStore.setState({ session: null });
    render(<AccessGuard>page content</AccessGuard>);
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("waits instead of saying there is no access while probes are still pending", () => {
    mockPathname = "/personnel";
    signIn([]);
    render(<AccessGuard>page content</AccessGuard>);
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
