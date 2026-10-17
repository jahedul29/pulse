import { render, screen } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth/store";
import { ChipLink, InlineRecordLink, RecordLink } from "./record-link";

function signIn(permissions: string[]) {
  useAuthStore.setState({
    session: { email: "admin@abapro.ai", name: "Admin", role: "admin", token: "t", issuedAt: 0, permissions },
  });
}

describe("record links", () => {
  it("link to a record the user can open", () => {
    signIn(["USER_MANAGEMENT.user_management.VIEW"]);
    render(<RecordLink href="/admin/user-management?open=u-1">Emma Novak</RecordLink>);
    expect(screen.getByRole("link", { name: "Emma Novak" })).toHaveAttribute("href", "/admin/user-management?open=u-1");
  });

  it("show plain text for a record the user can't open", () => {
    signIn(["ROLES.roles.VIEW"]);
    render(
      <>
        <RecordLink href="/admin/user-management?open=u-1">Emma Novak</RecordLink>
        <InlineRecordLink href="/admin/settings/security">Policy v3</InlineRecordLink>
        <ChipLink href="/admin/roles/4">admin</ChipLink>
      </>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Emma Novak")).toBeInTheDocument();
    expect(screen.getByText("Policy v3")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("checks account and invitation links by record type", () => {
    signIn(["USER_MANAGEMENT.invitations.VIEW"]);
    render(
      <>
        <RecordLink href="/admin/user-management?invite=i-1">Omar Haddad</RecordLink>
        <InlineRecordLink href="/admin/user-management?open=u-1">Emma Novak</InlineRecordLink>
      </>,
    );
    expect(screen.getByRole("link", { name: "Omar Haddad" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Emma Novak" })).not.toBeInTheDocument();
  });
});
