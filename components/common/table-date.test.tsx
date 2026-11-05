import { render, screen } from "@testing-library/react";
import { fmtDateTimeParts } from "@/lib/format";
import { TableDate, TableDateText } from "./table-date";

describe("TableDate", () => {
  const epoch = new Date(2026, 10, 5, 9, 7).getTime();

  it("shows every table date at 13px in the main text colour with aligned figures", () => {
    const { date, time } = fmtDateTimeParts(epoch, "en");
    render(<TableDate epoch={epoch} locale="en" />);
    const cell = screen.getByText(`${date} ${time}`);
    expect(cell).toHaveClass("text-[13px]", "tabular", "whitespace-nowrap");
    expect(cell).not.toHaveClass("text-muted-foreground", "text-xs", "text-sm");
  });

  it("can leave the time out and shows a muted dash when there is no date", () => {
    const { date } = fmtDateTimeParts(epoch, "en");
    const { rerender } = render(<TableDate epoch={epoch} locale="en" withTime={false} />);
    expect(screen.getByText(date)).toBeInTheDocument();
    rerender(<TableDate epoch={null} locale="en" />);
    expect(screen.getByText("-")).toHaveClass("text-muted-foreground");
  });

  it("styles relative times the same way", () => {
    render(<TableDateText>2 days ago</TableDateText>);
    expect(screen.getByText("2 days ago")).toHaveClass("text-[13px]", "tabular");
  });
});
