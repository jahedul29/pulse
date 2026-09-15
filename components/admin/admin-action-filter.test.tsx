import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminActionFilter } from "./admin-action-filter";

jest.mock("../../lib/admin-actions/queries", () => ({
  useAdminActionSearch: () => ({
    data: {
      pages: [
        {
          data: [
            { id: "a1", actionName: "ROLE_UPDATE", targetType: "ROLES" },
            { id: "a2", actionName: "USER_SUSPEND", targetType: "" },
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

describe("AdminActionFilter", () => {
  it("labels options with action code + target and toggles", async () => {
    const onChange = jest.fn();
    render(<AdminActionFilter value={[]} onChange={onChange} searchLabel="Search" />);
    expect(screen.getByText("ROLE_UPDATE · ROLES")).toBeInTheDocument();
    expect(screen.getByText("USER_SUSPEND")).toBeInTheDocument();
    await userEvent.click(screen.getByText("USER_SUSPEND"));
    expect(onChange).toHaveBeenCalledWith(["a2"]);
  });
});
