import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampaignFilter } from "./campaign-filter";

jest.mock("../../lib/notifications/queries", () => ({
  useCampaignSearch: () => ({
    data: {
      pages: [
        {
          data: [
            { id: "c1", name: "Q1 announcement" },
            { id: "c2", name: "" },
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

describe("CampaignFilter", () => {
  it("labels options with name (falls back to id) and toggles", async () => {
    const onChange = jest.fn();
    render(<CampaignFilter value={[]} onChange={onChange} searchLabel="Search" />);
    expect(screen.getByText("Q1 announcement")).toBeInTheDocument();
    expect(screen.getByText("c2")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Q1 announcement"));
    expect(onChange).toHaveBeenCalledWith(["c1"]);
  });
});
