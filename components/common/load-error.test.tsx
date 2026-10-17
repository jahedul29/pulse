import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/lib/auth/store";
import { LoadError } from "./load-error";
import { NoAccess } from "./no-access";

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

describe("LoadError", () => {
  beforeEach(() => signIn(["ROLES.roles.VIEW"]));

  it("shows the message and a working Try again for an ordinary failure", async () => {
    const retry = jest.fn();
    render(<LoadError error={new ApiError("server", 500, "boom")} message="Couldn't load the roles." onRetry={retry} />);
    expect(screen.getByText("Couldn't load the roles.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows the not-authorized message without Try again for a 403", () => {
    render(<LoadError error={new ApiError("forbidden", 403, "Forbidden")} message="Couldn't load the roles." onRetry={jest.fn()} />);
    expect(screen.getByText("You're not authorized to see this content.")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load the roles.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});

describe("NoAccess page", () => {
  it("offers the first page the user can open", () => {
    signIn(["ROLES.roles.VIEW"]);
    render(<NoAccess variant="page" />);
    expect(screen.getByRole("heading", { name: "You're not authorized to view this page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to your start page" })).toHaveAttribute("href", "/admin/roles");
  });
});
