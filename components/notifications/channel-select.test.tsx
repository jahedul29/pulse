import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelFilter, ChannelSelect } from "./channel-select";

jest.mock("../../lib/notifications/queries", () => ({
  useChannelSearch: () => ({
    data: {
      pages: [
        {
          data: [
            { id: 1, code: "IN_APP", name: "In-app inbox", is_active: true },
            { id: 2, code: "EMAIL", name: "Email", is_active: true },
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

describe("ChannelFilter", () => {
  it("lists server-loaded channels and toggles selection", async () => {
    const onChange = jest.fn();
    render(<ChannelFilter value={[]} onChange={onChange} searchLabel="Search" />);

    expect(screen.getByText("In-app inbox")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Email"));
    expect(onChange).toHaveBeenCalledWith(["2"]);
  });
});

describe("ChannelSelect", () => {
  it("shows the selected label on the trigger", () => {
    render(<ChannelSelect value="1" onChange={jest.fn()} selectedLabel="In-app inbox" ariaLabel="Channel" />);
    expect(screen.getByRole("button", { name: "Channel" })).toHaveTextContent("In-app inbox");
  });
});
