import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminUserFilter } from "./admin-user-filter";

jest.mock("../../lib/user-management/queries", () => ({
  useAdminUserSearch: () => ({
    data: {
      pages: [
        {
          data: [
            { id: "u1", name: "Layla Haddad", email: "layla@x.co" },
            { id: "u2", name: "", email: "sam@x.co" },
          ],
          meta: { current_page: 1, last_page: 1 },
        },
      ],
    },
    isPending: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
}));

describe("AdminUserFilter", () => {
  it("maps admins to name-or-email options and toggles", async () => {
    const onChange = jest.fn();
    render(<AdminUserFilter value={[]} onChange={onChange} searchLabel="Search" />);
    expect(screen.getByText("Layla Haddad")).toBeInTheDocument();
    expect(screen.getByText("sam@x.co")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Layla Haddad"));
    expect(onChange).toHaveBeenCalledWith(["u1"]);
  });
});
